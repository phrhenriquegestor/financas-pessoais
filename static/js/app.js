// ── App: navigation, modal, toast, utilities ─────────────────────────────

const App = (() => {
  const sections = ['dashboard', 'income', 'debts', 'credit', 'investments', 'goals'];
  let currentSection = 'dashboard';

  function navigate(section) {
    if (!sections.includes(section)) return;
    currentSection = section;

    // Update sidebar
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.section === section);
    });
    // Update bottom nav
    document.querySelectorAll('.bn-item').forEach(el => {
      el.classList.toggle('active', el.dataset.section === section);
    });
    // Show section
    document.querySelectorAll('.section').forEach(el => {
      el.classList.toggle('active', el.id === `section-${section}`);
    });

    // Load section data
    if (section === 'dashboard') Dashboard.load();
    else if (section === 'income') Income.load();
    else if (section === 'debts') Debts.load();
    else if (section === 'credit') Credit.load();
    else if (section === 'investments') Investments.load();
    else if (section === 'goals') Goals.load();
  }

  function openModal(title, bodyHTML) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHTML;
    document.getElementById('modalOverlay').classList.add('open');
  }

  function closeModal() {
    document.getElementById('modalOverlay').classList.remove('open');
  }

  function toast(msg, type = '') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show ' + type;
    setTimeout(() => { el.className = 'toast'; }, 3000);
  }

  function init() {
    // Sidebar nav clicks
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.section));
    });
    // Bottom nav clicks
    document.querySelectorAll('.bn-item').forEach(el => {
      el.addEventListener('click', () => navigate(el.dataset.section));
    });

    // Date header
    const el = document.getElementById('dashDate');
    if (el) el.textContent = new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    navigate('dashboard');
  }

  document.addEventListener('DOMContentLoaded', init);

  return { navigate, openModal, closeModal, toast };
})();

// ── Utilities ────────────────────────────────────────────────────────────

function fmt(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value ?? 0);
}

function fmtDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-BR');
}

function animateValue(el, from, to, duration = 500) {
  if (!el) return;
  const start = performance.now();
  const update = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = fmt(from + (to - from) * eased);
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

async function api(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch('/api' + path, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Erro desconhecido' }));
    throw new Error(err.detail || 'Erro na requisição');
  }
  if (res.status === 204) return null;
  return res.json();
}

const FREQ_LABELS = {
  weekly: 'Semanal', biweekly: 'Quinzenal',
  monthly: 'Mensal', annual: 'Anual', once: 'Único'
};

const CAT_LABELS = {
  housing: 'Moradia', utilities: 'Utilidades', insurance: 'Seguros',
  subscription: 'Assinaturas', loan: 'Empréstimos', other: 'Outros',
  shopping: 'Compras', food: 'Alimentação', travel: 'Viagem', health: 'Saúde'
};

const INV_TYPES = { fixed: 'Renda Fixa', variable: 'Renda Variável', crypto: 'Cripto', real_estate: 'Imóveis' };
