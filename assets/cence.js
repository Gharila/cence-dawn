// cence.js — custom interactions
// Runs alongside Dawn's global.js, product-form.js, cart.js.
// Handles: search overlay, basket dropdown, accordion, image carousel,
//          size selector, add-to-cart AJAX, collection sort/filter.

// ── UTILITY ───────────────────────────────────────────────────────────────────
function formatMoney(cents) {
  return '£' + (cents / 100).toFixed(2);
}

// ── SEARCH OVERLAY ────────────────────────────────────────────────────────────
function openSearch() {
  document.getElementById('search-overlay')?.classList.add('open');
  setTimeout(() => document.getElementById('search-input')?.focus(), 300);
}
function closeSearch() {
  document.getElementById('search-overlay')?.classList.remove('open');
}
document.getElementById('search-close')?.addEventListener('click', closeSearch);
document.getElementById('search-btn')?.addEventListener('click', openSearch);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSearch(); });

// ── BASKET DROPDOWN ───────────────────────────────────────────────────────────
document.getElementById('basket-btn')?.addEventListener('click', e => {
  e.stopPropagation();
  document.getElementById('basket-dropdown')?.classList.toggle('open');
});

// Remove item from basket via AJAX
document.addEventListener('click', async e => {
  const btn = e.target.closest('.basket-item-remove');
  if (!btn) return;
  const key = btn.dataset.itemKey;
  if (!key) return;
  try {
    const res = await fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: 0 })
    });
    if (res.ok) updateBasketDropdown(await res.json());
  } catch (err) { console.error(err); }
});

function updateBasketDropdown(cart) {
  document.querySelectorAll('.basket-count').forEach(el => el.textContent = cart.item_count);
  const itemsEl = document.getElementById('basket-items');
  if (!itemsEl) return;
  if (cart.item_count === 0) {
    itemsEl.innerHTML = '<p class="basket-empty">your bag is empty</p>';
  } else {
    itemsEl.innerHTML = cart.items.map(item => `
      <div class="basket-item">
        <div class="basket-item-info">
          <div class="basket-item-name">${item.product_title.toLowerCase()}</div>
          <div class="basket-item-meta">size ${(item.variant_options?.[0] || '').toLowerCase()}</div>
        </div>
        <span class="basket-item-price">${formatMoney(item.final_price)}</span>
        <button class="basket-item-remove" data-item-key="${item.key}" aria-label="Remove">&times;</button>
      </div>
    `).join('');
  }
  const footer = document.getElementById('basket-footer');
  if (footer) {
    footer.style.display = cart.item_count > 0 ? 'block' : 'none';
    const totalEl = document.getElementById('basket-dropdown-total');
    if (totalEl) totalEl.textContent = formatMoney(cart.total_price);
  }
}

// Listen for Dawn's cart:refresh event to keep dropdown in sync
document.addEventListener('cart:refresh', async () => {
  try {
    const res = await fetch('/cart.js');
    if (res.ok) updateBasketDropdown(await res.json());
  } catch(err) { console.error(err); }
});

// ── CLOSE DROPDOWNS ON OUTSIDE CLICK ─────────────────────────────────────────
document.addEventListener('click', e => {
  if (!e.target.closest('.dropdown-wrap')) {
    document.querySelectorAll('.dropdown-panel').forEach(d => d.classList.remove('open'));
  }
  if (!e.target.closest('.basket-wrap')) {
    document.getElementById('basket-dropdown')?.classList.remove('open');
  }
});

// ── SCROLL BORDER ─────────────────────────────────────────────────────────────
window.addEventListener('scroll', () => {
  document.getElementById('top-bar')?.classList.toggle('scrolled', window.scrollY > 10);
}, { passive: true });

// ── COLLECTION SORT / FILTER ──────────────────────────────────────────────────
const allProducts = window.collectionProducts || [];
let currentItems = [...allProducts];
let currentSortMode = 'featured';

function toggleDrop(id) {
  const el = document.getElementById(id);
  const was = el?.classList.contains('open');
  document.querySelectorAll('.dropdown-panel').forEach(d => d.classList.remove('open'));
  if (!was && el) el.classList.add('open');
}

function sortGrid(mode, btn) {
  document.querySelectorAll('#sort-drop .dropdown-option').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');
  currentSortMode = mode;
  renderGrid(getSortedItems());
  document.getElementById('sort-drop')?.classList.remove('open');
}

function filterGrid(mode, btn) {
  document.querySelectorAll('#filter-drop .dropdown-option').forEach(b => b.classList.remove('active'));
  btn?.classList.add('active');
  if (mode === 'under-60') currentItems = allProducts.filter(p => p.price < 6000);
  else if (mode === 'over-60') currentItems = allProducts.filter(p => p.price >= 6000);
  else currentItems = [...allProducts];
  renderGrid(getSortedItems());
  document.getElementById('filter-drop')?.classList.remove('open');
}

function getSortedItems() {
  const arr = [...currentItems];
  if (currentSortMode === 'price-asc') arr.sort((a, b) => a.price - b.price);
  else if (currentSortMode === 'price-desc') arr.sort((a, b) => b.price - a.price);
  else if (currentSortMode === 'name') arr.sort((a, b) => a.title.localeCompare(b.title));
  return arr;
}

function renderGrid(items) {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  grid.innerHTML = items.map((p, i) => `
    <a class="product-card" href="${p.url}" style="animation-delay:${i * 0.06}s">
      <div class="product-img">
        ${p.featured_image
          ? `<img src="${p.featured_image}" alt="${p.title}" loading="lazy">`
          : '<span class="ph-label">add image</span>'}
      </div>
      <p class="p-name">${p.title}</p>
      <p class="p-price">${formatMoney(p.price)}</p>
    </a>
  `).join('');
}

// ── SIZE SELECTOR (cence variant buttons) ────────────────────────────────────
// Works alongside Dawn's product-variant-picker for the selected variant ID
document.querySelectorAll('.sz').forEach(btn => {
  btn.addEventListener('click', () => {
    if (btn.disabled) return;
    document.querySelectorAll('.sz').forEach(b => {
      b.classList.remove('sel');
      b.setAttribute('aria-checked', 'false');
    });
    btn.classList.add('sel');
    btn.setAttribute('aria-checked', 'true');
    const variantId = btn.dataset.variantId;
    if (variantId) {
      const input = document.getElementById('selected-variant-id');
      if (input) input.value = variantId;
      // Also update Dawn's product form if present
      const productForm = document.querySelector('product-form');
      if (productForm) {
        const idInput = productForm.querySelector('[name="id"]');
        if (idInput) idInput.value = variantId;
      }
    }
  });
});

// ── IMAGE CAROUSEL ────────────────────────────────────────────────────────────
const imgElements = Array.from(document.querySelectorAll('.img-box img'));
const dotElements = Array.from(document.querySelectorAll('.dot'));
let dotIdx = 0;

function setDot(i) {
  dotIdx = i;
  imgElements.forEach((img, j) => img.classList.toggle('active', j === i));
  dotElements.forEach((d, j) => d.classList.toggle('active', j === i));
}

document.querySelector('.arr-left')?.addEventListener('click', () => {
  if (!imgElements.length) return;
  setDot((dotIdx - 1 + imgElements.length) % imgElements.length);
});
document.querySelector('.arr-right')?.addEventListener('click', () => {
  if (!imgElements.length) return;
  setDot((dotIdx + 1) % imgElements.length);
});
dotElements.forEach((d, i) => d.addEventListener('click', () => setDot(i)));

// ── ACCORDION ─────────────────────────────────────────────────────────────────
document.querySelectorAll('.acc-toggle').forEach(btn => {
  btn.addEventListener('click', () => {
    const item = btn.parentElement;
    const body = item.querySelector('.acc-body');
    const isOpen = body.classList.contains('open');
    document.querySelectorAll('.acc-body').forEach(b => b.classList.remove('open'));
    document.querySelectorAll('.acc-item').forEach(it => it.classList.remove('open'));
    if (!isOpen) { body.classList.add('open'); item.classList.add('open'); }
  });
});

// ── ADD TO CART (cence product page) ─────────────────────────────────────────
document.getElementById('add-to-cart-btn')?.addEventListener('click', async () => {
  const variantInput = document.getElementById('selected-variant-id');
  const variantId = variantInput?.value;
  if (!variantId) return;
  const btn = document.getElementById('add-to-cart-btn');
  const originalText = btn.textContent;
  btn.textContent = 'adding...';
  btn.disabled = true;
  try {
    const addRes = await fetch('/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: parseInt(variantId, 10), quantity: 1 })
    });
    if (addRes.ok) {
      const cartRes = await fetch('/cart.js');
      const cart = await cartRes.json();
      updateBasketDropdown(cart);
      document.getElementById('basket-dropdown')?.classList.add('open');
    }
  } catch (err) { console.error(err); }
  finally { btn.textContent = originalText; btn.disabled = false; }
});

// ── DISCOUNT TOGGLE ───────────────────────────────────────────────────────────
document.querySelector('.co-discount-toggle')?.addEventListener('click', () => {
  document.getElementById('co-discount-field')?.classList.toggle('open');
});
