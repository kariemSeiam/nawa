import { useEffect, useMemo, useState } from 'react'
import { MobileActionBar } from '../components/MobileActionBar'
import { NawaLogo } from '../components/NawaLogo'
import { WhatsAppFab } from '../components/WhatsAppFab'
import { ensureVisitPosted, readVisitSent } from '../lib/telemetry'

const CATEGORIES = [
  {
    title: 'كوابل وأسلاك (نحاس وألمنيوم)',
    desc: 'من مقاسات التأسيس حتى مشاريع الضغط المتوسط — توريد مجدول حسب جدول الشدّ الإنشائي.',
  },
  {
    title: 'فيش ومقابس (سكني وصناعي)',
    desc: 'تشكيلة للورش والمحلات والتشطيبات — جودة تشغيل وثبات في التركيب.',
  },
  {
    title: 'مفاتيح وسلاسل فنادق',
    desc: 'حلول تأسيس واضحة للشقق والمكاتب والتجاري — سلاسل فندقية عند الطلب.',
  },
  {
    title: 'لوحات توزيع ووحدات استهلاك',
    desc: 'تجهيز لوحات آمنة وفق متطلبات المقاول والاستشاري — MCB ووحدات منظمة.',
  },
  {
    title: 'قواطع وحماية (MCB / RCCB)',
    desc: 'تنسيق درجات الحماية مع نوع الحمل — تقليل الأعطال ووقت التوقف.',
  },
  {
    title: 'قنوات ومخفيات وكسوات',
    desc: 'PVC / GI ومسارات كابلات — تنسيق شكل الموقع وتسريع التركيب.',
  },
  {
    title: 'ملحقات إضاءة وتركيب',
    desc: 'حوامل، درايفرز LED، إطارات سبوت — للتشطيب التجاري والسكني الراقي.',
  },
  {
    title: 'أدوات سحب واختبار',
    desc: 'قصّ وسحب واختبار جهد — تجهيز فرق التركيب بأدوات عملية.',
  },
] as const

const BRANDS = [
  'Elsewedy',
  'Schneider',
  'Panasonic',
  'Legrand',
  'Alfanar',
  'ABB',
  'Hager',
  'MK',
] as const

const STEPS = [
  { t: '١', title: 'أرسل الطلب', body: 'صورة أو قائمة + الكمية + عنوان التسليم على واتساب.' },
  { t: '٢', title: 'تسعير سريع', body: 'نرجع بعرض واضح أو بأسعار شرائح حسب الكمية.' },
  { t: '٣', title: 'تأكيد وتوريد', body: 'نحدد موعد التحضير/الشحن حسب المخزون والمنطقة.' },
  { t: '٤', title: 'تسليم ومتابعة', body: 'استلام على الباب أو موقع المشروع — ومتابعة لأي ملاحظات.' },
] as const

const PRICING: readonly [string, string][] = [
  ['شرائح جملة', 'كلما زادت الكمية انخفض السعر — مناسب للتوريد المتكرر.'],
  ['عرض سعر للمشروع', 'كميات كبيرة أو مواصفات استشارية.'],
  ['سعر قائم + خصم حساب', 'للعملاء المسجّلين بعد تقييم أولي.'],
  ['آجل محدود', 'Net 30 / 60 للعملاء المثبتين فقط.'],
  ['كاش عند التسليم', 'للطلبات الأولى أو حسب الاتفاق.'],
] as const

const TESTIMONIALS = [
  {
    name: 'م. كريم — مقاول تشطيبات',
    quote:
      'أهم حاجة السرعة في الرد والالتزام بالمواعيد. القناة على واتساب وفّرت وقت مجالس كتير.',
  },
  {
    name: 'أحمد — صاحب محل كهرباء',
    quote:
      'التشكيلة الواسعة في الكابلات والفيش ساعدتني أغطي طلبات الزباين من غير ما ألف على ٣ موردين.',
  },
  {
    name: 'هندسة لبنان — مشرف موقع',
    quote:
      'محتاجين فواتير واضحة ومواصفات مطابقة. التنسيق على أصناف محددة قلّل المفاجآت في الموقع.',
  },
] as const

const FAQ = [
  {
    q: 'ما الحد الأدنى للطلب؟',
    a: 'يختلف حسب الصنف: أصناف الرولات والكابلات غالبًا لها MOQ أوضح، بينما المفاتيح والفيش يمكن تجميعها في طلب مرن. نحدد ذلك في أول رسالة.',
  },
  {
    q: 'هل يوجد فاتورة ضريبية؟',
    a: 'نعم — يمكن إصدار فاتورة رسمية عند الطلب وفق بيانات الشركة أو المحل.',
  },
  {
    q: 'ما نطاق التوصيل؟',
    a: 'نغطي تنسيق توريد لمحافظات متعددة داخل مصر — التفاصيل تُحدد حسب المخزون والكمية والموعد.',
  },
  {
    q: 'ما طرق الدفع؟',
    a: 'تحويل بنكي، كاش عند الاستلام حسب الاتفاق، وشروط آجل للعملاء المثبتين بعد تقييم أولي.',
  },
  {
    q: 'هل الأسعار معروضة على الموقع؟',
    a: 'نعرض نطاقات وشرائح بشكل عام في المحادثة. السوق يتحرك — نفضّل عرضًا مخصصًا لكمية فعلية.',
  },
] as const

const NAV = [
  { href: '#products', label: 'المنتجات' },
  { href: '#why', label: 'لماذا نواة' },
  { href: '#process', label: 'آلية العمل' },
  { href: '#faq', label: 'الأسئلة' },
] as const

const DELIVERY_GOVERNORATES = [
  'القاهرة',
  'الشرقية',
  'الجيزة',
  'القليوبية',
  'الإسكندرية',
  'البحيرة',
  'مطروح',
  'الغربية',
  'المنوفية',
  'الدقهلية',
  'كفر الشيخ',
  'دمياط',
  'بورسعيد',
  'الإسماعيلية',
  'السويس',
  'شمال سيناء',
  'جنوب سيناء',
  'الفيوم',
  'بني سويف',
  'المنيا',
  'أسيوط',
  'سوهاج',
  'قنا',
  'الأقصر',
  'أسوان',
  'الوادي الجديد',
  'البحر الأحمر',
] as const

export default function LandingPage() {
  const [unlocked, setUnlocked] = useState(() => readVisitSent())
  const [syncingGate, setSyncingGate] = useState(false)
  const [gateError, setGateError] = useState<string | null>(null)
  const [showGate, setShowGate] = useState(false)

  useEffect(() => {
    if (unlocked) {
      setShowGate(false)
      return
    }
    const t = window.setTimeout(() => {
      setShowGate(true)
    }, 10_000)
    return () => {
      window.clearTimeout(t)
    }
  }, [unlocked])

  const startGateFlow = async () => {
    if (syncingGate) return
    setGateError(null)
    setSyncingGate(true)
    try {
      await ensureVisitPosted()
      setUnlocked(true)
    } catch {
      setGateError('لا يمكن إكمال المتابعة الآن. يرجى المحاولة مرة أخرى.')
    } finally {
      setSyncingGate(false)
    }
  }

  const waNumber = (
    import.meta.env.VITE_WHATSAPP_NUMBER ?? '201000000000'
  ).replace(/\D/g, '')
  const waHref = useMemo(() => {
    const text = encodeURIComponent(
      'السلام عليكم — مهتم بتوريد أدوات كهربائية بالجملة. أرجو تزويدي بعرض حسب الكمية والمنطقة.'
    )
    return `https://wa.me/${waNumber}?text=${text}`
  }, [waNumber])

  const catalogHref = useMemo(() => {
    const text = encodeURIComponent('أرجو إرسال كاتالوج PDF أو قائمة الأسعار المتاحة حاليًا.')
    return `https://wa.me/${waNumber}?text=${text}`
  }, [waNumber])

  return (
    <div className="relative min-h-screen-safe bg-[#f5f3ed] text-slate-900">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.2]"
        style={{
          backgroundImage: `radial-gradient(760px 320px at 12% -4%, rgba(180, 134, 11, 0.08), transparent 60%),
            radial-gradient(520px 280px at 88% 4%, rgba(30, 58, 95, 0.06), transparent 56%)`,
        }}
        aria-hidden
      />

      {!unlocked && showGate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gate-title"
          aria-describedby="gate-desc"
        >
          <div className="absolute inset-0 bg-slate-900/55" />
          <div className="relative z-10 max-h-[min(90dvh,640px)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-[var(--radius-xl)] border border-white/25 bg-white/96 shadow-lift">
            <div className="h-1.5 w-full bg-gradient-to-l from-amber-400 via-amber-500 to-sky-400" />
            <div className="px-[max(1.25rem,env(safe-area-inset-left))] pb-8 pt-8 sm:px-10 sm:pb-10 sm:pt-10">
              <div className="mx-auto mb-5 flex justify-center">
                <NawaLogo variant="mark" className="h-14 w-14 drop-shadow-sm sm:h-16 sm:w-16" />
              </div>
              <p className="text-center text-sm font-semibold text-amber-800">
                مرحبًا بك في نواة الجملة
              </p>
              <h2
                id="gate-title"
                className="mt-3 text-center font-display text-2xl font-extrabold text-slate-900 sm:text-3xl"
              >
                نسعد بخدمتكم
              </h2>
              {!syncingGate ? (
                <>
                  <p
                    id="gate-desc"
                    className="mt-4 text-center text-sm leading-relaxed text-slate-600 sm:text-[0.95rem]"
                  >
                    للمواصلة، يلزم قبول ملفات الارتباط الخاصة بالموقع.
                  </p>
                  <div className="mt-6 rounded-2xl border border-slate-200/90 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600 sm:px-5 sm:text-sm">
                    <p>يتم استخدام ملفات الارتباط لتحسين تجربة التصفح واستمرار الجلسة.</p>
                    <p className="mt-1">بدون القبول لن تتم المتابعة إلى محتوى الموقع.</p>
                  </div>
                  {gateError && (
                    <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-center text-xs leading-relaxed text-red-800 sm:text-sm">
                      {gateError}
                    </p>
                  )}
                  <div className="mt-7 grid grid-cols-1 gap-2.5 xs:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => {
                        void startGateFlow()
                      }}
                      className="focus-ring inline-flex min-h-touch w-full items-center justify-center rounded-2xl border-2 border-slate-300/90 bg-white px-5 py-3 text-sm font-bold text-slate-800 transition hover:border-slate-400 active:scale-[0.99]"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void startGateFlow()
                      }}
                      className="focus-ring inline-flex min-h-touch w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
                    >
                      قبول والمتابعة
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <p
                    id="gate-desc"
                    className="mt-4 text-center text-sm leading-relaxed text-slate-600 sm:text-[0.95rem]"
                  >
                    جاري استكمال التهيئة…
                  </p>
                  <div
                    className="mt-8 flex min-h-touch w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3.5 text-base font-semibold text-slate-700"
                    role="status"
                    aria-live="polite"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-amber-500 motion-safe:animate-shimmer"
                      aria-hidden
                    />
                    جاري التهيئة…
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div
        className={!unlocked && showGate ? 'pointer-events-none blur-[3px] select-none' : ''}
        aria-hidden={!unlocked && showGate}
      >
        <div className="border-b border-amber-900/10 bg-[#1e293b] px-gutter py-2.5 text-center text-[clamp(0.7rem,2.4vw,0.875rem)] font-medium leading-snug text-amber-100/95 sm:py-3 sm:text-sm">
          <span className="inline-block max-w-3xl">
            منذ عام ٢٠١٠ — أكثر من <strong className="font-bold text-white">١٦ عامًا</strong> في
            توريد الأدوات الكهربائية بالجملة للمقاولين والمحلات والمشاريع
          </span>
        </div>

        <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-[#f5f3ed]/90 backdrop-blur-xl supports-[backdrop-filter]:bg-[#f5f3ed]/82">
          <div className="container-content flex min-h-touch items-center justify-between gap-3 py-3 sm:gap-4 sm:py-4">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
              <NawaLogo variant="badge" className="h-11 w-11 shrink-0 sm:h-12 sm:w-12" />
              <div className="min-w-0">
                <p className="truncate font-display text-base font-extrabold tracking-tight text-slate-900 sm:text-xl">
                  نواة الجملة
                </p>
                <p className="hidden text-xs text-slate-600 xs:block sm:text-sm">
                  توريد كهربائي موثوق — جملة للشركات والورش
                </p>
              </div>
            </div>

            <nav
              className="hidden items-center gap-1 lg:flex xl:gap-2"
              aria-label="أقسام الصفحة"
            >
              {NAV.map((n) => (
                <a
                  key={n.href}
                  href={n.href}
                  className="focus-ring rounded-xl px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-white/80 hover:text-slate-900"
                >
                  {n.label}
                </a>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring inline-flex min-h-touch items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 md:hidden"
              >
                واتساب
              </a>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring hidden min-h-touch items-center justify-center rounded-full border border-slate-800 bg-slate-900 px-5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 md:inline-flex"
              >
                طلب عرض سعر
              </a>
            </div>
          </div>
        </header>

        <main className={unlocked ? 'pb-mobile-bar' : ''}>
          {/* Hero */}
          <section className="py-[clamp(2.5rem,6vw,4.25rem)] md:py-[clamp(3rem,7vw,5.5rem)]">
            <div className="container-content grid items-center gap-10 lg:grid-cols-12 lg:gap-14 xl:gap-16">
              <div className="motion-safe:animate-fade-up lg:col-span-6">
                <p className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-amber-200/90 bg-white/90 px-3 py-2 text-[0.7rem] font-semibold leading-snug text-amber-950 shadow-card xs:text-xs sm:px-4 sm:py-1.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" aria-hidden />
                  مقاولون · محلات كهرباء · ورش · مشاريع إنشاء وتشطيب
                </p>
                <h1 className="mt-5 font-display text-hero font-extrabold leading-[1.18] tracking-tight text-balance-safe text-slate-900 motion-safe:animate-fade-up motion-safe:animate-delay-100">
                  شريك التوريد الكهربائي بالجملة — خبرة متراكمة وجودة معتمدة.
                </h1>
                <p className="mt-5 max-w-measure text-pretty text-lead font-medium leading-[1.88] text-slate-700 motion-safe:animate-fade-up motion-safe:animate-delay-200">
                  منذ أكثر من ستة عشر عامًا نخدم السوق المصري بكابلات وأسلاك، فيش ومقابس، مفاتيح،
                  لوحات توزيع، قواطع، وملحقات التركيب من علامات أصلية. ننسّق المخزون مع مواعيد
                  مشروعك، ونوفر متابعة مباشرة مع فريق المبيعات — عبر واتساب أو زيارة مكتبية عند
                  الحاجة.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex min-h-touch items-center justify-center rounded-2xl bg-[#25D366] px-6 py-3.5 text-base font-bold text-white shadow-[0_12px_36px_rgba(37,211,102,0.28)] transition hover:brightness-105 active:scale-[0.99] sm:min-w-[12rem]"
                  >
                    واتساب — اطلب سعرًا الآن
                  </a>
                  <a
                    href={catalogHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex min-h-touch items-center justify-center rounded-2xl border-2 border-slate-300/90 bg-white px-6 py-3.5 text-base font-bold text-slate-800 shadow-card transition hover:border-slate-400 active:scale-[0.99] sm:min-w-[12rem]"
                  >
                    اطلب كاتالوج PDF
                  </a>
                </div>
                <dl className="mt-10 grid grid-cols-3 gap-2 border-t border-slate-300/50 pt-8 xs:gap-4 sm:gap-8">
                  <div className="text-center sm:text-start">
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500 xs:text-[11px]">
                      خبرة في السوق
                    </dt>
                    <dd className="mt-1 font-display text-lg font-extrabold text-slate-900 xs:text-xl sm:text-2xl">
                      ١٦+ سنة
                    </dd>
                  </div>
                  <div className="text-center sm:text-start">
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500 xs:text-[11px]">
                      عملاء وشركاء
                    </dt>
                    <dd className="mt-1 font-display text-lg font-extrabold text-slate-900 xs:text-xl sm:text-2xl">
                      ٢٨٠+
                    </dd>
                  </div>
                  <div className="text-center sm:text-start">
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500 xs:text-[11px]">
                      التزام بالرد
                    </dt>
                    <dd className="mt-1 font-display text-lg font-extrabold text-slate-900 xs:text-xl sm:text-2xl">
                      سريع
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="motion-safe:animate-fade-up motion-safe:animate-delay-300 lg:col-span-6">
                <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-slate-200/90 bg-gradient-to-br from-white via-[#faf8f4] to-amber-50/40 p-6 shadow-lift sm:p-8 lg:p-10">
                  <div
                    className="pointer-events-none absolute -end-16 -top-16 h-48 w-48 rounded-full bg-amber-400/15 blur-2xl"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute -bottom-12 -start-12 h-40 w-40 rounded-full bg-slate-400/10 blur-2xl"
                    aria-hidden
                  />
                  <p className="relative text-xs font-bold uppercase tracking-wide text-amber-800/90">
                    لماذا يختارنا شركاء الجملة
                  </p>
                  <p className="relative mt-4 text-base font-semibold leading-[1.85] text-slate-800 sm:text-lg">
                    الثقة تُبنى بالوضوح: نوضح المواصفات، أوقات التوريد، وشروط الدفع — بصياغة يفهمها
                    المقاول والفني دون لغة إعلانية فارغة.
                  </p>
                  <ul className="relative mt-6 space-y-3 border-t border-slate-200/80 pt-6 text-sm text-slate-700">
                    <li className="flex gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
                      ردّ عملي على واتساب مع تتبع للطلبات المتكررة.
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
                      تنسيق توريد يتوافق مع جداول المشروع والكميات الفعلية.
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
                      علامات أصلية حسب التوفر — دون ادّعاءات غير مدعومة بمستندات.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Brands */}
          <section className="cv-auto section-y-tight border-y border-slate-200/80 bg-white/75">
            <div className="container-content">
              <p className="text-center text-sm font-bold text-slate-800 sm:text-base">
                علامات تجارية نورّدها حسب التوفر والاتفاق
              </p>
              <div className="mt-5 flex flex-nowrap items-center justify-start gap-x-10 gap-y-3 overflow-x-auto overscroll-x-contain pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:justify-center [&::-webkit-scrollbar]:hidden">
                {BRANDS.map((b) => (
                  <span
                    key={b}
                    dir="ltr"
                    className="shrink-0 snap-start text-sm font-bold tracking-tight text-slate-800 opacity-90 sm:text-base"
                  >
                    {b}
                  </span>
                ))}
              </div>
              <p className="mx-auto mt-4 max-w-2xl text-center text-xs leading-relaxed text-slate-500 sm:text-sm">
                أسماء العلامات للإشارة فقط؛ التوفر يعتمد على المخزون والاتفاق. لا ندّعي تمثيلًا
                رسميًا دون عقد.
              </p>
            </div>
          </section>

          {/* Product axes — compact list, same visual weight as brands / pricing */}
          <section id="products" className="cv-auto section-y-tight scroll-mt-24 border-y border-slate-200/80 bg-white/80">
            <div className="container-content">
              <div className="mx-auto max-w-3xl text-center">
                <h2 className="font-display text-h2 font-bold text-slate-900">محاور التوريد</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:mt-3 sm:text-lead sm:leading-[1.88]">
                  ثمانية فئات تغطي طلب الجملة اليومي — نص فقط وواضح، بلا صور زينة.
                </p>
              </div>

              <div className="mx-auto mt-6 max-w-4xl overflow-hidden rounded-[var(--radius-xl)] border border-slate-200/90 bg-[#faf8f4]/90 shadow-sm sm:mt-8">
                <ul className="divide-y divide-slate-200/80">
                  {CATEGORIES.map((c, i) => (
                    <li key={c.title} className="flex gap-3 px-4 py-3.5 transition hover:bg-white/70 sm:gap-4 sm:px-5 sm:py-4">
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xs font-extrabold text-amber-950 sm:h-10 sm:w-10 sm:text-sm"
                        aria-hidden
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1 text-start">
                        <h3 className="font-display text-sm font-bold leading-snug text-slate-900 sm:text-base">
                          {c.title}
                        </h3>
                        <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">{c.desc}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <p className="mx-auto mt-4 max-w-2xl text-center text-[11px] leading-relaxed text-slate-500 sm:mt-5 sm:text-xs">
                التوفر والأسعار يُحدَّدان في المحادثة حسب الكمية والموعد — اطلب عرضًا من واتساب عند الحاجة.
              </p>
            </div>
          </section>

          {/* Bento why */}
          <section id="why" className="cv-auto section-y scroll-mt-24 border-y border-slate-800/80 bg-slate-900 text-white">
            <div className="container-content">
              <h2 className="font-display text-h2 font-bold">لماذا نواة؟</h2>
              <p className="mt-3 max-w-measure text-sm font-medium leading-[1.9] text-slate-300 sm:text-lead">
                نجمع بين خبرة الجملة الطويلة ومعايير الخدمة الحديثة: شفافية في الطلبات، تنسيق
                توريد مرن، وواجهة مريحة على الجوال وسطح المكتب — لأن قرار الشراء غالبًا يُتخذ
                أثناء التنقّل.
              </p>
              <div className="mt-12 grid gap-4 sm:gap-5 lg:grid-cols-3">
                <div className="rounded-[var(--radius-xl)] border border-white/10 bg-white/5 p-6 sm:p-8 lg:col-span-2">
                  <h3 className="font-display text-lg font-bold sm:text-xl">جملة حقيقية + شفافية MOQ</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-[0.95rem]">
                    نماذج السوق: شرائح سعر حسب الكمية، عرض سعر للمشاريع، وخصومات للحسابات
                    المسجّلة. نوضح الحد الأدنى المتوقع لكل فئة — لتوفير وقت الطرفين.
                  </p>
                </div>
                <div className="rounded-[var(--radius-xl)] border border-amber-400/35 bg-gradient-to-br from-amber-500/25 to-transparent p-6 sm:p-8">
                  <h3 className="font-display text-lg font-bold text-amber-100 sm:text-xl">واتساب أولًا</h3>
                  <p className="mt-3 text-sm font-medium leading-[1.9] text-amber-50/95 sm:text-[0.95rem]">
                    قناة واتساب للمتابعة اليومية: قوائم أسعار، تأكيد كميات، ومستندات عند الطلب —
                    مع الحفاظ على أرشفة الطلبات كما يتوقع عمل الجملة.
                  </p>
                </div>
                <div className="rounded-[var(--radius-xl)] border border-white/10 bg-white/5 p-6 sm:p-8">
                  <h3 className="font-display text-lg font-bold sm:text-xl">مواصفات ومستندات</h3>
                  <p className="mt-3 text-sm font-medium leading-[1.9] text-slate-300 sm:text-[0.95rem]">
                    نركّز على وضوح الصنف والدفعات والمواعيد؛ عند الطلب نرفق ما يلزم من بيانات فنية
                    أو فواتير بما يتوافق مع أسلوب عملكم.
                  </p>
                </div>
                <div className="rounded-[var(--radius-xl)] border border-white/10 bg-white/5 p-6 sm:p-8 lg:col-span-2">
                  <h3 className="font-display text-lg font-bold sm:text-xl">تغطية وتنسيق تسليم</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-[0.95rem]">
                    نحدد نطاق التوصيل والمواعيد وفق المخزون والكمية — بلا وعود عامة بلا تفاصيل،
                    كما يتوقع شركاء الجملة من علاقة طويلة الأمد.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section id="process" className="cv-auto section-y scroll-mt-24">
            <div className="container-content">
              <h2 className="font-display text-h2 font-bold text-slate-900">كيف نشتغل؟</h2>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
                {STEPS.map((s) => (
                  <div
                    key={s.t}
                    className="relative rounded-[var(--radius-xl)] border border-slate-200 bg-white p-5 shadow-card sm:p-6"
                  >
                    <span className="font-display text-3xl font-bold text-amber-500/95 sm:text-4xl">
                      {s.t}
                    </span>
                    <h3 className="mt-3 font-display text-base font-bold text-slate-900 sm:text-lg">
                      {s.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-[0.95rem]">{s.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing models */}
          <section className="cv-auto section-y bg-white">
            <div className="container-content">
              <h2 className="font-display text-h2 font-bold text-slate-900">نماذج التسعير في الجملة</h2>
              <p className="mt-3 max-w-measure text-lead font-medium leading-[1.88] text-slate-700">
                نطبّق ممارسات الجملة المعتادة ونختار النموذج الأنسب لحجم تعاملكم وتكرار طلباتكم.
              </p>

              <div className="mt-8 space-y-3 md:hidden">
                {PRICING.map(([title, desc]) => (
                  <div
                    key={title}
                    className="rounded-[var(--radius-lg)] border border-slate-200 bg-[#faf8f4] p-4 shadow-sm"
                  >
                    <p className="font-display text-base font-bold text-slate-900">{title}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 hidden overflow-hidden rounded-[var(--radius-xl)] border border-slate-200 shadow-card md:block">
                <table className="w-full border-collapse text-start text-sm lg:text-[0.95rem]">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3.5 font-semibold sm:px-6">النموذج</th>
                      <th className="px-4 py-3.5 font-semibold sm:px-6">متى يُستخدم</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {PRICING.map(([a, b]) => (
                      <tr key={a} className="transition hover:bg-slate-50/90">
                        <td className="px-4 py-4 font-bold text-slate-900 sm:px-6 sm:py-5">{a}</td>
                        <td className="px-4 py-4 text-slate-600 sm:px-6 sm:py-5">{b}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Delivery + payment */}
          <section className="cv-auto section-y">
            <div className="container-content grid gap-6 sm:gap-8 lg:grid-cols-2">
              <div className="rounded-[var(--radius-xl)] border border-slate-200 bg-[#f0ede6] p-6 shadow-card sm:p-8 lg:p-10">
                <h2 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">
                  التوصيل والتغطية
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-[0.95rem]">
                  نغطي جميع محافظات مصر، مع تنسيق الموعد حسب المخزون وحجم الطلب. نطاق الخدمة
                  واضح ومباشر بدون وعود عامة.
                </p>
                <ul className="mt-6 flex flex-wrap gap-2 sm:gap-2.5">
                  {DELIVERY_GOVERNORATES.map((x) => (
                    <li
                      key={x}
                      className="rounded-full border border-slate-200/90 bg-white px-3 py-2 text-xs font-semibold text-slate-700 min-[400px]:px-4 sm:text-sm"
                    >
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[var(--radius-xl)] border border-slate-200 bg-white p-6 shadow-card sm:p-8 lg:p-10">
                <h2 className="font-display text-xl font-bold text-slate-900 sm:text-2xl">طرق الدفع</h2>
                <ul className="mt-6 space-y-4 text-sm text-slate-600 sm:text-[0.95rem]">
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    تحويل بنكي مع إشعار تحويل.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    كاش عند الاستلام عند الاتفاق.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    شروط آجل للحسابات المعتمدة.
                  </li>
                </ul>
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-ring mt-8 inline-flex min-h-touch w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 sm:w-auto"
                >
                  ناقش الشروط على واتساب
                </a>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="cv-auto section-y border-t border-slate-200/80 bg-white">
            <div className="container-content">
              <h2 className="font-display text-h2 font-bold text-slate-900">ماذا يقول العملاء</h2>
              <p className="mt-2 text-sm text-slate-500 sm:text-[0.95rem]">
                أمثلة لأسلوب التعامل — يمكن استبدالها بشهادات بأسماء حقيقية عند الرغبة.
              </p>
              <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 lg:grid-cols-3">
                {TESTIMONIALS.map((t) => (
                  <blockquote
                    key={t.name}
                    className="rounded-[var(--radius-xl)] border border-slate-200 bg-[#f0ede6] p-6 sm:p-8 shadow-card"
                  >
                    <p className="text-sm leading-relaxed text-slate-700 sm:text-[0.95rem]">“{t.quote}”</p>
                    <footer className="mt-5 text-xs font-bold text-slate-900 sm:text-sm">{t.name}</footer>
                  </blockquote>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="cv-auto section-y scroll-mt-24">
            <div className="container-content max-w-3xl">
              <h2 className="text-center font-display text-h2 font-bold text-slate-900">أسئلة شائعة</h2>
              <div className="mt-10 space-y-3 sm:space-y-4">
                {FAQ.map((f) => (
                  <details
                    key={f.q}
                    className="group rounded-[var(--radius-lg)] border border-slate-200 bg-white shadow-card open:shadow-card-hover"
                  >
                    <summary className="focus-ring flex min-h-touch cursor-pointer list-none items-center rounded-[var(--radius-lg)] px-4 py-3 text-start text-base font-bold text-slate-900 marker:content-none sm:px-5 sm:py-4 sm:text-lg [&::-webkit-details-marker]:hidden">
                      <span className="flex flex-1 items-center justify-between gap-3">
                        {f.q}
                        <span className="shrink-0 text-xl text-amber-600 transition motion-safe:duration-200 group-open:rotate-45">
                          ＋
                        </span>
                      </span>
                    </summary>
                    <p className="border-t border-slate-100 px-4 pb-4 pt-3 text-sm leading-relaxed text-slate-600 sm:px-5 sm:pb-5 sm:text-[0.95rem]">
                      {f.a}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="cv-auto section-y border-t border-slate-200 bg-gradient-to-l from-amber-100/85 via-white to-sky-50/85">
            <div className="container-content text-center">
              <h2 className="font-display text-[clamp(1.35rem,3.5vw+0.5rem,2.15rem)] font-extrabold leading-snug text-slate-900">
                ابدأ طلبك الآن — ردّ عملي خلال ساعة هدف
              </h2>
              <p className="mx-auto mt-3 max-w-measure text-sm leading-relaxed text-slate-600 sm:text-lead">
                أرسل الصنف والكمية والموقع. سنرجع بعرض أو بنطاق سعر واضح — بدون جمل إعلانية
                فارغة.
              </p>
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="focus-ring mt-8 inline-flex min-h-touch w-full max-w-md items-center justify-center rounded-2xl bg-[#25D366] px-8 py-4 text-base font-bold text-white shadow-[0_14px_40px_rgba(37,211,102,0.3)] transition hover:brightness-105 active:scale-[0.99] sm:w-auto"
              >
                افتح واتساب
              </a>
            </div>
          </section>

          <footer className="border-t border-slate-200 bg-white py-8 sm:py-10">
            <div className="container-content flex flex-col gap-3 text-center text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:text-start">
              <p>© {new Date().getFullYear()} نواة الجملة — توريد الأدوات الكهربائية بالجملة</p>
              <a
                href="#faq"
                className="text-slate-500 underline-offset-2 transition hover:text-slate-800 hover:underline"
              >
                أسئلة شائعة
              </a>
            </div>
          </footer>
        </main>
      </div>

      {unlocked && (
        <>
          <MobileActionBar waHref={waHref} catalogHref={catalogHref} />
          <WhatsAppFab href={waHref} />
        </>
      )}
    </div>
  )
}
