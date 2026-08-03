import React, { useState } from 'react';
import { Flask, ShieldCheck, LockOpen } from '@phosphor-icons/react';
import { SUBSCRIPTION_PLANS } from '../../utils/subscriptionPlans';
import OnboardingBackButton from './OnboardingBackButton';
import OnboardingLogoFooter from './OnboardingLogoFooter';
import OnboardingQuestionHeader from './OnboardingQuestionHeader';
import readyResearchArt from '../../assets/onboarding/your_ready_research.png';

const ICON_WEIGHT = 'duotone';

/**
 * Final onboarding step — trial pitch + optional pricing.
 * Full-page layout (same shell as other onboarding steps).
 */
export default function TrialPricingStep({ theme, onComplete, onBack }) {
  const [showPricing, setShowPricing] = useState(false);
  const text = theme?.text || '#1f2937';
  const muted = theme?.isDark ? 'rgba(255,255,255,0.65)' : '#6b7280';
  const primary = theme?.primary || '#7F9E95';
  const cardBg = theme?.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.55)';
  const border = theme?.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  return (
    <div
      className="relative flex flex-col h-full"
      style={{
        paddingTop: '0.5rem',
        paddingBottom: 'calc(0.75rem + var(--safe-area-bottom, 0px))',
      }}
    >
      <div className="px-3 pt-1">
        <OnboardingBackButton
          onClick={() => {
            if (showPricing) setShowPricing(false);
            else onBack?.();
          }}
          theme={theme}
        />
      </div>

      <div className="flex-1 px-6 max-w-lg mx-auto w-full flex flex-col justify-center overflow-y-auto">
        {!showPricing ? (
          <div className="text-center">
            <div className="w-40 h-40 sm:w-48 sm:h-48 mx-auto mb-3 flex items-center justify-center">
              <img
                src={readyResearchArt}
                alt=""
                className="w-full h-full object-contain"
                draggable={false}
                style={{
                  mixBlendMode: theme?.isDark ? 'screen' : 'multiply',
                }}
              />
            </div>
            <OnboardingQuestionHeader
              className="mb-6"
              theme={theme}
              titleClassName="text-3xl sm:text-4xl font-bold mb-2 leading-tight"
              title="You're ready!"
            />

            <div
              className="rounded-2xl p-4 sm:p-5 mb-6 border"
              style={{ backgroundColor: cardBg, borderColor: border }}
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Flask size={20} weight={ICON_WEIGHT} style={{ color: primary }} />
                <h3 className="text-base font-semibold tracking-tight" style={{ color: text }}>
                  14 Days of Research
                  <span
                    className="rp-plus-sparkle inline-block"
                    style={{ color: '#D4A030', fontWeight: 700, fontSize: '1.15em' }}
                    aria-hidden="true"
                  >
                    +
                  </span>
                </h3>
                <style>{`
                  @keyframes rpPlusSparkle {
                    0%, 100% {
                      opacity: 1;
                      transform: scale(1) rotate(0deg);
                      text-shadow: 0 0 2px rgba(212,160,48,0.35);
                    }
                    35% {
                      opacity: 1;
                      transform: scale(1.22) rotate(-6deg);
                      text-shadow:
                        0 0 6px rgba(245,217,122,0.95),
                        0 0 12px rgba(212,160,48,0.65),
                        0 0 18px rgba(232,197,90,0.4);
                    }
                    55% {
                      opacity: 0.88;
                      transform: scale(1.06) rotate(4deg);
                      text-shadow: 0 0 4px rgba(245,217,122,0.7);
                    }
                  }
                  .rp-plus-sparkle {
                    animation: rpPlusSparkle 2.4s ease-in-out infinite;
                    transform-origin: center;
                  }
                `}</style>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: muted }}>
                Protocols, dosing schedule, stockpile tracking, the works.
                Just see if it works for you.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: Flask, title: 'Flexible', sub: 'Month / Annual / Life' },
                { icon: ShieldCheck, title: 'Zero Pressure', sub: 'No upfront payment' },
                { icon: LockOpen, title: 'Full Access', sub: 'Every research tool' },
              ].map(({ icon: Icon, title, sub }) => (
                <div key={title} className="flex flex-col items-center px-1">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-2"
                    style={{ backgroundColor: `${primary}22`, color: primary }}
                  >
                    <Icon size={20} weight={ICON_WEIGHT} style={{ color: primary }} />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: text }}>
                    {title}
                  </p>
                  <p className="text-[10px] mt-0.5 leading-snug" style={{ color: muted }}>
                    {sub}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={onComplete}
                className="w-full py-3.5 rounded-full font-bold"
                style={{ backgroundColor: primary, color: theme?.textOnPrimary || '#fff' }}
              >
                Start Researching!
              </button>
              <button
                type="button"
                onClick={() => setShowPricing(true)}
                className="text-sm opacity-70 py-2"
                style={{ color: muted }}
              >
                Show me pricing first!
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <OnboardingQuestionHeader
              className="mb-6"
              theme={theme}
              titleClassName="text-2xl sm:text-3xl font-bold mb-2 leading-tight"
              title="Research Plans"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              {[
                { key: 'researchPlusMonthly', label: 'Monthly', sub: 'Most flexible', price: SUBSCRIPTION_PLANS.researchPlusMonthly.price, suffix: '/mo' },
                { key: 'researchPlusAnnual', label: 'Annual', sub: `~$${(SUBSCRIPTION_PLANS.researchPlusAnnual.price / 12).toFixed(2)}/mo`, price: SUBSCRIPTION_PLANS.researchPlusAnnual.price, suffix: '/yr', featured: true },
                { key: 'researchPlusLifetime', label: 'Lifetime', sub: 'Pay once, own forever', price: SUBSCRIPTION_PLANS.researchPlusLifetime.price, suffix: '' },
              ].map((plan) => (
                <div
                  key={plan.key}
                  className={`rounded-2xl p-4 flex flex-col justify-between relative border ${plan.featured ? 'sm:scale-[1.02]' : ''}`}
                  style={{
                    borderColor: plan.featured ? primary : border,
                    backgroundColor: plan.featured
                      ? `${primary}18`
                      : cardBg,
                  }}
                >
                  {plan.featured && (
                    <span
                      className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[9px] font-semibold rounded-full text-white uppercase tracking-widest"
                      style={{ backgroundColor: '#c87a5c' }}
                    >
                      Best Value
                    </span>
                  )}
                  <div>
                    <p className="font-semibold text-sm mb-0.5 mt-1" style={{ color: text }}>{plan.label}</p>
                    <p className="text-[10px] mb-2" style={{ color: muted }}>{plan.sub}</p>
                  </div>
                  <p className="font-semibold text-2xl" style={{ color: primary }}>
                    ${plan.price}
                    {plan.suffix && (
                      <span className="text-sm font-normal opacity-60" style={{ color: muted }}>
                        {plan.suffix}
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={onComplete}
              className="w-full py-3.5 rounded-full font-bold"
              style={{ backgroundColor: primary, color: theme?.textOnPrimary || '#fff' }}
            >
              Let&apos;s Research!
            </button>
          </div>
        )}
      </div>

      <OnboardingLogoFooter />
    </div>
  );
}
