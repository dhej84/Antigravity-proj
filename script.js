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

/* ── Signup form handler ── */
function handleSignup() {
  const name  = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const track = document.getElementById('signupTrack').value;

  if (!name) {
    showToast('Please enter your full name.', 'error');
    return;
  }
  if (!email || !email.includes('@')) {
    showToast('Please enter a valid email address.', 'error');
    return;
  }
  if (!track) {
    showToast('Please select a learning track.', 'error');
    return;
  }

  // Simulate signup
  closeModal();
  setTimeout(() => {
    showToast(`🎉 Welcome, ${name}! Check your email for next steps.`, 'success');
  }, 300);
}

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
