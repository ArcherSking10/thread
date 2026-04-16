import { uploadPhoto, createOrder, startStripeCheckout } from "./api.js";
import { requireAuth, getCurrentUser, updateNav } from "./auth.js";

const params = new URLSearchParams(location.search);
const productId = params.get("product");
const editionIdx = parseInt(params.get("edition") || "0");
const priceId = params.get("price");
let uploadedPhotoUrl = null, orderId = null;

async function init() {
  updateNav();

  // If order_id is in URL, resume payment — show Step 3 immediately before auth
  const existingOrderId = params.get('order_id');
  if (existingOrderId) {
    showStep(3);
    await requireAuth();
    orderId = existingOrderId;
    return;
  }

  await requireAuth();

  // Normal checkout: populate order summary from URL params
  const productName  = params.get('name')          || '';
  const editionLabel = params.get('edition_label') || '';
  const priceDisplay = params.get('price_display') || '';
  if (productName) {
    const el = document.getElementById('order-summary');
    if (el) {
      el.textContent = `${productName} · ${editionLabel} · ${priceDisplay}`;
      el.style.display = 'block';
    }
  }
  showStep(1);
}

export function showStep(n) {
  document.querySelectorAll(".step-panel").forEach((p, i) => p.classList.toggle("active", i+1===n));
  ["dot1","dot2","dot3"].forEach((id, i) => {
    const d = document.getElementById(id);
    if (!d) return;
    d.classList.toggle("done",   i+1 < n);
    d.classList.toggle("active", i+1 === n);
  });
}
window.showStep = showStep;

window.handlePhotoUpload = async input => {
  const file = input.files[0]; if (!file) return;
  const btn = document.getElementById("upload-btn");
  btn.textContent = "Uploading..."; btn.disabled = true;
  try {
    uploadedPhotoUrl = await uploadPhoto(file);
    const prev = document.getElementById("photo-preview");
    prev.src = uploadedPhotoUrl; prev.style.display = "block";
    // CHECKOUT-05: hide upload-btn, show change photo
    btn.textContent = "Photo uploaded ✓";
    btn.style.display = "none";
    document.getElementById("next-step1").style.display = "inline-block";
    document.getElementById("reselect-wrap").style.display = "block";
  } catch(e) { btn.textContent = "Failed - try again"; btn.disabled = false; }
};

window.goStep2 = () => showStep(2);

window.submitDetails = async e => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const user = await getCurrentUser();
  try {
    // CHECKOUT-04: pass product_slug not product_id
    const order = await createOrder({
      user_id:         user.id,
      product_slug:    productId,
      edition_index:   editionIdx,
      edition_label:   params.get('edition_label') || '',
      stripe_price_id: priceId,
      photo_url:       uploadedPhotoUrl,
      subject_name:    fd.get("subject_name"),
      customer_email:  user.email,
      notes:           fd.get("notes")
    });
    orderId = order.id; showStep(3);
  } catch(e) { document.getElementById("step2-alert").innerHTML = `<div class="alert alert-error">${e.message}</div>`; }
};

window.proceedToPayment = async () => {
  const user = await getCurrentUser();
  const btn = document.getElementById("pay-btn");
  btn.textContent = "Redirecting..."; btn.disabled = true;
  try { await startStripeCheckout(orderId, priceId, user.email); }
  catch(e) { btn.textContent = "Pay now →"; btn.disabled = false;
    document.getElementById("step3-alert").innerHTML = `<div class="alert alert-error">${e.message}</div>`; }
};

init();