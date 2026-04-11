import { getUserOrders, submitPreviewResponse } from "./api.js";
import { requireAuth, getCurrentUser, updateNav } from "./auth.js";

const STATUS_LABEL = {
  pending:            'Awaiting payment',
  paid:               'Order confirmed',
  in_production:      'In production',
  preview_sent:       'Preview ready',
  revision_requested: 'Revision requested',
  preview_approved:   'Preview approved',
  shipped:            'Shipped',
  complete:           'Complete',
};

async function init() {
  updateNav();
  const session = await requireAuth();
  if (!session) return;
  document.getElementById('orders-list').innerHTML = '<div class="spinner"></div>';
  try {
    const user = await getCurrentUser();
    document.getElementById('user-name').textContent = user.fullName || user.email;
    const orders = await getUserOrders(user.id);
    const c = document.getElementById('orders-list');

    if (!orders.length) {
      c.innerHTML = `
        <div style="padding:48px 0;text-align:center;border:.5px solid var(--border)">
          <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;
            color:var(--ink2);margin-bottom:10px">No orders yet</div>
          <p style="font-size:13px;color:var(--muted);margin-bottom:24px;line-height:1.7">
            Your custom keepsakes will appear here once you place an order.
          </p>
          <a href="/#collections" class="btn-dark" style="display:inline-block">
            Browse collections
          </a>
        </div>`;
      return;
    }

    c.innerHTML = orders.map(o => {
      const label       = STATUS_LABEL[o.status] || o.status;
      const name        = o.product?.name || o.product_slug || 'Order';
      // edition_label 为空时（老订单），根据 edition_index 推导
      const editionLabel = o.edition_label ||
        (o.edition_index === 0 ? 'Standard' : o.edition_index === 1 ? 'Framed Signature' : '');
      const date        = new Date(o.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric'
      });

      let html = `<div class="card" style="margin-bottom:16px" id="order-${o.id}">`;

      // 顶部：产品名 + 状态
      html += `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px">
          <div>
            <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:20px;
              color:var(--ink2);margin-bottom:4px">${name}</div>
            <div style="font-size:12px;color:var(--muted)">${editionLabel}</div>
          </div>
          <span class="badge badge-${o.status}">${label}</span>
        </div>`;

      // 中部：订单详情四列，tracking number 无值显示 —
      html += `
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:16px;
          padding:16px 0;border-top:.5px solid var(--border2);border-bottom:.5px solid var(--border2);
          margin-bottom:16px">
          <div>
            <div style="font-size:10px;letter-spacing:.14em;color:var(--muted);
              text-transform:uppercase;margin-bottom:4px">Order date</div>
            <div style="font-size:13px;color:var(--ink2)">${date}</div>
          </div>
          <div>
            <div style="font-size:10px;letter-spacing:.14em;color:var(--muted);
              text-transform:uppercase;margin-bottom:4px">Order ID</div>
            <div style="font-size:13px;color:var(--ink2);font-family:monospace">
              #${o.id.slice(0, 8).toUpperCase()}</div>
          </div>
          <div>
            <div style="font-size:10px;letter-spacing:.14em;color:var(--muted);
              text-transform:uppercase;margin-bottom:4px">Edition</div>
            <div style="font-size:13px;color:var(--ink2)">${editionLabel || '—'}</div>
          </div>
          <div>
            <div style="font-size:10px;letter-spacing:.14em;color:var(--muted);
              text-transform:uppercase;margin-bottom:4px">Tracking</div>
            <div style="font-size:13px;color:var(--ink2);font-family:monospace">
              ${o.tracking_number || '—'}</div>
          </div>
        </div>`;

      // 照片缩略图
      if (o.photo_url) {
        html += `
          <div style="margin-bottom:16px">
            <div style="font-size:10px;letter-spacing:.14em;color:var(--muted);
              text-transform:uppercase;margin-bottom:8px">Your photo</div>
            <img src="${o.photo_url}" style="width:80px;height:80px;object-fit:cover;
              border:.5px solid var(--border)">
          </div>`;
      }

      // pending：引导付款
      if (o.status === 'pending') {
        html += `
          <div style="padding:14px;background:var(--gold-p);border:.5px solid var(--gold-l)">
            <p style="font-size:13px;color:var(--ink2);margin-bottom:10px;line-height:1.7">
              Your order is saved but payment hasn't been completed yet.
            </p>
            <a href="/checkout.html?product=${o.product_slug}&edition=${o.edition_index}&price=${o.stripe_price_id}"
              class="btn-dark btn-sm" style="display:inline-block">Complete payment →</a>
          </div>`;
      }

      // preview 区域
      if (o.preview_url) {
        html += `
          <div style="margin-top:16px;padding-top:16px;border-top:.5px solid var(--border2)">
            <div style="font-size:10px;letter-spacing:.14em;color:var(--gold);
              text-transform:uppercase;margin-bottom:12px">Your preview</div>
            <img src="${o.preview_url}" style="width:100%;max-height:360px;object-fit:contain;
              border:.5px solid var(--border);margin-bottom:16px">`;

        if (o.status === 'preview_sent') {
          html += `
            <div style="display:flex;gap:10px;flex-wrap:wrap">
              <button class="btn-dark btn-sm" onclick="approvePreview('${o.id}')">
                Approve and proceed</button>
              <button class="btn-ghost btn-sm" onclick="showRevision('${o.id}')">
                Request revision</button>
            </div>
            <div id="rev-${o.id}" style="display:none;margin-top:14px">
              <textarea class="f-input" id="rev-note-${o.id}" rows="3"
                placeholder="Describe what you'd like changed…"></textarea>
              <button class="btn-dark btn-sm" style="margin-top:8px"
                onclick="submitRevision('${o.id}')">Submit revision request</button>
            </div>`;
        }
        html += `</div>`;
      }

      html += `</div>`;
      return html;
    }).join('');

    // 付款成功提示
    const p = new URLSearchParams(location.search);
    if (p.get('paid') === '1') {
      const b = document.createElement('div');
      b.className = 'alert alert-success';
      b.style.cssText = 'position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:200;white-space:nowrap';
      b.textContent = 'Payment confirmed! We will be in touch soon.';
      document.body.appendChild(b);
      setTimeout(() => b.remove(), 5000);
    }
  } catch (err) {
    console.error('[account] init error:', err);
    const c = document.getElementById('orders-list');
    if (c) c.innerHTML = "<p style='color:var(--muted);font-size:13px'>Unable to load orders. Please try again later.</p>";
  }
}

window.approvePreview = async id => { await submitPreviewResponse(id, 'approve'); location.reload(); };
window.showRevision   = id => { document.getElementById('rev-' + id).style.display = 'block'; };
window.submitRevision = async id => {
  const note = document.getElementById('rev-note-' + id).value;
  await submitPreviewResponse(id, 'revise', note);
  location.reload();
};

init();