"""
Nawa — Flask API: visit + action logging, IP geo + optional browser GPS from client `geo` payload.
"""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv
from flask import Flask, abort, jsonify, request, send_file

try:
    from flask_cors import CORS as _FlaskCORS
except ImportError:
    _FlaskCORS = None  # prod (PA) same-origin; optional for local dev

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

LOGS_DIR = ROOT / "logs"
LOGS_DIR.mkdir(parents=True, exist_ok=True)

DIST_DIR = ROOT / "dist"

# Production: NODE_ENV, FLASK_ENV, or PythonAnywhere (HTTPS + single-process typical)
IS_PA = bool(os.environ.get("PYTHONANYWHERE_DOMAIN"))
IS_PROD = (
    os.environ.get("NODE_ENV") == "production"
    or os.environ.get("FLASK_ENV") == "production"
    or IS_PA
)
PORT = int(os.environ.get("PORT", "8787"))
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 512 * 1024
app.config["JSON_SORT_KEYS"] = False

# Dev: optional CORS when flask-cors is installed. Prod: same origin — never required.
if not IS_PROD and _FlaskCORS is not None:
    _FlaskCORS(app, resources={r"/api/*": {"origins": "*"}})


def today_log_path(prefix: str) -> Path:
    d = datetime.now(timezone.utc)
    y, m, day = d.year, f"{d.month:02d}", f"{d.day:02d}"
    return LOGS_DIR / f"{prefix}-{y}-{m}-{day}.ndjson"


def client_ip() -> str | None:
    xf = request.headers.get("X-Forwarded-For")
    if xf:
        return xf.split(",")[0].strip() or None
    return request.remote_addr


def normalize_ip(ip: str | None) -> str | None:
    if not ip:
        return None
    s = ip.strip()
    if s.lower().startswith("::ffff:"):
        s = s[7:]
    return s or None


def ungeolocatable_reason(ip: str) -> str | None:
    """Reason we skip public geo DBs (still allow client egress path)."""
    if ip in ("127.0.0.1", "::1", "0.0.0.0"):
        return "loopback"
    if ip.startswith("127."):
        return "loopback"
    if ip.startswith("10."):
        return "rfc1918_private"
    if ip.startswith("192.168."):
        return "rfc1918_private"
    if ip.startswith("169.254."):
        return "link_local"
    parts = ip.split(".")
    if len(parts) == 4 and parts[0] == "172":
        try:
            n = int(parts[1])
            if 16 <= n <= 31:
                return "rfc1918_private"
        except ValueError:
            pass
    return None


def _trim(v: Any, n: int = 240) -> str | None:
    if v is None:
        return None
    s = str(v).strip()
    if not s:
        return None
    return s[:n]


def _location_row(
    lat: float,
    lng: float,
    *,
    source: str,
    looked_up_ip: str | None = None,
    city: Any = None,
    region: Any = None,
    region_code: Any = None,
    country: Any = None,
    country_code: Any = None,
    continent: Any = None,
    continent_code: Any = None,
    timezone: Any = None,
    utc_offset: Any = None,
    postal: Any = None,
    isp: Any = None,
    org: Any = None,
    asn: Any = None,
    currency: Any = None,
    currency_code: Any = None,
    extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    row: dict[str, Any] = {
        "lat": round(lat, 7),
        "lng": round(lng, 7),
        "source": source,
        "ip": looked_up_ip,
        "city": _trim(city, 120),
        "region": _trim(region, 120),
        "regionCode": _trim(region_code, 16),
        "country": _trim(country, 120),
        "countryCode": _trim(country_code, 8),
        "continent": _trim(continent, 64),
        "continentCode": _trim(continent_code, 8),
        "timezone": _trim(timezone, 80),
        "utcOffset": _trim(utc_offset, 32),
        "postalCode": _trim(postal, 24),
        "isp": _trim(isp, 200),
        "org": _trim(org, 200),
        "asn": _trim(asn, 32) if asn is not None else None,
        "currency": _trim(currency, 64),
        "currencyCode": _trim(currency_code, 12),
    }
    if extra:
        for k, v in list(extra.items())[:24]:
            kk = str(k)[:48]
            if v is None:
                row[kk] = None
            elif isinstance(v, bool):
                row[kk] = v
            elif isinstance(v, int) and not isinstance(v, bool):
                row[kk] = v
            elif isinstance(v, float) and v == v:
                row[kk] = v
            elif isinstance(v, str):
                row[kk] = _trim(v, 400)
    return row


def _fetch_json(url: str, timeout: float = 2.8) -> dict[str, Any] | None:
    req = Request(url, headers={"User-Agent": "Nawa/1.0"})
    try:
        with urlopen(req, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8", errors="replace")
        data = json.loads(raw)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError, ValueError):
        return None
    return data if isinstance(data, dict) else None


def lookup_ipwho(ip: str) -> tuple[dict[str, Any] | None, str | None]:
    data = _fetch_json(f"https://ipwho.is/{ip}")
    if not data or not data.get("success"):
        return None, "ipwho.is:fail"
    conn = data.get("connection")
    isp = conn.get("isp") if isinstance(conn, dict) else None
    domain = conn.get("domain") if isinstance(conn, dict) else None
    tz = data.get("timezone")
    tz_id = tz.get("id") if isinstance(tz, dict) else None
    tz_utc = tz.get("utc") if isinstance(tz, dict) else None
    lat, lng = data.get("latitude"), data.get("longitude")
    try:
        lat_f, lng_f = float(lat), float(lng)
    except (TypeError, ValueError):
        return None, "ipwho.is:no_coords"
    return (
        _location_row(
            lat_f,
            lng_f,
            source="ipwho.is",
            looked_up_ip=ip,
            city=data.get("city"),
            region=data.get("region"),
            country=data.get("country"),
            country_code=data.get("country_code"),
            continent=data.get("continent"),
            continent_code=data.get("continent_code"),
            timezone=tz_id,
            utc_offset=tz_utc,
            isp=isp,
            org=domain,
            currency=data.get("currency"),
            currency_code=data.get("currency_code"),
            extra={"capital": _trim(data.get("capital"), 120), "ipType": _trim(data.get("type"), 32)},
        ),
        None,
    )


def lookup_ipapi_co(ip: str) -> tuple[dict[str, Any] | None, str | None]:
    data = _fetch_json(f"https://ipapi.co/{ip}/json/")
    if not data or data.get("error") is True:
        return None, "ipapi.co:fail"
    lat, lng = data.get("latitude"), data.get("longitude")
    try:
        lat_f, lng_f = float(lat), float(lng)
    except (TypeError, ValueError):
        return None, "ipapi.co:no_coords"
    return (
        _location_row(
            lat_f,
            lng_f,
            source="ipapi.co",
            looked_up_ip=ip,
            city=data.get("city"),
            region=data.get("region"),
            region_code=data.get("region_code"),
            country=data.get("country_name"),
            country_code=data.get("country_code"),
            timezone=data.get("timezone"),
            postal=data.get("postal"),
            isp=data.get("org"),
            org=data.get("org"),
            asn=data.get("asn"),
            extra={"network": _trim(data.get("network"), 64), "version": _trim(data.get("version"), 8)},
        ),
        None,
    )


def lookup_geojs(ip: str) -> tuple[dict[str, Any] | None, str | None]:
    data = _fetch_json(f"https://get.geojs.io/v1/ip/geo/{ip}.json")
    if not data:
        return None, "geojs.io:fail"
    lat, lng = data.get("latitude"), data.get("longitude")
    try:
        lat_f = float(lat) if lat is not None and str(lat) != "" else float("nan")
        lng_f = float(lng) if lng is not None and str(lng) != "" else float("nan")
    except (TypeError, ValueError):
        return None, "geojs.io:no_coords"
    if not (lat_f == lat_f and lng_f == lng_f):  # NaN check
        return None, "geojs.io:no_coords"
    gj_ex: dict[str, Any] = {}
    if isinstance(data.get("hosting"), bool):
        gj_ex["hosting"] = data["hosting"]
    return (
        _location_row(
            lat_f,
            lng_f,
            source="geojs.io",
            looked_up_ip=ip,
            city=data.get("city"),
            region=data.get("region"),
            country=data.get("country"),
            country_code=data.get("country_code"),
            timezone=data.get("timezone"),
            isp=data.get("organization"),
            org=data.get("organization"),
            extra=gj_ex or None,
        ),
        None,
    )


def lookup_ip_geo_multi(ip: str | None) -> tuple[dict[str, Any] | None, list[dict[str, Any]], str | None]:
    """
    Try several providers. Returns (best_geo_or_none, attempts_log, skip_reason_if_no_try).
    skip_reason set when IP is not suitable for public geo DBs.
    """
    attempts: list[dict[str, Any]] = []
    nip = normalize_ip(ip)
    if not nip:
        return None, attempts, "no_ip"

    skip = ungeolocatable_reason(nip)
    if skip:
        return None, attempts, skip

    for fn, label in (
        (lookup_ipwho, "ipwho.is"),
        (lookup_ipapi_co, "ipapi.co"),
        (lookup_geojs, "geojs.io"),
    ):
        geo, err = fn(nip)
        attempts.append({"provider": label, "ok": geo is not None, "error": err})
        if geo is not None:
            return geo, attempts, None

    return None, attempts, "all_providers_failed"


def parse_client_egress_geo(raw: Any) -> tuple[dict[str, Any] | None, str | None]:
    """Validate browser-supplied egress-IP geo (parallel path to server IP)."""
    if not isinstance(raw, dict):
        return None, "not_object"
    err = raw.get("error")
    if err is True:
        return None, str(raw.get("reason") or "provider_error")[:120]
    if isinstance(err, str) and err:
        return None, err[:120]
    if err not in (None, False, ""):
        return None, str(err)[:120]
    try:
        lat = float(raw["lat"])
        lng = float(raw["lng"])
    except (KeyError, TypeError, ValueError):
        return None, "bad_coords"
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        return None, "out_of_range"
    isp = raw.get("isp")
    org = raw.get("org")
    ex: dict[str, Any] = {}
    for k in ("network", "version"):
        v = raw.get(k)
        if v is None:
            continue
        if isinstance(v, str) and not v.strip():
            continue
        if isinstance(v, bool):
            ex[k] = v
        elif isinstance(v, int) and not isinstance(v, bool):
            ex[k] = v
        elif isinstance(v, float) and v == v:
            ex[k] = v
        elif isinstance(v, str):
            ex[k] = _trim(v, 120)
    return (
        _location_row(
            lat,
            lng,
            source=str(raw.get("provider") or "client_egress"),
            looked_up_ip=_trim(raw.get("egressIp"), 64),
            city=raw.get("city"),
            region=raw.get("region"),
            region_code=raw.get("regionCode"),
            country=raw.get("country"),
            country_code=raw.get("countryCode"),
            continent=raw.get("continent"),
            timezone=raw.get("timezone"),
            postal=raw.get("postalCode"),
            isp=isp,
            org=org if org is not None else isp,
            asn=raw.get("asn"),
            extra=ex or None,
        ),
        None,
    )


def build_location_audit(
    *,
    geo_gps: dict[str, Any] | None,
    server_ip_geo: dict[str, Any] | None,
    server_attempts: list[dict[str, Any]],
    server_skip: str | None,
    client_egress: dict[str, Any] | None,
    client_egress_err: str | None,
    normalized_ip: str | None,
    ip_raw: str | None,
) -> dict[str, Any]:
    has_server = server_ip_geo is not None
    has_client = client_egress is not None
    has_gps = geo_gps is not None
    has_any = has_gps or has_server or has_client

    if has_gps:
        primary = "gps_browser"
    elif has_server:
        primary = "server_ip_geo"
    elif has_client:
        primary = "client_egress_ip_geo"
    else:
        primary = "none"

    best: dict[str, Any] | None = None
    if has_gps and geo_gps:
        best = {
            "lat": round(float(geo_gps["lat"]), 7),
            "lng": round(float(geo_gps["lng"]), 7),
            "tier": "gps_browser",
            "accuracyMeters": geo_gps.get("accuracy"),
            "providerHint": None,
        }
    elif has_server and server_ip_geo:
        best = {
            "lat": server_ip_geo["lat"],
            "lng": server_ip_geo["lng"],
            "tier": "server_ip_geo",
            "accuracyMeters": None,
            "providerHint": server_ip_geo.get("source"),
        }
    elif has_client and client_egress:
        best = {
            "lat": client_egress["lat"],
            "lng": client_egress["lng"],
            "tier": "client_egress_ip_geo",
            "accuracyMeters": None,
            "providerHint": client_egress.get("source"),
        }

    layers = {
        "gps": geo_gps,
        "serverIpLookup": server_ip_geo,
        "clientEgress": client_egress,
    }

    return {
        "hasApproximateLatLng": has_any,
        "primarySource": primary,
        "latLngBest": best,
        "layers": layers,
        "ip": {"raw": ip_raw, "normalized": normalized_ip},
        "normalizedIp": normalized_ip,
        "serverGeoSkippedReason": server_skip,
        "serverProvidersAttempted": server_attempts,
        "clientEgressGeoError": client_egress_err,
        "disclaimer": "Approximate only (IP/VPN/cellular). Not exact device GPS unless tier is gps_browser.",
    }


def build_location_bundle(
    *,
    geo_gps: dict[str, Any] | None,
    server_ip_geo: dict[str, Any] | None,
    client_egress: dict[str, Any] | None,
    audit: dict[str, Any],
) -> dict[str, Any]:
    """Single object: best lat/lng + every layer we have (for dashboards / exports)."""
    return {
        "latLngBest": audit.get("latLngBest"),
        "ip": audit.get("ip"),
        "primarySource": audit.get("primarySource"),
        "server": server_ip_geo,
        "clientEgress": client_egress,
        "gps": geo_gps,
        "hasApproximateLatLng": audit.get("hasApproximateLatLng"),
    }


def read_ndjson_glob(pattern_prefix: str, max_rows: int) -> list[dict]:
    rows: list[dict] = []
    try:
        files = sorted(
            f
            for f in LOGS_DIR.iterdir()
            if f.is_file() and f.name.startswith(pattern_prefix) and f.name.endswith(".ndjson")
        )
    except OSError:
        return []
    for f in files:
        try:
            text = f.read_text(encoding="utf-8")
        except OSError:
            continue
        for line in text.splitlines():
            t = line.strip()
            if not t:
                continue
            try:
                rows.append(json.loads(t))
            except json.JSONDecodeError:
                pass
    rows.sort(key=lambda a: str(a.get("ts", "")), reverse=True)
    return rows[:max_rows]


def read_visits_from_disk(max_rows: int = 400) -> list[dict]:
    return read_ndjson_glob("visits-", max_rows)


def read_events_from_disk(max_rows: int = 800) -> list[dict]:
    return read_ndjson_glob("events-", max_rows)


@app.post("/api/visit")
def post_visit():
    body = request.get_json(silent=True) or {}
    if not isinstance(body, dict):
        body = {}

    server_ts = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    ip = client_ip()
    nip = normalize_ip(ip)
    ip_geo, server_attempts, server_skip = lookup_ip_geo_multi(ip)

    geo = body.get("geo")
    geo_out = None
    if isinstance(geo, dict) and isinstance(geo.get("lat"), (int, float)) and isinstance(
        geo.get("lng"), (int, float)
    ):
        acc = geo.get("accuracy")
        alt = geo.get("altitude")
        hdg = geo.get("heading")
        spd = geo.get("speed")
        rec = geo.get("recordedAt")
        geo_out = {
            "lat": float(geo["lat"]),
            "lng": float(geo["lng"]),
            "accuracy": float(acc) if isinstance(acc, (int, float)) else None,
            "altitude": float(alt) if isinstance(alt, (int, float)) else None,
            "heading": float(hdg) if isinstance(hdg, (int, float)) else None,
            "speed": float(spd) if isinstance(spd, (int, float)) else None,
            "recordedAt": str(rec)[:64] if rec is not None else None,
        }

    client = body.get("client")
    if not isinstance(client, dict):
        client = None

    client_egress_raw = body.get("clientEgressGeo")
    client_egress, client_egress_err = parse_client_egress_geo(client_egress_raw)

    location_audit = build_location_audit(
        geo_gps=geo_out,
        server_ip_geo=ip_geo,
        server_attempts=server_attempts,
        server_skip=server_skip,
        client_egress=client_egress,
        client_egress_err=client_egress_err,
        normalized_ip=nip,
        ip_raw=ip,
    )
    location_bundle = build_location_bundle(
        geo_gps=geo_out,
        server_ip_geo=ip_geo,
        client_egress=client_egress,
        audit=location_audit,
    )

    record = {
        "visitId": str(uuid.uuid4()),
        "ts": server_ts,
        "serverReceivedAt": server_ts,
        "ip": ip,
        "ipGeo": ip_geo,
        "clientEgressGeo": client_egress,
        "location": location_bundle,
        "locationAudit": location_audit,
        "consent": bool(body.get("consent")),
        "sessionId": (str(body["sessionId"])[:80] if isinstance(body.get("sessionId"), str) else None),
        "referrer": (str(body["referrer"])[:2048] if isinstance(body.get("referrer"), str) else None),
        "pageUrl": (str(body["pageUrl"])[:2048] if isinstance(body.get("pageUrl"), str) else None),
        "landedAt": body.get("landedAt") if isinstance(body.get("landedAt"), str) else None,
        "reportedAt": body.get("reportedAt") if isinstance(body.get("reportedAt"), str) else None,
        "geo": geo_out,
        "geoError": (str(body["geoError"])[:500] if isinstance(body.get("geoError"), str) else None),
        "client": client,
    }

    line = json.dumps(record, ensure_ascii=False) + "\n"
    path = today_log_path("visits")
    try:
        with open(path, "a", encoding="utf-8") as f:
            f.write(line)
    except OSError as e:
        print(f"[visit-log] {e}")

    geo_yes = "yes" if location_audit.get("hasApproximateLatLng") else "no"
    print(
        f"[visit] {record['ts']} id={record['visitId']} ip={record['ip']} "
        f"session={record['sessionId']} geo={geo_yes}"
    )
    return "", 204


@app.post("/api/event")
def post_event():
    body = request.get_json(silent=True) or {}
    if not isinstance(body, dict):
        body = {}

    server_ts = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    detail = body.get("detail")
    if isinstance(detail, dict):
        detail_out = detail
    elif detail is None:
        detail_out = None
    else:
        detail_out = {"_raw": str(detail)[:2000]}

    client = body.get("client")
    if not isinstance(client, dict):
        client = None

    record = {
        "eventId": str(uuid.uuid4()),
        "ts": server_ts,
        "ip": client_ip(),
        "sessionId": (str(body["sessionId"])[:80] if isinstance(body.get("sessionId"), str) else None),
        "action": (str(body["action"])[:120] if isinstance(body.get("action"), str) else None),
        "pageUrl": (str(body["pageUrl"])[:2048] if isinstance(body.get("pageUrl"), str) else None),
        "path": (str(body["path"])[:512] if isinstance(body.get("path"), str) else None),
        "detail": detail_out,
        "client": client,
    }

    line = json.dumps(record, ensure_ascii=False) + "\n"
    path = today_log_path("events")
    try:
        with open(path, "a", encoding="utf-8") as f:
            f.write(line)
    except OSError as e:
        print(f"[event-log] {e}")

    return "", 204


@app.get("/api/internal/visitors")
def get_visitors():
    try:
        lim = int(request.args.get("limit", "400"))
    except ValueError:
        lim = 400
    lim = max(1, min(800, lim))
    visits = read_visits_from_disk(max_rows=lim)
    return jsonify(
        {
            "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "count": len(visits),
            "visits": visits,
        }
    )


@app.get("/api/internal/events")
def get_events():
    try:
        lim = int(request.args.get("limit", "800"))
    except ValueError:
        lim = 800
    lim = max(1, min(2000, lim))
    events = read_events_from_disk(max_rows=lim)
    return jsonify(
        {
            "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "count": len(events),
            "events": events,
        }
    )


@app.get("/api/health")
def health():
    return jsonify({"ok": True})


def _safe_dist_file(rel: str) -> Path | None:
    """Resolve a file under dist/ without path traversal."""
    if not rel or rel.startswith(("/", "\\")):
        return None
    segments = [p for p in rel.replace("\\", "/").split("/") if p and p != "."]
    if ".." in segments:
        return None
    if not segments:
        return None
    candidate = (DIST_DIR / Path(*segments)).resolve()
    try:
        candidate.relative_to(DIST_DIR.resolve())
    except ValueError:
        return None
    return candidate if candidate.is_file() else None


@app.get("/")
def serve_spa_index():
    """Production: Vite `npm run build` output at dist/index.html."""
    index = DIST_DIR / "index.html"
    if not index.is_file():
        return (
            jsonify(
                {
                    "error": "frontend_build_missing",
                    "hint": "Run: npm ci && npm run build — dist/ must exist at project root.",
                }
            ),
            503,
        )
    return send_file(index)


@app.get("/<path:path>")
def serve_spa_or_static(path: str):
    """Serve built assets; unknown paths → SPA shell (React Router)."""
    if path.startswith("api/"):
        abort(404)
    hit = _safe_dist_file(path)
    if hit is not None:
        return send_file(hit)
    index = DIST_DIR / "index.html"
    if not index.is_file():
        return jsonify({"error": "frontend_build_missing"}), 503
    return send_file(index)


# WSGI servers (PythonAnywhere, gunicorn) expect `application`
application = app


if __name__ == "__main__":
    print(f"[Nawa] Flask http://127.0.0.1:{PORT}")
    app.run(host="127.0.0.1", port=PORT, debug=not IS_PROD)
