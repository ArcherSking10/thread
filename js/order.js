/* order.js — Silkthread Studio interactive order flow */

// ——— PRICE TABLE
const PRICES = {
  pet:    { standard: 69,  framed: 99  },
  couple: { standard: 89,  framed: 129 },
  name:   { standard: 39,  framed: 69  },
  family: { standard: 149, framed: 179 },
};
const TYPE_LABELS = {
  pet: 'Pet portrait', couple: 'Couple portrait',
  name: 'Name art', family: 'Family keepsake'
};
const EDITION_LABELS = { standard: 'Standard Edition', framed: 'Framed Signature Edition' };
const STYLE_LABELS = { outline: 'Clean outline', shading: 'Soft shading' };

// ——— DYNAMIC FIELDS per type
const DYNAMIC_FIELDS = {
  pet: [
    { id: 'petName', label: "Pet's name", placeholder: 'e.g. Mochi', required: true },
    { id: 'petType', label: 'Type of pet', placeholder: 'e.g. Golden Retriever, cat, rabbit…', required: false },
  ],
  couple: [
    { id: 'name1', label: 'Name 1', placeholder: 'First person\'s name', required: true },
    { id: 'name2', label: 'Name 2', placeholder: 'Second person\'s name', required: true },
    { id: 'coupleDate', label: 'Date (optional)', placeholder: 'e.g. June 14, 2022', required: false },
  ],
  name: [
    { id: 'nameText', label: 'Name or short phrase', placeholder: 'e.g. Emma, or "Forever Home"', required: true },
    { id: 'motif', label: 'Preferred motif (optional)', placeholder: 'e.g. plum blossom, fan, lattice…', required: false },
  ],
  family: [
    { id: 'famNames', label: 'Names of all people/pets', placeholder: 'e.g. Sarah, Tom, Lily, Biscuit', required: true },
    { id: 'famNote', label: 'Any arrangement notes', placeholder: 'e.g. youngest child in center, dog on left…', required: false },
  ],
};

// ——— STATE
const state = {
  type: null, edition: 'standard', style: 'outline',
  photo: null, photoName: null,
  dynamicValues: {}, notes: '',
  email: '', shipName: '', shipAddress: '', shipCity: '', shipZip: '',
  isGift: false, giftMessage: '',
};

// ——— NAV scroll
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 20));

// ——— Read URL param for type pre-selection
const urlType = new URLSearchParams(location.search).get('type');
if (urlType && PRICES[urlType]) {
  state.type = urlType;
  selectType(urlType);
}

// ——— TYPE CARDS
document.querySelectorAll('.type-card').forEach(card => {
  card.addEventListener('click', () => {
    const t = card.dataset.type;
    selectType(t);
  });
});

function selectType(t) {
  state.type = t;
  document.querySelectorAll('.type-card').forEach(c => {
    c.classList.toggle('selected', c.dataset.type === t);
    const inp = c.querySelector('input');
    if (inp) inp.checked = c.dataset.type === t;
  });
  updateSidebar();
  checkStep1();
}

// ——— EDITION TOGGLE
document.querySelectorAll('.edition-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    state.edition = opt.querySelector('input').value;
    document.querySelectorAll('.edition-opt').forEach(o => o.classList.remove('active'));
    opt.classList.add('active');
    updateSidebar();
  });
});

// ——— STEP 1 → 2
function checkStep1() {
  document.getElementById('toStep2').disabled = !state.type;
}
document.getElementById('toStep2').addEventListener('click', () => {
  if (!state.type) return;
  goToStep(2);
  renderDynamicFields();
});

// ——— STEP 2 ← → 3
document.getElementById('backToStep1').addEventListener('click', () => goToStep(1));
document.getElementById('toStep3').addEventListener('click', () => {
  if (!validateStep2()) return;
  goToStep(3);
  renderOrderSummary();
});

// ——— STEP 3 ← → success
document.getElementById('backToStep2').addEventListener('click', () => goToStep(2));
document.getElementById('placeOrder').addEventListener('click', () => {
  if (!validateStep3()) return;
  goToStep('success');
});

// ——— STEP NAVIGATION
function goToStep(n) {
  document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
  const id = n === 'success' ? 'stepSuccess' : 'step' + n;
  document.getElementById(id).classList.add('active');
  // update step nav indicators
  document.querySelectorAll('.ostep').forEach(s => {
    s.classList.toggle('active', parseInt(s.dataset.step) === n);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ——— PHOTO UPLOAD
const uploadZone = document.getElementById('uploadZone');
const photoInput = document.getElementById('photoInput');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');
const uploadPreview = document.getElementById('uploadPreview');
const previewImg = document.getElementById('previewImg');
const previewLabel = document.getElementById('previewLabel');

document.getElementById('uploadTrigger').addEventListener('click', () => photoInput.click());
uploadZone.addEventListener('click', (e) => {
  if (e.target.id !== 'uploadTrigger' && !uploadPreview.contains(e.target)) photoInput.click();
});

photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (file) handlePhoto(file);
});

uploadZone.addEventListener('dragover', e => {
  e.preventDefault(); uploadZone.classList.add('dragover');
});
uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
uploadZone.addEventListener('drop', e => {
  e.preventDefault(); uploadZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) handlePhoto(file);
});

document.getElementById('removePhoto').addEventListener('click', () => {
  state.photo = null; state.photoName = null;
  photoInput.value = '';
  uploadPreview.style.display = 'none';
  uploadPlaceholder.style.display = 'block';
  previewImg.src = '';
  checkStep2();
});

function handlePhoto(file) {
  state.photo = file;
  state.photoName = file.name;
  const reader = new FileReader();
  reader.onload = e => {
    previewImg.src = e.target.result;
    uploadPlaceholder.style.display = 'none';
    uploadPreview.style.display = 'flex';
    const kb = (file.size / 1024).toFixed(0);
    previewLabel.textContent = `${file.name} · ${kb}KB`;
    checkStep2();
    updateSidebar();
  };
  reader.readAsDataURL(file);
}

// ——— DYNAMIC FIELDS
function renderDynamicFields() {
  const container = document.getElementById('dynamicFields');
  const fields = DYNAMIC_FIELDS[state.type] || [];
  container.innerHTML = fields.map(f => `
    <div class="field-group dynamic-field">
      <label for="${f.id}">${f.label}${f.required ? ' <span class="required">*</span>' : ' <span class="optional">(optional)</span>'}</label>
      <input type="text" id="${f.id}" class="field-input" placeholder="${f.placeholder}" value="${state.dynamicValues[f.id] || ''}" />
    </div>
  `).join('');

  fields.forEach(f => {
    const el = document.getElementById(f.id);
    if (el) {
      el.addEventListener('input', () => {
        state.dynamicValues[f.id] = el.value.trim();
        checkStep2();
      });
    }
  });

  // hide photo upload for name type (no photo needed)
  const photoGroup = document.querySelector('.field-group:has(#uploadZone)');
  if (photoGroup) {
    if (state.type === 'name') {
      photoGroup.style.display = 'none';
      state.photo = 'name_no_photo';
    } else {
      photoGroup.style.display = '';
      if (state.photo === 'name_no_photo') { state.photo = null; }
    }
  }

  checkStep2();
}

// ——— STYLE OPTS
document.querySelectorAll('.style-opt').forEach(opt => {
  opt.addEventListener('click', () => {
    state.style = opt.dataset.style;
    document.querySelectorAll('.style-opt').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    opt.querySelector('input').checked = true;
    updateSidebar();
  });
});

// ——— NOTES
document.getElementById('notesField').addEventListener('input', e => {
  state.notes = e.target.value;
});

// ——— VALIDATE STEP 2
function checkStep2() {
  const btn = document.getElementById('toStep3');
  btn.disabled = !validateStep2();
}

function validateStep2() {
  const fields = DYNAMIC_FIELDS[state.type] || [];
  const allRequired = fields.filter(f => f.required).every(f => {
    const v = (state.dynamicValues[f.id] || '').trim();
    return v.length > 0;
  });
  const hasPhoto = state.photo !== null && state.type !== undefined;
  const nameTypeOk = state.type === 'name'; // name type doesn't need photo
  return allRequired && (hasPhoto || nameTypeOk);
}

// ——— VALIDATE STEP 3
function validateStep3() {
  const email = document.getElementById('emailField').value.trim();
  const name = document.getElementById('shipName').value.trim();
  const address = document.getElementById('shipAddress').value.trim();
  const city = document.getElementById('shipCity').value.trim();
  const zip = document.getElementById('shipZip').value.trim();
  return email.includes('@') && name && address && city && zip;
}

// Bind step 3 fields for live validation
['emailField', 'shipName', 'shipAddress', 'shipCity', 'shipZip'].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener('input', () => {
    document.getElementById('placeOrder').disabled = !validateStep3();
  });
});

// Gift toggle
document.getElementById('giftCheck').addEventListener('change', e => {
  state.isGift = e.target.checked;
  document.getElementById('giftMessageWrap').style.display = e.target.checked ? 'block' : 'none';
});
document.getElementById('giftMessage').addEventListener('input', e => {
  state.giftMessage = e.target.value;
});

// ——— RENDER ORDER SUMMARY (step 3)
function renderOrderSummary() {
  const summary = document.getElementById('orderSummary');
  const price = getPrice();
  const photoHTML = state.photo && state.photo !== 'name_no_photo'
    ? `<div class="os-photo"><img src="${previewImg.src}" alt="Photo"/><span class="os-photo-name">${state.photoName || 'Photo uploaded'}</span></div>`
    : '<span class="os-val">Name only (no photo)</span>';

  const dynFields = DYNAMIC_FIELDS[state.type] || [];
  const dynRows = dynFields.map(f => {
    const val = state.dynamicValues[f.id] || '—';
    return `<div class="os-row"><span class="os-label">${f.label}</span><span class="os-val">${val}</span></div>`;
  }).join('');

  summary.innerHTML = `
    <div class="os-row"><span class="os-label">Template</span><span class="os-val">${TYPE_LABELS[state.type]}</span></div>
    <div class="os-row"><span class="os-label">Edition</span><span class="os-val">${EDITION_LABELS[state.edition]}</span></div>
    <div class="os-row"><span class="os-label">Style</span><span class="os-val">${STYLE_LABELS[state.style]}</span></div>
    ${dynRows}
    <div class="os-row"><span class="os-label">Photo</span>${photoHTML}</div>
    ${state.notes ? `<div class="os-row"><span class="os-label">Notes</span><span class="os-val" style="font-size:12px;max-width:260px;text-align:right">${state.notes}</span></div>` : ''}
  `;

  const shipping = price >= 80 ? 'Free' : '$8';
  document.getElementById('checkoutTotal').innerHTML = `
    <span class="total-label">Order total</span>
    <div style="text-align:right">
      <span class="total-amount">$${price}</span>
      <div style="font-size:12px;color:var(--ink-muted);margin-top:2px">+ shipping: ${shipping}</div>
    </div>
  `;
}

// ——— SIDEBAR
function updateSidebar() {
  document.getElementById('sbTypeVal').textContent = state.type ? TYPE_LABELS[state.type] : '—';
  document.getElementById('sbEditionVal').textContent = EDITION_LABELS[state.edition];
  document.getElementById('sbStyleVal').textContent = STYLE_LABELS[state.style] || '—';
  const price = state.type ? getPrice() : null;
  document.getElementById('sbTotal').textContent = price ? `$${price}` : '—';
}

function getPrice() {
  if (!state.type) return 0;
  return PRICES[state.type][state.edition];
}

// ——— INIT
checkStep1();
updateSidebar();
