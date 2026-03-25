/** Human-facing copy and formatting for the visits dashboard (non-technical users). */

export function formatVisitWhen(iso: string | null | undefined): string {
  if (!iso || !String(iso).trim()) return '—'
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return iso
    return new Intl.DateTimeFormat('ar-EG', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return iso
  }
}

export function regionGuessFromVisit(v: {
  ipGeo?: { city?: string | null; region?: string | null; country?: string | null } | null
}): string {
  const parts = [v.ipGeo?.city, v.ipGeo?.region, v.ipGeo?.country].filter(
    (x): x is string => Boolean(x && String(x).trim())
  )
  const uniq = [...new Set(parts)]
  return uniq.slice(0, 3).join(' · ') || 'غير متوفر'
}

export function sessionShort(id: string | null | undefined): string {
  if (!id) return '—'
  return id.length > 10 ? `${id.slice(0, 8)}…` : id
}

/** Short Arabic hint when device location failed (no raw codes on the main card). */
export function deviceLocationStatus(v: {
  geo?: { lat: number; lng: number; accuracy?: number | null } | null
  geoError?: string | null
}): { label: string; ok: boolean; accuracyM: number | null } {
  if (v.geo && typeof v.geo.lat === 'number' && typeof v.geo.lng === 'number') {
    const m =
      typeof v.geo.accuracy === 'number' && Number.isFinite(v.geo.accuracy)
        ? Math.round(v.geo.accuracy)
        : null
    return {
      ok: true,
      label: m != null ? `تم التقاط الموقع من الجهاز (تقريبًا ±${m} م)` : 'تم التقاط الموقع من الجهاز',
      accuracyM: m,
    }
  }
  const e = (v.geoError ?? '').toLowerCase()
  if (e.includes('denied') || e.includes('code_1') || e.includes(':1:')) {
    return { ok: false, label: 'لم يُسمح بالوصول للموقع على هذا الجهاز', accuracyM: null }
  }
  if (e.includes('timeout') || e.includes('code_3')) {
    return { ok: false, label: 'انتهى وقت انتظار الموقع — يمكن إعادة المحاولة لاحقًا', accuracyM: null }
  }
  if (e.includes('unsupported') || e.includes('missing')) {
    return { ok: false, label: 'المتصفح لا يدعم تحديد الموقع', accuracyM: null }
  }
  if (v.geoError) {
    return { ok: false, label: 'لم يُحفَظ موقع الجهاز لهذه الزيارة', accuracyM: null }
  }
  return { ok: false, label: 'لا يوجد موقع من الجهاز', accuracyM: null }
}
