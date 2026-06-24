const STORAGE_KEY = 'credanta_beta_signups';

// ── Navigation scroll state ──
const nav = document.getElementById('nav');
const navToggle = document.querySelector('.nav__toggle');
const navMobile = document.querySelector('.nav__mobile');

function updateNav() {
  nav.classList.toggle('nav--scrolled', window.scrollY > 10);
}

window.addEventListener('scroll', updateNav, { passive: true });
updateNav();

// ── Mobile menu ──
navToggle?.addEventListener('click', () => {
  const expanded = navToggle.getAttribute('aria-expanded') === 'true';
  navToggle.setAttribute('aria-expanded', String(!expanded));
  navMobile.hidden = expanded;
});

navMobile?.querySelectorAll('a').forEach((link) => {
  link.addEventListener('click', () => {
    navToggle.setAttribute('aria-expanded', 'false');
    navMobile.hidden = true;
  });
});

// ── Smooth scroll for anchor links ──
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const id = anchor.getAttribute('href');
    if (id === '#') return;
    const target = document.querySelector(id);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// ── Scroll reveal ──
const revealElements = document.querySelectorAll(
  '.problem-card, .feature-card, .step, .vision-card, .beta-card, .section__header'
);

revealElements.forEach((el) => el.classList.add('reveal'));

const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
);

revealElements.forEach((el) => observer.observe(el));

// ── Footer year ──
document.getElementById('year').textContent = new Date().getFullYear();

// ── Beta signup ──
const form = document.getElementById('beta-form');
const messageEl = document.getElementById('form-message');

function getLocalSignups() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveLocalSignup(email) {
  const signups = getLocalSignups();
  signups.push({ email, timestamp: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(signups));
}

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = `beta-form__message beta-form__message--${type}`;
}

async function submitSignup(email) {
  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      return { success: true };
    }

    if (res.status === 409) {
      return { success: false, message: 'You\'re already on the list!' };
    }

    throw new Error(data.error || 'Server error');
  } catch {
    const existing = getLocalSignups();
    if (existing.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
      return { success: false, message: 'You\'re already on the list!' };
    }
    saveLocalSignup(email);
    return { success: true, fallback: true };
  }
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const input = form.querySelector('#email');
  const email = input.value.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showMessage('Please enter a valid email address.', 'error');
    input.focus();
    return;
  }

  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Submitting…';
  showMessage('', '');

  const result = await submitSignup(email);

  if (result.success) {
    showMessage(
      result.fallback
        ? 'You\'re on the list! We\'ll be in touch soon.'
        : 'You\'re on the list! Check your inbox for updates.',
      'success'
    );
    input.value = '';
  } else {
    showMessage(result.message || 'Something went wrong. Please try again.', 'error');
  }

  btn.disabled = false;
  btn.textContent = 'Request Early Access';
});
