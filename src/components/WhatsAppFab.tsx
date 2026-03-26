type Props = { href: string; className?: string }

export function WhatsAppFab({ href, className = '' }: Props) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] end-[max(1rem,env(safe-area-inset-right,0px))] z-40 hidden h-14 w-14 min-h-touch min-w-touch items-center justify-center rounded-full bg-[#25D366] text-2xl text-white shadow-[0_14px_44px_rgba(37,211,102,0.42)] transition hover:scale-[1.04] hover:shadow-[0_18px_52px_rgba(37,211,102,0.5)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#25D366] motion-safe:active:scale-95 md:flex ${className}`}
      aria-label="استفسار تمويل عبر واتساب"
    >
      <span aria-hidden>💬</span>
    </a>
  )
}
