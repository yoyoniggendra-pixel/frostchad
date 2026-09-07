# FROSTLINK v2.0 — Vercel + persistent realtime backend

FROSTLINK v2 keeps the existing browser UI and Socket.IO realtime behavior, but removes the local JSON/file-system dependency that made the original project unsuitable for cloud deployment.

## Architecture

- **Vercel:** hosts the frontend (`public/`).
- **Render (or another always-on Node host):** runs `server/index.js` and Socket.IO.
- **Supabase Postgres:** stores persistent chat history.
- **Supabase Storage:** stores uploaded images, videos, audio and files.
- **GIPHY/MyInstants:** remain server-side integrations.

The browser connects directly to the Render backend for `/api/*` and Socket.IO. `public/runtime-config.js` contains the backend URL.

## 1. Create the Supabase database

Create a Supabase project and open SQL Editor. Run `supabase.sql`.

Create a Storage bucket named `frostlink-uploads` and make that bucket **Public**, or change `SUPABASE_BUCKET` to your bucket name.

Never expose `SUPABASE_SERVICE_ROLE_KEY` in the browser.

## 2. Deploy the backend

The included `render.yaml` is a starting point for Render.

Environment variables on the backend:

```text
PORT=3000
ROOM_NAME=FROSTLINK
MAX_UPLOAD_MB=100
MAX_HISTORY=500
CORS_ORIGIN=https://YOUR-FROSTLINK.vercel.app
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
SUPABASE_BUCKET=frostlink-uploads
GIPHY_API_KEY=YOUR_GIPHY_KEY
GIPHY_RATING=pg-13
```

After deployment, your backend should answer:

`https://YOUR-BACKEND/api/health`

It should return JSON containing `ok: true`.

## 3. Point the frontend at the backend

Edit:

`public/runtime-config.js`

Change:

```js
window.FROSTLINK_BACKEND_URL = 'https://YOUR-FROSTLINK-BACKEND.onrender.com';
```

to the actual backend URL.

## 4. Deploy the frontend to Vercel

Import this repository/project into Vercel with the project root as the repository root.

The included `vercel.json` serves the existing `public/` directory as the Vercel site.

Do **not** deploy `.env`, the Supabase service-role key, or a real GIPHY key in frontend files.

## Important upload note

The backend uses memory-backed multipart uploads before sending the file to Supabase Storage. `MAX_UPLOAD_MB` is therefore intentionally set to 100 MB in this cloud edition. If you want very large uploads (hundreds of MB), the next upgrade should switch the browser to direct Supabase signed uploads so the backend never buffers the whole file.

## Local development

The backend can still be run locally:

```bash
npm install
npm start
```

Set `public/runtime-config.js` to `http://localhost:3000` when testing the backend locally.

## Security

This remains a trusted-room chat design rather than a full authentication system. Display names are convenience identities, so anyone who can reach the backend can choose a display name. Keep the Render backend URL private if you do not want the service publicly usable, or add real authentication before treating it as a public production chat.
