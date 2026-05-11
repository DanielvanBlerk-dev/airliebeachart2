// script.js

const ADMIN_TOKEN_KEY = 'adminToken';

let isAdmin = false;
let pendingDeleteId = null;
let artworks = [];
let cart = [];
let squareCard = null;
let squarePayments = null;
let newImgData = null;

/* ─── HELPERS ───────────────────────────────────────────────────────────── */

function containsHTML(str) {
  return /[<>]/.test(str);
}

function isValidPhone(str) {
  return /^[0-9+\s-]{6,20}$/.test(str);
}

function isValidPostcode(str) {
  return /^[0-9]{4}$/.test(str);
}

function getAdminToken() {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY);
}

function isLoggedInAdmin() {
  return !!getAdminToken();
}

function clearElement(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/* ─── DEFAULT ARTWORKS (FALLBACK ONLY) ──────────────────────────────────── */

const DEFAULT_ARTWORKS = [
  { id:1, title:'Still Life with Lemons', medium:'Oil on linen · 40 × 50 cm', price:1800, sold:false },
  { id:2, title:'Coastal Morning', medium:'Oil on board · 30 × 40 cm', price:950, sold:false },
  { id:3, title:'Interior, Late Afternoon', medium:'Acrylic on linen · 60 × 80 cm', price:2400, sold:false },
  { id:4, title:'Portrait Study No. 7', medium:'Oil on board · 25 × 35 cm', price:1200, sold:true },
  { id:5, title:'Garden at Dusk', medium:'Oil on linen · 70 × 90 cm', price:3200, sold:false },
  { id:6, title:'The White Jug', medium:'Oil on board · 20 × 25 cm', price:680, sold:false }
];

/* ─── ADMIN AUTH (FRONTEND) ─────────────────────────────────────────────── */

function openLogin() {
  const pw = document.getElementById('admin-pw');
  const err = document.getElementById('login-error');
  if (pw) pw.value = '';
  if (err) err.textContent = '';
  const overlay = document.getElementById('login-overlay');
  if (overlay) overlay.classList.add('open');
  setTimeout(() => pw && pw.focus(), 200);
}

function closeLogin() {
  const overlay = document.getElementById('login-overlay');
  if (overlay) overlay.classList.remove('open');
}

async function attemptLogin() {
  const pwInput = document.getElementById('admin-pw');
  const errorEl = document.getElementById('login-error');
  if (!pwInput || !errorEl) return;

  errorEl.textContent = '';
  const pw = pwInput.value;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    });

    const data = await res.json();

    if (!res.ok || !data.token) {
      errorEl.textContent = 'Incorrect password.';
      return;
    }

    sessionStorage.setItem(ADMIN_TOKEN_KEY, data.token);
    activateAdminMode();
    closeLogin();
  } catch (err) {
    console.error(err);
    errorEl.textContent = 'Login failed. Try again.';
  }
}

function adminLogout() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  isAdmin = false;
  const bar = document.getElementById('admin-bar');
  if (bar) bar.classList.remove('visible');
  const nav = document.getElementById('admin-nav-link');
  if (nav) nav.style.color = 'var(--border)';
  renderGallery();
}

function activateAdminMode() {
  isAdmin = true;
  const bar = document.getElementById('admin-bar');
  if (bar) bar.classList.add('visible');
  const nav = document.getElementById('admin-nav-link');
  if (nav) nav.style.color = 'var(--gold)';
  renderGallery();
}

/* ─── LOAD ARTWORKS FROM BACKEND ────────────────────────────────────────── */

async function fetchArtworksFromBackend() {
  try {
    const res = await fetch('/api/get-artworks');
    const data = await res.json();
    if (!res.ok || !Array.isArray(data.artworks)) {
      artworks = DEFAULT_ARTWORKS.slice();
    } else {
      artworks = data.artworks;
    }
  } catch (e) {
    console.error('Failed to load artworks from backend, using defaults:', e);
    artworks = DEFAULT_ARTWORKS.slice();
  }
}

/* ─── RENDER GALLERY (SAFE DOM) ─────────────────────────────────────────── */

function inCart(id) {
  return cart.some(i => i.id === id);
}

function renderGallery() {
  const grid = document.getElementById('gallery-grid');
  if (!grid) return;
  clearElement(grid);

  artworks.forEach(art => {
    const card = document.createElement('div');
    card.className = 'artwork-card';
    card.id = `card-${art.id}`;

    const imgWrap = document.createElement('div');
    imgWrap.className = 'artwork-img';

    if (art.imgData) {
      const img = document.createElement('img');
      img.src = art.imgData;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      imgWrap.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'artwork-placeholder';
      const phText = document.createElement('span');
      phText.textContent = art.title || 'Artwork';
      placeholder.appendChild(phText);
      imgWrap.appendChild(placeholder);
    }

    if (art.sold) {
      const soldOverlay = document.createElement('div');
      soldOverlay.className = 'sold-overlay';
      soldOverlay.textContent = 'Sold';
      imgWrap.appendChild(soldOverlay);
    }

    const label = document.createElement('div');
    label.className = 'artwork-label';

    const titleEl = document.createElement('span');
    titleEl.className = 'artwork-title';
    titleEl.textContent = art.title;

    const priceEl = document.createElement('span');
    priceEl.className = 'artwork-price';
    priceEl.textContent = `AUD $${art.price.toLocaleString()}`;

    label.appendChild(titleEl);
    label.appendChild(priceEl);

    const mediumEl = document.createElement('div');
    mediumEl.className = 'artwork-medium';
    mediumEl.textContent = art.medium;

    const addBtn = document.createElement('button');
    addBtn.className = 'add-btn';
    addBtn.id = `btn-${art.id}`;
    if (inCart(art.id)) addBtn.classList.add('added');
    addBtn.textContent = art.sold
      ? 'Sold'
      : inCart(art.id)
      ? 'In your selection'
      : '+ Add to selection';
    addBtn.disabled = art.sold || inCart(art.id);
    addBtn.addEventListener('click', () => addToCart(art.id));

    const adminControls = document.createElement('div');
    adminControls.className = 'admin-controls';
    if (isAdmin) adminControls.classList.add('visible');

    const soldBtn = document.createElement('button');
    soldBtn.className = 'admin-ctrl-btn sold-toggle';
    soldBtn.textContent = art.sold ? 'Mark available' : 'Mark sold';
    soldBtn.addEventListener('click', () => toggleSold(art.id));

    const delBtn = document.createElement('button');
    delBtn.className = 'admin-ctrl-btn del';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', () => confirmDelete(art.id, art.title));

    adminControls.appendChild(soldBtn);
    adminControls.appendChild(delBtn);

    card.appendChild(imgWrap);
    card.appendChild(label);
    card.appendChild(mediumEl);
    card.appendChild(addBtn);
    card.appendChild(adminControls);

    grid.appendChild(card);
  });
}

/* ─── ADMIN ACTIONS (BACKEND-DRIVEN) ────────────────────────────────────── */

async function toggleSold(id) {
  const token = getAdminToken();
  if (!token) {
    alert('Admin session expired — please log in again.');
    return;
  }

  try {
    const res = await fetch(`/api/toggle-sold?id=${id}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      alert('Unauthorized or failed to update.');
      return;
    }

    await fetchArtworksFromBackend();
    renderGallery();
    updateCartUI();
  } catch (e) {
    console.error(e);
    alert('Failed to update artwork status.');
  }
}

function confirmDelete(id, title) {
  pendingDeleteId = Number(id);
  const sub = document.getElementById('confirm-sub');
  if (sub) sub.textContent = `"${title}" will be removed from your gallery permanently.`;
  const overlay = document.getElementById('confirm-overlay');
  if (overlay) overlay.classList.add('open');
}

function closeConfirm() {
  const overlay = document.getElementById('confirm-overlay');
  if (overlay) overlay.classList.remove('open');
}

async function deletePainting() {
  const token = getAdminToken();
  if (!token) {
    alert('Admin session expired — please log in again.');
    return;
  }

  const id = pendingDeleteId;
  if (id === null || id === undefined) return;

  try {
    const res = await fetch(`/api/delete-painting?id=${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      alert('Unauthorized or failed to delete.');
      return;
    }

    pendingDeleteId = null;
    await fetchArtworksFromBackend();
    updateCartUI();
    renderGallery();
    closeConfirm();
  } catch (e) {
    console.error(e);
    alert('Failed to delete painting.');
  }
}

/* ─── ADD PAINTING (BACKEND-DRIVEN) ─────────────────────────────────────── */

function openAddPanel() {
  const panel = document.getElementById('add-panel');
  if (panel) panel.classList.add('open');
  document.body.style.overflow = 'hidden';

  const fields = ['new-title','new-medium','new-price'];
  fields.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  const sold = document.getElementById('new-sold');
  if (sold) sold.checked = false;

  const err = document.getElementById('add-error');
  if (err) err.textContent = '';

  const ph = document.getElementById('img-placeholder');
  const prev = document.getElementById('img-preview-el');
  if (ph) ph.style.display = 'block';
  if (prev) prev.style.display = 'none';

  newImgData = null;
}

function closeAddPanel() {
  const panel = document.getElementById('add-panel');
  if (panel) panel.classList.remove('open');
  document.body.style.overflow = '';
}

function handleImgUpload(e) {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = ev => {
    newImgData = ev.target.result;
    const ph = document.getElementById('img-placeholder');
    const prev = document.getElementById('img-preview-el');
    if (ph) ph.style.display = 'none';
    if (prev) {
      prev.src = newImgData;
      prev.style.display = 'block';
    }
  };
  reader.readAsDataURL(file);
}

async function saveNewPainting() {
  const token = getAdminToken();
  if (!token) {
    alert('Admin session expired — please log in again.');
    return;
  }

  const titleEl = document.getElementById('new-title');
  const mediumEl = document.getElementById('new-medium');
  const priceEl = document.getElementById('new-price');
  const soldEl = document.getElementById('new-sold');
  const errEl = document.getElementById('add-error');

  if (!titleEl || !mediumEl || !priceEl || !soldEl || !errEl) return;

  const title = titleEl.value.trim();
  const medium = mediumEl.value.trim();
  const priceRaw = priceEl.value;
  const sold = soldEl.checked;

  if (containsHTML(title) || containsHTML(medium)) {
    errEl.textContent = 'HTML tags are not allowed.';
    return;
  }

  if (!title) { errEl.textContent = 'Please enter a title.'; return; }
  if (!medium) { errEl.textContent = 'Please enter the medium and dimensions.'; return; }

  const price = parseInt(priceRaw, 10);
  if (!priceRaw || isNaN(price) || price < 0) {
    errEl.textContent = 'Please enter a valid price.';
    return;
  }

  try {
    const res = await fetch('/api/add-painting', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title,
        medium,
        price,
        sold,
        imgData: newImgData || null
      })
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      errEl.textContent = 'Failed to save painting (unauthorized or error).';
      return;
    }

    await fetchArtworksFromBackend();
    renderGallery();
    closeAddPanel();

    setTimeout(() => {
      const card = document.getElementById('card-' + data.id);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 200);
  } catch (e) {
    console.error(e);
    errEl.textContent = 'Unexpected error while saving.';
  }
}

/* ─── CART LOGIC ────────────────────────────────────────────────────────── */

function addToCart(id) {
  const art = artworks.find(a => a.id === id);
  if (!art || art.sold || inCart(id)) return;
  cart.push(art);
  updateCartUI();
  renderGallery();
  openCart();
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  updateCartUI();
  renderGallery();
}

function updateCartUI() {
  const countEl = document.getElementById('cart-count');
  const checkoutBtn = document.getElementById('checkout-btn');
  const totalEl = document.getElementById('cart-total');
  const itemsEl = document.getElementById('cart-items');
  const emptyEl = document.getElementById('cart-empty');

  const count = cart.length;
  if (countEl) countEl.textContent = String(count);
  if (checkoutBtn) checkoutBtn.disabled = count === 0;

  const total = cart.reduce((s, i) => s + i.price, 0);
  if (totalEl) totalEl.textContent = `AUD $${total.toLocaleString()}`;

  if (!itemsEl || !emptyEl) return;

  clearElement(itemsEl);

  if (count === 0) {
    emptyEl.style.display = 'block';
    itemsEl.appendChild(emptyEl);
    return;
  }

  emptyEl.style.display = 'none';

  cart.forEach(art => {
    const item = document.createElement('div');
    item.className = 'cart-item';

    const thumbWrap = document.createElement('div');
    thumbWrap.className = 'cart-item-thumb';

    if (art.imgData) {
      const img = document.createElement('img');
      img.src = art.imgData;
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'cover';
      thumbWrap.appendChild(img);
    }

    const info = document.createElement('div');

    const name = document.createElement('div');
    name.className = 'cart-item-name';
    name.textContent = art.title;

    const meta = document.createElement('div');
    meta.className = 'cart-item-meta';
    meta.textContent = art.medium;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-item';
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => removeFromCart(art.id));

    info.appendChild(name);
    info.appendChild(meta);
    info.appendChild(removeBtn);

    const price = document.createElement('div');
    price.className = 'cart-item-price';
    price.textContent = `$${art.price.toLocaleString()}`;

    item.appendChild(thumbWrap);
    item.appendChild(info);
    item.appendChild(price);

    itemsEl.appendChild(item);
  });
}

function openCart() {
  const overlay = document.getElementById('cart-overlay');
  const panel = document.getElementById('cart-panel');
  if (overlay) overlay.classList.add('open');
  if (panel) panel.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeCart() {
  const overlay = document.getElementById('cart-overlay');
  const panel = document.getElementById('cart-panel');
  if (overlay) overlay.classList.remove('open');
  if (panel) panel.classList.remove('open');
  document.body.style.overflow = '';
}

function toggleCart() {
  const panel = document.getElementById('cart-panel');
  if (!panel) return;
  const open = panel.classList.contains('open');
  if (open) {
    closeCart();
  } else {
    openCart();
  }
}

/* ─── CHECKOUT / SQUARE ─────────────────────────────────────────────────── */

function buildOrderSummary() {
  const container = document.getElementById('order-summary');
  if (!container) return;
  clearElement(container);

  const total = cart.reduce((s, i) => s + i.price, 0);

  const line1 = document.createElement('div');
  line1.className = 'summary-line';
  const l1a = document.createElement('span');
  l1a.textContent = 'Subtotal';
  const l1b = document.createElement('span');
  l1b.textContent = `AUD $${total.toLocaleString()}`;
  line1.appendChild(l1a);
  line1.appendChild(l1b);

  const line2 = document.createElement('div');
  line2.className = 'summary-line total';
  const l2a = document.createElement('span');
  l2a.textContent = 'Total';
  const l2b = document.createElement('span');
  l2b.textContent = `AUD $${total.toLocaleString()}`;
  line2.appendChild(l2a);
  line2.appendChild(l2b);

  container.appendChild(line1);
  container.appendChild(line2);
}

async function initSquare() {
  if (!window.Square) {
    showPaymentError('Square failed to load.');
    return;
  }

  try {
    squarePayments = window.Square.payments(
      window.SQUARE_CONFIG.applicationId,
      window.SQUARE_CONFIG.locationId
    );
    squareCard = await squarePayments.card();
    await squareCard.attach('#card-container');
  } catch (e) {
    console.error('Square init error:', e);
    const cc = document.getElementById('card-container');
    if (cc) {
      const msg = document.createElement('p');
      msg.style.color = 'var(--muted)';
      msg.style.fontSize = '12px';
      msg.style.padding = '12px 0';
      msg.textContent = '⚠️ Payment form could not load. Replace the Square sandbox credentials in SQUARE_CONFIG.';
      clearElement(cc);
      cc.appendChild(msg);
    }
  }
}

async function openCheckout() {
  closeCart();
  document.body.style.overflow = 'hidden';

  buildOrderSummary();

  const modal = document.getElementById('checkout-modal');
  const body = document.getElementById('checkout-body');
  const success = document.getElementById('success-state');

  if (modal) modal.classList.add('open');
  if (body) body.style.display = 'block';
  if (success) success.style.display = 'none';

  if (!squareCard) await initSquare();
}

function closeCheckout() {
  const modal = document.getElementById('checkout-modal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

function showPaymentError(msg) {
  const el = document.getElementById('payment-error');
  if (!el) return;
  el.textContent = msg;
  el.style.display = 'block';
}

function validateForm() {
  const fields = [
    ['first-name','First name'],
    ['last-name','Last name'],
    ['email','Email'],
    ['address','Address'],
    ['city','City'],
    ['postcode','Postcode'],
    ['phone','Phone']
  ];

  for (const [id, label] of fields) {
    const el = document.getElementById(id);
    if (!el) {
      showPaymentError(`Please enter your ${label}.`);
      return false;
    }
    const val = el.value.trim();
    if (!val) {
      showPaymentError(`Please enter your ${label}.`);
      return false;
    }
    if (containsHTML(val)) {
      showPaymentError('HTML tags are not allowed.');
      return false;
    }
  }

  const emailEl = document.getElementById('email');
  if (!emailEl) return false;
  const emailVal = emailEl.value.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
    showPaymentError('Please enter a valid email address.');
    return false;
  }

  const phoneEl = document.getElementById('phone');
  if (!phoneEl) return false;
  const phoneVal = phoneEl.value.trim();
  if (!isValidPhone(phoneVal)) {
    showPaymentError('Please enter a valid phone number.');
    return false;
  }

  const pcEl = document.getElementById('postcode');
  if (!pcEl) return false;
  const pcVal = pcEl.value.trim();
  if (!isValidPostcode(pcVal)) {
    showPaymentError('Postcode must be 4 digits.');
    return false;
  }

  return true;
}

async function handlePayment() {
  const errorEl = document.getElementById('payment-error');
  if (errorEl) errorEl.style.display = 'none';

  if (!validateForm()) return;

  if (!squareCard) {
    showPaymentError('Payment form is not ready. Please try again.');
    return;
  }

  const btn = document.getElementById('pay-btn');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = 'Processing…';

  try {
    const result = await squareCard.tokenize();

    if (result.status !== 'OK') {
      showPaymentError(
        (result.errors && result.errors.map(e => e.message).join(' ')) ||
        'Card error — please check your details.'
      );
      btn.disabled = false;
      btn.textContent = 'Complete Purchase';
      return;
    }

    const total = cart.reduce((sum, item) => sum + item.price, 0);

    const response = await fetch('/api/create-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: result.token,
        amount: total * 100,
        currency: 'AUD'
      })
    });

    const data = await response.json();

    if (!data.success) {
      showPaymentError('Payment failed. Please try again.');
      btn.disabled = false;
      btn.textContent = 'Complete Purchase';
      return;
    }

    showSuccess(data.orderId);
  } catch (err) {
    console.error(err);
    showPaymentError('An unexpected error occurred. Please try again.');
    btn.disabled = false;
    btn.textContent = 'Complete Purchase';
  }
}

function showSuccess(orderId) {
  const body = document.getElementById('checkout-body');
  const success = document.getElementById('success-state');
  const idEl = document.getElementById('success-order-id');

  if (body) body.style.display = 'none';
  if (success) success.style.display = 'block';
  if (idEl) idEl.textContent = `Order ${orderId}`;
}

function resetShop() {
  cart = [];
  updateCartUI();
  renderGallery();
  squareCard = null;
  squarePayments = null;
  const cc = document.getElementById('card-container');
  if (cc) clearElement(cc);
}

/* ─── INIT & EVENT LISTENERS ───────────────────────────────────────────── */

function attachGlobalListeners() {
  const loginCancel = document.getElementById('login-cancel-btn');
  if (loginCancel) loginCancel.addEventListener('click', closeLogin);

  const loginSubmit = document.getElementById('login-submit-btn');
  if (loginSubmit) loginSubmit.addEventListener('click', attemptLogin);

  const pwInput = document.getElementById('admin-pw');
  if (pwInput) {
    pwInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        attemptLogin();
      }
    });
  }

  const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
  if (confirmDeleteBtn) confirmDeleteBtn.addEventListener('click', deletePainting);

  const confirmCancelBtn = document.getElementById('confirm-cancel-btn');
  if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', closeConfirm);

  const addSaveBtn = document.getElementById('add-save-btn');
  if (addSaveBtn) addSaveBtn.addEventListener('click', saveNewPainting);

  const addCancelBtn = document.getElementById('add-cancel-btn');
  if (addCancelBtn) addCancelBtn.addEventListener('click', closeAddPanel);

  const imgInput = document.getElementById('img-upload-input');
  if (imgInput) imgInput.addEventListener('change', handleImgUpload);

  const imgArea = document.getElementById('img-upload-area');
  if (imgArea && imgInput) {
    imgArea.addEventListener('click', () => imgInput.click());
  }

  const cartToggle = document.getElementById('cart-toggle-btn');
  if (cartToggle) cartToggle.addEventListener('click', toggleCart);

  const cartClose = document.getElementById('cart-close-btn');
  if (cartClose) cartClose.addEventListener('click', closeCart);

  const cartOverlay = document.getElementById('cart-overlay');
  if (cartOverlay) cartOverlay.addEventListener('click', closeCart);

  const checkoutBtn = document.getElementById('checkout-btn');
  if (checkoutBtn) checkoutBtn.addEventListener('click', openCheckout);

  const checkoutClose = document.getElementById('checkout-close-btn');
  if (checkoutClose) checkoutClose.addEventListener('click', closeCheckout);

  const successClose = document.getElementById('success-close-btn');
  if (successClose) successClose.addEventListener('click', () => {
    closeCheckout();
    resetShop();
  });

  const payBtn = document.getElementById('pay-btn');
  if (payBtn) payBtn.addEventListener('click', handlePayment);

  const adminNav = document.getElementById('admin-nav-link');
  if (adminNav) {
    adminNav.addEventListener('click', (e) => {
      e.preventDefault();
      openLogin();
    });
  }

  const adminLogoutBtn = document.getElementById('admin-logout-btn');
  if (adminLogoutBtn) adminLogoutBtn.addEventListener('click', adminLogout);

  const adminAddBtn = document.getElementById('admin-add-btn');
  if (adminAddBtn) adminAddBtn.addEventListener('click', openAddPanel);
}

async function initSite() {
  attachGlobalListeners();
  await fetchArtworksFromBackend();

  if (isLoggedInAdmin()) {
    activateAdminMode();
  }

  renderGallery();
  updateCartUI();
}

document.addEventListener('DOMContentLoaded', initSite);
