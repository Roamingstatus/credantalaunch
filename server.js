import 'dotenv/config';
import express from 'express';
import nodemailer from 'nodemailer';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = join(__dirname, 'data');
const SIGNUPS_FILE = join(DATA_DIR, 'signups.json');
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@credantaapp.com';
const MAX_EMAIL_LENGTH = 254;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX = 5;

const rateLimitMap = new Map();

app.disable('x-powered-by');
app.use(express.json({ limit: '1kb' }));
app.use(express.static(join(__dirname, 'dist')));

app.use((err, _req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: 'Invalid request' });
  }
  return next(err);
});

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  if (email.length > MAX_EMAIL_LENGTH) return false;
  if (/[\r\n\0<>]/.test(email)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || 'unknown';
}

function isRateLimited(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now - entry.start > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(ip, { start: now, count: 1 });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

async function verifyTurnstile(token, ip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token || typeof token !== 'string') return false;

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secret, response: token, remoteip: ip }),
  });

  const data = await response.json().catch(() => ({}));
  return Boolean(data.success);
}

function loadSignups() {
  if (!existsSync(SIGNUPS_FILE)) return [];
  try {
    return JSON.parse(readFileSync(SIGNUPS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveSignups(signups) {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(SIGNUPS_FILE, JSON.stringify(signups, null, 2));
}

function createMailTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: SMTP_PORT === '465',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

async function sendSignupEmail(email) {
  const transporter = createMailTransporter();
  if (!transporter) {
    return { sent: false, reason: 'SMTP not configured' };
  }

  const from = process.env.SMTP_FROM || `"Credanta Launch" <${process.env.SMTP_USER}>`;
  const timestamp = new Date().toISOString();
  const safeEmail = escapeHtml(email);

  await transporter.sendMail({
    from,
    to: SUPPORT_EMAIL,
    replyTo: email,
    subject: 'New Credanta Beta Signup',
    text: [
      'New early access request',
      '',
      `Email: ${email}`,
      `Submitted: ${timestamp}`,
    ].join('\n'),
    html: `
      <h2>New early access request</h2>
      <p><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></p>
      <p><strong>Submitted:</strong> ${escapeHtml(timestamp)}</p>
    `,
  });

  return { sent: true };
}

app.post('/api/signup', async (req, res) => {
  try {
    const ip = getClientIp(req);

    if (isRateLimited(ip)) {
      return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    const { email, website, cfTurnstileResponse } = req.body ?? {};

    if (typeof website === 'string' && website.trim().length > 0) {
      return res.json({ success: true });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const turnstileOk = await verifyTurnstile(cfTurnstileResponse, ip);
    if (!turnstileOk) {
      return res.status(400).json({ error: 'Verification failed. Please try again.' });
    }

    const trimmed = email.trim();
    const normalized = trimmed.toLowerCase();
    const signups = loadSignups();
    if (signups.some((s) => s.email.toLowerCase() === normalized)) {
      return res.status(409).json({ error: 'Already registered' });
    }

    const entry = { email: trimmed, timestamp: new Date().toISOString(), ip };
    signups.push(entry);
    saveSignups(signups);

    try {
      const result = await sendSignupEmail(trimmed);
      if (!result.sent) {
        console.warn(`Signup saved for ${trimmed} — email not sent (${result.reason}). Configure SMTP in .env to enable delivery to ${SUPPORT_EMAIL}.`);
      } else {
        console.log(`Signup email sent to ${SUPPORT_EMAIL} for ${trimmed}`);
      }
    } catch (err) {
      console.error('Failed to send signup email:', err.message);
      return res.status(503).json({
        error: 'Unable to submit right now. Please try again or email support@credantaapp.com directly.',
      });
    }

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

app.use((_err, _req, res, _next) => {
  res.status(500).json({ error: 'Something went wrong. Please try again.' });
});

app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Credanta launch server running on port ${PORT}`);
  console.log(`Beta signups will be sent to ${SUPPORT_EMAIL}`);
});
