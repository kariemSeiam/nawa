import type { MapPoint } from '../lib/visitGeo'
import { googleMapsNavigateUrl, googleMapsSearchUrl, openStreetMapUrl } from '../lib/visitGeo'

type Props = { point: MapPoint | null }

export function MapLinkDeck({ point }: Props) {
  if (!point) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300/90 bg-[#faf8f4] px-4 py-8 text-center">
        <p className="text-sm font-medium text-slate-600">اختر زيارة من القائمة أعلاه لعرض روابط الخرائط.</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">تظهر الروابط فقط للزيارات التي سجّلت موقعًا من الجهاز.</p>
      </div>
    )
  }

  const { lat, lng } = point

  const items = [
    {
      href: openStreetMapUrl(lat, lng),
      title: 'خريطة مفتوحة',
      desc: 'عرض مجاني على الإنترنت',
      className:
        'border-emerald-200/80 bg-white hover:border-emerald-300 hover:bg-emerald-50/50 active:bg-emerald-50',
      labelClass: 'text-emerald-900',
    },
    {
      href: googleMapsSearchUrl(lat, lng),
      title: 'خرائط جوجل',
      desc: 'عرض أو قمر صناعي',
      className: 'border-sky-200/80 bg-white hover:border-sky-300 hover:bg-sky-50/50 active:bg-sky-50',
      labelClass: 'text-sky-900',
    },
    {
      href: googleMapsNavigateUrl(lat, lng),
      title: 'توجيه بالسيارة',
      desc: 'فتح التطبيق للوصول',
      className:
        'border-amber-200/90 bg-white hover:border-amber-300 hover:bg-amber-50/60 active:bg-amber-50',
      labelClass: 'text-amber-950',
    },
  ] as const

  return (
    <div className="mt-5 space-y-3">
      <p className="text-center text-xs font-medium text-slate-500">روابط سريعة للموقع المختار</p>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 sm:gap-3">
        {items.map((c) => (
          <a
            key={c.title}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`focus-ring flex min-h-touch flex-col justify-center rounded-2xl border-2 px-4 py-3.5 text-center shadow-sm transition sm:min-h-[4.25rem] sm:py-4 ${c.className}`}
          >
            <span className={`font-display text-sm font-bold sm:text-base ${c.labelClass}`}>{c.title}</span>
            <span className="mt-0.5 text-[11px] leading-snug text-slate-600 sm:text-xs">{c.desc}</span>
          </a>
        ))}
      </div>
      <p className="text-center font-mono text-[10px] text-slate-400" dir="ltr">
        {lat.toFixed(5)} · {lng.toFixed(5)}
      </p>
    </div>
  )
}
