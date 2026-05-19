import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconContext,
  Check,
  Star,
  Lightning,
  Shield,
  Users,
  CaretDown,
  Crown,
  Sparkle,
  ArrowRight,
  X,
  Heart,
  DeviceMobile,
  Cloud,
  Brain,
  Lock,
  Infinity,
  ShoppingCart,
  Pill,
} from '@phosphor-icons/react';
import { themes, defaultThemeName } from '../theme/themes';
import { formatCurrency } from '../utils/currencyUtils';
import { usePageSEO } from '../utils/pageSEO';
import LandingHeader from '../components/layout/LandingHeader';
import LandingFooter from '../components/layout/LandingFooter';
import { SUBSCRIPTION_PLANS } from '../utils/subscriptionPlans';

const MARKETING_PLANS = [
  {
    id: 'free',
    name: SUBSCRIPTION_PLANS.free.label,
    description: SUBSCRIPTION_PLANS.free.description,
    monthlyPrice: 0,
    yearlyPrice: 0,
    isFree: true,
    features: [
      '1 active protocol',
      '10 stockpile items',
      'Full Recon Calculator',
      'Local-only storage',
      'Upgrade anytime',
    ],
    popular: false,
    cta: SUBSCRIPTION_PLANS.free.cta,
    ctaLink: '/app',
    icon: Lightning,
    accent: '#7F9E95',
  },
  {
    id: 'researchPlus',
    descriptionMonthly: SUBSCRIPTION_PLANS.researchPlusMonthly.description,
    descriptionAnnual: SUBSCRIPTION_PLANS.researchPlusAnnual.description,
    monthlyPrice: SUBSCRIPTION_PLANS.researchPlusMonthly.price,
    yearlyPrice: SUBSCRIPTION_PLANS.researchPlusAnnual.price,
    features: [
      'Unlimited protocols & stockpile',
      'AI Research chat + library',
      'Buddy System (track two users)',
      'Community Directory access',
      'Advanced insights & analytics',
      'Sync across phone, tablet & web',
      'Priority support',
    ],
    popular: true,
    ctaMonthly: SUBSCRIPTION_PLANS.researchPlusMonthly.cta,
    ctaAnnual: SUBSCRIPTION_PLANS.researchPlusAnnual.cta,
    ctaLink: '/login?signup=true&redirect=/app/account/subscription',
    icon: Crown,
    accent: '#5F7F76',
  },
  {
    id: 'lifetime',
    name: SUBSCRIPTION_PLANS.researchPlusLifetime.label,
    description: SUBSCRIPTION_PLANS.researchPlusLifetime.description,
    monthlyPrice: SUBSCRIPTION_PLANS.researchPlusLifetime.price,
    yearlyPrice: SUBSCRIPTION_PLANS.researchPlusLifetime.price,
    isLifetime: true,
    features: [
      'Everything in Research+',
      'One-time payment — never billed again',
      'All future features included',
      'Use on every device you own',
      'Best long-term value',
    ],
    popular: false,
    cta: SUBSCRIPTION_PLANS.researchPlusLifetime.cta,
    ctaLink: '/login?signup=true&redirect=/app/account/subscription',
    icon: Infinity,
    accent: '#4A6B62',
  },
];

const COMPARISON_FEATURES = [
  { label: 'Active Protocols', free: '1', plus: 'Unlimited', icon: Lightning },
  { label: 'Stockpile Items', free: '10', plus: 'Unlimited', icon: Shield },
  { label: 'Recon Calculator', free: true, plus: true, icon: Brain },
  { label: 'AI Research Chat', free: 'Limited', plus: 'Generous', icon: Sparkle },
  { label: 'Buddy System', free: false, plus: true, icon: Users },
  { label: 'Active Orders', free: '1', plus: 'Unlimited', icon: ShoppingCart },
  { label: 'Sync Across Devices', free: false, plus: true, icon: DeviceMobile },
  { label: 'Advanced Insights', free: false, plus: true, icon: Star },
  { label: 'Premium Themes', free: false, plus: true, icon: Sparkle },
  { label: 'Priority Support', free: false, plus: true, icon: Shield },
  { label: 'Supplements', free: '1', plus: 'Unlimited', icon: Pill },
];

function annualSavingsPercent() {
  const perMonth = SUBSCRIPTION_PLANS.researchPlusMonthly.price;
  const annual = SUBSCRIPTION_PLANS.researchPlusAnnual.price;
  const fullYearAtMonthly = perMonth * 12;
  if (fullYearAtMonthly <= 0) return 0;
  return Math.round(((fullYearAtMonthly - annual) / fullYearAtMonthly) * 100);
}

const RESEARCH_PLUS_GOLD = '#C8912A';

function planTitle(plan, billingCycle) {
  if (plan.id === 'researchPlus') {
    return billingCycle === 'monthly'
      ? SUBSCRIPTION_PLANS.researchPlusMonthly.label
      : SUBSCRIPTION_PLANS.researchPlusAnnual.label;
  }
  return plan.name;
}

/** Renders "Research+" with a gold plus — use inside headings and labels. */
function PlanTitleText({ text }) {
  if (!text?.includes('+')) return text;
  const plusAt = text.indexOf('+');
  return (
    <>
      {text.slice(0, plusAt)}
      <span style={{ color: RESEARCH_PLUS_GOLD }}>+</span>
      {text.slice(plusAt + 1)}
    </>
  );
}

function planDescription(plan, billingCycle) {
  if (plan.id === 'researchPlus') {
    return billingCycle === 'monthly' ? plan.descriptionMonthly : plan.descriptionAnnual;
  }
  return plan.description;
}

function planCta(plan, billingCycle) {
  if (plan.id === 'researchPlus') {
    return billingCycle === 'monthly' ? plan.ctaMonthly : plan.ctaAnnual;
  }
  return plan.cta;
}

function ComparisonCell({ value }) {
  if (value === true)
    return <Check size={20} weight="bold" className="mx-auto" style={{ color: '#5F7F76' }} />;
  if (value === false)
    return <X size={16} weight="bold" className="mx-auto opacity-30" style={{ color: '#999' }} />;
  return (
    <span className="text-sm font-semibold" style={{ color: '#2F3B3A' }}>
      {value}
    </span>
  );
}

function FAQItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-xl overflow-hidden transition-all duration-200"
      style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDE6DE' }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 sm:p-6 text-left transition-colors hover:bg-[#F8FAF8]"
      >
        <span className="text-base font-semibold pr-4" style={{ color: '#2F3B3A' }}>
          {question}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex-shrink-0"
        >
          <CaretDown size={20} weight="bold" style={{ color: '#7F9E95' }} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-5 sm:px-6 pb-5 sm:pb-6">
              <p className="text-sm leading-relaxed" style={{ color: '#6B7D7A' }}>
                {answer}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FreePlanTier({ billingCycle }) {
  const freePlan = MARKETING_PLANS.find((p) => p.isFree);
  const [mobileOpen, setMobileOpen] = useState(false);
  if (!freePlan) return null;

  return (
    <section className="pb-6 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="max-w-3xl mx-auto"
      >
        {/* Mobile: expandable disclosure */}
        <div
          className="sm:hidden rounded-2xl overflow-hidden"
          style={{ backgroundColor: 'rgba(127,158,149,0.08)', border: '1px solid #DDE6DE' }}
        >
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-expanded={mobileOpen}
            className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left transition-colors hover:bg-[#F8FAF8]"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Lightning size={14} weight="duotone" className="flex-shrink-0" style={{ color: '#7F9E95' }} aria-hidden />
              <span className="text-sm font-semibold" style={{ color: '#2F3B3A' }}>
                Free plan available
              </span>
            </div>
            <motion.span
              animate={{ rotate: mobileOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="flex-shrink-0"
              aria-hidden
            >
              <CaretDown size={18} weight="bold" style={{ color: '#7F9E95' }} />
            </motion.span>
          </button>
          <AnimatePresence initial={false}>
            {mobileOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
                className="overflow-hidden"
              >
                <div
                  className="px-4 pb-4 pt-1"
                  style={{ borderTop: '1px solid #DDE6DE' }}
                >
                  <p className="text-xs mb-3 leading-relaxed" style={{ color: '#6B7D7A' }}>
                    {planDescription(freePlan, billingCycle)} No credit card required.
                  </p>
                  <ul className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4">
                    {freePlan.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check size={14} weight="bold" className="flex-shrink-0 mt-0.5" style={{ color: '#7F9E95' }} aria-hidden />
                        <span className="text-sm leading-snug" style={{ color: '#4A5A56' }}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={freePlan.ctaLink}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold transition-opacity hover:opacity-70"
                    style={{ color: '#5F7F76' }}
                  >
                    {planCta(freePlan, billingCycle)}
                    <ArrowRight size={14} weight="bold" aria-hidden />
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop: single inline row */}
        <div
          className="hidden sm:flex items-center justify-between gap-6 py-4 px-1"
          style={{ borderBottom: '1px dashed #CDD8D2' }}
        >
          <div className="flex items-center gap-3 flex-shrink-0">
            <Lightning size={16} weight="duotone" style={{ color: '#7F9E95' }} aria-hidden />
            <span className="text-base font-bold" style={{ color: '#2F3B3A' }}>
              {planTitle(freePlan, billingCycle)}
            </span>
            <span className="text-lg font-extrabold" style={{ color: '#5F7F76' }}>$0</span>
            <span className="text-xs font-medium" style={{ color: '#8A8077' }}>/ forever</span>
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-1 flex-1 min-w-0 justify-end">
            {freePlan.features.map((f, i) => (
              <span key={i} className="flex items-center gap-1.5 text-xs whitespace-nowrap" style={{ color: '#6B7D7A' }}>
                <Check size={12} weight="bold" className="flex-shrink-0" style={{ color: '#7F9E95' }} aria-hidden />
                {f}
              </span>
            ))}
          </div>
          <a
            href={freePlan.ctaLink}
            className="text-sm font-semibold underline underline-offset-2 flex-shrink-0 transition-opacity hover:opacity-70"
            style={{ color: '#5F7F76' }}
          >
            {planCta(freePlan, billingCycle)} →
          </a>
        </div>
      </motion.div>
    </section>
  );
}

export default function Pricing() {
  usePageSEO();
  const theme = themes[defaultThemeName];
  const [billingCycle, setBillingCycle] = useState('yearly');

  const yearlySavePct = useMemo(() => annualSavingsPercent(), []);

  const faqs = [
    {
      question: 'Is the Free plan really free forever?',
      answer:
        'Yes — the Free plan includes core tracking (one active protocol, limited stockpile, and the full Recon Calculator) at zero cost, forever. No credit card required. Research+ unlocks unlimited protocols, AI Research, Buddy System, Community Directory, cloud sync, and more.',
    },
    {
      question: 'Can I try Research+ before committing?',
      answer:
        'New accounts get a trial period to explore every premium feature. When it ends you can stay on Free forever or subscribe to keep the full experience.',
    },
    {
      question: 'What makes the Lifetime plan worth it?',
      answer:
        "Most people start with GLP-1s — that's about a year of research right there. But real researchers don't stop. After that comes BPC-157, TB-500, peptide stacks, longevity protocols... the rabbit hole is deep. If you're serious about this, Lifetime pays for itself before you've even scratched the surface. One payment. No bills. Every future feature included.",
    },
    {
      question: 'Can I switch plans anytime?',
      answer:
        'Absolutely. Upgrade, downgrade, or cancel whenever you want. Changes take effect according to your billing cycle.',
    },
    {
      question: 'What happens to my data if I cancel?',
      answer:
        'Your data stays yours. After cancellation you continue on the Free tier within plan limits, or you can export your data. Nothing disappears overnight.',
    },
    {
      question: 'Is my research data secure?',
      answer:
        'Completely. We use enterprise-grade encryption in transit and at rest, and we never sell or share your data. Your research is private — as grey should always be.',
    },
  ];

  return (
    <IconContext.Provider value={{ weight: 'duotone' }}>
    <div className="min-h-screen" style={{ backgroundColor: '#EFF2EE' }}>
      <LandingHeader />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-16 pb-8 sm:pt-20 sm:pb-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div
            className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
            style={{ background: 'radial-gradient(circle, #7F9E95 0%, transparent 70%)' }}
          />
          <div
            className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full opacity-15 blur-3xl"
            style={{ background: 'radial-gradient(circle, #A0B9B3 0%, transparent 70%)' }}
          />
        </div>

        <div className="relative max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-6"
              style={{ backgroundColor: 'rgba(127,158,149,0.15)', color: '#5F7F76' }}
            >
              <Sparkle size={14} weight="duotone" aria-hidden />
              Peptides can be pricey — your tracking shouldn&apos;t be.
            </div>

            <h1
              className="text-4xl sm:text-5xl md:text-6xl font-bold mb-5 leading-tight"
              style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}
            >
              Invest in Your{' '}
              <span style={{ color: '#5F7F76' }}>Research</span>
              <span style={{ color: RESEARCH_PLUS_GOLD }}>+</span>
            </h1>

            <div className="mb-10" />
          </motion.div>

          {/* Billing Toggle */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="inline-flex items-center gap-3 p-1.5 rounded-full"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #DDE6DE', boxShadow: '0 2px 8px rgba(47,59,58,0.06)' }}
          >
            <button
              type="button"
              onClick={() => setBillingCycle('monthly')}
              className="px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200"
              style={{
                backgroundColor: billingCycle === 'monthly' ? '#5F7F76' : 'transparent',
                color: billingCycle === 'monthly' ? '#FFFFFF' : '#6B7D7A',
              }}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle('yearly')}
              className="px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 flex items-center gap-2"
              style={{
                backgroundColor: billingCycle === 'yearly' ? '#5F7F76' : 'transparent',
                color: billingCycle === 'yearly' ? '#FFFFFF' : '#6B7D7A',
              }}
            >
              Annual
              {yearlySavePct > 0 && (
                <span
                  className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                  style={{
                    backgroundColor: billingCycle === 'yearly' ? 'rgba(255,255,255,0.25)' : 'rgba(127,158,149,0.2)',
                    color: billingCycle === 'yearly' ? '#FFFFFF' : '#5F7F76',
                  }}
                >
                  -{yearlySavePct}%
                </span>
              )}
            </button>
          </motion.div>
        </div>
      </section>

      <FreePlanTier billingCycle={billingCycle} />

      {/* ── PAID PLAN CARDS (vertical stack) ──────────────────────────────────── */}
      <section className="pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">
          {MARKETING_PLANS.filter((p) => !p.isFree).map((plan, idx) => {
            const Icon = plan.icon;
            const isPopular = plan.popular;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.08 + idx * 0.08 }}
                className="relative rounded-2xl overflow-hidden"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: isPopular ? '2px solid #5F7F76' : '1px solid #DDE6DE',
                  boxShadow: isPopular
                    ? '0 8px 40px rgba(95,127,118,0.18), 0 0 0 1px rgba(95,127,118,0.08)'
                    : '0 2px 12px rgba(47,59,58,0.06)',
                }}
              >
                {isPopular && (
                  <div
                    className="text-center py-2 text-xs font-bold tracking-wider uppercase"
                    style={{ backgroundColor: '#5F7F76', color: '#FFFFFF' }}
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      <Star size={14} weight="fill" aria-hidden />
                      Most Popular
                      <Star size={14} weight="fill" aria-hidden />
                    </div>
                  </div>
                )}

                <div className="p-6 sm:p-8">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: `${plan.accent}15` }}
                        >
                          <Icon size={20} weight="duotone" style={{ color: plan.accent }} aria-hidden />
                        </div>
                        <h3 className="text-xl font-bold" style={{ color: '#2F3B3A' }}>
                          <PlanTitleText text={planTitle(plan, billingCycle)} />
                        </h3>
                      </div>
                      <p className="text-sm leading-relaxed ml-[52px] sm:ml-[52px]" style={{ color: '#6B7D7A' }}>
                        {planDescription(plan, billingCycle)}
                      </p>
                    </div>

                    <div className="flex-shrink-0 sm:text-right ml-[52px] sm:ml-0">
                      <div className="flex items-baseline gap-1 sm:justify-end">
                        <span className="text-3xl sm:text-4xl font-extrabold" style={{ color: '#2F3B3A' }}>
                          {formatCurrency(
                            billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
                          )}
                        </span>
                        {!plan.isLifetime && (
                          <span className="text-sm font-medium" style={{ color: '#8A8077' }}>
                            /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                          </span>
                        )}
                        {plan.isLifetime && (
                          <span className="text-sm font-medium" style={{ color: '#8A8077' }}>
                            once
                          </span>
                        )}
                      </div>
                      {billingCycle === 'yearly' && !plan.isLifetime && plan.yearlyPrice > 0 && (
                        <p className="text-xs mt-1 font-medium" style={{ color: '#5F7F76' }}>
                          {formatCurrency(Number((plan.yearlyPrice / 12).toFixed(2)))}/mo billed annually
                        </p>
                      )}
                    </div>
                  </div>

                  <div
                    className="rounded-xl px-4 py-3.5 mb-5"
                    style={{ backgroundColor: '#F8FAF8', border: '1px solid #EFF2EE' }}
                  >
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {plan.features.map((feature, featureIndex) => (
                        <li key={featureIndex} className="flex items-center gap-2">
                          <Check size={16} weight="bold" className="flex-shrink-0" style={{ color: plan.accent }} aria-hidden />
                          <span className="text-sm" style={{ color: '#4A5A56' }}>
                            {feature}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <a
                    href={plan.ctaLink}
                    className="block w-full sm:w-auto sm:inline-flex sm:items-center sm:justify-center py-3 px-8 rounded-xl font-semibold text-center transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      backgroundColor: isPopular ? '#5F7F76' : 'transparent',
                      color: isPopular ? '#FFFFFF' : '#5F7F76',
                      border: isPopular ? '2px solid #5F7F76' : '2px solid #B0C4BF',
                      boxShadow: isPopular ? '0 4px 14px rgba(95,127,118,0.25)' : 'none',
                    }}
                  >
                    {planCta(plan, billingCycle)}
                    {isPopular && <ArrowRight size={16} weight="bold" className="ml-2 inline-block" aria-hidden />}
                  </a>
                </div>
              </motion.div>
            );
          })}

          <p className="text-center mt-2 text-xs" style={{ color: '#8A8077' }}>
            Web, iOS, Android — one plan, every device. No surprise charges, ever.
          </p>
        </div>
      </section>

      {/* ── SOCIAL PROOF ────────────────────────────────────────────────────── */}
      <section
        className="py-10 sm:py-12 px-4 sm:px-6 lg:px-8"
        style={{ backgroundColor: '#5F7F76' }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 text-center text-white">
            {[
              { value: '50k+', label: 'Protocols Tracked' },
              { value: '120k+', label: 'Orders Logged' },
              { value: '10k+', label: 'Vendors Listed' },
              { value: '30k+', label: 'Stockpile Items Managed' },
              { value: '5,000+', label: 'Active Researchers' },
              { value: '30+', label: 'Peptides in the Database' },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-2xl sm:text-3xl font-extrabold mb-1">{value}</div>
                <div className="text-xs sm:text-sm font-medium opacity-80">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURE COMPARISON TABLE ────────────────────────────────────────── */}
      <section className="py-14 sm:py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2
              className="text-2xl sm:text-3xl font-bold mb-3"
              style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}
            >
              Compare Your Research Plans
            </h2>
            <p className="text-sm sm:text-base" style={{ color: '#6B7D7A' }}>
              See exactly what you get with each plan.
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #DDE6DE' }}>
            {/* Table header */}
            <div
              className="grid grid-cols-3 py-4 px-4 sm:px-6"
              style={{ backgroundColor: '#F5F8F6' }}
            >
              <div className="text-sm font-bold" style={{ color: '#2F3B3A' }}>
                Feature
              </div>
              <div className="text-sm font-bold text-center" style={{ color: '#8A8077' }}>
                Free
              </div>
              <div className="text-sm font-bold text-center" style={{ color: '#5F7F76' }}>
                <PlanTitleText text="Research+" />
              </div>
            </div>

            {COMPARISON_FEATURES.map((row, i) => {
              const RowIcon = row.icon;
              return (
                <div
                  key={row.label}
                  className="grid grid-cols-3 items-center py-3.5 px-4 sm:px-6"
                  style={{
                    backgroundColor: i % 2 === 0 ? '#FFFFFF' : '#FAFBFA',
                    borderTop: '1px solid #EFF2EE',
                  }}
                >
                  <div className="flex items-center gap-2">
                    <RowIcon size={16} weight="duotone" className="flex-shrink-0 hidden sm:block" style={{ color: '#7F9E95' }} aria-hidden />
                    <span className="text-sm" style={{ color: '#4A5A56' }}>
                      {row.label}
                    </span>
                  </div>
                  <div className="text-center">
                    <ComparisonCell value={row.free} />
                  </div>
                  <div className="text-center">
                    <ComparisonCell value={row.plus} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── WHY RESEARCH+ ───────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#EFF2EE' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2
              className="text-2xl sm:text-3xl font-bold mb-3"
              style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}
            >
              Why Researchers Upgrade
            </h2>
            <p className="text-sm sm:text-base max-w-xl mx-auto" style={{ color: '#6B7D7A' }}>
              <PlanTitleText text="Research+" /> isn&apos;t just &quot;more features&quot; — it&apos;s the difference between tracking
              one protocol and managing your entire workflow.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-3xl mx-auto">
            {[
              {
                icon: Brain,
                title: 'AI-Powered Research',
                text: 'Ask questions, get cited answers, and build your personal research library — all inside the app.',
              },
              {
                icon: Cloud,
                title: 'Sync Across Devices',
                text: 'Phone, tablet, and web — your protocols, stockpile, and analytics stay in sync everywhere you research.',
              },
              {
                icon: Users,
                title: 'Buddy System',
                text: 'Track a second person\'s research alongside your own. Perfect for partners or clients.',
              },
              {
                icon: Lock,
                title: 'Enterprise-Grade Security',
                text: 'Encrypted in transit and at rest. Your research data is private — period.',
              },
              {
                icon: Star,
                title: 'Advanced Analytics',
                text: 'Spending trends, delivery timelines, protocol optimization — see the patterns you\'d otherwise miss.',
              },
              {
                icon: Heart,
                title: 'Built by Researchers',
                text: 'We use the app ourselves. Every feature comes from real research workflows, not a boardroom.',
              },
            ].map(({ icon: ItemIcon, title, text }) => (
              <div
                key={title}
                className="rounded-xl p-6 transition-all duration-200 hover:-translate-y-0.5"
                style={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #DDE6DE',
                  boxShadow: '0 2px 8px rgba(47,59,58,0.04)',
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: 'rgba(127,158,149,0.12)' }}
                >
                  <ItemIcon size={20} weight="duotone" style={{ color: '#5F7F76' }} aria-hidden />
                </div>
                <h3 className="text-base font-bold mb-2" style={{ color: '#2F3B3A' }}>
                  {title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6B7D7A' }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: '#FFFFFF' }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-10">
            <h2
              className="text-2xl sm:text-3xl font-bold mb-3"
              style={{ color: '#2F3B3A', fontFamily: 'Poppins, sans-serif' }}
            >
              Frequently Asked Questions
            </h2>
            <p className="text-sm" style={{ color: '#6B7D7A' }}>
              Still have questions? We've got answers.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => (
              <FAQItem key={index} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ───────────────────────────────────────────────────────── */}
      <section
        className="py-14 sm:py-16 px-4 sm:px-6 lg:px-8"
        style={{
          background: 'linear-gradient(135deg, #5F7F76 0%, #4A6B62 100%)',
        }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4 text-white"
            style={{ fontFamily: 'Poppins, sans-serif' }}
          >
            Your research deserves better than a spreadsheet.
          </h2>
          <p className="text-base sm:text-lg mb-8 leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Join thousands of researchers who organize their protocols, stockpile, and schedules
            in one place — and never lose track again.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <a
              href="/app"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold transition-all hover:-translate-y-0.5 hover:shadow-xl"
              style={{
                backgroundColor: '#FFFFFF',
                color: '#5F7F76',
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              }}
            >
              Get Started Free
              <ArrowRight size={16} weight="bold" aria-hidden />
            </a>
            <a
              href="/login?signup=true&redirect=/app/account/subscription"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold transition-all hover:-translate-y-0.5 hover:shadow-xl"
              style={{
                backgroundColor: 'rgba(255,255,255,0.12)',
                color: '#FFFFFF',
                border: '2px solid rgba(255,255,255,0.55)',
                boxShadow: '0 2px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.2)',
                backdropFilter: 'blur(4px)',
              }}
            >
              Start <PlanTitleText text="Research+" />
            </a>
          </div>
          <p className="mt-5 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
            No payment required to use The Pep Planner. Cancel <PlanTitleText text="Research+" /> anytime.
          </p>
        </div>
      </section>

      <LandingFooter />
    </div>
    </IconContext.Provider>
  );
}
