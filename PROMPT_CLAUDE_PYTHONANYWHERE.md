# Copy-paste prompt for Claude (PythonAnywhere deploy — Nawa)

Paste everything below the line into Claude. Replace nothing unless your username or repo URL differs.

---

You are helping deploy **Nawa** to **PythonAnywhere** for a **fresh account**. The human does the clicks and typing in the browser; you give **exact commands, paths, and file contents**. Be concise. After each major step, say what success looks like.

## What this project is (ground truth)

- **Repo:** `https://github.com/kariemSeiam/nawa.git` (public).
- **Stack:** React 18 + Vite + TypeScript + Tailwind (frontend); **Flask** (`server/app.py`) serves **both** the built frontend and `/api/*` in production.
- **WSGI entry:** project root `wsgi.py` does `from server.app import application`. The Flask app exposes `application` for gunicorn/PA.
- **Python deps:** `requirements.txt` — Flask, flask-cors, python-dotenv.
- **`dist/` is NOT in Git** (`.gitignore`). The human must **`npm run build` on their PC** and **upload `dist/`** to the server, or the site returns JSON `frontend_build_missing` / 503 until `dist/index.html` exists.
- **Telemetry:** NDJSON logs under `logs/` on the server (created at runtime). Do not commit secrets; `.env` is ignored.

## Fixed identifiers for this deployment

| Item | Value |
|------|--------|
| PythonAnywhere username | `nawa` |
| Site | `https://nawa.pythonanywhere.com` |
| App directory on server | `/home/nawa/nawa` |
| Virtualenv | `/home/nawa/nawa/.venv` |
| WSGI file (PA-managed) | `/var/www/nawa_pythonanywhere_com_wsgi.py` |
| Python version on Web tab | **3.12** |

## Your job — execute as a numbered runbook

1. **Bash console (PythonAnywhere)**  
   - If `~/nawa` exists but is wrong/empty: `cd ~` then `rm -rf nawa` only if safe (no user data).  
   - Then:
     ```bash
     cd ~
     git clone https://github.com/kariemSeiam/nawa.git nawa
     cd nawa
     python3.12 -m venv .venv
     source .venv/bin/activate
     pip install --upgrade pip
     pip install -r requirements.txt
     ```
   - If clone fails (private repo): explain PAT or SSH briefly.

2. **Web tab → Code**  
   - **Source code:** `/home/nawa/nawa`  
   - **Working directory:** `/home/nawa/` is OK if source code path is set correctly.  
   - **Virtualenv:** `/home/nawa/nawa/.venv`  
   - **Python version:** 3.12 (already set).

3. **Web tab → Environment variables**  
   - `FLASK_ENV` = `production`  
   - `PYTHONANYWHERE_DOMAIN` = `nawa.pythonanywhere.com` (optional but matches app logic)

4. **WSGI configuration file** (`/var/www/nawa_pythonanywhere_com_wsgi.py`)  
   - **Delete entire file contents** (including Hello World).  
   - Replace with **only**:
     ```python
     import sys

     path = "/home/nawa/nawa"
     if path not in sys.path:
         sys.path.insert(0, path)

     from wsgi import application
     ```
   - Save.

5. **Frontend build (on the human’s PC — not on PA unless they install Node)**  
   - In cloned repo locally: `npm ci` (or `npm install`), then `npm run build`.  
   - Produces `dist/` with `index.html` and `assets/`.

6. **Upload `dist/`**  
   - Via **Files** tab: ensure `/home/nawa/nawa/dist/` contains the same structure as local `dist/` (`index.html`, `assets/`, etc.).

7. **Reload**  
   - Web tab → **Reload nawa.pythonanywhere.com**.

8. **Smoke tests**  
   - `https://nawa.pythonanywhere.com/` → landing (HTML, not JSON error).  
   - `https://nawa.pythonanywhere.com/api/health` → `{"ok":true}`.  
   - If failure: open **error log** `nawa.pythonanywhere.com.error.log` and interpret the last traceback (ImportError → `sys.path` / venv; 503 JSON → missing `dist/`).

9. **Later updates**  
   - PC: `git push` after changes; run `npm run build` when frontend changes.  
   - PA: `cd ~/nawa && git pull` and `source .venv/bin/activate && pip install -r requirements.txt` if deps changed.  
   - Re-upload `dist/` when UI changed.  
   - Reload web app.

## Rules for you (Claude)

- Do **not** invent paths: use `/home/nawa/nawa` and the WSGI snippet exactly unless the human says their username differs.
- Do **not** tell them to commit `.env` or `node_modules`.
- If they see **CORS** errors in prod, remind them: same-origin deploy should not need CORS; dev uses Vite proxy or `CORS` only when `IS_PROD` is false.
- If **static files** mapping on PA is empty, that is OK — Flask serves `dist/` via `send_file`.

Start by asking: “Is `~/nawa` already cloned and non-empty?” Then run the runbook from the right step.

---

_End of prompt._
