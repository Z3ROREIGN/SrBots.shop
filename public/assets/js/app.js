/**
 * SrBots.shop - JavaScript Global
 * Utilitários, API Client, Autenticação
 */

// ── Configuração ───────────────────────────────────────────
const CONFIG = {
  API_BASE: '/api',
  SITE_NAME: 'SrBots',
};

// ── API Client ─────────────────────────────────────────────
const API = {
  async request(method, endpoint, data = null, auth = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (auth) {
      const token = Auth.getToken();
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (data && method !== 'GET') options.body = JSON.stringify(data);

    try {
      const res = await fetch(`${CONFIG.API_BASE}${endpoint}`, options);
      const json = await res.json();

      if (res.status === 401) {
        Auth.logout();
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
        }
        return { error: 'Sessão expirada' };
      }

      return json;
    } catch (e) {
      console.error('API Error:', e);
      return { error: 'Erro de conexão. Verifique sua internet.' };
    }
  },

  get: (endpoint, auth = true) => API.request('GET', endpoint, null, auth),
  post: (endpoint, data, auth = true) => API.request('POST', endpoint, data, auth),
  put: (endpoint, data, auth = true) => API.request('PUT', endpoint, data, auth),
  delete: (endpoint, auth = true) => API.request('DELETE', endpoint, null, auth),
  patch: (endpoint, data, auth = true) => API.request('PATCH', endpoint, data, auth),
};

// ── Autenticação ───────────────────────────────────────────
const Auth = {
  TOKEN_KEY: 'srbots_token',
  USER_KEY: 'srbots_user',

  getToken() { return localStorage.getItem(this.TOKEN_KEY); },
  getUser() {
    try { return JSON.parse(localStorage.getItem(this.USER_KEY)); } catch { return null; }
  },
  isLoggedIn() { return !!this.getToken(); },
  isAdmin() { return this.getUser()?.role === 'admin'; },

  setAuth(token, user) {
    localStorage.setItem(this.TOKEN_KEY, token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  },

  logout() {
    API.post('/auth/logout').catch(() => {});
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  },

  requireAuth() {
    if (!this.isLoggedIn()) {
      window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
      return false;
    }
    return true;
  },

  requireAdmin() {
    if (!this.isLoggedIn() || !this.isAdmin()) {
      window.location.href = '/';
      return false;
    }
    return true;
  },
};

// ── Toast Notifications ────────────────────────────────────
const Toast = {
  container: null,

  init() {
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  },

  show(message, type = 'info', duration = 4000) {
    if (!this.container) this.init();

    const icons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span style="font-size:1.1rem;flex-shrink:0">${icons[type] || icons.info}</span>
      <span style="flex:1">${message}</span>
      <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text-muted);font-size:1.1rem;cursor:pointer;padding:0;margin-left:0.5rem">×</button>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'slideOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  success: (msg, dur) => Toast.show(msg, 'success', dur),
  error: (msg, dur) => Toast.show(msg, 'error', dur),
  warning: (msg, dur) => Toast.show(msg, 'warning', dur),
  info: (msg, dur) => Toast.show(msg, 'info', dur),
};

// ── Utilitários ────────────────────────────────────────────
const Utils = {
  formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  },

  formatDate(dateStr, opts = {}) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
      ...opts
    });
  },

  formatDateShort(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  },

  timeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return 'agora';
    if (mins < 60) return `${mins}m atrás`;
    if (hours < 24) return `${hours}h atrás`;
    if (days < 30) return `${days}d atrás`;
    return Utils.formatDateShort(dateStr);
  },

  truncate(str, len = 100) {
    if (!str) return '';
    return str.length > len ? str.substring(0, len) + '...' : str;
  },

  copyToClipboard(text) {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => Toast.success('Copiado!')).catch(() => {
        Utils._fallbackCopy(text);
      });
    } else {
      Utils._fallbackCopy(text);
    }
  },

  _fallbackCopy(text) {
    const el = document.createElement('textarea');
    el.value = text;
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    Toast.success('Copiado!');
  },

  debounce(fn, delay = 300) {
    let timer;
    return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), delay); };
  },

  getParam(name) {
    return new URLSearchParams(window.location.search).get(name);
  },

  setParam(name, value) {
    const url = new URL(window.location);
    if (value) url.searchParams.set(name, value);
    else url.searchParams.delete(name);
    window.history.replaceState({}, '', url);
  },

  statusLabel(status) {
    const labels = {
      pending: { text: 'Pendente', class: 'badge-yellow' },
      paid: { text: 'Pago', class: 'badge-green' },
      delivered: { text: 'Entregue', class: 'badge-blue' },
      cancelled: { text: 'Cancelado', class: 'badge-red' },
      refunded: { text: 'Reembolsado', class: 'badge-gray' },
    };
    return labels[status] || { text: status, class: 'badge-gray' };
  },

  botStatusLabel(status) {
    const labels = {
      online: { text: 'Online', class: 'badge-green' },
      offline: { text: 'Offline', class: 'badge-gray' },
      error: { text: 'Erro', class: 'badge-red' },
      suspended: { text: 'Suspenso', class: 'badge-yellow' },
    };
    return labels[status] || { text: status, class: 'badge-gray' };
  },

  productTypeIcon(type) {
    const icons = { bot: '🤖', source_code: '💻', script: '⚡', panel: '🖥️' };
    return icons[type] || '📦';
  },

  productTypeLabel(type) {
    const labels = { bot: 'Bot', source_code: 'Código Fonte', script: 'Script', panel: 'Painel' };
    return labels[type] || type;
  },

  stars(rating) {
    const full = Math.floor(rating);
    const half = rating % 1 >= 0.5 ? 1 : 0;
    const empty = 5 - full - half;
    return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty);
  },
};

// ── Navbar ─────────────────────────────────────────────────
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  // Scroll effect
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });

  // Mobile menu
  const mobileBtn = document.querySelector('.navbar-mobile-btn');
  const navMenu = document.querySelector('.navbar-nav-mobile');
  if (mobileBtn && navMenu) {
    mobileBtn.addEventListener('click', () => {
      navMenu.classList.toggle('active');
    });
  }

  // Auth state
  const user = Auth.getUser();
  const authSection = document.getElementById('navbar-auth');
  if (authSection) {
    if (user) {
      authSection.innerHTML = `
        <div class="navbar-user-menu" style="position:relative">
          <button class="btn btn-secondary btn-sm" onclick="toggleUserMenu()" style="gap:0.5rem">
            <span>${user.username}</span>
            <span>▾</span>
          </button>
          <div id="user-dropdown" style="display:none;position:absolute;right:0;top:calc(100% + 0.5rem);background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);min-width:180px;z-index:100;overflow:hidden">
            <a href="/dashboard" style="display:block;padding:0.75rem 1rem;font-size:0.875rem;color:var(--text-secondary);border-bottom:1px solid var(--border)">📊 Dashboard</a>
            ${user.role === 'admin' ? '<a href="/admin" style="display:block;padding:0.75rem 1rem;font-size:0.875rem;color:var(--purple-light);border-bottom:1px solid var(--border)">⚙️ Admin</a>' : ''}
            <button onclick="handleLogout()" style="display:block;width:100%;padding:0.75rem 1rem;font-size:0.875rem;color:var(--red-light);background:none;border:none;text-align:left;cursor:pointer">🚪 Sair</button>
          </div>
        </div>
      `;
    } else {
      authSection.innerHTML = `
        <a href="/login" class="btn btn-secondary btn-sm">Entrar</a>
        <a href="/registro" class="btn btn-primary btn-sm">Criar Conta</a>
      `;
    }
  }
}

function toggleUserMenu() {
  const dropdown = document.getElementById('user-dropdown');
  if (dropdown) dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

function handleLogout() {
  Auth.logout();
  Toast.success('Até logo!');
  setTimeout(() => window.location.href = '/', 1000);
}

// Fechar dropdown ao clicar fora
document.addEventListener('click', (e) => {
  if (!e.target.closest('.navbar-user-menu')) {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.style.display = 'none';
  }
});

// ── Modal Helper ───────────────────────────────────────────
function openModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.add('active');
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.remove('active');
}

// Fechar modal ao clicar no overlay
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
  }
});

// Fechar modal com ESC
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  }
});

// ── Init ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  Toast.init();
  initNavbar();
});
