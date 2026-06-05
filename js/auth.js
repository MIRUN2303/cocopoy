// ============================================================
// AUTH MODULE — Supabase Auth + Google OAuth
// ============================================================

// Sign up with email & password
async function signUpWithEmail(email, password) {
  const { data, error } = await db.auth.signUp({
    email,
    password
  });
  if (error) throw error;
  return data;
}

// Sign in with email & password
async function signInWithEmail(email, password) {
  const { data, error } = await db.auth.signInWithPassword({
    email,
    password
  });
  if (error) throw error;
  return data;
}

// Sign in with Google OAuth
async function signInWithGoogle() {
  const { data, error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/index.html'
    }
  });
  if (error) throw error;
  return data;
}

// Sign out
async function signOut() {
  try {
    await db.auth.signOut();
  } catch (err) {
    console.error('Sign out error:', err);
  } finally {
    // Force clear any potential local session artifacts
    localStorage.clear(); 
    window.location.href = 'index.html';
  }
}
window.signOut = signOut;

// Get current user
async function getCurrentUser() {
  const { data: { user } } = await db.auth.getUser();
  return user;
}

// Get current session
async function getSession() {
  const { data: { session } } = await db.auth.getSession();
  return session;
}

// Get user profile from profiles table
async function getUserProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await db
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}

// Check if current user is admin
async function isAdmin() {
  try {
    const user = await getCurrentUser();
    if (!user) return false;
    
    // Case-insensitive fallback for founder
    if (user.email && ADMIN_EMAIL && user.email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
      return true;
    }

    const profile = await getUserProfile();
    return profile && profile.role === 'admin';
  } catch (err) {
    console.error('Admin check failed:', err);
    return false;
  }
}

// Update user profile
async function updateProfile(updates) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Not logged in');

  // Fetch current profile to check for name changes
  const currentProfile = await getUserProfile();
  
  // Add timestamp
  updates.updated_at = new Date().toISOString();

  if (updates.full_name && currentProfile && updates.full_name !== currentProfile.full_name) {
    // Name is changing, archive the old one
    const history = currentProfile.name_history || [];
    if (currentProfile.full_name) {
      history.push({
        name: currentProfile.full_name,
        changed_at: new Date().toISOString()
      });
    }
    updates.name_history = history;
  }

  const { data, error } = await db
    .from('profiles')
    .update(updates)
    .eq('id', user.id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Listen for auth state changes
function onAuthStateChange(callback) {
  db.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

// Require login — redirects to login page if not authenticated
async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = 'cocologin.html';
    return null;
  }
  return user;
}

// Require admin — redirects if not admin
async function requireAdmin() {
  const user = await requireAuth();
  if (!user) return null;
  const admin = await isAdmin();
  if (!admin) {
    alert('Access denied. Admin only.');
    window.location.href = 'index.html';
    return null;
  }
  return user;
}

// Navigate to admin panel — loads admin page dynamically (no admin.html file exists)
async function navigateToAdmin() {
  sessionStorage.setItem('adminActive', 'true');
  const user = await requireAdmin();
  if (!user) return;

  if (typeof renderAdminPanel !== 'function') {
    try {
      await new Promise(function(resolve, reject) {
        var script = document.createElement('script');
        script.src = 'js/admin-page.js?' + Date.now();
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    } catch (e) {
      window.location.href = 'index.html';
      return;
    }
  }

  renderAdminPanel();
}
window.navigateToAdmin = navigateToAdmin;

// Auto-redirect to admin page after refresh
(function() {
  if (sessionStorage.getItem('adminActive') === 'true') {
    sessionStorage.removeItem('adminActive');
    if (typeof navigateToAdmin === 'function') {
      navigateToAdmin();
    }
  }
})();
