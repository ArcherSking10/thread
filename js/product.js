import { getProduct } from "./api.js";
import { getSession, updateNav } from "./auth.js";

const params = new URLSearchParams(location.search);
const productId = params.get("id");
let activeEdition = 0, product = null;

async function init() {
  updateNav();
  product = await getProduct(productId);
  document.title = product.name + " — Lunastitch";
  document.getElementById("product-name").textContent = product.name;
  document.getElementById("product-tagline").textContent = product.tagline;
  if (product.hero_url) {
    const img = document.getElementById("product-hero");
    img.src = product.hero_url; img.style.display = "block";
    document.getElementById("product-hero-placeholder").style.display = "none";
  }
  const tabs = product.editions.map((ed, i) =>
    `<button class="etab${i===0?" active":""}" onclick="switchEdition(${i})">${ed.label}</button>`
  ).join("");
  document.getElementById("edition-tabs").innerHTML = tabs;
  renderEdition();
}

function renderEdition() {
  const ed = product.editions[activeEdition];
  document.getElementById("edition-price").textContent = ed.price_display;
  document.getElementById("edition-features").innerHTML =
    ed.features.map(f => `<li>${f}</li>`).join("");
  document.querySelectorAll(".etab").forEach((t, i) =>
    t.classList.toggle("active", i === activeEdition));
}

window.switchEdition = i => { activeEdition = i; renderEdition(); };

window.startOrder = async () => {
  const session = await getSession();
  if (!session) { location.href = "/login.html?next=" + encodeURIComponent(location.href); return; }
  const ed = product.editions[activeEdition];
  location.href = "/checkout.html?product=" + productId +
    "&edition=" + activeEdition + "&price=" + ed.stripe_price_id;
};

init();
