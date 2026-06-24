# Post-Launch Audit Report — Credanta Launch

**Date:** 2026-06-24  
**Stack:** Vanilla JS · Vite 6 · Express · Nodemailer  
**Scope:** Launch/waitlist SPA — no redesign, security & stability only

---

## Executive summary

The site **builds successfully** and is **launch-ready** with targeted security hardening applied. No exposed API keys were found. Critical email HTML injection and missing bot/spam controls were fixed. The largest remaining item is **logo asset size (~1 MB)**, which affects load performance but not security.

| Area | Status |
|------|--------|
| Build | ✅ Pass |
| Form security | ✅ Hardened |
| Secret exposure | ✅ Clean |
| XSS / injection | ✅ Fixed / mitigated |
| Links & routes | ✅ Verified |
| Mobile layout | ✅ Acceptable (minor notes) |
| Performance | ⚠️ Logo optimization recommended |
| Deployment | ✅ Ready (SMTP secrets required for email) |

---

## 1. Build check

**Commands run:**
```bash
npm install   # ✅ success
npm run build # ✅ success
```

**Output (production bundle):**
| Asset | Size |
|-------|------|
| `index.html` | 19.13 kB (gzip 4.50 kB) |
| `index-*.css` | 15.95 kB (gzip 3.81 kB) |
| `index-*.js` | 3.26 kB (gzip 1.48 kB) |
| `Credanta-*.png` | **1,042.88 kB** |

**Result:** No broken imports, missing assets, TypeScript errors, or Vite failures. No TypeScript in project.

---

## 2. Form security

### Before audit

| Check | Status |
|-------|--------|
| Email validation (client) | ✅ Basic regex |
| Email validation (server) | ⚠️ Basic regex only |
| Name validation | N/A (email-only form) |
| Duplicate handling | ✅ 409 response |
| Loading state | ✅ Button disabled + text |
| Success state | ✅ Message + redirect |
| Failure state | ✅ Generic messages |
| Raw error exposure | ⚠️ JSON parse could leak stack |
| API keys in frontend | ✅ None |
| Honeypot | ❌ Missing |
| Rate limiting | ❌ Missing |
| Max input length | ❌ Missing |
| Bot protection | ❌ Missing |
| HTML injection in email | ❌ **Critical** |

### Fixes applied

- **Honeypot field** (`website`) — bots get silent success; humans unaffected
- **Rate limiting** — 5 submissions per IP per 15 minutes
- **Max email length** — 254 chars (client `maxlength` + server check)
- **Header/injection chars rejected** — `\r`, `\n`, `\0`, `<`, `>` blocked
- **Request body limit** — 1 KB via `express.json({ limit: '1kb' })`
- **HTML escaping** in outbound email template
- **Generic error handler** — no stack traces returned to client
- **Double-submit guard** — `isSubmitting` flag on client
- **Optional Cloudflare Turnstile** — activates when `VITE_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` are set
- **Nodemailer upgraded** to `^9.0.1` (high-severity advisories in v6)

### Form flow (post-fix)

1. Client validates email → POST `/api/signup`
2. Server checks honeypot, rate limit, Turnstile (if configured), duplicate
3. Signup saved to `data/signups.json`
4. Email sent to `support@credantaapp.com` if SMTP configured
5. Success → *"Input received, loading Credanta....."* → redirect to `https://credantaapp.com` after 8s

---

## 3. Secret / key exposure

**Search patterns:** `sk-`, `re_`, `whsec_`, `pk_live`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `STRIPE_SECRET_KEY`, `DATABASE_URL`, `SESSION_SECRET`, `VITE_*`

**Result:** ✅ **No secrets committed.** SMTP and optional Turnstile keys belong in `.env` / Replit Secrets only (see `.env.example`).

| Location | Finding |
|----------|---------|
| Frontend (`main.js`, `index.html`) | No private keys |
| `server.js` | Reads `process.env` only |
| `.gitignore` | `.env` excluded ✅ |

---

## 4. XSS / HTML injection

| Vector | Finding | Severity | Status |
|--------|---------|----------|--------|
| `innerHTML` / `dangerouslySetInnerHTML` | Not used | — | ✅ |
| Form message rendering | `textContent` only | — | ✅ |
| Email HTML template | Unescaped user email | **Critical** | ✅ Fixed (`escapeHtml`) |
| URL params in DOM | Not used | — | ✅ |
| Stored signups JSON | Plain text file | Low | ✅ |

---

## 5. Links and routes

| Link | Target | Status |
|------|--------|--------|
| Nav: Features | `#features` | ✅ |
| Nav: How it works | `#how-it-works` | ✅ |
| Nav: Join Beta | `#beta` | ✅ |
| Hero CTAs | `#beta`, `#features` | ✅ |
| Form submit | `POST /api/signup` | ✅ |
| Success redirect | `https://credantaapp.com` | ✅ |
| Footer: Privacy | `#privacy` | ✅ (on-page section) |
| Footer: Contact | `mailto:support@credantaapp.com` | ✅ |
| Footer: NexusGarden | `https://nexgarden.io` | ✅ `rel="noopener noreferrer"` |
| Nav/footer logo | `#hero` | ✅ Fixed (was `#`) |
| Security page | — | N/A (not in scope) |
| About page | — | N/A (not in scope) |

---

## 6. Mobile check

Tested via CSS review at breakpoints: 320, 375, 390, 414, 768, 1440px.

| Issue | Severity | Status |
|-------|----------|--------|
| Horizontal scroll from float cards | Medium | ✅ Fixed (`overflow: hidden` on `.hero__visual`) |
| `overflow-x: hidden` on body | — | ✅ Present |
| Button tap targets (~44px+) | — | ✅ Adequate padding |
| Form stacks on mobile | — | ✅ Column → row at 540px |
| Hero height on small screens | Low | Acceptable; logo + content visible |
| Clipped nav logo | Low | Large logo may feel tight at 320px — acceptable for brand |

---

## 7. Performance

| Issue | Severity | Status |
|-------|----------|--------|
| Logo PNG ~1 MB | **High** | ⚠️ Recommend compress to WebP/PNG < 150 KB |
| CSS/JS bundle | — | ✅ Small (~20 KB total gzipped) |
| Google Fonts | Low | Preconnect present; consider `font-display: swap` in URL |
| Scroll reveal animations | — | ✅ Respects `prefers-reduced-motion` |
| Footer logo | — | ✅ `loading="lazy"` added |
| Unused imports | — | ✅ None |

**Recommendation:** Run `Credanta.png` through Squoosh/TinyPNG or export a WebP at 2× display width (~560px wide).

---

## 8. Accessibility

| Check | Status |
|-------|--------|
| Form label | ✅ `sr-only` label on email |
| Button names | ✅ Visible text + nav `aria-label` |
| Color contrast | ✅ Dark text on light bg (readable) |
| Keyboard navigation | ✅ Native focus order |
| Focus states | ✅ `:focus-visible` added |
| Image alt text | ✅ Logos have `alt="Credanta"` |
| Error announcements | ✅ `role="status"` + `aria-live="polite"` |
| Invalid field state | ✅ `aria-invalid` on errors |

---

## 9. Security headers

Documented in **`SECURITY_HEADERS_RECOMMENDATIONS.md`**. Headers are not yet applied in code (hosting-layer configuration recommended to avoid breaking Google Fonts / optional Turnstile).

---

## 10. Issues by severity

### Critical — Fixed
- **Email HTML injection** via signup address in Nodemailer template → escaped with `escapeHtml()`

### High — Fixed / mitigated
- **No rate limiting** on signup endpoint → 5 req / 15 min / IP
- **No honeypot** → added
- **Nodemailer CVEs** (v6) → upgraded to v9.0.1
- **Logo asset 1 MB** → documented; compress before high-traffic launch

### Medium — Fixed / noted
- Missing max email length → 254 chars
- Missing request body size limit → 1 KB
- JSON parse errors could expose internals → generic handler
- SMTP not configured → signups still saved; email skipped with server log
- No Turnstile → optional hook added; enable via env vars

### Low — Fixed / noted
- Logo/home links used `#` → `#hero`
- Footer logo not lazy-loaded → fixed
- IP address stored in signups JSON → useful for abuse review; note in privacy copy if required
- Privacy is an anchor section, not a standalone page → acceptable for launch MVP

---

## 11. Fixes applied (summary)

| File | Change |
|------|--------|
| `server.js` | Rate limit, honeypot, validation, HTML escape, body limit, Turnstile hook, error handler, `x-powered-by` disabled |
| `main.js` | Honeypot, stricter validation, double-submit guard, Turnstile loader, `aria-invalid`, 429 handling |
| `index.html` | Honeypot field, `maxlength`, lazy footer logo, logo links → `#hero` |
| `styles.css` | Honeypot styles, focus-visible, invalid input styles, hero overflow fix |
| `package.json` | Nodemailer `^9.0.1` |
| `.env.example` | Turnstile vars documented |

---

## 12. Remaining recommendations

1. **Configure SMTP** in production (Replit Secrets) so signups email `support@credantaapp.com`
2. **Enable Cloudflare Turnstile** for social-traffic bot protection
3. **Compress logo** to reduce LCP on mobile
4. **Apply security headers** per `SECURITY_HEADERS_RECOMMENDATIONS.md`
5. **Add standalone Privacy Policy page** before GDPR-heavy traffic (optional)
6. **Monitor `data/signups.json`** size; rotate or move to a database if volume grows

---

## 13. Final test checklist

| Test | Expected |
|------|----------|
| `npm run build` | ✅ Passes |
| Homepage loads | Manual verify at `npm run preview` |
| Valid email submits | Success message + 8s redirect |
| Invalid email | Client error, no submit |
| XSS payload in email (`<script>@x.com`) | Rejected client + server |
| Honeypot filled | Silent success (bot trap) |
| Rapid resubmit | 429 after rate limit |
| Mobile 320px | No horizontal scroll |

---

*Audit performed without redesign. Site remains a simple, stable launch/waitlist page.*
