import { supabase } from './auth.js';
import { isConfigured, CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, CHECKOUT_FUNCTION_URL } from './config.js';

// ── Mock 数据（本地未配置 Supabase 时使用） ──────────────────

const MOCK_PRODUCTS = [
  {
    id: 'pet',
    name: 'Pet portrait',
    tagline: 'Your pet in refined satin stitch with a quiet eastern touch.',
    hero_url: '',
    sort_order: 1,
    editions: [
      { label: 'Standard',         price_display: '$69–79',   stripe_price_id: 'price_TODO', features: ['1 pet (head or half-body)', 'Pet name', 'Eastern accent element', 'Gift-ready packaging', '10–14 day turnaround'] },
      { label: 'Framed Signature', price_display: '$99–129',  stripe_price_id: 'price_TODO', features: ['All Standard features', 'Full frame wall-ready', 'Premium linen ground', '12–16 day turnaround'] },
    ],
  },
  {
    id: 'couple',
    name: 'Couple portrait',
    tagline: 'Two people, one frame. Perfect for anniversaries and weddings.',
    hero_url: '',
    sort_order: 2,
    editions: [
      { label: 'Standard',         price_display: '$89–109',  stripe_price_id: 'price_TODO', features: ['2 people half-body', '2 names + optional date', '10–14 days'] },
      { label: 'Framed Signature', price_display: '$129–169', stripe_price_id: 'price_TODO', features: ['All Standard features', 'Full frame', '12–16 days'] },
    ],
  },
  {
    id: 'name',
    name: 'Name art',
    tagline: 'A name or phrase with a single eastern motif. No photo needed.',
    hero_url: '',
    sort_order: 3,
    editions: [
      { label: 'Standard',         price_display: '$39–59',   stripe_price_id: 'price_TODO', features: ['Name up to 12 chars', '1 eastern motif', 'No photo needed', '7–10 days'] },
      { label: 'Framed Signature', price_display: '$69–89',   stripe_price_id: 'price_TODO', features: ['All Standard features', 'Full frame', '10–14 days'] },
    ],
  },
  {
    id: 'family',
    name: 'Family keepsake',
    tagline: 'The most meaningful piece we make. Families and groups.',
    hero_url: '',
    sort_order: 4,
    editions: [
      { label: 'Custom Standard',  price_display: '$149–189', stripe_price_id: 'price_TODO', features: ['2–5 subjects', 'All names + date', '14–20 days', 'Preview approval required'] },
      { label: 'Custom Framed',    price_display: '$179–249', stripe_price_id: 'price_TODO', features: ['All Custom features', 'Full frame', 'Lead time confirmed per order'] },
    ],
  },
];

// ── Products ─────────────────────────────────────────────────

export async function getProducts() {
  if (!isConfigured()) return MOCK_PRODUCTS;
  const { data, error } = await supabase.from('products').select('*').order('sort_order');
  if (error) throw error;
  return data;
}

export async function getProduct(slug) {
  if (!isConfigured()) {
    const p = MOCK_PRODUCTS.find(p => p.id === slug);
    if (!p) throw new Error('Product not found');
    return p;
  }
  const { data, error } = await supabase
    .from('products').select('*').eq('slug', slug).single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id, fields) {
  if (!isConfigured()) { console.log('[DEV] updateProduct', id, fields); return; }
  const { error } = await supabase.from('products')
    .update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

// ── Orders ───────────────────────────────────────────────────

export async function createOrder(data) {
  if (!isConfigured()) {
    console.log('[DEV] createOrder', data);
    return { id: 'mock-order-id', ...data };
  }
  const { data: order, error } = await supabase.from('orders')
    .insert([{ ...data, status: 'pending', created_at: new Date().toISOString() }])
    .select().single();
  if (error) throw error;
  return order;
}

export async function getUserOrders(userId) {
  if (!isConfigured()) return []; // 本地无订单
  const { data, error } = await supabase.from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getAllOrders(filters = {}) {
  if (!isConfigured()) return [];
  let q = supabase
    .from('orders')
    .select('*, products!orders_product_id_fkey(name)')
    .order('created_at', { ascending: false });
  if (filters.status) q = q.eq('status', filters.status);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function updateOrder(id, fields) {
  if (!isConfigured()) { console.log('[DEV] updateOrder', id, fields); return; }
  const { error } = await supabase.from('orders')
    .update({ ...fields, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) throw error;
}

export async function submitPreviewResponse(orderId, action, note = '') {
  const status = action === 'approve' ? 'preview_approved' : 'revision_requested';
  return updateOrder(orderId, { status, customer_note: note });
}

// ── Cloudinary 上传 ──────────────────────────────────────────

export async function uploadPhoto(file) {
  if (!isConfigured()) {
    // 本地调试：返回 object URL 模拟上传
    return URL.createObjectURL(file);
  }
  const fd = new FormData();
  fd.append('file', file);
  fd.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: 'POST', body: fd }
  );
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || 'Upload failed');
  return json.secure_url;
}

// ── Stripe Checkout ──────────────────────────────────────────

export async function startStripeCheckout(orderId, stripePriceId, customerEmail) {
  if (!isConfigured()) {
    alert('[DEV MODE] Stripe not configured.\n\nIn production this redirects to Stripe Checkout.\nFill in js/config.js to enable.');
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(CHECKOUT_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ orderId, stripePriceId, customerEmail }),
  });
  const { url, error } = await res.json();
  if (error) throw new Error(error);
  window.location.href = url;
}