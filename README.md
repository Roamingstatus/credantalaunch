# Credanta Launch

Minimalist single-page launch campaign website for Credanta.

**Tagline:** Credentials secured, monitored, and easily shared.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Production (Replit / deploy)

```bash
npm run build
npm start
```

The Express server serves the built site and persists beta signups to `data/signups.json`.

## Beta signups

Submissions from the bottom form are emailed to **support@credantaapp.com** and saved to `data/signups.json`.

Set these environment variables (see `.env.example`):

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (default `587`) |
| `SMTP_USER` | SMTP username |
| `SMTP_PASS` | SMTP password |
| `SMTP_FROM` | From address (optional) |
| `SUPPORT_EMAIL` | Recipient (default `support@credantaapp.com`) |

On Replit, add these as **Secrets** in the project settings.

**Local dev:** run the API server alongside Vite:

```bash
npm run dev        # terminal 1 — frontend on :3000
node server.js     # terminal 2 — API on :3001
```

## Stack

- Vanilla HTML / CSS / JS
- Vite (dev & build)
- Express (production server)

## License

© Credanta · NexusGarden
