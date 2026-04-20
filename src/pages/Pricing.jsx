import React, { useMemo, useState } from 'react';
import { Check, Star, Zap, Shield, Users } from 'lucide-react';
import { themes, defaultThemeName } from '../theme/themes';
import { formatCurrency } from '../utils/currencyUtils';
import { usePageSEO } from '../utils/pageSEO';
import LandingHeader from '../components/layout/LandingHeader';
import LandingFooter from '../components/layout/LandingFooter';
import { SUBSCRIPTION_PLANS } from '../utils/subscriptionPlans';

/**
 * Public marketing plans — always aligned with `subscriptionPlans.js` (Free + Research+).
 * Not gated by ENABLE_RESEARCH_PLUS so the landing pricing page stays accurate.
 */
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
      'Full Recon Calculator (always free)',
      'Local-only (no cloud sync)',
      'Upgrade anytime without losing data',
    ],
    popular: false,
    cta: SUBSCRIPTION_PLANS.free.cta,
    ctaLink: '/app',
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
      'Cloud sync across devices',
      'Priority support',
    ],
    popular: true,
    ctaMonthly: SUBSCRIPTION_PLANS.researchPlusMonthly.cta,
    ctaAnnual: SUBSCRIPTION_PLANS.researchPlusAnnual.cta,
    ctaLink: '/app',
  },
  {
    id: 'lifetime',
    name: SUBSCRIPTION_PLANS.researchPlusLifetime.label,
    description: SUBSCRIPTION_PLANS.researchPlusLifetime.description,
    monthlyPrice: SUBSCRIPTION_PLANS.researchPlusLifetime.price,
    yearlyPrice: SUBSCRIPTION_PLANS.researchPlusLifetime.price,
    isLifetime: true,
    features: [
      'Everything in Research+ (monthly or annual)',
      'One-time payment — never billed again',
      'All future features included',
      'Use on every device you own',
      'Best long-term value',
    ],
    popular: false,
    cta: SUBSCRIPTION_PLANS.researchPlusLifetime.cta,
    ctaLink: '/app',
  },
];

function annualSavingsPercent() {
  const perMonth = SUBSCRIPTION_PLANS.researchPlusMonthly.price;
  const annual = SUBSCRIPTION_PLANS.researchPlusAnnual.price;
  const fullYearAtMonthly = perMonth * 12;
  if (fullYearAtMonthly <= 0) return 0;
  return Math.round(((fullYearAtMonthly - annual) / fullYearAtMonthly) * 100);
}

function planTitle(plan, billingCycle) {
  if (plan.id === 'researchPlus') {
    return billingCycle === 'monthly'
      ? SUBSCRIPTION_PLANS.researchPlusMonthly.label
      : SUBSCRIPTION_PLANS.researchPlusAnnual.label;
  }
  return plan.name;
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

export default function Pricing() {
  usePageSEO();
  const theme = themes[defaultThemeName];
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = MARKETING_PLANS;
  const yearlySavePct = useMemo(() => annualSavingsPercent(), []);

  const faqs = [
    {
      question: 'Is there a free tier?',
      answer:
        'Yes. The Free plan includes core tracking — one active protocol, limited stockpile, and the full Recon Calculator — at no cost. Research+ unlocks unlimited protocols, AI Research, Buddy, Community Directory, cloud sync, and more.',
    },
    {
      question: 'Is there a trial for Research+?',
      answer:
        'New accounts get a research trial period to explore premium capabilities (see Terms). You can stay on Free forever or subscribe to Research+ when you are ready.',
    },
    {
      question: 'Can I change plans anytime?',
      answer:
        'Absolutely. You can upgrade or downgrade between Free and Research+ at any time. Changes take effect according to your billing cycle where applicable.',
    },
    {
      question: 'What happens to my data if I cancel Research+?',
      answer:
        'Your data stays yours. After cancellation you can continue on the Free tier within plan limits, or export your data. See Terms for retention details.',
    },
    {
      question: 'Do you offer educational discounts?',
      answer: 'Yes! We offer special pricing for educational institutions and students. Contact us for more information.',
    },
    {
      question: 'Is my data secure?',
      answer:
        'Yes. We use enterprise-grade security with encryption in transit and at rest to protect your research data.',
    },
    {
      question: 'Can I use this for commercial research?',
      answer: 'Yes, all plans support both academic and commercial research applications.',
    },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
      <LandingHeader />

      {/* Hero Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: theme.primaryDark }}>
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl md:text-2xl mb-8" style={{ color: theme.textLight }}>
            Start free with core tracking, or unlock everything with Research+ — AI, cloud sync, Buddy, Directory, and more.
          </p>

          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-8 flex-wrap gap-y-2">
            <span className={`mr-3 text-sm font-medium ${billingCycle === 'monthly' ? '' : 'opacity-50'}`} style={{ color: theme.text }}>
              Monthly
            </span>
            <button
              type="button"
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{ backgroundColor: billingCycle === 'yearly' ? theme.primary : '#D1D5DB' }}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`ml-3 text-sm font-medium ${billingCycle === 'yearly' ? '' : 'opacity-50'}`} style={{ color: theme.text }}>
              Yearly
            </span>
            {billingCycle === 'yearly' && yearlySavePct > 0 && (
              <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: theme.primary, color: 'white' }}>
                Save {yearlySavePct}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative p-8 rounded-2xl ${
                  plan.popular ? 'ring-2' : ''
                }`}
                style={{
                  backgroundColor: theme.white,
                  borderColor: plan.popular ? theme.primary : theme.border,
                  border: plan.popular ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`,
                }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="flex items-center px-4 py-2 rounded-full text-sm font-medium text-white" style={{ backgroundColor: theme.primary }}>
                      <Star className="w-4 h-4 mr-1" />
                      Most Popular
                    </div>
                  </div>
                )}

                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2" style={{ color: theme.primaryDark }}>
                    {planTitle(plan, billingCycle)}
                  </h3>
                  <p className="text-sm mb-4 min-h-[3rem]" style={{ color: theme.textLight }}>
                    {planDescription(plan, billingCycle)}
                  </p>
                  <div className="mb-4">
                    {plan.isFree ? (
                      <>
                        <span className="text-4xl font-bold" style={{ color: theme.primaryDark }}>
                          Free
                        </span>
                        <p className="text-sm mt-2 m-0" style={{ color: theme.textLight }}>
                          Forever · core features · no card required
                        </p>
                      </>
                    ) : (
                      <>
                        <span className="text-4xl font-bold" style={{ color: theme.primaryDark }}>
                          {formatCurrency(billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice)}
                        </span>
                        {!plan.isLifetime && (
                          <span className="text-sm ml-1" style={{ color: theme.textLight }}>
                            /{billingCycle === 'monthly' ? 'month' : 'year'}
                          </span>
                        )}
                        {plan.isLifetime && (
                          <span className="text-sm ml-1" style={{ color: theme.textLight }}>
                            one-time
                          </span>
                        )}
                      </>
                    )}
                  </div>
                  {billingCycle === 'yearly' && !plan.isLifetime && !plan.isFree && plan.yearlyPrice > 0 && (
                    <p className="text-sm" style={{ color: theme.primary }}>
                      {formatCurrency(Number((plan.yearlyPrice / 12).toFixed(2)))}/month billed yearly
                    </p>
                  )}
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" style={{ color: theme.primary }} />
                      <span className="text-sm" style={{ color: theme.text }}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.ctaLink}
                  className={`block w-full py-3 px-6 rounded-lg font-medium text-center transition-colors ${
                    plan.popular
                      ? 'text-white'
                      : 'border'
                  }`}
                  style={{
                    backgroundColor: plan.popular ? theme.primary : 'transparent',
                    borderColor: plan.popular ? theme.primary : theme.primary,
                    color: plan.popular ? 'white' : theme.primary,
                  }}
                  onMouseEnter={(e) => {
                    if (plan.popular) {
                      e.target.style.backgroundColor = theme.primaryDark;
                    } else {
                      e.target.style.backgroundColor = theme.primary;
                      e.target.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (plan.popular) {
                      e.target.style.backgroundColor = theme.primary;
                    } else {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = theme.primary;
                    }
                  }}
                >
                  {planCta(plan, billingCycle)}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Comparison */}
      <div className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.white }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: theme.primaryDark }}>
              Why The Pep Planner
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: theme.primary }}>
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: theme.primaryDark }}>
                Secure by design
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                Encryption in transit and at rest, with infrastructure built for sensitive research workflows.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: theme.primary }}>
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: theme.primaryDark }}>
                Try before you subscribe
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                Use the Free tier indefinitely, or explore Research+ with a trial — no surprise lock-in.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: theme.primary }}>
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: theme.primaryDark }}>
                Expert support
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                Get help from our team when you need it — Research+ includes priority support.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: theme.primaryDark }}>
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="p-6 rounded-xl" style={{ backgroundColor: theme.white }}>
                <h3 className="text-lg font-semibold mb-3" style={{ color: theme.primaryDark }}>
                  {faq.question}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.white }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: theme.primaryDark }}>
            Ready to Get Started?
          </h2>
          <p className="text-lg mb-8" style={{ color: theme.textLight }}>
            Join researchers who use The Pep Planner to organize protocols, stockpile, and schedules in one place.
          </p>
          <a
            href="/app"
            className="inline-block px-8 py-3 rounded-lg font-medium text-white transition-colors"
            style={{ backgroundColor: theme.primary }}
            onMouseEnter={(e) => { e.target.style.backgroundColor = theme.primaryDark; }}
            onMouseLeave={(e) => { e.target.style.backgroundColor = theme.primary; }}
          >
            Continue Free or Start Research+
          </a>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
