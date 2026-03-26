import { SITE_REQUIRE_DEVICE_GPS } from '../config/siteDefaults'

const STORAGE_VISIT = 'nawa_visit_sent_v1'
const STORAGE_SESSION = 'nawa_session_id_v1'
const STORAGE_LANDED = 'nawa_landed_at_v1'
const EVENT_QUEUE = 'nawa_event_queue_v1'

export function getOrCreateSessionId(): string {
  try {
    const existing = sessionStorage.getItem(STORAGE_SESSION)
    if (existing) return existing
    const id = crypto.randomUUID()
    sessionStorage.setItem(STORAGE_SESSION, id)
    return id
  } catch {
    return `fallback-${Date.now()}`
  }
}

function getLandedAt(): string {
  try {
    let t = sessionStorage.getItem(STORAGE_LANDED)
    if (!t) {
      t = new Date().toISOString()
      sessionStorage.setItem(STORAGE_LANDED, t)
    }
    return t
  } catch {
    return new Date().toISOString()
  }
}

function mediaMatches(q: string): boolean | null {
  try {
    return typeof window !== 'undefined' && window.matchMedia(q).matches
  } catch {
    return null
  }
}

function webglRenderer(): { vendor: string | null; renderer: string | null } | null {
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl') as WebGLRenderingContext | null
    if (!gl) return null
    const ext = gl.getExtension('WEBGL_debug_renderer_info')
    if (!ext) return { vendor: null, renderer: null }
    type WGLEXT = { UNMASKED_VENDOR_WEBGL: number; UNMASKED_RENDERER_WEBGL: number }
    const e = ext as unknown as WGLEXT
    return {
      vendor: gl.getParameter(e.UNMASKED_VENDOR_WEBGL),
      renderer: gl.getParameter(e.UNMASKED_RENDERER_WEBGL),
    }
  } catch {
    return null
  }
}

function networkConnection(): Record<string, unknown> | null {
  type Conn = {
    effectiveType?: string
    downlink?: number
    rtt?: number
    saveData?: boolean
  }
  const c = typeof navigator !== 'undefined' ? (navigator as Navigator & { connection?: Conn }).connection : undefined
  if (!c) return null
  return {
    effectiveType: c.effectiveType ?? null,
    downlink: typeof c.downlink === 'number' ? c.downlink : null,
    rtt: typeof c.rtt === 'number' ? c.rtt : null,
    saveData: typeof c.saveData === 'boolean' ? c.saveData : null,
  }
}

async function batterySnapshot(): Promise<Record<string, unknown> | null> {
  type Bat = {
    charging: boolean
    chargingTime: number
    dischargingTime: number
    level: number
  }
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  const bat =
    nav && 'getBattery' in nav
      ? await (nav as Navigator & { getBattery: () => Promise<Bat> }).getBattery().catch(() => null)
      : null
  if (!bat) return null
  return {
    charging: bat.charging,
    chargingTime: bat.chargingTime,
    dischargingTime: bat.dischargingTime,
    level: typeof bat.level === 'number' ? Math.round(bat.level * 1000) / 1000 : null,
  }
}

async function storageEstimate(): Promise<{ usage: number | null; quota: number | null } | null> {
  try {
    if (!navigator.storage?.estimate) return null
    const e = await navigator.storage.estimate()
    return {
      usage: typeof e.usage === 'number' ? e.usage : null,
      quota: typeof e.quota === 'number' ? e.quota : null,
    }
  } catch {
    return null
  }
}

/** Synchronous slice of environment (no permission APIs). */
export function clientSnapshotSync() {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined
  const scr = typeof screen !== 'undefined' ? screen : undefined
  const tz =
    typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : null

  const navAny = nav as Navigator & {
    deviceMemory?: number
    userAgentData?: { brands?: { brand: string; version: string }[]; mobile?: boolean; platform?: string }
  }

  return {
    userAgent: nav?.userAgent ?? null,
    language: nav?.language ?? null,
    languages: nav?.languages ? [...nav.languages] : null,
    timezone: tz,
    timezoneOffset: typeof new Date().getTimezoneOffset === 'function' ? new Date().getTimezoneOffset() : null,
    screen: {
      width: scr?.width ?? null,
      height: scr?.height ?? null,
      availWidth: scr?.availWidth ?? null,
      availHeight: scr?.availHeight ?? null,
      pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : null,
      colorDepth: scr?.colorDepth ?? null,
      orientation:
        typeof scr !== 'undefined' && 'orientation' in scr && scr.orientation
          ? (scr.orientation as ScreenOrientation).type
          : null,
    },
    viewport: {
      innerWidth: typeof window !== 'undefined' ? window.innerWidth : null,
      innerHeight: typeof window !== 'undefined' ? window.innerHeight : null,
      outerWidth: typeof window !== 'undefined' ? window.outerWidth : null,
      outerHeight: typeof window !== 'undefined' ? window.outerHeight : null,
      scrollX: typeof window !== 'undefined' ? window.scrollX : null,
      scrollY: typeof window !== 'undefined' ? window.scrollY : null,
    },
    document: {
      visibilityState: typeof document !== 'undefined' ? document.visibilityState : null,
      docWidth: typeof document !== 'undefined' ? document.documentElement?.clientWidth : null,
      docHeight: typeof document !== 'undefined' ? document.documentElement?.clientHeight : null,
    },
    platform: nav?.platform ?? null,
    oscpu: (nav as Navigator & { oscpu?: string })?.oscpu ?? null,
    vendor: nav?.vendor ?? null,
    vendorSub: nav?.vendorSub ?? null,
    product: nav?.product ?? null,
    productSub: nav?.productSub ?? null,
    cookieEnabled: nav?.cookieEnabled ?? null,
    pdfViewerEnabled: (nav as Navigator & { pdfViewerEnabled?: boolean })?.pdfViewerEnabled ?? null,
    webdriver: (nav as Navigator & { webdriver?: boolean })?.webdriver ?? null,
    hardwareConcurrency: nav?.hardwareConcurrency ?? null,
    deviceMemory: typeof navAny?.deviceMemory === 'number' ? navAny.deviceMemory : null,
    maxTouchPoints: nav?.maxTouchPoints ?? null,
    touch: nav ? Boolean(nav.maxTouchPoints && nav.maxTouchPoints > 0) : null,
    connection: networkConnection(),
    userAgentData: navAny.userAgentData
      ? {
          brands: navAny.userAgentData.brands ?? null,
          mobile: navAny.userAgentData.mobile ?? null,
          platform: navAny.userAgentData.platform ?? null,
        }
      : null,
    prefersColorScheme: (() => {
      const d = mediaMatches('(prefers-color-scheme: dark)')
      if (d === true) return 'dark'
      if (d === false) return 'light'
      return null
    })(),
    prefersReducedMotion: mediaMatches('(prefers-reduced-motion: reduce)'),
    prefersContrast: mediaMatches('(prefers-contrast: more)'),
    pointerCoarse: mediaMatches('(pointer: coarse)'),
    hoverNone: mediaMatches('(hover: none)'),
    displayModeStandalone: mediaMatches('(display-mode: standalone)'),
    webgl: webglRenderer(),
  }
}

/** Full device context including async APIs that do not show permission prompts (when supported). */
export async function buildFullClientSnapshot() {
  const [battery, storage] = await Promise.all([batterySnapshot(), storageEstimate()])
  return {
    ...clientSnapshotSync(),
    battery,
    storage,
    collectedAt: new Date().toISOString(),
  }
}

const EGRESS_TIMEOUT_MS = 4500

/** Browser GPS — outer cap; inner `getCurrentPosition` timeout slightly below. */
const DEVICE_GPS_TIMEOUT_MS = 55_000

export type DeviceGeoOk = {
  ok: true
  lat: number
  lng: number
  accuracy: number | null
  altitude: number | null
  heading: number | null
  speed: number | null
  recordedAt: string
}

export type DeviceGeoFail = {
  ok: false
  code: number | 'unsupported' | 'timeout'
  message: string
}

export type DeviceGeoResult = DeviceGeoOk | DeviceGeoFail

let deviceGeoInflight: Promise<DeviceGeoResult> | null = null

function deviceGeolocationOnce(opts: {
  enableHighAccuracy: boolean
  innerTimeoutMs: number
  outerMs: number
}): Promise<DeviceGeoResult> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return Promise.resolve({ ok: false, code: 'unsupported', message: 'geolocation_api_missing' })
  }

  return new Promise((resolve) => {
    const outer = window.setTimeout(() => {
      resolve({ ok: false, code: 'timeout', message: 'outer_deadline' })
    }, opts.outerMs)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        window.clearTimeout(outer)
        const c = pos.coords
        const lat = c.latitude
        const lng = c.longitude
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          resolve({ ok: false, code: 2, message: 'position_unusable' })
          return
        }
        resolve({
          ok: true,
          lat,
          lng,
          accuracy: typeof c.accuracy === 'number' && Number.isFinite(c.accuracy) ? c.accuracy : null,
          altitude: c.altitude != null && Number.isFinite(c.altitude) ? c.altitude : null,
          heading: c.heading != null && Number.isFinite(c.heading) ? c.heading : null,
          speed: c.speed != null && Number.isFinite(c.speed) ? c.speed : null,
          recordedAt: new Date(pos.timestamp).toISOString(),
        })
      },
      (err) => {
        window.clearTimeout(outer)
        resolve({
          ok: false,
          code: err.code,
          message: (err.message && err.message.slice(0, 200)) || `code_${err.code}`,
        })
      },
      {
        enableHighAccuracy: opts.enableHighAccuracy,
        maximumAge: 0,
        timeout: opts.innerTimeoutMs,
      }
    )
  })
}

/** High accuracy first; on timeout/unavailable, one lower-accuracy read. Denied (1) is not retried. */
async function probeDeviceGeolocation(): Promise<DeviceGeoResult> {
  const innerHi = Math.max(8000, DEVICE_GPS_TIMEOUT_MS - 2000)
  const hi = await deviceGeolocationOnce({
    enableHighAccuracy: true,
    innerTimeoutMs: innerHi,
    outerMs: DEVICE_GPS_TIMEOUT_MS,
  })
  if (hi.ok) return hi
  if (hi.code === 1) return hi
  if (hi.code === 2 || hi.code === 3) {
    const lo = await deviceGeolocationOnce({
      enableHighAccuracy: false,
      innerTimeoutMs: 22_000,
      outerMs: 28_000,
    })
    if (lo.ok) return lo
  }
  return hi
}

/**
 * Start GPS as early as possible (e.g. from main.tsx). Reused by the visit gate.
 * The OS/browser may still show a location prompt — that cannot be suppressed by web code.
 */
export function startDeviceGeolocationWarm(): void {
  if (typeof window === 'undefined') return
  if (!deviceGeoInflight) deviceGeoInflight = probeDeviceGeolocation()
}

/**
 * Await the probe for this attempt, then clear inflight so a failed POST can re-probe.
 * Coordinates are not rendered on your UI.
 */
export async function fetchDeviceGeolocation(): Promise<DeviceGeoResult> {
  startDeviceGeolocationWarm()
  const p = deviceGeoInflight!
  const r = await p
  deviceGeoInflight = null
  return r
}

/**
 * Clears the in-flight GPS probe so the next `fetchDeviceGeolocation` / `ensureVisitPosted` issues a
 * fresh `getCurrentPosition`. Use between retries so the browser can show the prompt again when
 * permission is still "prompt". If the user chose "block" permanently, the browser will not show
 * the dialog again until they change site settings — that cannot be overridden from JS.
 */
export function resetGeolocationProbeOnly(): void {
  deviceGeoInflight = null
}

function requireDeviceGpsForGate(): boolean {
  return SITE_REQUIRE_DEVICE_GPS
}

/** True when client-side egress IP lookup returned usable coordinates (audit / server merge only — not used to satisfy the gate). */
export function hasEgressLatLng(eg: Record<string, unknown>): boolean {
  if ('error' in eg && eg.error) return false
  const lat = typeof eg.lat === 'number' ? eg.lat : parseFloat(String(eg.lat ?? ''))
  const lng = typeof eg.lng === 'number' ? eg.lng : parseFloat(String(eg.lng ?? ''))
  return Number.isFinite(lat) && Number.isFinite(lng)
}

let egressGeoSuccess: Record<string, unknown> | null = null
let egressGeoInflight: Promise<Record<string, unknown>> | null = null

/**
 * Approximate location from the visitor's public egress IP (third-party JSON, no GPS permission).
 * Tries geojs then ipapi.co. Can still fail: offline, adblock, CORS changes, rate limits, VPN-only APIs.
 * Successful lat/lng are cached for the tab to speed up the visit payload; gate success still requires device GPS when enabled.
 */
async function fetchClientEgressGeoUncached(): Promise<Record<string, unknown>> {
  const tryGeojs = async (): Promise<Record<string, unknown>> => {
    const ctrl = new AbortController()
    const id = window.setTimeout(() => ctrl.abort(), EGRESS_TIMEOUT_MS)
    try {
      const r = await fetch('https://get.geojs.io/v1/ip/geo.json', { signal: ctrl.signal })
      if (!r.ok) return { error: `http_${r.status}`, provider: 'geojs.io' }
      const d = (await r.json()) as Record<string, unknown>
      const lat = parseFloat(String(d.latitude ?? ''))
      const lng = parseFloat(String(d.longitude ?? ''))
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return { error: 'no_coords', provider: 'geojs.io' }
      }
      return {
        provider: 'geojs.io',
        lat,
        lng,
        city: d.city ?? null,
        region: d.region ?? null,
        country: d.country ?? null,
        countryCode: d.country_code ?? null,
        timezone: d.timezone ?? null,
        postalCode: d.postal_code ?? d.postal ?? null,
        isp: d.organization ?? null,
        org: d.organization ?? null,
        egressIp: d.ip ?? null,
      }
    } catch (e) {
      const name = e instanceof Error ? e.name : 'fetch_failed'
      return { error: name, provider: 'geojs.io' }
    } finally {
      window.clearTimeout(id)
    }
  }

  const tryIpApi = async (): Promise<Record<string, unknown>> => {
    const ctrl = new AbortController()
    const id = window.setTimeout(() => ctrl.abort(), EGRESS_TIMEOUT_MS)
    try {
      const r = await fetch('https://ipapi.co/json/', { signal: ctrl.signal })
      if (!r.ok) return { error: `http_${r.status}`, provider: 'ipapi.co' }
      const d = (await r.json()) as Record<string, unknown>
      if (d.error === true) return { error: String(d.reason ?? 'api_error'), provider: 'ipapi.co' }
      const lat =
        typeof d.latitude === 'number' ? d.latitude : parseFloat(String(d.latitude ?? ''))
      const lng =
        typeof d.longitude === 'number' ? d.longitude : parseFloat(String(d.longitude ?? ''))
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        return { error: 'no_coords', provider: 'ipapi.co' }
      }
      return {
        provider: 'ipapi.co',
        lat,
        lng,
        city: d.city ?? null,
        region: d.region ?? null,
        regionCode: d.region_code ?? null,
        country: d.country_name ?? null,
        countryCode: d.country_code ?? null,
        timezone: d.timezone ?? null,
        postalCode: d.postal ?? null,
        asn: d.asn ?? null,
        isp: d.org ?? null,
        org: d.org ?? null,
        egressIp: d.ip ?? null,
        network: d.network ?? null,
        version: d.version ?? null,
      }
    } catch (e) {
      const name = e instanceof Error ? e.name : 'fetch_failed'
      return { error: name, provider: 'ipapi.co' }
    } finally {
      window.clearTimeout(id)
    }
  }

  const g = await tryGeojs()
  if (!('error' in g)) return g
  return tryIpApi()
}

export async function fetchClientEgressGeo(): Promise<Record<string, unknown>> {
  if (egressGeoSuccess) return egressGeoSuccess
  if (!egressGeoInflight) {
    egressGeoInflight = fetchClientEgressGeoUncached().then((r) => {
      egressGeoInflight = null
      if (hasEgressLatLng(r)) egressGeoSuccess = r
      return r
    })
  }
  return egressGeoInflight
}

/** Fire-and-forget on first paint so client egress fields are ready for the visit POST (supplementary; gate is GPS-only). */
export function prefetchEgressGeo(): void {
  if (typeof window === 'undefined') return
  void fetchClientEgressGeo().catch(() => {})
}

/** @deprecated use clientSnapshotSync or buildFullClientSnapshot */
export function clientSnapshot() {
  return clientSnapshotSync()
}

export function readVisitSent(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_VISIT) === '1'
  } catch {
    return false
  }
}

export function markVisitSent() {
  try {
    sessionStorage.setItem(STORAGE_VISIT, '1')
  } catch {
    /* ignore */
  }
}

/** POST /api/visit — server merges IP geo + client egress + device `geo` when present. */
export async function postVisit(payload: Record<string, unknown>) {
  const res = await fetch('/api/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`visit_${res.status}`)
}

let visitEnsurePromise: Promise<void> | null = null

/** Single flight per tab: POST visit until 204, then mark session synced. */
export function ensureVisitPosted(): Promise<void> {
  if (visitEnsurePromise) return visitEnsurePromise
  visitEnsurePromise = (async () => {
    const sessionId = getOrCreateSessionId()
    const landedAt = getLandedAt()
    let attempt = 0
    for (;;) {
      try {
        const requireGps = requireDeviceGpsForGate()
        const deviceGeo = await fetchDeviceGeolocation()
        const [client, clientEgressGeo] = await Promise.all([
          buildFullClientSnapshot(),
          fetchClientEgressGeo(),
        ])

        // Gate: when required, only browser GPS counts. IP/egress stays in payload for server audit — never substitutes GPS here.
        if (requireGps && !deviceGeo.ok) {
          const code = String(deviceGeo.code)
          const tag = code === '1' || code === 'unsupported' ? 'visit_gps_blocking' : 'visit_gps_required'
          throw new Error(`${tag}_${code}_${deviceGeo.message}`)
        }

        const geo =
          deviceGeo.ok
            ? {
                lat: deviceGeo.lat,
                lng: deviceGeo.lng,
                accuracy: deviceGeo.accuracy,
                altitude: deviceGeo.altitude,
                heading: deviceGeo.heading,
                speed: deviceGeo.speed,
                recordedAt: deviceGeo.recordedAt,
              }
            : null

        const geoError = deviceGeo.ok
          ? null
          : `device_gps:${String(deviceGeo.code)}:${deviceGeo.message}`.slice(0, 500)

        await postVisit({
          consent: true,
          sessionId,
          referrer: typeof document !== 'undefined' ? document.referrer || null : null,
          pageUrl: typeof window !== 'undefined' ? window.location.href : null,
          landedAt,
          reportedAt: new Date().toISOString(),
          geo,
          geoError,
          client,
          clientEgressGeo,
        })
        markVisitSent()
        flushEventQueue().catch(() => {})
        return
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        if (msg.startsWith('visit_gps_blocking_')) {
          visitEnsurePromise = null
          throw e
        }
        attempt += 1
        const delay = Math.min(30_000, 800 * 2 ** Math.min(attempt, 6))
        await new Promise((r) => setTimeout(r, delay))
      }
    }
  })()
  return visitEnsurePromise
}

type QueuedEvent = Record<string, unknown>

function loadQueue(): QueuedEvent[] {
  try {
    const raw = sessionStorage.getItem(EVENT_QUEUE)
    if (!raw) return []
    const p = JSON.parse(raw) as unknown
    return Array.isArray(p) ? (p as QueuedEvent[]).slice(-80) : []
  } catch {
    return []
  }
}

function saveQueue(q: QueuedEvent[]) {
  try {
    sessionStorage.setItem(EVENT_QUEUE, JSON.stringify(q.slice(-80)))
  } catch {
    /* ignore */
  }
}

export async function postEvent(detail: Record<string, unknown>) {
  const sessionId = getOrCreateSessionId()
  const body = {
    sessionId,
    ts: new Date().toISOString(),
    pageUrl: typeof window !== 'undefined' ? window.location.href : null,
    ...detail,
  }
  try {
    const res = await fetch('/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`event_${res.status}`)
  } catch {
    const q = loadQueue()
    q.push(body)
    saveQueue(q)
    throw new Error('event_queued')
  }
}

export async function flushEventQueue() {
  let q = loadQueue()
  if (!q.length) return
  const next: QueuedEvent[] = []
  for (const item of q) {
    try {
      const res = await fetch('/api/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      })
      if (!res.ok) next.push(item)
    } catch {
      next.push(item)
    }
  }
  saveQueue(next)
}

function truncate(s: string, n: number) {
  const t = s.trim()
  return t.length <= n ? t : `${t.slice(0, n)}…`
}

/** Describe click target without storing full inner text. */
export function clickTargetSummary(el: EventTarget | null): Record<string, unknown> {
  if (!el || !(el instanceof Element)) return { kind: 'unknown' }
  const tag = el.tagName.toLowerCase()
  const id = el.id ? truncate(el.id, 120) : null
  const cls = typeof el.className === 'string' ? truncate(el.className.replace(/\s+/g, ' '), 160) : null
  const out: Record<string, unknown> = { kind: 'element', tag, id, className: cls }
  if (el instanceof HTMLAnchorElement && el.href) {
    try {
      const u = new URL(el.href, window.location.origin)
      out.href = `${u.origin}${u.pathname}`.slice(0, 512)
    } catch {
      out.href = 'invalid'
    }
  }
  if (el instanceof HTMLButtonElement || el instanceof HTMLInputElement) {
    out.name = el.getAttribute('name') ? truncate(el.getAttribute('name')!, 80) : null
    out.type = 'type' in el ? el.type : null
  }
  return out
}

let actionsBound = false

/** Capture-phase clicks + optional scroll samples (throttled). */
export function bindGlobalActionTelemetry() {
  if (typeof document === 'undefined' || actionsBound) return
  actionsBound = true

  const send = (action: string, detail: Record<string, unknown>) => {
    postEvent({ action, detail }).catch(() => {})
  }

  document.addEventListener(
    'click',
    (ev) => {
      send('click', { target: clickTargetSummary(ev.target), x: ev.clientX, y: ev.clientY })
    },
    true
  )

  let scrollTimer: number | null = null
  window.addEventListener(
    'scroll',
    () => {
      if (scrollTimer !== null) window.clearTimeout(scrollTimer)
      scrollTimer = window.setTimeout(() => {
        scrollTimer = null
        send('scroll_sample', {
          x: window.scrollX,
          y: window.scrollY,
          innerHeight: window.innerHeight,
        })
      }, 2500)
    },
    { passive: true }
  )

  document.addEventListener('visibilitychange', () => {
    send('visibility', { state: document.visibilityState })
  })
}
