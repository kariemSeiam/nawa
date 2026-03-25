import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import fs from 'node:fs'
import fsp from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(__dirname, '..')
dotenv.config({ path: path.join(root, '.env') })
const logsDir = path.join(root, 'logs')
const isProd = process.env.NODE_ENV === 'production'
const port = Number(process.env.PORT ?? 8787)

fs.mkdirSync(logsDir, { recursive: true })

const app = express()
app.set('trust proxy', 1)
app.use(cors({ origin: isProd ? false : true }))
app.use(express.json({ limit: '64kb' }))

function todayLogPath(prefix) {
  const d = new Date()
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return path.join(logsDir, `${prefix}-${y}-${m}-${day}.ndjson`)
}

function clientIp(req) {
  const xf = req.headers['x-forwarded-for']
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim()
  if (Array.isArray(xf) && xf[0]) return xf[0].split(',')[0].trim()
  return req.socket.remoteAddress ?? null
}

function trimStr(v, n = 240) {
  if (v == null) return null
  const s = String(v).trim()
  if (!s) return null
  return s.length <= n ? s : s.slice(0, n)
}

function normalizeIp(ip) {
  if (!ip) return null
  let s = String(ip).trim()
  if (s.toLowerCase().startsWith('::ffff:')) s = s.slice(7)
  return s || null
}

function ungeolocatableReason(ip) {
  if (!ip) return null
  if (ip === '127.0.0.1' || ip === '::1' || ip === '0.0.0.0') return 'loopback'
  if (ip.startsWith('127.')) return 'loopback'
  if (ip.startsWith('10.')) return 'rfc1918_private'
  if (ip.startsWith('192.168.')) return 'rfc1918_private'
  if (ip.startsWith('169.254.')) return 'link_local'
  const parts = ip.split('.')
  if (parts.length === 4 && parts[0] === '172') {
    const n = parseInt(parts[1], 10)
    if (!Number.isNaN(n) && n >= 16 && n <= 31) return 'rfc1918_private'
  }
  return null
}

async function fetchJson(url, timeoutMs = 2800) {
  const ctrl = new AbortController()
  const t = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Nawa/1.0' },
      signal: ctrl.signal,
    })
    if (!r.ok) return null
    const data = await r.json()
    return data !== null && typeof data === 'object' ? data : null
  } catch {
    return null
  } finally {
    clearTimeout(t)
  }
}

function rowIpwho(ip, data) {
  if (!data || data.success === false) return null
  const lat = Number(data.latitude)
  const lng = Number(data.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const conn = data.connection
  const isp = conn && typeof conn === 'object' ? conn.isp : null
  const domain = conn && typeof conn === 'object' ? conn.domain : null
  const tz = data.timezone
  const tzId = tz && typeof tz === 'object' ? tz.id : null
  const tzUtc = tz && typeof tz === 'object' ? tz.utc : null
  return {
    lat: Math.round(lat * 1e7) / 1e7,
    lng: Math.round(lng * 1e7) / 1e7,
    source: 'ipwho.is',
    ip,
    city: trimStr(data.city, 120),
    region: trimStr(data.region, 120),
    country: trimStr(data.country, 120),
    countryCode: trimStr(data.country_code, 8),
    continent: trimStr(data.continent, 64),
    continentCode: trimStr(data.continent_code, 8),
    timezone: trimStr(tzId, 80),
    utcOffset: trimStr(tzUtc, 32),
    isp: trimStr(isp, 200),
    org: trimStr(domain ?? isp, 200),
    currency: trimStr(data.currency, 64),
    currencyCode: trimStr(data.currency_code, 12),
  }
}

function rowIpapi(ip, data) {
  if (!data || data.error === true) return null
  const lat = Number(data.latitude)
  const lng = Number(data.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return {
    lat: Math.round(lat * 1e7) / 1e7,
    lng: Math.round(lng * 1e7) / 1e7,
    source: 'ipapi.co',
    ip,
    city: trimStr(data.city, 120),
    region: trimStr(data.region, 120),
    regionCode: trimStr(data.region_code, 16),
    country: trimStr(data.country_name, 120),
    countryCode: trimStr(data.country_code, 8),
    timezone: trimStr(data.timezone, 80),
    postalCode: trimStr(data.postal, 24),
    isp: trimStr(data.org, 200),
    org: trimStr(data.org, 200),
    asn: trimStr(data.asn, 32),
  }
}

function rowGeojs(ip, data) {
  if (!data) return null
  const lat = Number(data.latitude)
  const lng = Number(data.longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return {
    lat: Math.round(lat * 1e7) / 1e7,
    lng: Math.round(lng * 1e7) / 1e7,
    source: 'geojs.io',
    ip,
    city: trimStr(data.city, 120),
    region: trimStr(data.region, 120),
    country: trimStr(data.country, 120),
    countryCode: trimStr(data.country_code, 8),
    timezone: trimStr(data.timezone, 80),
    isp: trimStr(data.organization, 200),
    org: trimStr(data.organization, 200),
  }
}

async function lookupIpGeoMulti(ip) {
  const attempts = []
  const nip = normalizeIp(ip)
  if (!nip) return { geo: null, attempts, skip: 'no_ip' }
  const skip = ungeolocatableReason(nip)
  if (skip) return { geo: null, attempts, skip }

  const chain = [
    { label: 'ipwho.is', url: `https://ipwho.is/${nip}`, map: (d) => rowIpwho(nip, d) },
    { label: 'ipapi.co', url: `https://ipapi.co/${nip}/json/`, map: (d) => rowIpapi(nip, d) },
    { label: 'geojs.io', url: `https://get.geojs.io/v1/ip/geo/${nip}.json`, map: (d) => rowGeojs(nip, d) },
  ]

  for (const { label, url, map } of chain) {
    const raw = await fetchJson(url)
    const geo = raw ? map(raw) : null
    attempts.push({
      provider: label,
      ok: geo != null,
      error: geo ? null : `${label}:fail`,
    })
    if (geo) return { geo, attempts, skip: null }
  }
  return { geo: null, attempts, skip: 'all_providers_failed' }
}

function parseClientEgressGeo(raw) {
  if (!raw || typeof raw !== 'object') return { geo: null, err: 'not_object' }
  const err = raw.error
  if (err === true) return { geo: null, err: String(raw.reason || 'provider_error').slice(0, 120) }
  if (typeof err === 'string' && err) return { geo: null, err: err.slice(0, 120) }
  if (err != null && err !== false && err !== '') return { geo: null, err: String(err).slice(0, 120) }
  const lat = Number(raw.lat)
  const lng = Number(raw.lng)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return { geo: null, err: 'bad_coords' }
  if (!(lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180)) return { geo: null, err: 'out_of_range' }
  const isp = raw.isp
  const org = raw.org
  return {
    geo: {
      lat: Math.round(lat * 1e7) / 1e7,
      lng: Math.round(lng * 1e7) / 1e7,
      source:
        typeof raw.provider === 'string' && raw.provider.trim()
          ? raw.provider.trim().slice(0, 80)
          : 'client_egress',
      ip: trimStr(raw.egressIp, 64),
      city: trimStr(raw.city, 120),
      region: trimStr(raw.region, 120),
      regionCode: trimStr(raw.regionCode, 16),
      country: trimStr(raw.country, 120),
      countryCode: trimStr(raw.countryCode, 8),
      continent: trimStr(raw.continent, 64),
      timezone: trimStr(raw.timezone, 80),
      postalCode: trimStr(raw.postalCode, 24),
      isp: trimStr(isp, 200),
      org: trimStr(org != null ? org : isp, 200),
      asn: trimStr(raw.asn, 32),
    },
    err: null,
  }
}

function buildLocationAudit({
  geoGps,
  serverIpGeo,
  serverAttempts,
  serverSkip,
  clientEgress,
  clientEgressErr,
  normalizedIp,
  ipRaw,
}) {
  const hasServer = serverIpGeo != null
  const hasClient = clientEgress != null
  const hasGps = geoGps != null
  const hasAny = hasGps || hasServer || hasClient
  let primary = 'none'
  if (hasGps) primary = 'gps_browser'
  else if (hasServer) primary = 'server_ip_geo'
  else if (hasClient) primary = 'client_egress_ip_geo'

  let best = null
  if (hasGps && geoGps) {
    best = {
      lat: geoGps.lat,
      lng: geoGps.lng,
      tier: 'gps_browser',
      accuracyMeters: geoGps.accuracy ?? null,
      providerHint: null,
    }
  } else if (hasServer && serverIpGeo) {
    best = {
      lat: serverIpGeo.lat,
      lng: serverIpGeo.lng,
      tier: 'server_ip_geo',
      accuracyMeters: null,
      providerHint: serverIpGeo.source ?? null,
    }
  } else if (hasClient && clientEgress) {
    best = {
      lat: clientEgress.lat,
      lng: clientEgress.lng,
      tier: 'client_egress_ip_geo',
      accuracyMeters: null,
      providerHint: clientEgress.source ?? null,
    }
  }

  return {
    hasApproximateLatLng: hasAny,
    primarySource: primary,
    latLngBest: best,
    layers: { gps: geoGps, serverIpLookup: serverIpGeo, clientEgress },
    ip: { raw: ipRaw, normalized: normalizedIp },
    normalizedIp,
    serverGeoSkippedReason: serverSkip,
    serverProvidersAttempted: serverAttempts,
    clientEgressGeoError: clientEgressErr,
    disclaimer:
      'Approximate only (IP/VPN/cellular). Not exact device GPS unless tier is gps_browser.',
  }
}

function buildLocationBundle({ geoGps, serverIpGeo, clientEgress, audit }) {
  return {
    latLngBest: audit.latLngBest,
    ip: audit.ip,
    primarySource: audit.primarySource,
    server: serverIpGeo,
    clientEgress,
    gps: geoGps,
    hasApproximateLatLng: audit.hasApproximateLatLng,
  }
}

function readVisitsFromDisk({ maxRows = 400 } = {}) {
  let files = []
  try {
    files = fs
      .readdirSync(logsDir)
      .filter((f) => f.startsWith('visits-') && f.endsWith('.ndjson'))
      .sort()
  } catch {
    return []
  }
  const rows = []
  for (const f of files) {
    let content = ''
    try {
      content = fs.readFileSync(path.join(logsDir, f), 'utf8')
    } catch {
      continue
    }
    for (const line of content.split('\n')) {
      const t = line.trim()
      if (!t) continue
      try {
        rows.push(JSON.parse(t))
      } catch {
        /* skip corrupt line */
      }
    }
  }
  rows.sort((a, b) => String(b.ts).localeCompare(String(a.ts)))
  return rows.slice(0, maxRows)
}

app.post('/api/visit', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const serverTs = new Date().toISOString()
    const ip = clientIp(req)
    const nip = normalizeIp(ip)

    const { geo: ipGeo, attempts: serverAttempts, skip: serverSkip } = await lookupIpGeoMulti(ip)

    let geoOut = null
    const g = body.geo
    if (g && typeof g === 'object' && typeof g.lat === 'number' && typeof g.lng === 'number') {
      const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null)
      geoOut = {
        lat: g.lat,
        lng: g.lng,
        accuracy: num(g.accuracy),
        altitude: num(g.altitude),
        heading: num(g.heading),
        speed: num(g.speed),
        recordedAt: typeof g.recordedAt === 'string' ? g.recordedAt.slice(0, 64) : null,
      }
    }

    const client = body.client && typeof body.client === 'object' ? body.client : null
    const { geo: clientEgress, err: clientEgressErr } = parseClientEgressGeo(body.clientEgressGeo)

    const locationAudit = buildLocationAudit({
      geoGps: geoOut,
      serverIpGeo: ipGeo,
      serverAttempts,
      serverSkip,
      clientEgress,
      clientEgressErr,
      normalizedIp: nip,
      ipRaw: ip,
    })
    const locationBundle = buildLocationBundle({
      geoGps: geoOut,
      serverIpGeo: ipGeo,
      clientEgress,
      audit: locationAudit,
    })

    const record = {
      visitId: crypto.randomUUID(),
      ts: serverTs,
      serverReceivedAt: serverTs,
      ip,
      ipGeo,
      clientEgressGeo: clientEgress,
      location: locationBundle,
      locationAudit,
      consent: Boolean(body.consent),
      sessionId: typeof body.sessionId === 'string' ? body.sessionId.slice(0, 80) : null,
      referrer: typeof body.referrer === 'string' ? body.referrer.slice(0, 2048) : null,
      pageUrl: typeof body.pageUrl === 'string' ? body.pageUrl.slice(0, 2048) : null,
      landedAt: typeof body.landedAt === 'string' ? body.landedAt : null,
      reportedAt: typeof body.reportedAt === 'string' ? body.reportedAt : null,
      geo: geoOut,
      geoError: typeof body.geoError === 'string' ? body.geoError.slice(0, 500) : null,
      client,
    }

    await fsp.appendFile(todayLogPath('visits'), JSON.stringify(record) + '\n')

    const geoYes = locationAudit.hasApproximateLatLng ? 'yes' : 'no'
    console.log(
      `[visit] ${record.ts} id=${record.visitId} ip=${record.ip} session=${record.sessionId} geo=${geoYes}`
    )
    res.status(204).end()
  } catch (e) {
    console.error('[visit]', e)
    res.status(500).end()
  }
})

app.post('/api/event', async (req, res) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {}
    const serverTs = new Date().toISOString()
    let detailOut = null
    const d = body.detail
    if (d && typeof d === 'object') detailOut = d
    else if (d == null) detailOut = null
    else detailOut = { _raw: String(d).slice(0, 2000) }

    const client = body.client && typeof body.client === 'object' ? body.client : null

    const record = {
      eventId: crypto.randomUUID(),
      ts: serverTs,
      ip: clientIp(req),
      sessionId: typeof body.sessionId === 'string' ? body.sessionId.slice(0, 80) : null,
      action: typeof body.action === 'string' ? body.action.slice(0, 120) : null,
      pageUrl: typeof body.pageUrl === 'string' ? body.pageUrl.slice(0, 2048) : null,
      path: typeof body.path === 'string' ? body.path.slice(0, 512) : null,
      detail: detailOut,
      client,
    }

    await fsp.appendFile(todayLogPath('events'), JSON.stringify(record) + '\n')
    res.status(204).end()
  } catch (e) {
    console.error('[event]', e)
    res.status(500).end()
  }
})

app.get('/api/internal/visitors', (req, res) => {
  const max = Math.min(800, Math.max(1, Number(req.query.limit) || 400))
  const visits = readVisitsFromDisk({ maxRows: max })
  res.json({
    generatedAt: new Date().toISOString(),
    count: visits.length,
    visits,
  })
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

if (isProd) {
  const dist = path.join(root, 'dist')
  app.use(express.static(dist))
  app.get('*', (_req, res) => {
    res.sendFile(path.join(dist, 'index.html'))
  })
}

app.listen(port, () => {
  console.log(`[Nawa] API ${isProd ? '+ static' : ''} http://127.0.0.1:${port}`)
})
