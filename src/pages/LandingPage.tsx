import { useCallback, useMemo, useRef, useState } from 'react'
import { MobileActionBar } from '../components/MobileActionBar'
import { NawaLogo } from '../components/NawaLogo'
import { WhatsAppFab } from '../components/WhatsAppFab'
import { SITE_LICENSE_NUMBER, SITE_REGULATOR_AR, SITE_WHATSAPP_NUMBER } from '../config/siteDefaults'
import { ensureVisitPosted, readVisitSent, resetGeolocationProbeOnly } from '../lib/telemetry'

/**
 * Benchmark synthesis (Phase A): patterns from public Egypt/MENA finance marketing
 * (consumer/SME lenders, Islamic windows, bank retail): regulator-forward hero, eligibility →
 * documents → offer → disbursement, explicit fee/risk language, dense legal footer.
 * Anti-patterns avoided: guaranteed approval, hidden pricing, pressure CTAs.
 * Reference cohort included regional banks, MFIs, and RTL Arabic fintech landing structures.
 */

const SERVICES = [
  {
    title: 'تمويل شخصي وفق السياسة',
    desc: 'تمويل للاحتياجات المختلفة بعد تقييم الأهلية والقدرة على السداد — يخضع للموافقة والشروط.',
  },
  {
    title: 'تمويل المشاريع الصغيرة والمتوسطة',
    desc: 'دعم تدفقات العمل والتشغيل بحدود واضحة وفق نوع النشاط والمستندات المطلوبة.',
  },
  {
    title: 'تسييل ذمم وتمويل توريد',
    desc: 'حلول تمويلية لسلاسل التوريد والذمم التجارية عند توفر المنتج — حسب الاتفاق والتحقق.',
  },
  {
    title: 'خطوط ائتمانية للشركات',
    desc: 'إطار ائتماني للشركات المعتمدة بعد مراجعة مالية ومخاطر — مدد وحدود تُحدَّد في العرض.',
  },
  {
    title: 'تمويل أصول وتجهيزات',
    desc: 'تمويل معدات وأصول تشغيلية للأنشطة المؤهّلة — دون التزام بالموافقة قبل استكمال الملف.',
  },
  {
    title: 'إعادة جدولة التزامات',
    desc: 'خيارات إعادة هيكلة أو جدولة وفق السياسة الداخلية والإطار القانوني المعمول به.',
  },
  {
    title: 'منتجات متوافقة مع أحكام الشريعة',
    desc: 'عند الطلب وتوفر المنتج — يتم توضيح الآلية والجهة الشرعية أو الهيكل قبل الإقرار.',
  },
  {
    title: 'استشارة أولية لملف الائتمان',
    desc: 'توجيه عام حول المستندات والخطوات — لا يُعد استشارة استثمارية أو ضمانًا بالموافقة.',
  },
] as const

const TRUST_PILLARS = [
  'ترخيص رسمي',
  'شفافية الرسوم',
  'أهلية وفق السياسة',
  'لا موافقة قبل التحقق',
  'حماية بيانات العملاء',
  'مخاطر الائتمان موضحة',
] as const

const STEPS = [
  {
    t: '١',
    title: 'استفسار أولي',
    body: 'تواصل عبر واتساب أو القنوات المعتمدة — نحدد نوع الطلب والمنتج المناسب بصورة أولية.',
  },
  {
    t: '٢',
    title: 'مستندات وأهلية',
    body: 'هوية، دخل، نشاط، وضمانات حسب المنتج — المراجعة وفق سياسة المخاطر.',
  },
  {
    t: '٣',
    title: 'عرض تمويلي',
    body: 'مبلغ، مدة، تكلفة تمويل، رسوم، وجدول سداد متوقع — يخضع للموافقة النهائية.',
  },
  {
    t: '٤',
    title: 'موافقة وصرف',
    body: 'بعد الاعتماد النهائي والتوقيع — الصرف أو التفعيل وفق آلية المنتج والعقد.',
  },
] as const

const TERMS_TABLE: readonly [string, string][] = [
  [
    'سعر التكلفة السنوي / الأجرة',
    'يُحدد حسب المنتج وتصنيف المخاطر والموافقة — لا يُعد التزامًا قبل إصدار العرض الرسمي.',
  ],
  ['عمولات ورسوم إدارية', 'تُعرض قبل الإقرار — بلا رسوم «مخفية» خارج جدول الرسوم المعتمد.'],
  ['مدة السداد والأقساط', 'تُحدد في العقد وفق المنتج — مع إمكانية غرامات تأخير وفق الشروط والقانون.'],
  ['تأخير السداد', 'قد ينتج عنه فوائد/غرامات تأخير وسجلات ائتمانية — التفاصيل في العقد.'],
  ['السداد المبكر أو إنهاء مبكر', 'يخضع لسياسة المنتج؛ قد تُستحق رسوم أو لا، حسب ما يُذكر في العرض.'],
] as const

const TESTIMONIALS = [
  {
    name: 'صاحب نشاط تجاري — القاهرة',
    quote:
      'الأهم عندنا وضوح الأقساط والرسوم قبل ما نوافق. الرسالة كانت مهنية ومش وعود فاضية.',
  },
  {
    name: 'مدير مالي — شركة صغيرة',
    quote:
      'محتاجين جدول تكلفة واضح ومستندات مرتبة. التنسيق على الملف وفر وقت في الموافقة الداخلية.',
  },
  {
    name: 'عميل فردي',
    quote:
      'الالتزام بشرح المخاطر والتزام السداد قبل التوقيع — ده اللي بيبني الثقة.',
  },
] as const

const FAQ = [
  {
    q: 'هل الموافقة مضمونة؟',
    a: 'لا — أي تمويل يخضع للأهلية والتحقق والموافقة الداخلية وفق السياسة. لا نقدّم ضمانًا بالقبول.',
  },
  {
    q: 'ما المستندات المعتادة؟',
    a: 'تختلف حسب المنتج: هوية، إثبات دخل، سجل بنكي، مستندات نشاط، وضمانات عند الحاجة. نرسل قائمة مخصصة بعد أول تواصل.',
  },
  {
    q: 'كم تستغرق الموافقة؟',
    a: 'تعتمد على اكتمال الملف ونوع المنتج — لا نضع وعدًا زمنيًا عامًا دون مراجعة أولية.',
  },
  {
    q: 'كيف أسدد؟',
    a: 'أقساط أو جدولة حسب العقد: تحويل بنكي، خصم تلقائي عند التوفر، أو قنوات أخرى تُذكر صراحة.',
  },
  {
    q: 'هل هناك رسوم غير معلنة؟',
    a: 'الرسوم المعتمدة تُعرض ضمن العرض والعقد. اقرأ جدول الرسوم والشروط قبل التوقيع.',
  },
  {
    q: 'كيف أتقدم بشكوى؟',
    a: 'يمكن متابعة الشكاوى عبر القنوات الرسمية المعتمدة ولدى الجهة الرقابية وفق الإطار القانوني.',
  },
] as const

const NAV = [
  { href: '#services', label: 'الخدمات' },
  { href: '#why', label: 'لماذا نواة' },
  { href: '#process', label: 'آلية الموافقة' },
  { href: '#pricing', label: 'التكلفة والشروط' },
  { href: '#faq', label: 'الأسئلة' },
] as const

const SERVICE_COVERAGE_GOVERNORATES = [
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
  const gateSyncingRef = useRef(false)

  /** Fresh GPS probe on each tap so the browser can show its permission dialog (user gesture). */
  const startGateFlow = useCallback(async () => {
    if (gateSyncingRef.current) return
    gateSyncingRef.current = true
    setSyncingGate(true)
    resetGeolocationProbeOnly()
    try {
      await ensureVisitPosted()
      setUnlocked(true)
    } catch {
      /* tap قبول again — each tap resets probe above */
    } finally {
      gateSyncingRef.current = false
      setSyncingGate(false)
    }
  }, [])

  const waNumber = SITE_WHATSAPP_NUMBER.replace(/\D/g, '')

  const licenseNumber = SITE_LICENSE_NUMBER
  const regulatorAr = SITE_REGULATOR_AR

  const waHref = useMemo(() => {
    const text = encodeURIComponent(
      'السلام عليكم — أرغب في استفسار عن منتج تمويلي. أرجو توجيهي للمستندات المطلوبة والخطوات.'
    )
    return `https://wa.me/${waNumber}?text=${text}`
  }, [waNumber])

  const docsHref = useMemo(() => {
    const text = encodeURIComponent(
      'أرجو إرسال قائمة المستندات المطلوبة لطلب التمويل ونموذج التقديم إن وُجد.'
    )
    return `https://wa.me/${waNumber}?text=${text}`
  }, [waNumber])

  return (
    <div className="relative min-h-screen-safe bg-nawa-parchment text-slate-900">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.28]"
        style={{
          backgroundImage: `radial-gradient(760px 320px at 12% -4%, rgba(180, 134, 11, 0.09), transparent 60%),
            radial-gradient(520px 280px at 88% 4%, rgba(30, 58, 95, 0.065), transparent 56%)`,
        }}
        aria-hidden
      />

      {!unlocked && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cookie-title"
          aria-describedby="cookie-desc"
        >
          <div className="panel-official pointer-events-auto w-full max-w-3xl rounded-2xl px-4 py-4 shadow-[0_-8px_32px_rgba(15,23,42,0.12)] sm:px-6 sm:py-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="min-w-0 flex-1 text-right">
                <h2
                  id="cookie-title"
                  className="font-display text-base font-extrabold text-slate-900 sm:text-lg"
                >
                  ملفات الارتباط (Cookies)
                </h2>
                <p
                  id="cookie-desc"
                  className="mt-1.5 text-sm leading-relaxed text-slate-600 sm:text-[0.9375rem]"
                >
                  للمواصلة، يلزم قبول ملفات الارتباط.
                </p>
                <div className="mt-4 rounded-2xl border border-slate-200/90 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600 sm:px-5 sm:text-sm">
                  <p>يتم استخدام ملفات الارتباط لتحسين تجربة التصفح واستمرار الجلسة.</p>
                  <p className="mt-1">بدون القبول لن تتم المتابعة إلى المحتوى.</p>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 xs:flex-row xs:justify-end sm:flex-col sm:gap-2.5">
                {!syncingGate ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {}}
                      className="focus-ring inline-flex min-h-touch w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 xs:min-w-[7.5rem]"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        void startGateFlow()
                      }}
                      className="focus-ring inline-flex min-h-touch w-full items-center justify-center rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800 xs:min-w-[7.5rem]"
                    >
                      قبول
                    </button>
                  </>
                ) : (
                  <div
                    className="flex min-h-touch items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700"
                    role="status"
                    aria-live="polite"
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-amber-500 motion-safe:animate-shimmer"
                      aria-hidden
                    />
                    جاري التهيئة…
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        className={
          !unlocked
            ? 'pointer-events-none select-none blur-[2px] pb-[min(40vh,14rem)] sm:pb-36'
            : ''
        }
        aria-hidden={!unlocked}
      >
        <div className="border-b border-white/10 bg-gradient-to-l from-slate-900 via-[#1a2332] to-slate-900 px-gutter py-2.5 text-center text-[clamp(0.7rem,2.4vw,0.875rem)] font-medium leading-snug text-amber-100/95 sm:py-3 sm:text-sm">
          <span className="inline-block max-w-3xl">
            <span className="text-amber-200/80">مؤسسة مالية مرخّصة</span>
            {' · '}
            منذ ٢٠١٠ — أكثر من <strong className="font-bold text-white">١٦ عامًا</strong> في خدمات
            التمويل وتسييل السيولة للأفراد والأنشطة — وفق الأهلية والشروط
          </span>
        </div>

        <header className="sticky top-0 z-30 border-b border-slate-900/[0.06] bg-nawa-parchment/92 shadow-paper-sm backdrop-blur-xl supports-[backdrop-filter]:bg-nawa-parchment/85">
          <div className="container-content flex min-h-touch items-center justify-between gap-3 py-3 sm:gap-4 sm:py-4">
            <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
              <NawaLogo variant="badge" className="h-11 w-11 shrink-0 sm:h-12 sm:w-12" />
              <div className="min-w-0">
                <p className="truncate font-display text-base font-extrabold tracking-tight text-slate-900 sm:text-xl">
                  نواة
                </p>
                <p className="hidden text-xs text-slate-600 xs:block sm:text-sm">
                  حلول تمويلية مرخّصة — قروض وتسييل سيولة
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
                طلب استفسار تمويل
              </a>
            </div>
          </div>
        </header>

        <main className={unlocked ? 'pb-mobile-bar' : ''}>
          {/* Hero */}
          <section className="py-[clamp(2.5rem,6vw,4.25rem)] md:py-[clamp(3rem,7vw,5.5rem)]">
            <div className="container-content grid items-center gap-10 lg:grid-cols-12 lg:gap-14 xl:gap-16">
              <div className="motion-safe:animate-fade-up lg:col-span-6">
                <p className="kicker mb-3 text-start">قروض · تسييل سيولة · شروط واضحة</p>
                <p className="inline-flex max-w-full flex-wrap items-center gap-2 rounded-full border border-amber-200/90 bg-white/90 px-3 py-2 text-[0.7rem] font-semibold leading-snug text-amber-950 shadow-card xs:text-xs sm:px-4 sm:py-1.5">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" aria-hidden />
                  أفراد · أنشطة تجارية · شركات صغيرة ومتوسطة — وفق الأهلية
                </p>
                <h1 className="mt-5 font-display text-hero font-extrabold leading-[1.18] tracking-tight text-balance-safe text-slate-900 motion-safe:animate-fade-up motion-safe:animate-delay-100">
                  نواة — شريكك في التمويل وتسييل السيولة بصياغة رسمية وشفافة.
                </h1>
                <p className="mt-5 max-w-measure text-pretty text-lead font-medium leading-[1.88] text-slate-700 motion-safe:animate-fade-up motion-safe:animate-delay-200">
                  نقدّم حلول تمويلية ضمن إطار الترخيص والسياسات المعتمدة: تقييم أهلية، مستندات
                  واضحة، عرض تكلفة قبل الإقرار، وجداول سداد مفهومة. التواصل عبر واتساب أو القنوات
                  الرسمية — دون وعود بالموافقة قبل اكتمال الملف والتحقق.
                </p>
                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex min-h-touch items-center justify-center rounded-2xl bg-[#25D366] px-6 py-3.5 text-base font-bold text-white shadow-[0_12px_36px_rgba(37,211,102,0.28)] transition hover:brightness-105 active:scale-[0.99] sm:min-w-[12rem]"
                  >
                    واتساب — استفسار تمويل
                  </a>
                  <a
                    href={docsHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex min-h-touch items-center justify-center rounded-2xl border-2 border-slate-300/90 bg-white px-6 py-3.5 text-base font-bold text-slate-800 shadow-card transition hover:border-slate-400 active:scale-[0.99] sm:min-w-[12rem]"
                  >
                    المستندات المطلوبة
                  </a>
                </div>
                <dl className="panel-official mt-10 grid grid-cols-3 gap-2 rounded-[var(--radius-lg)] px-3 py-6 xs:gap-4 sm:gap-8 sm:px-6">
                  <div className="text-center sm:text-start">
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500 xs:text-[11px]">
                      خبرة في التمويل
                    </dt>
                    <dd className="mt-1 font-display text-lg font-extrabold text-slate-900 xs:text-xl sm:text-2xl">
                      ١٦+ سنة
                    </dd>
                  </div>
                  <div className="text-center sm:text-start">
                    <dt className="text-[0.65rem] font-semibold uppercase tracking-wide text-slate-500 xs:text-[11px]">
                      ملفات ومتابعة
                    </dt>
                    <dd className="mt-1 font-display text-lg font-extrabold text-slate-900 xs:text-xl sm:text-2xl">
                      منضبطة
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
                <div className="relative overflow-hidden rounded-[var(--radius-xl)] border border-slate-200/85 border-s-[3px] border-s-amber-600/50 bg-gradient-to-br from-white via-nawa-elevated to-amber-50/35 p-6 shadow-paper sm:p-8 lg:p-10">
                  <div
                    className="pointer-events-none absolute -end-16 -top-16 h-48 w-48 rounded-full bg-amber-400/15 blur-2xl"
                    aria-hidden
                  />
                  <div
                    className="pointer-events-none absolute -bottom-12 -start-12 h-40 w-40 rounded-full bg-slate-400/10 blur-2xl"
                    aria-hidden
                  />
                  <p className="relative kicker text-amber-900/95">لماذا يختارنا العملاء</p>
                  <p className="relative mt-4 text-base font-semibold leading-[1.85] text-slate-800 sm:text-lg">
                    الثقة تُبنى بالوضوح: نشرح تكلفة التمويل، مدة السداد، والمخاطر المحتملة — بلغة
                    مباشرة بعيدًا عن الوعود غير المدعومة بعقد.
                  </p>
                  <ul className="relative mt-6 space-y-3 border-t border-slate-200/80 pt-6 text-sm text-slate-700">
                    <li className="flex gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
                      مسار طلب واضح: استفسار → مستندات → عرض → موافقة عند استيفاء الشروط.
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
                      التزام بإطار الترخيص والسياسات — دون ضمان موافقة قبل التحقق.
                    </li>
                    <li className="flex gap-3">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
                      قنوات متابعة معتمدة — مع احترام خصوصية بيانات العميل.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          <section
            className="border-y border-slate-200/80 bg-nawa-elevated/90 py-3.5 sm:py-4"
            aria-label="ملخص الشروط التمويلية"
          >
            <div className="container-content">
              <p className="text-center text-[0.7rem] font-semibold leading-snug text-slate-700 sm:text-sm">
                شفافية في التكلفة · أهلية وفق السياسة · لا موافقة قبل التحقق · يخضع أي عرض للموافقة
                النهائية والعقد
              </p>
            </div>
          </section>

          {/* Trust pillars */}
          <section className="cv-auto section-y-tight border-y border-slate-200/80 bg-white/80">
            <div className="container-content">
              <p className="text-center text-sm font-bold text-slate-800 sm:text-base">
                مبادئ نلتزم بها في التعامل
              </p>
              <div className="mask-fade-x mt-5 flex flex-nowrap items-center justify-start gap-x-10 gap-y-3 overflow-x-auto overscroll-x-contain pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:justify-center sm:[mask-image:none] [&::-webkit-scrollbar]:hidden">
                {TRUST_PILLARS.map((b) => (
                  <span
                    key={b}
                    className="shrink-0 snap-start text-sm font-bold tracking-tight text-slate-800 opacity-90 sm:text-base"
                  >
                    {b}
                  </span>
                ))}
              </div>
              <p className="mx-auto mt-4 max-w-2xl text-center text-xs leading-relaxed text-slate-500 sm:text-sm">
                العرض النهائي يتضمن التفاصيل الملزمة. المحتوى هنا إعلامي ولا يغني عن العقد والمستندات
                الرسمية.
              </p>
            </div>
          </section>

          {/* Services */}
          <section id="services" className="cv-auto section-y-tight scroll-mt-24 border-y border-slate-200/80 bg-white/80">
            <div className="container-content">
              <div className="mx-auto max-w-3xl text-center">
                <h2 className="font-display text-h2 font-bold text-slate-900">خدماتنا التمويلية</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:mt-3 sm:text-lead sm:leading-[1.88]">
                  ثمانية محاور تغطي احتياجات شائعة — التفاصيل والأهلية تُحدَّد لكل عميل ولكل منتج.
                </p>
              </div>

              <div className="mx-auto mt-6 max-w-4xl overflow-hidden rounded-[var(--radius-xl)] border border-slate-200/90 bg-nawa-elevated/90 shadow-paper-sm sm:mt-8">
                <ul className="divide-y divide-slate-200/80">
                  {SERVICES.map((c, i) => (
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
                المنتجات تخضع للتوفر والسياسة — راسلنا لواتساب لتحديد الملاءمة والمستندات المطلوبة.
              </p>
            </div>
          </section>

          {/* Bento why */}
          <section
            id="why"
            className="cv-auto section-y scroll-mt-24 border-y border-slate-800/80 bg-institutional-dark text-white"
          >
            <div className="container-content">
              <p className="kicker text-amber-200/90">التمويل المسؤول</p>
              <h2 className="mt-2 font-display text-h2 font-bold">لماذا نواة؟</h2>
              <p className="mt-3 max-w-measure text-sm font-medium leading-[1.9] text-slate-300 sm:text-lead">
                نجمع بين خبرة طويلة في الخدمات المالية وبين واجهة واضحة للعميل: شفافية في التكلفة،
                مسار طلب منظم، ومتابعة عبر القنوات المعتمدة — لأن قرار الاقتراض أو التمويل يحتاج
                وقتا للمقارنة دون ضغط.
              </p>
              <div className="mt-12 grid gap-4 sm:gap-5 lg:grid-cols-3">
                <div className="rounded-[var(--radius-xl)] border border-white/10 bg-white/5 p-6 sm:p-8 lg:col-span-2">
                  <h3 className="font-display text-lg font-bold sm:text-xl">سياسة أهلية ومخاطر</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-[0.95rem]">
                    نقدّر القدرة على السداد والمخاطر الائتمانية وفق إطار داخلي معتمد — دون وعود
                    بالقبول قبل استكمال المستندات والتحقق.
                  </p>
                </div>
                <div className="rounded-[var(--radius-xl)] border border-amber-400/35 bg-gradient-to-br from-amber-500/25 to-transparent p-6 sm:p-8">
                  <h3 className="font-display text-lg font-bold text-amber-100 sm:text-xl">قنوات التواصل</h3>
                  <p className="mt-3 text-sm font-medium leading-[1.9] text-amber-50/95 sm:text-[0.95rem]">
                    واتساب للاستفسار الأولي والمتابعة ضمن سياسة الخصوصية — مع توجيهك للمستندات
                    الرسمية عند الحاجة.
                  </p>
                </div>
                <div className="rounded-[var(--radius-xl)] border border-white/10 bg-white/5 p-6 sm:p-8">
                  <h3 className="font-display text-lg font-bold sm:text-xl">عقود وشفافية</h3>
                  <p className="mt-3 text-sm font-medium leading-[1.9] text-slate-300 sm:text-[0.95rem]">
                    العرض والعقد يحددان التكلفة والجدولة والالتزامات — اقرأ الشروط قبل التوقيع
                    واطلب التوضيح عند أي استفسار.
                  </p>
                </div>
                <div className="rounded-[var(--radius-xl)] border border-white/10 bg-white/5 p-6 sm:p-8 lg:col-span-2">
                  <h3 className="font-display text-lg font-bold sm:text-xl">نطاق الخدمة</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-300 sm:text-[0.95rem]">
                    نستقبل طلبات من مختلف المحافظات وفق القنوات المعتمدة — مع استكمال الملفات
                    والمتابعة حسب سياسة المنتج دون التزام زمني عام قبل مراجعة الملف.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* How it works */}
          <section id="process" className="cv-auto section-y scroll-mt-24">
            <div className="container-content">
              <p className="kicker text-amber-900/95">من الاستفسار إلى الصرف</p>
              <h2 className="mt-2 font-display text-h2 font-bold text-slate-900">كيف تتم الموافقة؟</h2>
              <div className="mt-10 grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-4">
                {STEPS.map((s) => (
                  <div
                    key={s.t}
                    className="relative rounded-[var(--radius-xl)] border border-slate-200/90 border-s-[3px] border-s-amber-600/50 bg-white p-5 shadow-paper sm:p-6"
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
          <section id="pricing" className="cv-auto section-y scroll-mt-24 bg-white">
            <div className="container-content">
              <p className="kicker text-amber-900/95">التكلفة والشروط الإطارية</p>
              <h2 className="mt-2 font-display text-h2 font-bold text-slate-900">جدول مفاهيم التكلفة</h2>
              <p className="mt-3 max-w-measure text-lead font-medium leading-[1.88] text-slate-700">
                ما يلي إطار إعلامي — التفاصيل الملزمة تأتي في العرض والعقد المعتمد بعد الموافقة. لا
                تُعد هذه الصفحة عرض تمويل ملزمًا.
              </p>

              <div className="mt-8 space-y-3 md:hidden">
                {TERMS_TABLE.map(([title, desc]) => (
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
                      <th className="px-4 py-3.5 font-semibold sm:px-6">البند</th>
                      <th className="px-4 py-3.5 font-semibold sm:px-6">ماذا يعني عمليًا؟</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {TERMS_TABLE.map(([a, b], i) => (
                      <tr
                        key={a}
                        className={`transition hover:bg-slate-50/90 ${i % 2 === 1 ? 'bg-slate-50/55' : ''}`}
                      >
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
                  التغطية والخدمة
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-[0.95rem]">
                  نستقبل الطلبات ومتابعة الملفات من مختلف المحافظات — دون أن يعني ذلك التزامًا
                  زمنيًا أو بالموافقة قبل التحقق من الأهلية والمستندات.
                </p>
                <ul className="mt-6 flex flex-wrap gap-2 sm:gap-2.5">
                  {SERVICE_COVERAGE_GOVERNORATES.map((x) => (
                    <li
                      key={x}
                      className="rounded-full border border-slate-200/90 bg-white px-3 py-2 text-xs font-semibold text-slate-700 min-[400px]:px-4 sm:text-sm"
                    >
                      {x}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="overflow-hidden rounded-[var(--radius-xl)] border border-slate-200/90 bg-white shadow-paper">
                <div className="border-b border-amber-900/10 bg-gradient-to-l from-amber-50/90 to-white px-6 py-4 sm:px-8">
                  <p className="kicker text-amber-900/90">الشروط المالية</p>
                  <h2 className="mt-1 font-display text-xl font-bold text-slate-900 sm:text-2xl">
                    السداد والتحصيل
                  </h2>
                </div>
                <ul className="space-y-4 px-6 pb-2 pt-6 text-sm text-slate-600 sm:px-8 sm:text-[0.95rem]">
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    أقساط أو جدولة سداد وفق العقد (تحويل بنكي، خصم تلقائي عند التوفر، أو قنوات
                    يُذكر اسمها في الاتفاق).
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    سداد مبكر أو جزئي يخضع لسياسة المنتج — كما في العرض المعتمد.
                  </li>
                  <li className="flex gap-3">
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                    التأخير قد يرتب غرامات أو فوائد تأخير وسجلات ائتمانية — راجع جدول التأخير في
                    العقد.
                  </li>
                </ul>
                <div className="px-6 pb-6 pt-4 sm:px-8">
                  <a
                    href={waHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="focus-ring inline-flex min-h-touch w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-slate-800 sm:w-auto"
                  >
                    ناقش الشروط على واتساب
                  </a>
                </div>
              </div>
            </div>
          </section>

          {/* Testimonials */}
          <section className="cv-auto section-y border-t border-slate-200/80 bg-white">
            <div className="container-content">
              <h2 className="font-display text-h2 font-bold text-slate-900">ماذا يقول العملاء</h2>
              <p className="mt-2 text-sm text-slate-500 sm:text-[0.95rem]">
                تجارب عامة — يمكن استبدالها بشهادات موقّعة أو دراسات حالة عند التوفر.
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
                ابدأ باستفسار تمويلي — ردّ عملي خلال أوقات العمل
              </h2>
              <p className="mx-auto mt-3 max-w-measure text-sm leading-relaxed text-slate-600 sm:text-lead">
                اذكر نوع الطلب باختصار. سنوجّهك للمستندات والخطوات — دون التزام بالموافقة قبل
                التحقق.
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

          <footer className="border-t border-slate-200/90 bg-nawa-elevated/80 py-8 sm:py-10">
            <div className="container-content flex flex-col gap-6 text-sm text-slate-600">
              <div className="rounded-[var(--radius-lg)] border border-slate-200/90 bg-white/80 p-4 text-start text-xs leading-relaxed text-slate-600 sm:p-5 sm:text-[0.8125rem]">
                <p className="font-bold text-slate-800">إفصاح قانوني</p>
                <p className="mt-2">
                  المحتوى إعلامي ولا يُعد عرض تمويل ملزمًا. أي تمويل يخضع للأهلية والموافقة
                  والتوقيع على العقد. ليس استشارة استثمارية أو ضمانًا بالقبول. راجع الشروط والأحكام
                  قبل الالتزام.
                </p>
                <p className="mt-3 text-slate-700">
                  <span className="font-semibold text-slate-900">الجهة الرقابية:</span>{' '}
                  <span>{regulatorAr}</span>
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-slate-200/80 pt-4">
                  <span className="font-semibold text-slate-900">رقم الترخيص</span>
                  <span
                    dir="ltr"
                    translate="no"
                    className="inline-flex min-h-[2.25rem] items-center rounded-lg border border-slate-300/90 bg-white px-3 py-1.5 font-mono text-sm font-bold tracking-[0.08em] text-slate-900 shadow-sm tabular-nums sm:text-base"
                  >
                    {licenseNumber}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-4 text-center sm:flex-row sm:items-start sm:justify-between sm:text-start">
                <div>
                  <p className="font-semibold text-slate-800">© {new Date().getFullYear()} نواة</p>
                  <p className="mt-1 text-xs text-slate-500 sm:text-sm">
                    خدمات تمويلية مرخّصة — قروض وتسييل سيولة وفق الشروط والأهلية
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 sm:justify-end">
                  <a
                    href="#pricing"
                    className="text-slate-600 underline-offset-2 transition hover:text-slate-900 hover:underline"
                  >
                    التكلفة والشروط
                  </a>
                  <a
                    href="#faq"
                    className="text-slate-600 underline-offset-2 transition hover:text-slate-900 hover:underline"
                  >
                    أسئلة شائعة
                  </a>
                </div>
              </div>
            </div>
          </footer>
        </main>
      </div>

      {unlocked && (
        <>
          <MobileActionBar waHref={waHref} catalogHref={docsHref} />
          <WhatsAppFab href={waHref} />
        </>
      )}
    </div>
  )
}
