// ============================================================
// SUPABASE CONFIGURATION
// ============================================================

const SUPABASE_URL = 'https://wnigemxmbnnmiwcjvbal.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InduaWdlbXhtYm5ubWl3Y2p2YmFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzMTI0MjEsImV4cCI6MjA5Mzg4ODQyMX0.7pDtZzWIwe0eNo1dHNw7tC3RAiiDJWVRf1uNlVmeXZI';

// Initialize Supabase client — use 'db' to avoid conflict with CDN's window.supabase
var db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Admin email (founder)
const ADMIN_EMAIL = 'cocopoyindia@gmail.com';

// UPI Payment Config
const UPI_ID = 'Q261913400@ybl';
const UPI_PAYEE_NAME = 'Cocopoy';

// Store location (for delivery calculator)
const STORE_LOCATION = {
  lat: 10.6690381,
  lng: 77.0315277,
  name: "Cocopoy Store"
};

// Shipping cost
const SHIPPING_COST = 50;
