/* ===== Media Tech Support Marketplace - Shared JavaScript ===== */

// ===== Configuration =====
const CONFIG = {
  APP_NAME: 'Media Tech Support',
  // Replace with your deployed Google Apps Script Web App URL
  API_URL: 'https://script.google.com/macros/s/AKfycbw8aEuPLoZ4nBPqMZFMlNd-TuRFqUKbcmpn7iJHfDErn3YTdY5RiZeqOVdbMdTT6u8D/exec',
  PAYMENT_ACCOUNTS: {
    nayapay: { number: '03198595421', name: 'Muhammad Ramzan ul sami' },
    easypaisa: { number: '03198595421', name: 'Muhammad Ramzan Al Sami' },
    jazzcash: { number: '03218595421', name: 'Muhammad Ramzan Al Sami' }
  }
};

// ===== Local Storage Database (fallback when no Apps Script backend) =====
const DB = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || null; } 
    catch { return null; }
  },
  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },
  getAll(key) {
    return this.get(key) || [];
  },
  push(key, item) {
    const arr = this.getAll(key);
    arr.push(item);
    this.set(key, arr);
  }
};

// ===== Auth Module =====
const Auth = {
  currentUser() {
    return DB.get('currentUser');
  },

  isLoggedIn() {
    return !!this.currentUser();
  },

  isSeller() {
    const user = this.currentUser();
    return user && user.role === 'seller';
  },

  isBuyer() {
    const user = this.currentUser();
    return user && user.role === 'buyer';
  },

  login(usernameOrEmail, password) {
    const users = DB.getAll('users');
    const user = users.find(u => 
      (u.username === usernameOrEmail || u.email === usernameOrEmail) && 
      u.password === password
    );
    if (user) {
      DB.set('currentUser', user);
      return { success: true, user };
    }
    return { success: false, message: 'Invalid username/email or password' };
  },

  signup(userData) {
    const users = DB.getAll('users');
    if (users.find(u => u.username === userData.username)) {
      return { success: false, message: 'Username already exists' };
    }
    if (users.find(u => u.email === userData.email)) {
      return { success: false, message: 'Email already registered' };
    }
    const user = {
      id: 'user_' + Date.now(),
      ...userData,
      createdAt: new Date().toISOString()
    };
    DB.push('users', user);
    return { success: true, user };
  },

  logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
  },

  updatePaymentMethod(paymentData) {
    const user = this.currentUser();
    if (!user) return false;
    user.paymentMethod = paymentData;
    DB.set('currentUser', user);
    const users = DB.getAll('users');
    const idx = users.findIndex(u => u.id === user.id);
    if (idx !== -1) { users[idx] = user; DB.set('users', users); }
    return true;
  }
};

// ===== Products Module =====
const Products = {
  getAll() {
    return DB.getAll('products');
  },

  getById(id) {
    return this.getAll().find(p => p.id === id);
  },

  getByCategory(category) {
    if (!category || category === 'all') return this.getAll();
    return this.getAll().filter(p => p.category === category);
  },

  search(query) {
    const q = query.toLowerCase();
    return this.getAll().filter(p => 
      p.name.toLowerCase().includes(q) || 
      p.description.toLowerCase().includes(q) ||
      p.company?.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  },

  add(product) {
    const user = Auth.currentUser();
    if (!user) return null;
    const item = {
      id: 'prod_' + Date.now(),
      sellerId: user.id,
      sellerName: user.fullName,
      createdAt: new Date().toISOString(),
      status: 'active',
      ...product
    };
    DB.push('products', item);
    return item;
  },

  delete(id) {
    const products = this.getAll().filter(p => p.id !== id);
    DB.set('products', products);
  }
};

// ===== Orders Module =====
const Orders = {
  getAll() {
    return DB.getAll('orders');
  },

  create(orderData) {
    const user = Auth.currentUser();
    const order = {
      id: 'order_' + Date.now(),
      buyerId: user?.id,
      buyerName: user?.fullName,
      status: 'pending',
      createdAt: new Date().toISOString(),
      ...orderData
    };
    DB.push('orders', order);
    return order;
  },

  submitProof(orderId, proofData) {
    const orders = this.getAll();
    const idx = orders.findIndex(o => o.id === orderId);
    if (idx !== -1) {
      orders[idx].proof = proofData;
      orders[idx].status = 'proof_submitted';
      DB.set('orders', orders);
      return orders[idx];
    }
    return null;
  }
};

// ===== Cart Module =====
const Cart = {
  getItems() {
    return DB.getAll('cart');
  },

  addItem(product) {
    const cart = this.getItems();
    if (!cart.find(c => c.id === product.id)) {
      cart.push(product);
      DB.set('cart', cart);
    }
  },

  removeItem(productId) {
    const cart = this.getItems().filter(c => c.id !== productId);
    DB.set('cart', cart);
  },

  clear() {
    DB.set('cart', []);
  },

  getCount() {
    return this.getItems().length;
  }
};

// ===== UI Helpers =====
function showToast(message, type = 'success') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 3000);
}

function validatePassword(password) {
  return {
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSymbol: /[^a-zA-Z0-9]/.test(password),
    minLength: password.length >= 8,
    get isValid() { return this.hasLetter && this.hasNumber && this.hasSymbol && this.minLength; }
  };
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

function formatPrice(price) {
  return 'Rs. ' + Number(price).toLocaleString();
}

function timeAgo(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + ' min ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + ' hr ago';
  const days = Math.floor(hrs / 24);
  if (days < 30) return days + ' day' + (days > 1 ? 's' : '') + ' ago';
  return date.toLocaleDateString();
}

function getCategoryLabel(cat) {
  const labels = {
    pc: 'PC',
    laptop: 'Laptop',
    used_laptop: 'Used Laptop',
    used_mobile: 'Used Mobile',
    used_computer: 'Used Computer',
    tool_rent: 'Tool (Rent)',
    tool_subscription: 'Tool (Subscription)'
  };
  return labels[cat] || cat;
}

function getCategoryBadgeClass(cat) {
  if (cat === 'pc') return 'badge-pc';
  if (cat === 'laptop') return 'badge-laptop';
  if (cat.startsWith('used_')) return 'badge-used';
  if (cat === 'tool_rent') return 'badge-rent';
  if (cat === 'tool_subscription') return 'badge-subscription';
  return 'badge-tool';
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ===== Navigation Helpers =====
function navigateTo(page, params = {}) {
  const query = Object.entries(params).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  window.location.href = page + (query ? '?' + query : '');
}

function getUrlParams() {
  const params = {};
  new URLSearchParams(window.location.search).forEach((v, k) => { params[k] = v; });
  return params;
}

// ===== Init Navbar =====
function initNavbar() {
  const user = Auth.currentUser();
  const loginBtn = document.getElementById('loginBtn');
  const userMenu = document.getElementById('userMenu');
  const userAvatar = document.getElementById('userAvatar');
  const userName = document.getElementById('userName');
  const sellerLinks = document.querySelectorAll('.seller-only');
  
  if (user) {
    if (loginBtn) loginBtn.classList.add('hidden');
    if (userMenu) userMenu.classList.remove('hidden');
    if (userAvatar) userAvatar.textContent = user.fullName.charAt(0).toUpperCase();
    if (userName) userName.textContent = user.fullName;
    sellerLinks.forEach(el => {
      el.classList.toggle('hidden', user.role !== 'seller');
    });
  } else {
    if (loginBtn) loginBtn.classList.remove('hidden');
    if (userMenu) userMenu.classList.add('hidden');
    sellerLinks.forEach(el => el.classList.add('hidden'));
  }

  // User dropdown toggle
  const userMenuBtn = document.getElementById('userMenuBtn');
  const userDropdown = document.getElementById('userDropdown');
  if (userMenuBtn && userDropdown) {
    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('show');
    });
    document.addEventListener('click', () => {
      userDropdown.classList.remove('show');
    });
  }

  // Cart count
  const cartCount = document.getElementById('cartCount');
  if (cartCount) {
    const count = Cart.getCount();
    cartCount.textContent = count;
    cartCount.style.display = count > 0 ? 'flex' : 'none';
  }
}

// ===== Google Apps Script API =====
const API = {
  async call(action, data = {}) {
    if (CONFIG.API_URL === 'YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL') {
      console.log('API not configured, using local storage');
      return null;
    }
    try {
      const response = await fetch(CONFIG.API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...data })
      });
      return await response.json();
    } catch (err) {
      console.error('API Error:', err);
      return null;
    }
  }
};

// ===== Seed Demo Data =====
function seedDemoData() {
  if (DB.get('seeded')) return;

  const demoProducts = [
    {
      id: 'prod_demo1', name: 'Gaming PC - RTX 4060', category: 'pc',
      company: 'Custom Build', price: 185000,
      description: 'High performance gaming PC with RTX 4060, 16GB RAM, 512GB SSD.',
      location: 'Lahore', sellerId: 'demo', sellerName: 'Ali Tech Store',
      images: [], createdAt: new Date().toISOString(), status: 'active'
    },
    {
      id: 'prod_demo2', name: 'Dell Inspiron 15', category: 'laptop',
      company: 'Dell', price: 95000,
      description: 'Dell Inspiron 15 with Intel i5, 8GB RAM, 256GB SSD. Great for students.',
      location: 'Karachi', sellerId: 'demo', sellerName: 'Digital Hub',
      images: [], createdAt: new Date().toISOString(), status: 'active'
    },
    {
      id: 'prod_demo3', name: 'iPhone 12 Pro', category: 'used_mobile',
      company: 'Apple', price: 65000,
      description: 'Used iPhone 12 Pro, 128GB, Pacific Blue. Battery health 87%.',
      location: 'Islamabad', sellerId: 'demo', sellerName: 'Phone Mart',
      images: [], createdAt: new Date().toISOString(), status: 'active'
    },
    {
      id: 'prod_demo4', name: 'HP Laptop Used', category: 'used_laptop',
      company: 'HP', price: 35000,
      description: 'HP Pavilion used laptop, i3, 4GB RAM, 500GB HDD. Working condition.',
      location: 'Rawalpindi', sellerId: 'demo', sellerName: 'Budget Tech',
      images: [], createdAt: new Date().toISOString(), status: 'active'
    },
    {
      id: 'prod_demo5', name: 'FRP Bypass Tool', category: 'tool_subscription',
      company: 'UnlockTool', price: 3500,
      description: 'Professional FRP bypass tool. Supports Samsung, Huawei, Xiaomi.',
      subscriptionDuration: '3 months',
      sellerId: 'demo', sellerName: 'Tool Master',
      images: [], createdAt: new Date().toISOString(), status: 'active'
    },
    {
      id: 'prod_demo6', name: 'JTAG Box', category: 'tool_rent',
      company: 'Medusa', price: 500,
      description: 'Medusa JTAG box for rent. Full kit with cables.',
      rentDuration: 'Per Day', rentPrice: '500/day',
      sellerId: 'demo', sellerName: 'Repair Hub',
      images: [], createdAt: new Date().toISOString(), status: 'active'
    },
    {
      id: 'prod_demo7', name: 'Desktop Computer i5', category: 'used_computer',
      company: 'HP', price: 28000,
      description: 'Used HP desktop computer, i5 3rd gen, 8GB RAM, 500GB HDD, 19" monitor included.',
      location: 'Faisalabad', sellerId: 'demo', sellerName: 'PC World',
      images: [], createdAt: new Date().toISOString(), status: 'active'
    },
    {
      id: 'prod_demo8', name: 'Sigma Key Dongle', category: 'tool_subscription',
      company: 'Sigma', price: 5000,
      description: 'Sigma Key dongle subscription. Unlock Motorola, ZTE, Huawei, and more.',
      subscriptionDuration: '6 months',
      sellerId: 'demo', sellerName: 'Unlock Pro',
      images: [], createdAt: new Date().toISOString(), status: 'active'
    }
  ];

  DB.set('products', demoProducts);
  DB.set('seeded', true);
}

// Initialize on every page
document.addEventListener('DOMContentLoaded', () => {
  seedDemoData();
  initNavbar();
});
