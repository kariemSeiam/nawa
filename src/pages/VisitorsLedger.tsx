import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapLinkDeck } from '../components/MapLinkDeck'
import { VisitsMap } from '../components/VisitsMap'
import {
  extractVisitMapPoint,
  googleMapsNavigateUrl,
  googleMapsSearchUrl,
  openStreetMapUrl,
  type MapPoint,
  type VisitRowLike,
} from '../lib/visitGeo'
import { deviceLocationStatus, formatVisitWhen, regionGuessFromVisit, sessionShort } from '../lib/visitUi'

type VisitRow = VisitRowLike

function VisitCard({
  v,
  mapPoint,
  selected,
  onSelectMap,
}: {
  v: VisitRow
  mapPoint: MapPoint | null
  selected: boolean
  onSelectMap: () => void
}) {
  const loc = deviceLocationStatus(v)
  const when = formatVisitWhen(v.serverReceivedAt ?? v.ts)
  const region = regionGuessFromVisit(v)
  const rowKey = v.visitId ?? `${v.ts}-${v.sessionId}`

  return (
    <article
      className={`rounded-[var(--radius-xl)] border bg-white p-4 shadow-card transition sm:p-5 ${
        selected
          ? 'border-amber-400/90 ring-2 ring-amber-300/50'
          : 'border-slate-200/90 hover:border-slate-300'
      } ${mapPoint ? 'cursor-pointer' : ''}`}
      onClick={() => {
        if (mapPoint) onSelectMap()
      }}
      aria-current={selected ? 'true' : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-display text-[0.65rem] font-bold uppercase tracking-wide text-amber-800/90">
            وقت التسجيل
          </p>
          <p className="mt-1 text-base font-bold leading-snug text-slate-900 sm:text-lg">{when}</p>
        </div>
        {mapPoint && (
          <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-900 sm:text-xs">
            على الخريطة
          </span>
        )}
      </div>

      <dl className="mt-4 space-y-3 text-sm">
        <div>
          <dt className="text-xs font-semibold text-slate-500">تقدير المنطقة من الشبكة</dt>
          <dd className="mt-0.5 font-medium text-slate-800">{region}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500">الموقع من الجهاز</dt>
          <dd
            className={`mt-0.5 font-medium leading-relaxed ${
              loc.ok ? 'text-emerald-800' : 'text-slate-600'
            }`}
          >
            {loc.label}
          </dd>
        </div>
      </dl>

      {mapPoint ? (
        <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4" onClick={(e) => e.stopPropagation()}>
          <p className="text-center text-[11px] font-medium text-slate-500">افتح الموقع في خدمة أخرى</p>
          <div className="grid grid-cols-1 gap-2 xs:grid-cols-3">
            <a
              href={openStreetMapUrl(mapPoint.lat, mapPoint.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring flex min-h-touch items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 text-xs font-bold text-emerald-900 transition hover:bg-emerald-100"
            >
              خريطة مفتوحة
            </a>
            <a
              href={googleMapsSearchUrl(mapPoint.lat, mapPoint.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring flex min-h-touch items-center justify-center rounded-xl border border-sky-200 bg-sky-50/80 px-3 text-xs font-bold text-sky-900 transition hover:bg-sky-100"
            >
              خرائط جوجل
            </a>
            <a
              href={googleMapsNavigateUrl(mapPoint.lat, mapPoint.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="focus-ring flex min-h-touch items-center justify-center rounded-xl border border-amber-200 bg-amber-50/80 px-3 text-xs font-bold text-amber-950 transition hover:bg-amber-100"
            >
              توجيه
            </a>
          </div>
        </div>
      ) : null}

      <details className="mt-4 border-t border-slate-100 pt-3">
        <summary className="focus-ring cursor-pointer list-none text-xs font-semibold text-slate-500 marker:content-none [&::-webkit-details-marker]:hidden">
          تفاصيل إضافية — اختياري
        </summary>
        <dl className="mt-3 space-y-2 text-[11px] text-slate-600">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-slate-500">معرّف الجلسة (مختصر)</dt>
            <dd className="font-mono" dir="ltr">
              {sessionShort(v.sessionId ?? undefined)}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-slate-500">توقيت فتح الصفحة</dt>
            <dd className="text-start font-mono text-[10px]" dir="ltr">
              {formatVisitWhen(v.landedAt)}
            </dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-slate-500">لغة المتصفح</dt>
            <dd className="font-mono text-[10px]" dir="ltr">
              {(v.client?.language as string) ?? '—'}
            </dd>
          </div>
          <div className="break-all font-mono text-[10px] text-slate-500" dir="ltr" title={rowKey}>
            رقم السجل: {rowKey}
          </div>
        </dl>
      </details>
    </article>
  )
}

export default function VisitorsLedger() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<{
    generatedAt: string
    count: number
    visits: VisitRow[]
  } | null>(null)
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/internal/visitors?limit=500')
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError('تعذّر تحميل القائمة. تحقق من الاتصال أو أعد المحاولة.')
        setPayload(null)
        return
      }
      setPayload(data)
    } catch {
      setError('لا يوجد اتصال بالخادم حاليًا.')
      setPayload(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const rows = useMemo(() => payload?.visits ?? [], [payload])

  const mapPoints = useMemo(
    () => rows.map(extractVisitMapPoint).filter((p): p is MapPoint => p != null),
    [rows]
  )

  useEffect(() => {
    if (mapPoints.length === 0) {
      setSelectedMapId(null)
      return
    }
    setSelectedMapId((prev) =>
      prev && mapPoints.some((p) => p.id === prev) ? prev : mapPoints[0].id
    )
  }, [mapPoints])

  const selectedPoint = useMemo(
    () => mapPoints.find((p) => p.id === selectedMapId) ?? null,
    [mapPoints, selectedMapId]
  )

  const stats = useMemo(() => {
    const total = rows.length
    const onMap = mapPoints.length
    const updated = payload ? formatVisitWhen(payload.generatedAt) : '—'
    return { total, onMap, updated }
  }, [rows.length, mapPoints.length, payload])

  return (
    <div
      className="min-h-screen-safe min-h-dvh bg-[#f5f3ed] text-slate-900"
      dir="rtl"
      style={{
        backgroundImage: `radial-gradient(720px 320px at 100% 0%, rgba(180, 134, 11, 0.06), transparent 55%),
          radial-gradient(520px 280px at 0% 100%, rgba(30, 58, 95, 0.05), transparent 50%)`,
      }}
    >
      <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-[#f5f3ed]/92 pb-[env(safe-area-inset-top,0px)] backdrop-blur-lg">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
          <div className="min-w-0">
            <p className="font-display text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl">
              لوحة الزيارات
            </p>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-600 sm:text-sm">
              صفحة خاصة لمراجعة من زار الموقع وأين تقريبًا. من يملك الرابط فقط يمكنه فتحها — لا تشاركها علنًا.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => void load()}
              className="focus-ring inline-flex min-h-touch flex-1 items-center justify-center rounded-2xl bg-amber-500 px-5 text-sm font-bold text-slate-900 shadow-sm transition hover:bg-amber-400 disabled:opacity-50 sm:flex-none"
            >
              {loading ? 'جاري التحديث…' : 'تحديث القائمة'}
            </button>
            <Link
              to="/"
              className="focus-ring inline-flex min-h-touch flex-1 items-center justify-center rounded-2xl border-2 border-slate-300/90 bg-white px-5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-slate-400 sm:flex-none"
            >
              الصفحة الرئيسية
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-10 pt-6 sm:px-6 sm:pb-12 sm:pt-8">
        {error && (
          <div
            className="mb-6 rounded-[var(--radius-xl)] border border-red-200/90 bg-red-50 px-4 py-4 text-sm text-red-900"
            role="alert"
          >
            {error}
          </div>
        )}

        {payload && (
          <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm sm:py-5">
              <p className="text-xs font-semibold text-slate-500">إجمالي الزيارات</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-slate-900">{stats.total}</p>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm sm:py-5">
              <p className="text-xs font-semibold text-slate-500">ظاهرة على الخريطة</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-emerald-800">{stats.onMap}</p>
              <p className="mt-1 text-[11px] text-slate-500">حيث وافق الزائر على الموقع من جهازه</p>
            </div>
            <div className="rounded-2xl border border-slate-200/90 bg-white px-4 py-4 shadow-sm sm:py-5">
              <p className="text-xs font-semibold text-slate-500">آخر تحديث للقائمة</p>
              <p className="mt-1 text-sm font-bold leading-snug text-slate-800">{stats.updated}</p>
            </div>
          </section>
        )}

        {payload && rows.length > 0 && (
          <section className="mb-10 overflow-hidden rounded-[var(--radius-xl)] border border-slate-200/90 bg-white p-4 shadow-card sm:p-6">
            <div className="mb-4">
              <h2 className="font-display text-lg font-bold text-slate-900 sm:text-xl">خريطة الزيارات</h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600 sm:text-sm">
                كل نقطة خضراء = موقع سجّله المتصفح من جهاز الزائر بعد الموافقة. اضغط نقطة أو بطاقة في الأسفل
                لمزامنة روابط الخرائط.
              </p>
            </div>
            <VisitsMap points={mapPoints} selectedId={selectedMapId} onSelect={(id) => setSelectedMapId(id)} />
            <MapLinkDeck point={selectedPoint} />
            <p className="mt-4 text-center text-[10px] text-slate-400">
              خرائط الأساس من{' '}
              <a
                href="https://www.openstreetmap.org/copyright"
                className="underline-offset-2 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                OpenStreetMap
              </a>
            </p>
          </section>
        )}

        <section>
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <h2 className="font-display text-lg font-bold text-slate-900 sm:text-xl">قائمة الزيارات</h2>
            <p className="text-xs text-slate-500">الأحدث أولًا — مرّر للأسفل على الجوال</p>
          </div>

          {rows.length === 0 && !loading && (
            <div className="rounded-[var(--radius-xl)] border border-dashed border-slate-300/90 bg-[#faf8f4] px-6 py-14 text-center">
              <p className="font-medium text-slate-700">لا توجد زيارات مسجّلة بعد</p>
              <p className="mt-2 text-sm text-slate-500">عند زيارة الموقع ستظهر البطاقات هنا. اضغط «تحديث القائمة».</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-3">
            {rows.map((v) => {
              const pt = extractVisitMapPoint(v)
              const rowId = v.visitId ?? `${v.ts}-${v.sessionId}`
              const isSel = pt != null && selectedMapId === pt.id
              return (
                <VisitCard
                  key={rowId}
                  v={v}
                  mapPoint={pt}
                  selected={isSel}
                  onSelectMap={() => pt && setSelectedMapId(pt.id)}
                />
              )
            })}
          </div>
        </section>

        {rows.length > 0 && (
          <details className="mt-10 rounded-[var(--radius-xl)] border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
            <summary className="focus-ring cursor-pointer list-none font-display text-sm font-bold text-slate-800 marker:content-none [&::-webkit-details-marker]:hidden">
              بيانات تقنية لأحدث زيارة — للدعم فقط
            </summary>
            <p className="mt-2 text-xs text-slate-500">
              لا حاجة لقراءة هذا القسم إلا إذا طلب منك فريق الدعم نسخًا من البيانات.
            </p>
            <pre
              className="mt-4 max-h-[min(50vh,420px)] overflow-auto rounded-xl bg-slate-900 p-4 text-[10px] leading-relaxed text-amber-100/95"
              dir="ltr"
            >
              {JSON.stringify(rows[0], null, 2)}
            </pre>
          </details>
        )}
      </main>
    </div>
  )
}
