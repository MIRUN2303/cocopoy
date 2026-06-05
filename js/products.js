// ============================================================
// PRODUCTS MODULE — Load products from db
// ============================================================

// Fetch all available products
async function fetchProducts() {
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('is_available', true)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching products:', error);
    return [];
  }
  return data;
}

// Fetch single product
async function fetchProductById(id) {
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching product:', error);
    return null;
  }
  return data;
}

// Search products by name
async function searchProducts(query) {
  const { data, error } = await db
    .from('products')
    .select('*')
    .eq('is_available', true)
    .ilike('name', `%${query}%`)
    .order('name');

  if (error) {
    console.error('Error searching products:', error);
    return [];
  }
  return data;
}

// Fetch all products (including unavailable) — for admin
async function fetchAllProducts() {
  const { data, error } = await db
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all products:', error);
    return [];
  }
  return data;
}

// Render product cards into the products grid
function renderProductCards(products, containerId = 'productsGrid') {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  grid.innerHTML = '';

  if (products.length === 0) {
    grid.innerHTML = `
      <div class="rounded-lg border border-secondary/30 bg-surface-light p-6 text-center font-semibold text-primary dark:bg-surface-dark dark:text-accent sm:col-span-2 lg:col-span-3">
        No products found.
      </div>`;
    return;
  }

  products.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card bg-surface-light dark:bg-surface-dark rounded-2xl shadow-soft overflow-hidden group transition-all duration-500 hover:shadow-xl border border-primary/5 hover:border-secondary/20 flex flex-row md:flex-col cursor-pointer';
    card.dataset.productId = product.id;
    card.dataset.productName = product.name.toLowerCase();

    const stockBadge = product.stock <= 0
      ? '<span class="bg-red-500 text-white text-[9px] md:text-[10px] font-black px-2 py-1 rounded-full uppercase">Sold Out</span>'
      : product.stock <= 10
        ? `<span class="bg-orange-500 text-white text-[9px] md:text-[10px] font-black px-2 py-1 rounded-full uppercase">${product.stock} left</span>`
        : '';

    card.innerHTML = `
      <div class="relative w-32 md:w-full aspect-square overflow-hidden bg-white shrink-0 product-visual">
        <img src="${product.image_url}" alt="${product.name}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>
        
        <!-- Desktop Description Overlay (Refined for visibility) -->
        <div class="hidden md:flex absolute inset-0 bg-primary/40 backdrop-blur-sm p-6 flex-col justify-center items-center text-center opacity-0 group-hover:opacity-100 transition-all duration-500">
           <span class="text-white text-[10px] font-black uppercase tracking-[0.2em] mb-2 drop-shadow-md">Product Story</span>
           <p class="text-white text-xs font-bold leading-relaxed italic line-clamp-6 px-2 drop-shadow-md">
             "${product.description || 'Pure, natural, and crafted with love in Pollachi.'}"
           </p>
        </div>

        <div class="absolute top-2 right-2 md:top-4 md:right-4 flex flex-col gap-2 z-10">
          ${stockBadge}
        </div>
      </div>
      <div class="p-3 md:p-5 flex flex-col flex-grow gap-2 md:gap-4 min-w-0">
        <div class="flex flex-col gap-0.5 md:gap-1">
          ${product.offer_note ? `<div class="mb-1"><span class="offer-tag-new">${product.offer_note}</span></div>` : ''}
          <h3 class="text-sm md:text-lg font-bold text-primary dark:text-accent leading-tight group-hover:text-secondary transition-colors truncate md:line-clamp-1">${product.name}</h3>
          <span class="text-secondary font-black text-lg md:text-2xl">₹${product.price}</span>
        </div>
        
        <div class="mt-auto space-y-3 md:space-y-4">
          <div class="flex items-center justify-center bg-primary/5 dark:bg-primary/20 rounded-xl p-1 md:p-1.5 border border-primary/10">
            <div class="flex items-center gap-3 md:gap-4">
              <button type="button" class="w-7 h-7 md:w-9 md:h-9 flex items-center justify-center bg-white dark:bg-surface-dark rounded-lg text-primary dark:text-accent font-black text-lg shadow-sm hover:bg-secondary hover:text-white transition-all active:scale-90 product-qty-minus">-</button>
              <input type="number" value="0" min="0" max="${product.stock || 99}" class="w-7 md:w-8 bg-transparent border-0 p-0 text-center text-sm md:text-base font-black text-primary dark:text-accent focus:ring-0 product-qty-input" />
              <button type="button" class="w-7 h-7 md:w-9 md:h-9 flex items-center justify-center bg-white dark:bg-surface-dark rounded-lg text-primary dark:text-accent font-black text-lg shadow-sm hover:bg-secondary hover:text-white transition-all active:scale-90 product-qty-plus">+</button>
            </div>
          </div>
          
          <button class="add-to-cart-btn w-full bg-gradient-to-r from-secondary to-orange-400 text-white py-2 md:py-4 rounded-xl font-black text-[10px] md:text-sm uppercase tracking-wider flex items-center justify-center gap-2 md:gap-3 shadow-lg shadow-secondary/30 hover:shadow-orange-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:grayscale"
            data-product-id="${product.id}"
            data-name="${product.name}"
            data-price="${product.price}"
            data-image="${product.image_url}"
            ${product.stock <= 0 ? 'disabled' : ''}>
            <svg class="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"></path>
            </svg>
            ${product.stock <= 0 ? 'Sold Out' : 'Add to Cart'}
          </button>
        </div>
      </div>
    `;

    // Click logic for descriptions
    card.onclick = (e) => {
      // Prevent modal if clicking buttons or inputs
      if (e.target.closest('.add-to-cart-btn') || e.target.closest('.qty-step') || e.target.closest('button')) return;
      
      if (window.innerWidth < 768) {
        if (typeof openProductModal === 'function') openProductModal(product);
      }
    };

    grid.appendChild(card);
  });

  // Re-setup custom quantity steppers for these new cards
  setupMiniSteppers();
  // Re-attach add-to-cart listeners
  setupAddToCartButtons();
}

function setupMiniSteppers() {
  document.querySelectorAll('.product-card').forEach(card => {
    const minus = card.querySelector('.product-qty-minus');
    const plus = card.querySelector('.product-qty-plus');
    const input = card.querySelector('.product-qty-input');
    
    if (minus && plus && input) {
      minus.onclick = (e) => {
        e.stopPropagation();
        let val = parseInt(input.value) || 0;
        if (val > 0) input.value = val - 1;
      };
      plus.onclick = (e) => {
        e.stopPropagation();
        let val = parseInt(input.value) || 0;
        const max = parseInt(input.getAttribute('max')) || 99;
        if (val < max) input.value = val + 1;
      };
    }
  });
}


// Setup add-to-cart button event listeners
function setupAddToCartButtons() {
  document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    // Remove existing listeners by cloning
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (newBtn.disabled) return;

      const card = newBtn.closest('.product-card');
      const productId = newBtn.dataset.productId;
      const quantityInput = card.querySelector('.product-qty-input');
      const quantity = parseInt(quantityInput?.value) || 0;

      if (!quantity || quantity < 1) {
        showToast('Please enter a valid quantity', 'warning');
        return;
      }

      // Check if user is logged in
      const user = await getCurrentUser();
      if (!user) {
        showToast('Please login to add items to cart', 'warning');
        window.location.href = 'cocologin.html';
        return;
      }

      try {
        await addToCart(productId, quantity);
        if (quantityInput) quantityInput.value = 0;
        showToast('Added to cart! 🛒', 'success');
        if (typeof updateCartDisplay === 'function') {
          updateCartDisplay();
        }
      } catch (err) {
        console.error('Add to cart error:', err);
        showToast('Failed to add to cart. Please try again.', 'error');
      }
    });
  });
}

// Client-side search filter (for instant filtering without DB calls)
function setupProductSearch() {
  const searchInput = document.getElementById('productSearch');
  const clearSearch = document.getElementById('clearSearch');
  const resultText = document.getElementById('searchResultText');
  const productCards = () => Array.from(document.querySelectorAll('.product-card'));

  if (!searchInput || !clearSearch || !resultText) return;

  function filterProducts() {
    const query = searchInput.value.trim().toLowerCase();
    const cards = productCards();
    let visibleCount = 0;

    cards.forEach(card => {
      const productName = (card.dataset.productName || '').toLowerCase();
      const isVisible = !query || productName.includes(query);
      card.classList.toggle('hidden', !isVisible);
      if (isVisible) visibleCount++;
    });

    clearSearch.classList.toggle('hidden', !query);
    resultText.textContent = query ? `${visibleCount} product${visibleCount === 1 ? '' : 's'} found` : '';
  }

  searchInput.addEventListener('input', filterProducts);
  searchInput.addEventListener('keydown', event => {
    if (event.key === 'Enter') {
      event.preventDefault();
      document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
  clearSearch.addEventListener('click', () => {
    searchInput.value = '';
    filterProducts();
    searchInput.focus();
  });
}
