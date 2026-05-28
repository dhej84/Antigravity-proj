/* ============================================
   UXLearn – script.js
   Interactivity, Animations, Course Filter
   ============================================ */

/* ── Navbar scroll effect ── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    navbar.style.padding = '12px 0';
    navbar.style.background = 'rgba(11,11,26,0.95)';
  } else {
    navbar.style.padding = '18px 0';
    navbar.style.background = 'rgba(11,11,26,0.8)';
  }
});

/* ── Mobile nav toggle ── */
const hamburger = document.getElementById('hamburger');
const mobileNav = document.getElementById('mobileNav');
hamburger.addEventListener('click', () => {
  mobileNav.classList.toggle('open');
});
function closeMobileNav() {
  mobileNav.classList.remove('open');
}

/* ── Scroll reveal animation ── */
const revealElements = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => {
        entry.target.classList.add('visible');
      }, 80 * (entry.target.dataset.delay || 0));
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

revealElements.forEach((el, index) => {
  el.dataset.delay = index % 4;
  revealObserver.observe(el);
});

/* ── Course Filter ── */
const filterBtns = document.querySelectorAll('.filter-btn');
const courseCards = document.querySelectorAll('.course-card');

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    // Update active button
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;

    courseCards.forEach(card => {
      if (filter === 'all' || card.dataset.track === filter) {
        card.style.display = '';
        card.style.animation = 'fadeInUp 0.4s ease both';
      } else {
        card.style.display = 'none';
      }
    });
  });
});

/* ── FAQ Accordion ── */
function toggleFaq(btn) {
  const item = btn.closest('.faq-item');
  const isOpen = item.classList.contains('open');

  // Close all
  document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));

  // Toggle current
  if (!isOpen) {
    item.classList.add('open');
  }
}

/* ── Modal ── */
function openModal() {
  document.getElementById('modalOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function closeModalOutside(event) {
  if (event.target === document.getElementById('modalOverlay')) {
    closeModal();
  }
}

// Close modal on Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

/* ── Toast notifications ── */
function showToast(message, type = 'success') {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position: 'fixed',
    bottom: '28px',
    left: '50%',
    transform: 'translateX(-50%) translateY(20px)',
    background: type === 'success'
      ? 'linear-gradient(135deg, #a855f7, #22d3ee)'
      : 'linear-gradient(135deg, #ef4444, #f97316)',
    color: '#fff',
    padding: '14px 28px',
    borderRadius: '999px',
    fontFamily: "'Inter', sans-serif",
    fontWeight: '600',
    fontSize: '0.9rem',
    boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
    zIndex: '9999',
    transition: 'transform 0.4s ease, opacity 0.4s ease',
    opacity: '0',
    whiteSpace: 'nowrap',
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
  });

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    setTimeout(() => toast.remove(), 400);
  }, 3500);
}

/* ── Animated counter for hero stats ── */
function animateCounter(el, target) {
  let start = 0;
  const duration = 1200;
  const step = 16;
  const increment = (target / (duration / step));
  const timer = setInterval(() => {
    start += increment;
    if (start >= target) {
      el.textContent = target + (el.dataset.suffix || '');
      clearInterval(timer);
    } else {
      el.textContent = Math.floor(start) + (el.dataset.suffix || '');
    }
  }, step);
}

/* Trigger counter when hero stats come into view */
const statsObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const nums = entry.target.querySelectorAll('.stat-number');
      nums.forEach(num => {
        const text = num.textContent;
        const match = text.match(/(\d+)/);
        if (match) {
          const val = parseInt(match[1]);
          const suffix = text.replace(match[1], '');
          num.dataset.suffix = suffix;
          num.textContent = '0' + suffix;
          animateCounter(num, val);
        }
      });
      statsObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

const heroStats = document.querySelector('.hero-stats');
if (heroStats) statsObserver.observe(heroStats);

/* ── Smooth scroll for nav links ── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function(e) {
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      const top = target.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  });
});

/* ── Tool cards hover ripple ── */
document.querySelectorAll('.tool-card').forEach(card => {
  card.addEventListener('click', () => {
    card.style.transform = 'scale(0.96)';
    setTimeout(() => { card.style.transform = ''; }, 150);
  });
});

/* ============================================
   UXLearn – API Integration
   ============================================ */

const API = 'https://antigravity-proj.onrender.com/api';

/* ── Token helpers ── */
const auth = {
  save: (tokens) => {
    localStorage.setItem('uxl_token', tokens.access_token);
    localStorage.setItem('uxl_refresh', tokens.refresh_token);
  },
  token: () => localStorage.getItem('uxl_token'),
  clear: () => {
    localStorage.removeItem('uxl_token');
    localStorage.removeItem('uxl_refresh');
    localStorage.removeItem('uxl_user');
  },
  saveUser: (user) => localStorage.setItem('uxl_user', JSON.stringify(user)),
  user: () => JSON.parse(localStorage.getItem('uxl_user') || 'null'),
  isLoggedIn: () => !!localStorage.getItem('uxl_token'),
};

/* ── API fetch wrapper ── */
async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (auth.token()) headers['Authorization'] = `Bearer ${auth.token()}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

/* ── Update navbar based on login state ── */
function updateNavAuth() {
  const user = auth.user();
  const signInBtn = document.querySelector('.nav-actions a[href*="Sign"]') ||
                    [...document.querySelectorAll('.nav-actions a')]
                      .find(a => a.textContent.trim() === 'Sign In');
  const startBtn  = document.querySelector('.btn-primary.nav-cta') ||
                    [...document.querySelectorAll('.nav-actions a')]
                      .find(a => a.textContent.includes('Start Free'));

  if (!signInBtn || !startBtn) return;

  if (user) {
    signInBtn.textContent = user.name.split(' ')[0];
    signInBtn.href = '#';
    signInBtn.onclick = handleLogout;
    startBtn.textContent = 'Dashboard →';
    startBtn.href = '#';
    startBtn.onclick = (e) => { e.preventDefault(); showDashboard(); };
  } else {
    signInBtn.textContent = 'Sign In';
    signInBtn.onclick = () => openModalMode('login');
    startBtn.textContent = 'Start Free →';
    startBtn.onclick = (e) => { e.preventDefault(); openModal(); };
  }
}

/* ── Modal modes: signup vs login ── */
function openModalMode(mode = 'signup') {
  openModal();
  const title    = document.querySelector('#modalOverlay h2, #modalOverlay .modal-title');
  const trackRow = document.getElementById('signupTrack')?.closest('div, p, label')?.parentElement;

  if (mode === 'login') {
    if (title) title.textContent = 'Welcome Back ✦';
    if (trackRow) trackRow.style.display = 'none';
    document.querySelector('.modal-submit-btn, [onclick="handleSignup()"]')
      .setAttribute('onclick', 'handleLogin()');
  } else {
    if (title) title.textContent = 'Start Learning for Free ✦';
    if (trackRow) trackRow.style.display = '';
    document.querySelector('.modal-submit-btn, [onclick="handleLogin()"]')
      ?.setAttribute('onclick', 'handleSignup()');
  }
}

/* ── Signup ── */
async function handleSignup() {
  const name  = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const track = document.getElementById('signupTrack').value;

  if (!name)                        return showToast('Please enter your full name.', 'error');
  if (!email || !email.includes('@')) return showToast('Please enter a valid email.', 'error');
  if (!track)                       return showToast('Please select a learning track.', 'error');

  const password = prompt('Choose a password (min 8 characters):');
  if (!password || password.length < 8) return showToast('Password must be at least 8 characters.', 'error');

  try {
    showToast('Creating your account...', 'success');
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });

    auth.save(data);
    auth.saveUser(data.user);
    closeModal();
    updateNavAuth();
    setTimeout(() => showToast(`🎉 Welcome, ${data.user.name}! You're all set.`, 'success'), 300);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ── Login ── */
async function handleLogin() {
  const email    = document.getElementById('signupEmail').value.trim();
  const password = prompt('Enter your password:');

  if (!email || !password) return showToast('Email and password required.', 'error');

  try {
    showToast('Signing you in...', 'success');
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    auth.save(data);
    auth.saveUser(data.user);
    closeModal();
    updateNavAuth();
    setTimeout(() => showToast(`👋 Welcome back, ${data.user.name}!`, 'success'), 300);
  } catch (err) {
    showToast(err.message, 'error');
  }
}

/* ── Logout ── */
function handleLogout() {
  auth.clear();
  updateNavAuth();
  showToast('Logged out successfully.', 'success');
}

/* ── Enroll button handler ── */
async function handleEnroll(courseId, btn) {
  if (!auth.isLoggedIn()) {
    showToast('Please sign in to enroll.', 'error');
    openModal();
    return;
  }

  btn.textContent = 'Enrolling...';
  btn.disabled = true;

  try {
    await apiFetch(`/courses/${courseId}/enroll`, { method: 'POST' });
    btn.textContent = '✓ Enrolled';
    btn.style.background = 'linear-gradient(135deg, #22c55e, #16a34a)';
    showToast('Successfully enrolled! 🎉', 'success');
  } catch (err) {
    btn.textContent = 'Enroll →';
    btn.disabled = false;
    showToast(err.message, 'error');
  }
}

/* ── Dashboard summary toast ── */
async function showDashboard() {
  try {
    const data = await apiFetch('/dashboard');
    const u = data.user;
    showToast(`📊 ${u.name} · ${data.stats.enrolled} courses · ${data.stats.completed} completed`, 'success');
  } catch (err) {
    showToast('Could not load dashboard.', 'error');
  }
}

/* ── Wire up Enroll buttons ── */
document.querySelectorAll('[data-course-id]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    handleEnroll(btn.dataset.courseId, btn);
  });
});

/* ── Init ── */
updateNavAuth();