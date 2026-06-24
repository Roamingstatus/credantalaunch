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

- **With server:** POST `/api/signup` with `{ "email": "..." }`
- **Fallback:** Emails stored in browser `localStorage` when the API is unavailable

## Stack

- Vanilla HTML / CSS / JS
- Vite (dev & build)
- Express (production server)

## License

© Credanta · NexusGarden
