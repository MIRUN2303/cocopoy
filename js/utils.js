// ============================================================
// UTILS MODULE — Shared across all pages
// ============================================================

// Toast notification system
function showToast(message, type = 'info') {
  const colors = {
    success: 'bg-green-500', error: 'bg-red-500',
    warning: 'bg-yellow-500', info: 'bg-blue-500'
  };

  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = 'position:fixed;top:80px;right:20px;z-index:10000;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `${colors[type] || colors.info} text-white px-5 py-3 rounded-lg shadow-lg font-semibold text-sm transform translate-x-full transition-transform duration-300`;
  toast.textContent = message;
  container.appendChild(toast);

  requestAnimationFrame(() => { toast.style.transform = 'translateX(0)'; });
  setTimeout(() => {
    toast.style.transform = 'translateX(120%)';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Global Headers/Auth Update logic
async function updateHeaderAuth() {
  const authDiv = document.getElementById('authButtonsDiv');
  const mobileAuthDiv = document.getElementById('mobileAuthButtons');
  const profileLink = document.getElementById('profileLink');
  const adminLink = document.getElementById('adminLink');
  const mobileAdminLink = document.getElementById('mobileAdminLink');

  const authHTML = `
    <a href="cocologin.html" class="auth-pill auth-pill-soft hover:text-secondary transition-colors">Login</a>
    <a href="cocosignup.html" class="auth-pill auth-pill-primary">Sign Up</a>
  `;

  try {
    const user = await getCurrentUser();
    if (user) {
      const profile = await getUserProfile();
      const admin = await isAdmin();
      const displayName = profile?.full_name || user.user_metadata?.full_name || user.email.split('@')[0];

      const userGreetingHTML = `
        <div class="hidden lg:flex items-center gap-3 mr-4">
          ${admin ? `
            <a href="javascript:void(0)" onclick="navigateToAdmin()" class="flex items-center gap-2 bg-secondary text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-lg hover:scale-105 transition-transform">
              ⚙ Admin Panel
            </a>
          ` : ''}
          <div class="flex flex-col items-end leading-tight">
            <span class="text-[11px] font-black text-secondary uppercase tracking-widest">Hello</span>
            <span class="text-xs font-bold text-primary dark:text-accent uppercase tracking-widest">${displayName}</span>
          </div>
        </div>
      `;

      if (authDiv) authDiv.innerHTML = userGreetingHTML;
      if (mobileAuthDiv) {
        mobileAuthDiv.innerHTML = `
          <div class="px-2 pb-4 border-b border-secondary/10 mb-2">
            ${admin ? `<a href="javascript:void(0)" onclick="navigateToAdmin()" class="w-full mb-3 flex items-center justify-center gap-2 bg-secondary text-white py-3 rounded-xl text-xs font-black uppercase tracking-widest">⚙ OPEN ADMIN PANEL</a>` : ''}
            <p class="text-[11px] font-black text-secondary uppercase tracking-widest">Hello</p>
            <p class="text-xs font-bold text-primary opacity-80 uppercase">${displayName}</p>
          </div>
        `;
      }

      if (profileLink) profileLink.style.display = 'inline-flex';
      if (adminLink) adminLink.style.display = 'none'; // Consolidated into greeting pill
      if (mobileAdminLink) mobileAdminLink.style.display = 'none';

      // First time name picker check
      checkFirstTimeUser();
    } else {
      if (authDiv) authDiv.innerHTML = authHTML;
      if (mobileAuthDiv) mobileAuthDiv.innerHTML = authHTML;
      if (profileLink) profileLink.style.display = 'none';
      if (adminLink) adminLink.style.display = 'none';
      if (mobileAdminLink) mobileAdminLink.style.display = 'none';
    }
  } catch (err) {
    console.error('Header auth update failed', err);
  }
}


// Run update on load
document.addEventListener('DOMContentLoaded', updateHeaderAuth);

// HELPER: First-time user name selection
async function checkFirstTimeUser() {
  const user = await getCurrentUser();
  if (!user) return;
  const profile = await getUserProfile();
  if (profile && profile.full_name) return; // Already has a name

  if (document.getElementById('name-setup-overlay')) return;

  const googleName = user.user_metadata?.full_name || '';
  const overlay = document.createElement('div');
  overlay.id = 'name-setup-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(11,17,61,0.95);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(10px);padding:20px;';
  overlay.innerHTML = `
    <div class="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center">
      <h2 class="text-2xl font-black text-primary mb-2">Welcome to Cocopoy!</h2>
      <p class="text-text-secondary text-sm mb-6">This will be your permanent billing name. Please choose carefully as it can only be changed with security verification later.</p>
      <div class="space-y-4">
        <button id="use-google-name" class="w-full p-4 bg-gray-100 rounded-2xl font-bold text-primary hover:bg-gray-200 transition">Use Google Name: ${googleName || 'N/A'}</button>
        <div class="relative"><div class="absolute inset-0 flex items-center"><span class="w-full border-t"></span></div><div class="relative flex justify-center text-xs uppercase"><span class="bg-white px-2 text-gray-400 font-bold">Or enter manually</span></div></div>
        <input type="text" id="custom-name" class="w-full p-4 border-2 border-gray-100 rounded-2xl outline-none focus:border-secondary font-bold text-center" placeholder="Your Full Name">
        <button id="save-name" class="w-full p-4 bg-primary text-white rounded-2xl font-black shadow-lg hover:bg-secondary transition">CONFIRM IDENTITY</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  document.getElementById('use-google-name').onclick = () => { if(googleName) document.getElementById('custom-name').value = googleName; };
  document.getElementById('save-name').onclick = async () => {
    const name = document.getElementById('custom-name').value.trim();
    if (name.length < 3) { alert('Please enter a valid name'); return; }
    try {
      await updateProfile({ full_name: name });
      overlay.remove();
      updateHeaderAuth();
      showToast('Identity verified! Welcome, ' + name, 'success');
    } catch (err) { alert('Setup failed: ' + err.message); }
  };
}

// HELPER: Mobile Menu
function setupMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');
  const searchBar = document.getElementById('siteSearchBar');

  if (btn && menu) {
    btn.onclick = () => {
      const isHidden = menu.classList.toggle('hidden');
      // If menu is shown, hide search bar. If menu is hidden, show search bar.
      if (searchBar) {
        if (!isHidden) searchBar.style.display = 'none';
        else searchBar.style.display = 'block';
      }
    };
    
    // Close on clicking outside
    document.addEventListener('click', (e) => { 
      if(!btn.contains(e.target) && !menu.contains(e.target)) {
        menu.classList.add('hidden');
        if (searchBar) searchBar.style.display = 'block';
      }
    });

    // Close on clicking any link inside the menu
    menu.querySelectorAll('a, button').forEach(item => {
      item.addEventListener('click', () => {
        menu.classList.add('hidden');
        if (searchBar) searchBar.style.display = 'block';
      });
    });
  }
}

// Distance & Delivery Helpers
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function calculateDeliverySchedule(distance, now = new Date()) {
  const roundedDistance = Number(distance.toFixed(2));
  const beforeCutoff = now.getHours() < 15;
  let daysToAdd = null, label = '', available = true;
  if (distance <= 30) { daysToAdd = beforeCutoff ? 0 : 1; label = beforeCutoff ? 'Same day delivery' : 'Next day delivery'; }
  else if (distance <= 70) { daysToAdd = 2; label = '2 days delivery'; }
  else if (distance <= 120) { daysToAdd = 3; label = '3 days delivery'; }
  else { available = false; label = 'Delivery currently unavailable'; }
  const deliveryDate = available ? new Date(now.getTime() + daysToAdd * 86400000) : null;
  return { distance: roundedDistance, message: label, date: deliveryDate, available, cutoffApplied: distance <= 30 && beforeCutoff };
}

// HELPER: Date Formatting
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  const options = { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' };
  return date.toLocaleDateString('en-IN', options);
}
