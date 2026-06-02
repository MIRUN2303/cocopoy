// ============================================================
// CART MODULE — Supabase-backed cart management
// ============================================================

// Get cart items for current user (with product details)
async function getCart() {
  const user = await getCurrentUser();
  if (!user) return [];

  const { data, error } = await db
    .from('cart_items')
    .select(`
      id,
      quantity,
      product_id,
      products (
        id,
        name,
        price,
        image_url,
        stock,
        is_available
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching cart:', error);
    return [];
  }
  return data || [];
}

// Add item to cart (or increase quantity if already exists)
async function addToCart(productId, quantity = 1) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Please login to add items to cart');

  // Check if item already in cart using limit(1) to avoid single() errors if duplicates somehow exist
  const { data: existingItems, error: fetchError } = await db
    .from('cart_items')
    .select('id, quantity')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .limit(1);

  if (fetchError) {
    console.error('Error checking existing cart items:', fetchError);
    throw fetchError;
  }

  const existing = existingItems && existingItems.length > 0 ? existingItems[0] : null;

  if (existing) {
    // Update quantity
    const { error } = await db
      .from('cart_items')
      .update({ quantity: existing.quantity + quantity })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    // Insert new item
    const { error } = await db
      .from('cart_items')
      .insert({
        user_id: user.id,
        product_id: productId,
        quantity: quantity
      });
    if (error) throw error;
  }
}

// Update cart item quantity
async function updateCartQuantity(cartItemId, newQuantity) {
  if (newQuantity < 1) {
    return removeFromCart(cartItemId);
  }

  const { error } = await db
    .from('cart_items')
    .update({ quantity: newQuantity })
    .eq('id', cartItemId);

  if (error) throw error;
}

// Remove item from cart
async function removeFromCart(cartItemId) {
  const { error } = await db
    .from('cart_items')
    .delete()
    .eq('id', cartItemId);

  if (error) throw error;
}

// Clear entire cart for current user
async function clearCart() {
  const user = await getCurrentUser();
  if (!user) return;

  const { error } = await db
    .from('cart_items')
    .delete()
    .eq('user_id', user.id);

  if (error) throw error;
}

// Get cart total
function calculateCartTotal(cartItems) {
  let subtotal = 0;
  let totalItems = 0;

  cartItems.forEach(item => {
    if (item.products) {
      subtotal += item.products.price * item.quantity;
      totalItems += item.quantity;
    }
  });

  return {
    subtotal,
    shipping: SHIPPING_COST,
    total: subtotal + SHIPPING_COST,
    totalItems
  };
}

// Update cart display on index page (cart section)
async function updateCartDisplay() {
  const cartItemsContainer = document.getElementById('cartItemsContainer');
  const emptyCartMessage = document.getElementById('emptyCartMessage');
  const cartSummary = document.getElementById('cartSummary');

  if (!cartItemsContainer) return;

  const user = await getCurrentUser();
  if (!user) {
    if (cartItemsContainer) cartItemsContainer.classList.add('hidden');
    if (cartSummary) cartSummary.classList.add('hidden');
    if (emptyCartMessage) {
      emptyCartMessage.classList.remove('hidden');
      emptyCartMessage.innerHTML = '<p class="text-lg text-primary/60 dark:text-accent/60">Please <a href="cocologin.html" class="text-secondary font-bold underline">login</a> to view your cart.</p>';
    }
    return;
  }

  const cart = await getCart();

  if (cart.length === 0) {
    cartItemsContainer.classList.add('hidden');
    if (cartSummary) cartSummary.classList.add('hidden');
    if (emptyCartMessage) {
      emptyCartMessage.classList.remove('hidden');
      emptyCartMessage.innerHTML = '<p class="text-lg text-primary/60 dark:text-accent/60">Your cart is empty. Add some delicious products!</p>';
    }
    return;
  }

  if (emptyCartMessage) emptyCartMessage.classList.add('hidden');
  cartItemsContainer.classList.remove('hidden');
  if (cartSummary) cartSummary.classList.remove('hidden');
  cartItemsContainer.innerHTML = '';

  const totals = calculateCartTotal(cart);

  cart.forEach(item => {
    if (!item.products) return;
    const product = item.products;
    const itemTotal = product.price * item.quantity;

    const cartCard = document.createElement('div');
    cartCard.className = 'cart-display-card bg-surface-light dark:bg-surface-dark rounded-xl p-4 shadow-soft border border-primary/5 flex flex-col gap-4 mb-4';
    cartCard.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-secondary/20 shadow-sm">
          <img src="${product.image_url}" alt="${product.name}" class="w-full h-full object-cover"/>
        </div>
        <div class="flex-grow">
          <h3 class="text-base font-bold text-primary dark:text-accent leading-tight">${product.name}</h3>
          <p class="text-secondary font-black text-sm mt-1">₹${product.price} × ${item.quantity} = ₹${itemTotal}</p>
        </div>
      </div>
      <div class="flex items-center justify-between pt-3 border-t border-primary/10">
        <div class="flex items-center bg-primary/5 dark:bg-primary/20 rounded-full p-1" style="min-width: 100px; justify-content: space-between;">
          <button type="button" class="cart-qty-step cart-qty-decrease w-8 h-8 flex items-center justify-center font-bold text-lg hover:bg-secondary/20 rounded-full" data-cart-id="${item.id}" data-qty="${item.quantity}">-</button>
          <span class="cart-qty-value px-3 font-bold text-sm">${item.quantity}</span>
          <button type="button" class="cart-qty-step cart-qty-increase w-8 h-8 flex items-center justify-center font-bold text-lg hover:bg-secondary/20 rounded-full" data-cart-id="${item.id}" data-qty="${item.quantity}">+</button>
        </div>
        <button class="remove-from-cart-btn px-4 py-2 bg-red-500/10 text-red-500 text-[11px] font-bold uppercase rounded-full hover:bg-red-500 hover:text-white transition-all border border-red-500/20" data-cart-id="${item.id}">Remove</button>
      </div>
    `;
    cartItemsContainer.appendChild(cartCard);
  });

  // Update summary
  const subtotalEl = document.getElementById('subtotal');
  const totalItemsEl = document.getElementById('totalItems');
  if (subtotalEl) subtotalEl.textContent = totals.subtotal;
  if (totalItemsEl) totalItemsEl.textContent = totals.totalItems;
}

// Event delegation for cart buttons on index page
function setupCartEventListeners() {
  document.addEventListener('click', async (e) => {
    const target = e.target;

    if (target.classList.contains('cart-qty-decrease')) {
      const cartId = target.dataset.cartId;
      const currentQty = parseInt(target.dataset.qty);
      try {
        await updateCartQuantity(cartId, currentQty - 1);
        await updateCartDisplay();
      } catch (err) { console.error(err); }
    }

    if (target.classList.contains('cart-qty-increase')) {
      const cartId = target.dataset.cartId;
      const currentQty = parseInt(target.dataset.qty);
      try {
        await updateCartQuantity(cartId, currentQty + 1);
        await updateCartDisplay();
      } catch (err) { console.error(err); }
    }

    if (target.classList.contains('remove-from-cart-btn')) {
      const cartId = target.dataset.cartId;
      try {
        await removeFromCart(cartId);
        await updateCartDisplay();
        showToast('Item removed from cart', 'info');
      } catch (err) { console.error(err); }
    }
  });
}
