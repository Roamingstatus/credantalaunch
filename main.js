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
const MAX_EMAIL_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/;

let isSubmitting = false;
let turnstileToken = null;

function isValidEmail(value) {
  if (!value || value.length > MAX_EMAIL_LENGTH) return false;
  if (/[\r\n\0]/.test(value)) return false;
  return EMAIL_PATTERN.test(value);
}

function showMessage(text, type) {
  messageEl.textContent = text;
  messageEl.className = `beta-form__message beta-form__message--${type}`;
  const emailInput = form?.querySelector('#email');
  if (emailInput) {
    emailInput.setAttribute('aria-invalid', type === 'error' ? 'true' : 'false');
  }
}

function loadTurnstile(siteKey) {
  const container = document.getElementById('turnstile-container');
  if (!container || !siteKey) return;

  container.hidden = false;
  const script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async = true;
  script.onload = () => {
    window.turnstile?.render(container, {
      sitekey: siteKey,
      callback: (token) => { turnstileToken = token; },
      'expired-callback': () => { turnstileToken = null; },
      'error-callback': () => { turnstileToken = null; },
    });
  };
  document.head.appendChild(script);
}

const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
if (turnstileSiteKey) {
  loadTurnstile(turnstileSiteKey);
}

async function submitSignup(payload) {
  try {
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      return { success: true };
    }

    if (res.status === 409) {
      return { success: false, message: 'You\'re already on the list!' };
    }

    if (res.status === 429) {
      return { success: false, message: 'Too many attempts. Please wait a few minutes and try again.' };
    }

    return {
      success: false,
      message: data.error || 'Something went wrong. Please try again or email support@credantaapp.com directly.',
    };
  } catch {
    return {
      success: false,
      message: 'Unable to reach the server. Please try again or email support@credantaapp.com directly.',
    };
  }
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (isSubmitting) return;

  const input = form.querySelector('#email');
  const honeypot = form.querySelector('#website');
  const email = input.value.trim();

  if (honeypot?.value.trim()) {
    form.querySelector('.beta-form__field').hidden = true;
    showMessage('Input received, loading Credanta.....', 'success');
    setTimeout(() => {
      window.location.href = 'https://credantaapp.com';
    }, 8000);
    return;
  }

  if (!isValidEmail(email)) {
    showMessage('Please enter a valid email address.', 'error');
    input.focus();
    return;
  }

  if (turnstileSiteKey && !turnstileToken) {
    showMessage('Please complete the verification check.', 'error');
    return;
  }

  isSubmitting = true;
  const btn = form.querySelector('button[type="submit"]');
  btn.disabled = true;
  btn.textContent = 'Submitting…';
  showMessage('', '');

  const payload = { email, website: honeypot?.value ?? '' };
  if (turnstileToken) {
    payload.cfTurnstileResponse = turnstileToken;
  }

  const result = await submitSignup(payload);

  if (result.success) {
    form.querySelector('.beta-form__field').hidden = true;
    document.getElementById('turnstile-container')?.remove();
    showMessage('Input received, loading Credanta.....', 'success');
    setTimeout(() => {
      window.location.href = 'https://credantaapp.com';
    }, 8000);
    return;
  }

  showMessage(result.message || 'Something went wrong. Please try again.', 'error');
  isSubmitting = false;
  btn.disabled = false;
  btn.textContent = 'Request Early Access';
});
