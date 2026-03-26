# Nawa · نواة الجملة

Arabic-first site for electrical wholesale (**RTL**, Tajawal / Noto Sans Arabic). Ships with a small **Express** API for visit logs + event telemetry, optional **admin map** (lazy-loaded), and a **gate** before full interaction.

**Live (example):** [https://nawa.pythonanywhere.com](https://nawa.pythonanywhere.com)

---

## Stack

| Layer | Tech |
|--------|------|
| UI | React 18, TypeScript, Vite 5, Tailwind 3 |
| Routing | `react-router-dom` |
| API (dev) | Node **Express** (`server/index.mjs`) — Vite proxies `/api` |
| API + static (single host) | **Flask** (`server/app.py`) — serves `dist/` + `/api/*`; use for **PythonAnywhere** and “no Node in prod” |
| Maps (admin only) | Leaflet + `react-leaflet` v4 (code-split) |
| Styling | Tailwind + `src/index.css` tokens (`--radius-xl`, etc.) |

> **`npm run dev`** uses Express + Vite. **Production on PythonAnywhere:** `npm run build`, then WSGI loads `wsgi.py` → Flask serves `dist/` and the API. See **`DEPLOY_PYTHONANYWHERE.md`**.

---

## Quick start

```bash
npm install
npm run dev
```

- **App (Vite):** [http://localhost:5173](http://localhost:5173)  
- **API:** [http://127.0.0.1:8787](http://127.0.0.1:8787)  
- In dev, Vite **proxies** `/api` → `8787` (see `vite.config.ts`).

### Other commands

| Command | Purpose |
|---------|---------|
| `npm run build` | Typecheck + production bundle to `dist/` |
| `npm run preview` | Serve built assets locally |
| `npm run start` | Run Express in production mode (`NODE_ENV=production`) |
| Flask (after `npm run build`) | `set FLASK_ENV=production` (Windows) / `export FLASK_ENV=production` (Unix), then `python server/app.py` — same origin as `/api` |

---

## Production (Flask only)

1. **Build:** `npm ci && npm run build` → `dist/`.
2. **Run:** Flask `application` in `server/app.py` (or import `application` from root **`wsgi.py`** for WSGI hosts).
3. **Deploy:** Full steps, env vars, and PythonAnywhere quirks → **`DEPLOY_PYTHONANYWHERE.md`**.

---

## Environment

Create **`.env`** in the project root for **server** vars (see `server/index.mjs` — loads via `dotenv`).

| Variable | Purpose |
|----------|---------|
| `PORT` | API port (default **8787**) |

**Client / landing:** WhatsApp number, license text, regulator name, and GPS gate default live in **`src/config/siteDefaults.ts`** (no `VITE_*` required).

Never commit secrets.

---

## Architecture (mental)

- **Heartbeat:** `LandingPage` + telemetry gate → `POST /api/visit`  
- **Skeleton:** NDJSON logs under `logs/` (`visits-*.ndjson`, `events-*.ndjson`)  
- **Nervous system:** `src/lib/telemetry.ts` (visit, events, optional geolocation)  
- **Admin organ:** `VisitorsLedger` (lazy-loaded in `App.tsx` — keeps the main bundle small)

---

## Routes

| Path | Description |
|------|-------------|
| `/` | Marketing landing |
| `/__nawa/ledger` | Internal visit log + map (lazy chunk). **No auth** — protect by URL secrecy / reverse proxy in production. |

---

## Telemetry & gate (high level)

- After load, a **modal** can appear (timing/copy in `LandingPage.tsx`); user must **accept** to continue.
- On continue, **`ensureVisitPosted()`** runs: device snapshot + egress geo + **device coordinates** when required, then `POST /api/visit` until **204**.
- Global click/scroll/route events are bound from `App.tsx` (`bindGlobalActionTelemetry`).

**Reality check:** browsers may show **system-level prompts** for sensitive APIs; web code cannot remove them.

---

## Public tunnel (ngrok)

Tunnel **5173** so `/api` still goes through Vite’s proxy:

```bash
ngrok http 5173
```

`vite.config.ts` allows `*.ngrok-free.app` (and related) in dev.

---

## Logs

- Directory: `logs/`  
- Format: **NDJSON** per day  
- Rotate/archive as needed; do not commit large logs to git.

---

## Repo hygiene (recommended)

- `.gitignore`: `node_modules/`, `dist/`, `logs/*.ndjson`, `.env`  
- Production: **Flask** can serve `dist/` + `/api` on one host (see above); or `dist/` + Express behind a reverse proxy; keep HTTPS for geolocation.

---

## VENOM (Cursor discipline)

This repo is wired for **VENOM** in `.cursor/` (rules, voice, routing). Useful triggers:

| Trigger | Meaning |
|---------|---------|
| `/venom?` | Init: read `.venom/CONTEXT.md`, memory, corrections, anatomy |
| `eat [path]` | Deep absorb a folder/spec |
| Builder vs Architect | Implement vs plan-only |

If `.venom/` is missing, run your scaffold/init flow once so cross-session memory and context stay consistent.

---

## License

Private project (`"private": true` in `package.json`). Add a license file if you open-source.
