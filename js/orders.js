// ============================================================
// ORDERS MODULE — Order placement & management
// ============================================================

async function placeOrder(deliveryAddress, deliveryInfo, paymentMethod = 'upi') {
  const user = await getCurrentUser();
  if (!user) throw new Error('Please login to place an order');
  const cart = await getCart();
  if (cart.length === 0) throw new Error('Your cart is empty');
  const totals = calculateCartTotal(cart);
  const orderId = `COCO-${Date.now()}`;
  const profile = await getUserProfile();

  const { error: orderError } = await db.from('orders').insert({
    id: orderId, user_id: user.id, status: 'placed',
    subtotal: totals.subtotal, shipping: totals.shipping, total: totals.total,
    delivery_address: deliveryAddress, delivery_info: deliveryInfo,
    payment_method: paymentMethod, 
    customer_email: user.email,
    customer_phone: profile?.phone || '',
    customer_name: profile?.full_name || ''
  });
  if (orderError) throw orderError;

  const orderItems = cart.map(item => ({
    order_id: orderId, product_id: item.product_id,
    product_name: item.products.name, product_image: item.products.image_url,
    price: item.products.price, quantity: item.quantity
  }));
  const { error: itemsError } = await db.from('order_items').insert(orderItems);
  if (itemsError) throw itemsError;

  for (const item of cart) {
    const newStock = Math.max(0, (item.products.stock || 0) - item.quantity);
    await db.from('products').update({ stock: newStock, is_available: newStock > 0 }).eq('id', item.product_id);
  }
  await clearCart();

  return { id: orderId, total: totals.total, subtotal: totals.subtotal, shipping: totals.shipping,
    items: orderItems, deliveryAddress, deliveryInfo, status: 'placed', orderTime: new Date().toISOString() };
}

async function getMyOrders() {
  const user = await getCurrentUser();
  if (!user) return [];
  const { data, error } = await db.from('orders').select('*, order_items (*)').eq('user_id', user.id).order('created_at', { ascending: false });
  if (error) { console.error('Error fetching orders:', error); return []; }
  return data || [];
}

async function getOrderById(orderId) {
  const { data, error } = await db.from('orders').select('*, order_items (*)').eq('id', orderId).single();
  if (error) return null;
  return data;
}

async function getLatestOrder() {
  const user = await getCurrentUser();
  if (!user) return null;
  const { data, error } = await db.from('orders').select('*, order_items (*)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();
  if (error) return null;
  return data;
}

async function getAllOrders() {
  const { data, error } = await db.from('orders').select('*, order_items (*)').order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

async function updateOrderStatus(orderId, newStatus) {
  const { data, error } = await db.from('orders').update({ status: newStatus }).eq('id', orderId).select().single();
  if (error) throw error;
  return data;
}

async function cancelOrderWithRefund(orderId, refundData) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Please login to cancel an order.');

  // Fetch the order scoped to this user — avoids RLS blocking getOrderById
  const { data: order, error: fetchErr } = await db
    .from('orders')
    .select('*, order_items (*)')
    .eq('id', orderId)
    .eq('user_id', user.id)
    .single();

  if (fetchErr || !order) throw new Error('Order not found or access denied.');

  if (['delivered', 'shipped', 'cancelled', 'cancel_requested', 'refund_processing', 'cancel_denied', 'cancel_pending'].includes(order.status)) {
    throw new Error('Order has already been shipped or processed. Cancellation is no longer available even if requested within 7 hours.');
  }

  const hoursSince = (new Date() - new Date(order.created_at)) / (1000 * 60 * 60);
  if (hoursSince > 7) throw new Error('Cancellation is only available within 7 hours of placing the order (and only if not yet shipped).');

  const updatedDeliveryInfo = {
    ...(order.delivery_info || {}),
    cancel_status: 'cancel_requested',
    refund: { ...refundData, status: 'requested', requested_at: new Date().toISOString() }
  };

  // Update delivery_info only to avoid status check constraint violation
  const { error: updateErr } = await db.from('orders').update({
    delivery_info: updatedDeliveryInfo
  }).eq('id', orderId).eq('user_id', user.id);

  if (updateErr) throw new Error('Could not submit cancellation. Please contact support.');
}

const ORDER_STATUS_CONFIG = {
  placed: { label: 'Processing', color: 'bg-blue-500', icon: '🛒' },
  confirmed: { label: 'Shipped', color: 'bg-indigo-500', icon: '✅' },
  shipped: { label: 'Out for Delivery', color: 'bg-purple-500', icon: '🚚' },
  delivered: { label: 'Delivered', color: 'bg-green-500', icon: '📦' },
  cancelled: { label: 'Cancelled', color: 'bg-red-500', icon: '✕' },
  cancel_requested: { label: 'Cancellation Requested', color: 'bg-orange-500', icon: '⚠️' },
  cancel_pending: { label: 'Cancellation Pending', color: 'bg-yellow-600', icon: '⏳' },
  refund_processing: { label: 'Cancellation Accepted', color: 'bg-green-500', icon: '✅' },
  refund_processed: { label: 'Refund Processed', color: 'bg-emerald-500', icon: '💸' },
  cancel_denied: { label: 'Confirmed - Sorry no cancel', color: 'bg-gray-500', icon: '🚫' }
};

function getStatusConfig(status) {
  return ORDER_STATUS_CONFIG[status] || { label: status, color: 'bg-gray-500', icon: '❓' };
}
