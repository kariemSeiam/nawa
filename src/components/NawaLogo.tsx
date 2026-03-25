import { useId } from 'react'

type Props = {
  className?: string
  /** `mark` = plate inside SVG (favicon, gate). `badge` = one outer frame only; glyph only inside SVG — no double cream box. */
  variant?: 'mark' | 'badge'
  title?: string
}

/**
 * نواة الجملة — bold N monogram: slate stems + brass diagonal.
 * Badge variant must not repeat the plate: wrapper = frame, SVG = letter only.
 */
export function NawaLogo({ className = '', variant = 'badge', title }: Props) {
  const uid = useId().replace(/:/g, '')
  const gBrass = `nawa-brass-${uid}`

  const defsAndGlyph = (
    <>
      <defs>
        <linearGradient id={gBrass} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4a84b" />
          <stop offset="55%" stopColor="#a16207" />
          <stop offset="100%" stopColor="#713f12" />
        </linearGradient>
      </defs>

      <path
        d="M 21 46 V 17.5"
        stroke="#1e293b"
        strokeWidth="5.25"
        strokeLinecap="round"
        strokeOpacity="0.92"
      />
      <path
        d="M 21 17.5 L 43 46.5"
        stroke={`url(#${gBrass})`}
        strokeWidth="5.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 43 46.5 V 18"
        stroke="#1e293b"
        strokeWidth="5.25"
        strokeLinecap="round"
        strokeOpacity="0.92"
      />
    </>
  )

  const plate = (
    <rect x="4" y="4" width="56" height="56" rx="14" fill="#f0ebe3" stroke="#e3dcd2" strokeWidth="1" />
  )

  const label = title ?? 'نواة الجملة — توريد كهربائي بالجملة'

  if (variant === 'mark') {
    return (
      <svg
        className={className}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label={label}
      >
        <title>{label}</title>
        {plate}
        {defsAndGlyph}
      </svg>
    )
  }

  return (
    <div
      role="img"
      aria-label={label}
      className={`flex items-center justify-center rounded-xl border border-slate-200/85 bg-[#f0ebe3] shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${className}`}
    >
      <svg className="h-[72%] w-[72%]" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        {defsAndGlyph}
      </svg>
    </div>
  )
}
