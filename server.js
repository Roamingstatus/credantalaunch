import express from 'express';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const DATA_DIR = join(__dirname, 'data');
const SIGNUPS_FILE = join(DATA_DIR, 'signups.json');

app.use(express.json());
app.use(express.static(join(__dirname, 'dist')));

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

app.post('/api/signup', (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  const signups = loadSignups();
  if (signups.some((s) => s.email.toLowerCase() === email.toLowerCase())) {
    return res.status(409).json({ error: 'Already registered' });
  }

  signups.push({ email, timestamp: new Date().toISOString() });
  saveSignups(signups);
  res.json({ success: true });
});

app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Credanta launch server running on port ${PORT}`);
});
