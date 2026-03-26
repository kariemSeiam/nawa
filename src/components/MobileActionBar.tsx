type Props = {
  waHref: string
  catalogHref: string
}

export function MobileActionBar({ waHref, catalogHref }: Props) {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/90 bg-nawa-parchment/93 pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-8px_32px_-12px_rgba(15,23,42,0.12)] backdrop-blur-xl md:hidden"
      aria-label="إجراءات سريعة"
    >
      <div className="mx-auto flex max-w-lg gap-2 px-3 py-2.5">
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring inline-flex min-h-touch flex-1 items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-4 text-sm font-bold text-white shadow-[0_8px_28px_rgba(37,211,102,0.35)] transition hover:brightness-105 active:scale-[0.98]"
        >
          <span aria-hidden className="text-lg">
            💬
          </span>
          واتساب
        </a>
        <a
          href={catalogHref}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring inline-flex min-h-touch flex-1 items-center justify-center rounded-2xl border-2 border-slate-300/90 bg-white px-4 text-sm font-bold text-slate-800 shadow-sm transition hover:border-slate-400 active:scale-[0.98]"
        >
          المستندات
        </a>
      </div>
    </nav>
  )
}
