/** Visit rows from API — tolerate older logs without `location`. */
export type VisitRowLike = {
  visitId?: string
  ts?: string
  serverReceivedAt?: string
  sessionId?: string | null
  landedAt?: string | null
  reportedAt?: string | null
  referrer?: string | null
  pageUrl?: string | null
  geoError?: string | null
  client?: Record<string, unknown> | null
  consent?: boolean
  ip?: string | null
  geo?: { lat: number; lng: number; accuracy?: number | null } | null
  ipGeo?: {
    lat?: number
    lng?: number
    city?: string | null
    region?: string | null
    country?: string | null
    source?: string | null
  } | null
  clientEgressGeo?: {
    lat?: number
    lng?: number
    city?: string | null
    region?: string | null
    country?: string | null
    source?: string | null
  } | null
  location?: {
    latLngBest?: { lat: number; lng: number; tier?: string; providerHint?: string | null } | null
    primarySource?: string
  } | null
  locationAudit?: {
    latLngBest?: { lat: number; lng: number; tier?: string; providerHint?: string | null } | null
  } | null
}

export type MapPoint = {
  id: string
  lat: number
  lng: number
  tier: string
  at: string
  ip: string | null
  cityLine: string
  providerHint: string | null
}

const TIER_LABEL: Record<string, string> = {
  gps_browser: 'موقع الجهاز',
  server_ip_geo: 'خادم IP',
  client_egress_ip_geo: 'متصفح IP',
  none: '—',
}

/** Caption for map popup — device fix only (no IP-derived place names). */
function deviceMapCaption(v: VisitRowLike): string {
  const g = v.geo
  if (!g) return 'موقع الجهاز'
  const a = g.accuracy
  if (typeof a === 'number' && Number.isFinite(a)) {
    return `موقع الجهاز · دقة تقديرية ±${Math.round(a)} م`
  }
  return 'موقع الجهاز'
}

function buildPoint(
  v: VisitRowLike,
  lat: number,
  lng: number,
  tier: string,
  providerHint: string | null,
  cityLine: string
): MapPoint {
  return {
    id: v.visitId ?? `${v.ts}-${v.ip ?? 'x'}`,
    lat,
    lng,
    tier,
    at: v.serverReceivedAt ?? v.ts ?? '',
    ip: v.ip ?? null,
    cityLine,
    providerHint,
  }
}

/**
 * Map + “خرائط” links use **device GPS only** (`geo` from the visit payload).
 * IP / egress coordinates are never plotted or linked here (still in raw JSON for audit).
 */
export function extractVisitMapPoint(v: VisitRowLike): MapPoint | null {
  if (v.geo && typeof v.geo.lat === 'number' && typeof v.geo.lng === 'number') {
    return buildPoint(
      v,
      v.geo.lat,
      v.geo.lng,
      'gps_browser',
      null,
      deviceMapCaption(v)
    )
  }
  return null
}

export function tierLabel(tier: string): string {
  return TIER_LABEL[tier] ?? tier
}

export function openStreetMapUrl(lat: number, lng: number, zoom = 14): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=${zoom}`
}

export function googleMapsSearchUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

/** Open Google Maps with driving directions to the pin. */
export function googleMapsNavigateUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

export const TIER_COLOR: Record<string, string> = {
  gps_browser: '#059669',
  server_ip_geo: '#0ea5e9',
  client_egress_ip_geo: '#d97706',
  unknown: '#64748b',
}

export function tierColor(tier: string): string {
  return TIER_COLOR[tier] ?? TIER_COLOR.unknown
}
