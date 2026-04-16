// Toast 提示（替代原生 alert）
let _toastTimer = null;
function showToast(msg, type = 'success') {
  let toast = document.getElementById('admin-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-toast';
    toast.style.cssText = 'position:fixed;top:76px;right:32px;z-index:9999;min-width:200px;max-width:320px;display:none';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<div class="alert alert-${type}" style="box-shadow:0 2px 12px rgba(0,0,0,.12)">${msg}</div>`;
  toast.style.display = 'block';
  if (_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

import { getAllOrders, updateOrder, getProducts, updateProduct, uploadPhoto } from "./api.js";
import { requireAdmin, logout, updateNav } from "./auth.js";
import { supabase } from "./auth.js";

window.logout = logout;

async function init() {
  updateNav();
  await requireAdmin();
  const page = document.body.dataset.page;
  if (page === "dashboard") initDashboard();
  if (page === "orders") initOrders();
  if (page === "products") initProducts();
}

async function initDashboard() {
  const orders = await getAllOrders();
  const c = {};
  orders.forEach(o => { c[o.status] = (c[o.status]||0)+1; });
  document.getElementById("stat-total").textContent = orders.length;
  ["pending","in_production","preview_sent","shipped"].forEach(k => {
    const el = document.getElementById("stat-"+k);
    if (el) el.textContent = c[k] || 0;
  });
}

const STATUSES = ["pending","paid","in_production","preview_sent","revision_requested","preview_approved","shipped","complete","cancelled"];

const STATUS_LABEL = {
  pending:            'Awaiting payment',
  paid:               'Order confirmed',
  in_production:      'In production',
  preview_sent:       'Preview ready',
  revision_requested: 'Revision requested',
  preview_approved:   'Preview approved',
  shipped:            'Shipped',
  complete:           'Complete',
  cancelled:          'Cancelled',
};

async function initOrders() {
  loadOrders();
}

window.loadOrders = loadOrders;
async function loadOrders(status) {
  const orders = await getAllOrders(status ? { status } : {});
  document.getElementById('orders-tbody').innerHTML = orders.map(o => {
    const cust    = o.customer_email || '—';
    const prod    = o.product?.name || o.product_slug || '—';
    const statusLabel = STATUS_LABEL[o.status] || o.status;
    const orderId = o.id;
    const statusOpts = STATUSES.map(s => {
      const active = s === o.status ? ' active' : '';
      const label  = STATUS_LABEL[s] || s;
      return '<div class="status-opt' + active + '" data-id="' + orderId + '" data-val="' + s + '">' + label + '</div>';
    }).join('');
    const photo   = o.photo_url
      ? `<a href="${o.photo_url}" target="_blank">
          <img src="${o.photo_url}" style="width:48px;height:48px;object-fit:cover;border:.5px solid var(--border);display:block">
        </a>` : '—';
    const prevLink = o.preview_url
      ? ` <a href="${o.preview_url}" target="_blank" style="color:var(--gold);font-size:11px">View</a>` : '';
    return `
      <tr>
        <td style="font-family:monospace;font-size:11px">${o.id.slice(0, 8)}</td>
        <td>${cust}</td>
        <td>${prod}</td>
        <td>${new Date(o.created_at).toLocaleDateString()}</td>
        <td>
          <div class="status-drop" onclick="this.classList.toggle('open')">
            <span class="badge badge-${o.status}">${statusLabel} &#9662;</span>
            <div class="status-menu">${statusOpts}</div>
          </div>
        </td>
        <td>${photo}</td>
        <td>${buildActionCell(o)}</td>
        <td>
          <textarea rows="2" style="min-width:120px"
            onblur="saveNote('${o.id}', this.value)">${o.admin_note || ''}</textarea>
        </td>
      </tr>`;
  }).join('');
}

window.changeStatus = async (id, status) => { await updateOrder(id, { status }); location.reload(); };
window.saveNote     = async (id, note) => { await updateOrder(id, { admin_note: note }); };

// Build action cell based on order status
function buildActionCell(o) {
  const id = o.id;

  const previewThumb = o.preview_url
    ? `<a href="${o.preview_url}" target="_blank"><img src="${o.preview_url}" style="width:48px;height:48px;object-fit:cover;border:.5px solid var(--border);display:block;margin-bottom:6px"></a>`
    : '';

  const revNote = o.customer_note
    ? `<div style="font-size:11px;color:var(--muted);margin-bottom:8px;max-width:160px;line-height:1.5">Note: ${o.customer_note}</div>`
    : '';

  if (o.status === 'paid') {
    return `<button class="btn-dark btn-sm" onclick="startProduction('${id}')">Start production</button>`;
  }

  if (o.status === 'in_production' || o.status === 'revision_requested') {
    return revNote +
      `<input type="file" id="pf-${id}" style="display:none" accept="image/*" onchange="uploadPreview('${id}', this.files[0])">` +
      `<button class="btn-ghost btn-sm" onclick="document.getElementById('pf-${id}').click()">Upload preview</button>`;
  }

  if (o.status === 'preview_sent') {
    return previewThumb +
      '<div style="font-size:11px;color:var(--muted)">Awaiting approval</div>';
  }

  if (o.status === 'preview_approved') {
    return '<div style="font-size:11px;color:var(--muted);margin-bottom:8px">Ready to produce</div>' +
      `<input class="f-input" id="tr-${id}" placeholder="Tracking number" style="margin-bottom:6px;font-size:12px">` +
      `<button class="btn-dark btn-sm" onclick="markShipped('${id}')">Mark as shipped</button>`;
  }

  if (o.status === 'shipped') {
    return `<button class="btn-ghost btn-sm" onclick="markComplete('${id}')">Mark as complete</button>`;
  }

  return previewThumb || '—';
}


window.startProduction = async (id) => {
  await updateOrder(id, { status: 'in_production' });
  showToast('Production started.');
  location.reload();
};

window.uploadPreview = async (id, file) => {
  if (!file) return;
  showToast('Uploading preview...');
  try {
    const url = await uploadPhoto(file);
    await updateOrder(id, { preview_url: url, status: 'preview_sent' });
    showToast('Preview sent to customer.');
    location.reload();
  } catch (e) {
    showToast('Upload failed: ' + e.message, 'error');
  }
};

window.markShipped = async (id) => {
  const tracking = document.getElementById('tr-' + id)?.value.trim();
  if (!tracking) { showToast('Please enter a tracking number.', 'error'); return; }
  await updateOrder(id, { status: 'shipped', tracking_number: tracking });
  showToast('Marked as shipped.');
  location.reload();
};

window.markComplete = async (id) => {
  await updateOrder(id, { status: 'complete' });
  showToast('Order complete.');
  location.reload();
};

let _productsCache = [];

async function initProducts() {
  const products = await getProducts();
  _productsCache = products;
  document.getElementById("products-editor").innerHTML = products.map(p => {
    const editions = p.editions.map((ed,i) => {
      return `<div style="border:.5px solid var(--border2);padding:12px;margin-bottom:10px">
        <div style="font-size:10px;letter-spacing:.1em;color:var(--gold);margin-bottom:10px">${ed.label}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><label class="f-label">Price display</label>
            <input class="f-input" value="${ed.price_display}" onblur="saveEdition('${p.id}',${i},'price_display',this.value)"></div>
          <div><label class="f-label">Stripe Price ID</label>
            <input class="f-input" placeholder="price_xxx" value="${ed.stripe_price_id||''}" onblur="saveEdition('${p.id}',${i},'stripe_price_id',this.value)"></div>
        </div></div>`;
    }).join("");
    return `<div class="card" style="margin-bottom:24px" data-id="${p.id}">
      <div style="display:grid;grid-template-columns:180px 1fr;gap:24px;align-items:start">
        <div>
          <img src="${p.hero_url||''}" id="img-${p.id}" style="width:100%;border:.5px solid var(--border);margin-bottom:10px">
          <input type="file" id="imgf-${p.id}" style="display:none" accept="image/*" onchange="replaceImg('${p.id}',this.files[0])">
          <button class="btn-ghost btn-sm" onclick="document.getElementById('imgf-${p.id}').click()">Replace image</button>
        </div>
        <div>
          <div class="f-group"><label class="f-label">Name</label><input class="f-input" id="name-${p.id}" value="${p.name}"></div>
          <div class="f-group"><label class="f-label">Tagline</label><textarea class="f-input" id="tagline-${p.id}" rows="2">${p.tagline||''}</textarea></div>
          ${editions}
          <button class="btn-dark btn-sm" onclick="saveProduct('${p.id}')">Save changes</button>
        </div>
      </div>
    </div>`;
  }).join("");
}

window.saveProduct = async id => {
  await updateProduct(id, {
    name: document.getElementById("name-"+id).value,
    tagline: document.getElementById("tagline-"+id).value
  });
  showToast("Changes saved.");
};
window.replaceImg = async (id,file) => {
  const url = await uploadPhoto(file);
  await updateProduct(id,{hero_url:url});
  document.getElementById("img-"+id).src = url;
  showToast("Image updated.");
};
window.saveEdition = async (productId,idx,field,value) => {
  const prod = _productsCache.find(p => p.id === productId);
  if (!prod) return;
  prod.editions[idx][field] = value;
  await updateProduct(productId, { editions: prod.editions });
};

init();