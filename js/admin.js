// ============================================================
// ADMIN MODULE — Product & Order management for founder
// ============================================================

// Add a new product
async function adminAddProduct(productData) {
  const { data, error } = await db.from('products').insert({
    name: productData.name,
    description: productData.description || '',
    price: parseFloat(productData.price),
    image_url: productData.image_url || '',
    category: productData.category || 'snacks',
    stock: parseInt(productData.stock) || 100,
    is_available: true
  }).select().single();
  if (error) throw error;
  return data;
}

// Update an existing product
async function adminUpdateProduct(productId, updates) {
  const { data, error } = await db.from('products').update(updates).eq('id', productId).select().single();
  if (error) throw error;
  return data;
}

// Delete a product
async function adminDeleteProduct(productId) {
  const { error } = await db.from('products').delete().eq('id', productId);
  if (error) throw error;
}

// Toggle product availability
async function adminToggleProduct(productId, isAvailable) {
  return adminUpdateProduct(productId, { is_available: isAvailable });
}

// Upload product image to Supabase Storage
async function adminUploadProductImage(file) {
  const fileExt = file.name.split('.').pop();
  const fileName = `product_${Date.now()}.${fileExt}`;
  const { data, error } = await db.storage.from('product-images').upload(fileName, file);
  if (error) throw error;
  const { data: urlData } = db.storage.from('product-images').getPublicUrl(fileName);
  return urlData.publicUrl;
}

// Get contact messages
async function adminGetMessages() {
  const { data, error } = await db.from('contact_messages').select('*').order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

// Mark message as read
async function adminMarkMessageRead(messageId) {
  await db.from('contact_messages').update({ is_read: true }).eq('id', messageId);
}

// Get dashboard stats
async function adminGetStats() {
  const [products, orders, messages] = await Promise.all([
    db.from('products').select('id', { count: 'exact' }),
    db.from('orders').select('id, total, status', { count: 'exact' }),
    db.from('contact_messages').select('id', { count: 'exact' }).eq('is_read', false)
  ]);

  const allOrders = orders.data || [];
  
  // Revenue ONLY counts confirmed, shipped, delivered, or cancel_denied orders
  const revenueStatuses = ['placed', 'confirmed', 'shipped', 'delivered', 'cancel_denied'];
  const validOrders = allOrders.filter(o => revenueStatuses.includes(o.status));
  const totalRevenue = validOrders.reduce((sum, o) => {
    const val = parseFloat(o.total);
    return sum + (isNaN(val) ? 0 : val);
  }, 0);
  
  const pendingOrders = allOrders.filter(o => !['delivered','cancelled','cancel_denied'].includes(o.status)).length;

  return {
    totalProducts: products.count || 0,
    totalOrders: orders.count || 0,
    totalRevenue,
    pendingOrders,
    unreadMessages: messages.count || 0
  };
}

async function adminCompleteRefund(orderId, screenshotData) {
  const { data: order } = await db.from('orders').select('delivery_info').eq('id', orderId).single();
  const info = order.delivery_info || {};
  info.refund_proof = screenshotData;
  
  const { error } = await db.from('orders').update({ 
    status: 'cancelled', 
    delivery_info: info 
  }).eq('id', orderId);
  
  if (error) throw error;
}
