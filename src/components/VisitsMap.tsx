import { useEffect, useMemo } from 'react'
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { MapPoint } from '../lib/visitGeo'
import { googleMapsNavigateUrl, googleMapsSearchUrl, openStreetMapUrl, tierColor } from '../lib/visitGeo'

function FitBounds({ points }: { points: MapPoint[] }) {
  const map = useMap()
  const key = useMemo(() => points.map((p) => `${p.lat},${p.lng}`).join('|'), [points])

  useEffect(() => {
    if (points.length === 0) return
    const latlngs = points.map((p) => L.latLng(p.lat, p.lng))
    const b = L.latLngBounds(latlngs)
    map.fitBounds(b, { padding: [36, 36], maxZoom: 14, animate: true })
  }, [map, key, points])

  return null
}

type Props = {
  points: MapPoint[]
  selectedId: string | null
  onSelect: (id: string) => void
}

export function VisitsMap({ points, selectedId, onSelect }: Props) {
  const center = useMemo((): [number, number] => {
    if (points.length === 0) return [26.82, 30.8]
    const p = points[0]
    return [p.lat, p.lng]
  }, [points])

  if (points.length === 0) {
    return (
      <div className="flex min-h-[min(44dvh,320px)] flex-col items-center justify-center gap-2 rounded-[var(--radius-xl)] border border-dashed border-slate-300/90 bg-[#faf8f4] px-4 py-10 text-center sm:min-h-[min(48vh,400px)]">
        <p className="max-w-sm text-sm font-medium text-slate-700">لا توجد نقاط على الخريطة بعد</p>
        <p className="max-w-xs text-xs leading-relaxed text-slate-500">
          تظهر النقاط عندما يُسمح للمتصفح بحفظ موقع الزائر من جهازه. الزيارات القديمة أو التي رُفض فيها الموقع لن
          تظهر هنا.
        </p>
      </div>
    )
  }

  return (
    <div
      className="overflow-hidden rounded-[var(--radius-xl)] border border-slate-200/90 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.18)]"
      dir="ltr"
    >
      <MapContainer
        center={center}
        zoom={11}
        className="z-0 h-[min(44dvh,340px)] w-full sm:h-[min(48vh,420px)]"
        scrollWheelZoom
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {points.map((p) => {
          const color = tierColor(p.tier)
          const isSel = selectedId === p.id
          return (
            <CircleMarker
              key={p.id}
              center={[p.lat, p.lng]}
              radius={isSel ? 12 : 8}
              pathOptions={{
                color,
                fillColor: color,
                fillOpacity: isSel ? 0.95 : 0.75,
                weight: isSel ? 3 : 2,
              }}
              eventHandlers={{
                click: () => onSelect(p.id),
              }}
            >
              <Popup>
                <div className="min-w-[180px] max-w-[220px] text-xs" dir="rtl">
                  <p className="font-bold text-slate-800">{p.cityLine}</p>
                  <div className="mt-2 flex flex-col gap-1.5">
                    <a
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-center text-[11px] font-semibold text-white hover:bg-emerald-700"
                      href={openStreetMapUrl(p.lat, p.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      خريطة مفتوحة
                    </a>
                    <a
                      className="rounded-lg bg-sky-600 px-3 py-2 text-center text-[11px] font-semibold text-white hover:bg-sky-700"
                      href={googleMapsSearchUrl(p.lat, p.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      خرائط جوجل
                    </a>
                    <a
                      className="rounded-lg bg-amber-600 px-3 py-2 text-center text-[11px] font-semibold text-white hover:bg-amber-700"
                      href={googleMapsNavigateUrl(p.lat, p.lng)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      توجيه بالسيارة
                    </a>
                  </div>
                </div>
              </Popup>
            </CircleMarker>
          )
        })}
      </MapContainer>
    </div>
  )
}
