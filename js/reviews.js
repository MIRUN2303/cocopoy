// ============================================================
// REVIEWS MODULE — Manage customer feedback
// ============================================================

// Fetch 3 most recent reviews (Pinned first, then newest)
async function fetchRecentReviews() {
  return await fetchAllReviews(3, 0, 'created_at', false);
}

// Fetch reviews (with pagination and sorting)
async function fetchAllReviews(limit = 1000, offset = 0, sortBy = 'created_at', ascending = false) {
  const { data, error } = await db
    .from('reviews')
    .select('*')
    .order('is_pinned', { ascending: false }) // Pinned always first
    .order(sortBy, { ascending: ascending })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
  return data;
}


// Add a new review (Automatically fetches name and avatar from profile)
async function addReview(rating, comment) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error('You must be logged in to review');

  // Fetch info from user metadata (Profile)
  const fullName = user.user_metadata?.full_name || user.email.split('@')[0];
  const avatarUrl = user.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${fullName}&background=F47C20&color=fff`;

  const { data, error } = await db
    .from('reviews')
    .insert([{
      user_id: user.id,
      user_name: fullName,
      user_email: user.email, // Capture email for admin
      user_avatar: avatarUrl,
      rating: parseInt(rating),
      comment: comment
    }]);

  if (error) throw error;
  return data;
}

// Admin: Delete review
async function adminDeleteReview(reviewId) {
  const { error } = await db
    .from('reviews')
    .delete()
    .eq('id', reviewId);
  if (error) throw error;
}

// Admin: Toggle Pin review
async function adminTogglePinReview(reviewId, currentPinStatus) {
  const { error } = await db
    .from('reviews')
    .update({ is_pinned: !currentPinStatus })
    .eq('id', reviewId);
  if (error) throw error;
}
