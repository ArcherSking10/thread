import { getUserOrders, submitPreviewResponse } from "./api.js";
import { requireAuth, getCurrentUser, updateNav } from "./auth.js";

const STATUS_LABEL = {
  pending: "Order received", in_production: "In production",
  preview_sent: "Preview ready - action needed",
  revision_requested: "Revision requested", preview_approved: "Preview approved",
  shipped: "Shipped", complete: "Complete"
};

async function init() {
  updateNav();
  // AUTH-05: await requireAuth before showing spinner
  const session = await requireAuth();
  if (!session) return;
  document.getElementById("orders-list").innerHTML = '<div class="spinner"></div>';
  try {
    const user = await getCurrentUser();
    document.getElementById("user-name").textContent = user.fullName || user.email;
    const orders = await getUserOrders(user.id);
    const c = document.getElementById("orders-list");
    if (!orders.length) {
      // UI-05: better empty state
      c.innerHTML = `
        <div style="padding:48px 0;text-align:center;border:.5px solid var(--border)">
          <div style="font-family:'Cormorant Garamond',Georgia,serif;font-size:22px;
            color:var(--ink2);margin-bottom:10px">No orders yet</div>
          <p style="font-size:13px;color:var(--muted);margin-bottom:24px;line-height:1.8">
            Your custom keepsakes will appear here once you place an order.
          </p>
          <a href="/#collections" class="btn-dark" style="display:inline-block">
            Browse collections
          </a>
        </div>`;
      return;
    }
    c.innerHTML = orders.map(o => {
      const label = STATUS_LABEL[o.status] || o.status;
      const name = o.product?.name || o.product_slug || 'Order';
      const date = new Date(o.created_at).toLocaleDateString("en-US",{year:"numeric",month:"long",day:"numeric"});
      let html = `<div class="card" style="margin-bottom:16px" id="order-${o.id}">`;
      html += `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px">`;
      html += `<div><div style="font-family:Cormorant Garamond,Georgia,serif;font-size:18px;color:var(--ink2);margin-bottom:4px">${name}</div>`;
      html += `<div style="font-size:11px;color:var(--muted)">${date}</div></div>`;
      html += `<span class="badge badge-${o.status}">${label}</span></div>`;
      if (o.preview_url) {
        html += `<div style="margin-top:16px;padding-top:16px;border-top:.5px solid var(--border2)">`;
        html += `<div style="font-size:11px;letter-spacing:.12em;color:var(--gold);text-transform:uppercase;margin-bottom:10px">Your preview</div>`;
        html += `<img src="${o.preview_url}" style="max-width:100%;max-height:320px;object-fit:contain;border:.5px solid var(--border);margin-bottom:14px">`;
        if (o.status === "preview_sent") {
          html += `<div style="display:flex;gap:10px;flex-wrap:wrap">`;
          html += `<button class="btn-dark btn-sm" onclick="approvePreview('${o.id}')">Approve and proceed</button>`;
          html += `<button class="btn-ghost btn-sm" onclick="showRevision('${o.id}')">Request revision</button></div>`;
          html += `<div id="rev-${o.id}" style="display:none;margin-top:14px">`;
          html += `<textarea class="f-input" id="rev-note-${o.id}" rows="3" placeholder="Describe what to change..."></textarea>`;
          html += `<button class="btn-dark btn-sm" style="margin-top:8px" onclick="submitRevision('${o.id}')">Submit</button></div>`;
        }
        html += "</div>";
      }
      html += "</div>";
      return html;
    }).join("");
    const p = new URLSearchParams(location.search);
    if (p.get("paid") === "1") {
      const b = document.createElement("div");
      b.className = "alert alert-success";
      b.style.cssText = "position:fixed;top:70px;left:50%;transform:translateX(-50%);z-index:200;white-space:nowrap";
      b.textContent = "Payment confirmed! We will be in touch soon.";
      document.body.appendChild(b);
      setTimeout(() => b.remove(), 5000);
    }
  } catch (err) {
    console.error('[account] init error:', err);
    const c = document.getElementById("orders-list");
    if (c) c.innerHTML = "<p style='color:var(--muted);font-size:13px'>Unable to load orders. Please try again later.</p>";
  }
}

window.approvePreview = async id => { await submitPreviewResponse(id,"approve"); location.reload(); };
window.showRevision = id => { document.getElementById("rev-"+id).style.display="block"; };
window.submitRevision = async id => {
  const note = document.getElementById("rev-note-"+id).value;
  await submitPreviewResponse(id,"revise",note); location.reload();
};

init();
