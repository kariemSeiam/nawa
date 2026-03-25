# Deploy Nawa on PythonAnywhere (Flask only)

**Model:** One Python web app serves **everything**: built React (`dist/`) + `/api/*`. No Node in production — build locally or in a CI job, upload `dist/`.

**Example URL:** [https://nawa.pythonanywhere.com](https://nawa.pythonanywhere.com) (your username + web app name may differ; match your PA **Web** tab URL.)

**Repo:** [github.com/kariemSeiam/nawa](https://github.com/kariemSeiam/nawa) — `git pull` on the server after each deploy. **`dist/` is not in git** (see `.gitignore`); after pulling, either run `npm ci && npm run build` on a machine with Node and upload `dist/` to PA, or build locally before uploading only the `dist/` folder.

## GitHub → PythonAnywhere (account username `nawa`)

Bash console:

```bash
cd ~
git clone https://github.com/kariemSeiam/nawa.git nawa
cd nawa
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

**Web tab → Virtualenv:** `/home/nawa/nawa/.venv`

**Replace** the entire contents of `/var/www/nawa_pythonanywhere_com_wsgi.py` with (delete the Hello World `application`):

```python
import sys

path = "/home/nawa/nawa"
if path not in sys.path:
    sys.path.insert(0, path)

from wsgi import application
```

**Environment variables:** `FLASK_ENV=production`, optional `PYTHONANYWHERE_DOMAIN=nawa.pythonanywhere.com`

Then **Reload** the web app. Until `dist/` exists under `/home/nawa/nawa/dist/`, `/` may return `frontend_build_missing` — add `dist/` from a local `npm run build`.

## What PythonAnywhere gives you

| Topic | Notes |
|--------|--------|
| **Stack** | Managed CPython, virtualenv, **WSGI** (not ASGI). Flask fits; FastAPI needs a worker shim — not covered here. |
| **HTTPS** | Free certificate on `*.pythonanywhere.com` and custom domains (paid plans). **Geolocation APIs need secure context** — PA HTTPS satisfies that. |
| **Static files** | Optional “Static files” mapping in the **Web** tab. This app **does not require** a separate mapping: Flask serves `dist/` from `send_file`. You *can* add `/static` → `dist/assets` later for efficiency; not required to go live. |
| **Always-on** | Free tier: app sleeps; wakes on request. Paid: always on. |
| **Outbound HTTP** | Free tier: **allowlist** of domains; paid: wider. Your `/api` only talks to the client and local disk — fine. |
| **File persistence** | `logs/` under your project path persists; use for NDJSON visit logs. |
| **Env vars** | **Web** tab → **Environment variables** (or WSGI file `os.environ`). |

## One-time setup

1. **Clone** the repo into `~/nawa` (or your chosen path — keep the folder name consistent with WSGI `path` below).
2. **Python 3.10+** virtualenv in project or account-wide:

   ```bash
   cd ~/nawa
   python3.12 -m venv .venv
   source .venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Build the frontend** (on your machine or any CI with Node):

   ```bash
   npm ci
   npm run build
   ```

   Upload the **`dist/`** folder to the same path on PA (**Files** or `git pull` if you commit `dist/` — usually you **don’t** commit `dist/`; upload artifacts instead).

4. **WSGI configuration** (Web tab → **WSGI configuration file**):

   ```python
   import sys
   path = "/home/YOUR_USERNAME/nawa"
   if path not in sys.path:
       sys.path.insert(0, path)

   from wsgi import application
   ```

   Or set **Working directory** / **Virtualenv** in the Web tab so `from server.app import application` resolves; the bundled root **`wsgi.py`** imports `application` from `server.app`.

5. **Environment variables** (Web tab):

   | Variable | Value |
   |----------|--------|
   | `FLASK_ENV` | `production` |
   | `PYTHONANYWHERE_DOMAIN` | e.g. `nawa.pythonanywhere.com` (optional; `app.py` sets `IS_PROD` if present) |

   Add any secrets you use in `.env` equivalent here (never commit secrets).

6. **Reload** the web app (green button on Web tab).

## Smoke tests

- `https://nawa.pythonanywhere.com/` → landing (replace host if yours differs).
- `https://nawa.pythonanywhere.com/__nawa/ledger` → SPA (same HTML shell).
- `https://nawa.pythonanywhere.com/api/health` → `{"ok":true}`.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| 503 `frontend_build_missing` | `dist/index.html` missing — run `npm run build` and upload `dist/`. |
| 404 on `/api/...` | Check Flask route names; API routes are registered **before** the SPA catch-all. |
| Import errors | Project root must be on `sys.path`; virtualenv must have `requirements.txt` installed. |
| CORS in prod | Same-origin SPA + `/api` needs no CORS; cross-origin dev uses Vite proxy or `CORS` only when not `IS_PROD`. |

## Local “production-like” run

```bash
npm run build
set FLASK_ENV=production
python server/app.py
```

Open `http://127.0.0.1:8787/` — same as PA without their WSGI layer.
