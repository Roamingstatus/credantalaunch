# Security Headers Recommendations — Credanta Launch

This site is a static Vite frontend served by Express on Replit/Cloud Run. Configure security headers at the **hosting layer** or in **Express middleware**.

## Recommended headers

| Header | Recommended value | Purpose |
|--------|-------------------|---------|
| `Content-Security-Policy` | See below | Restrict script/style/load sources |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Disable unused APIs |
| `X-Frame-Options` | `DENY` or use CSP `frame-ancestors` | Clickjacking protection |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS (production only) |

### Suggested Content-Security-Policy

```
default-src 'self';
script-src 'self' https://challenges.cloudflare.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data:;
connect-src 'self' https://challenges.cloudflare.com;
frame-src https://challenges.cloudflare.com;
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
```

Adjust `script-src` / `connect-src` if additional analytics or embeds are added.

## Where to configure

### Replit / Cloud Run (Express)

Add middleware in `server.js`:

```javascript
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
  );
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});
```

### Static CDN (Cloudflare, Netlify, Vercel)

Configure headers in the platform dashboard or `_headers` / `vercel.json` if the site is deployed as static-only.

### Cloudflare (recommended for credantaapp.com)

Use **Transform Rules → Response Header Modification** or **Security → Settings** to apply the headers above globally.

## Notes

- `'unsafe-inline'` in `style-src` is required for current inline SVG styling patterns; tighten if styles are fully externalized.
- Turnstile requires `challenges.cloudflare.com` in `script-src`, `connect-src`, and `frame-src`.
- Google Fonts require `fonts.googleapis.com` and `fonts.gstatic.com`.
- Do not add `Access-Control-Allow-Origin: *` on `/api/signup` unless a separate frontend domain requires it.
