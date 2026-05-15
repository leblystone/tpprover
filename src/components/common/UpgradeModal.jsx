import React, { useState } from 'react';
import { Crown, Loader } from 'lucide-react';
import { TestTube } from '@phosphor-icons/react';
import Modal from './Modal';
import { formatCurrency } from '../../utils/currencyUtils';
import { SUBSCRIPTION_PLANS, getPlanPricing } from '../../utils/subscriptionPlans';
import { createCheckoutSession } from '../../services/stripe';
import { subscribe as paymentSubscribe } from '../../services/payment/paymentService';
import { isNative } from '../../utils/platform';
import { STRIPE_CONFIG } from '../../config/stripe';
import { useFirebase } from '../../context/FirebaseContext';

const LIMIT_MESSAGES = {
  protocols: 'You\'ve used all your free protocol slots',
  stockpile: 'Your stockpile tracking has hit the free limit',
  supplements: 'You\'ve reached the supplement tracking limit',
  orders: 'Order tracking is capped on the free plan',
  vendors: 'Vendor slots are full on the free plan',
  savedCalcs: 'Saved calculation limit reached',
  ai: 'AI Research is a Research+ feature',
  buddy: 'Account Buddy is a Research+ feature',
  themes: 'Premium themes require Research+',
};

/**
 * Upgrade modal — shown everywhere a subscription gate is hit.
 * Initiates checkout directly (Stripe web / native IAP) without page redirect.
 *
 * @param {Object} limitContext - Optional. When a cap is hit, pass { feature, current, max }
 *   e.g. { feature: 'protocols', current: 1, max: 1 } to show what limit was hit.
 */
export default function UpgradeModal({ isOpen, onClose, theme, limitContext }) {
  const { firebaseUser } = useFirebase();
  const [loadingPlan, setLoadingPlan] = useState(null);

  const monthly  = getPlanPricing('researchPlusMonthly', 0);
  const annual   = getPlanPricing('researchPlusAnnual', 0);
  const lifetime = getPlanPricing('researchPlusLifetime', 0);

  const monthlyPrice  = formatCurrency(monthly?.founderPrice  ?? monthly?.price  ?? 0);
  const annualPrice   = formatCurrency(annual?.founderPrice   ?? annual?.price   ?? 0);
  const annualSavings = formatCurrency(Math.max(annual?.savings ?? 0, 0));
  const lifetimePrice = formatCurrency(lifetime?.founderPrice ?? lifetime?.price ?? 0);

  const perMonthFromAnnual =
    annual?.price && SUBSCRIPTION_PLANS.researchPlusAnnual?.interval === 'year'
      ? formatCurrency(Number((annual.price / 12).toFixed(2)))
      : null;

  const handleSelectPlan = async (planKey) => {
    if (loadingPlan) return;
    setLoadingPlan(planKey);
    try {
      if (isNative()) {
        await paymentSubscribe(planKey, {
          userEmail: firebaseUser?.email || '',
          userId: firebaseUser?.uid || '',
        });
        onClose();
      } else {
        const priceId = STRIPE_CONFIG.prices[planKey];
        await createCheckoutSession(priceId, firebaseUser?.email, firebaseUser?.uid);
        // Stripe redirects — no need to close
      }
    } catch (err) {
      console.error('[UpgradeModal] checkout error:', err);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Failed to start checkout. Please try again.', type: 'error' },
      }));
    } finally {
      setLoadingPlan(null);
    }
  };

  const primary     = theme?.primary     || '#2F665C';
  const primaryDark = theme?.primaryDark || '#244a45';
  const cardBg      = theme?.isDark ? 'rgba(255,255,255,0.04)' : '#ffffff';
  const cardBorder  = theme?.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const muted       = theme?.textLight || '#6b7280';

  const PlanButton = ({ planKey, children }) => {
    const loading = loadingPlan === planKey;
    const anyLoading = !!loadingPlan;
    return (
      <button
        type="button"
        onClick={() => handleSelectPlan(planKey)}
        disabled={anyLoading}
        className="relative w-full transition-opacity disabled:opacity-60"
      >
        {loading && (
          <span className="absolute inset-0 flex items-center justify-center z-10">
            <Loader size={18} className="animate-spin" style={{ color: primary }} />
          </span>
        )}
        <span className={loading ? 'invisible' : undefined}>{children}</span>
      </button>
    );
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={
        <span>
          Research
          <span style={{
            background: 'linear-gradient(135deg, #C8912A 0%, #E8C55A 50%, #B8822A 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            fontWeight: 700,
          }}>+</span>
        </span>
      }
      theme={theme}
      variant="modern"
      maxWidth="max-w-4xl"
      footer={
        <div className="flex justify-center w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={!!loadingPlan}
            className="px-6 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40"
            style={{
              backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              color: theme?.isDark ? '#e5e7eb' : '#374151',
            }}
          >
            Maybe Later
          </button>
        </div>
      }
    >
      <div className="px-1">
        {/* Limit Hit Context */}
        {limitContext && (
          <div
            className="mb-3 p-3 rounded-xl text-center"
            style={{
              backgroundColor: theme?.isDark ? 'rgba(212,160,48,0.1)' : 'rgba(212,160,48,0.08)',
              border: `1px solid ${theme?.isDark ? 'rgba(212,160,48,0.2)' : 'rgba(212,160,48,0.15)'}`,
            }}
          >
            <p className="text-xs font-semibold" style={{ color: '#B45309' }}>
              You've reached the free plan limit
            </p>
            <p className="text-[11px] mt-0.5" style={{ color: muted }}>
              {LIMIT_MESSAGES[limitContext.feature] || `${limitContext.current}/${limitContext.max} ${limitContext.feature} used`}
              {' — '}Research+ removes all limits.
            </p>
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-3">
          <div className="inline-flex items-center justify-center gap-2 mb-1.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%)`,
                boxShadow: `0 4px 12px ${primary}30`,
              }}
            >
              <TestTube className="w-4 h-4 text-white" weight="bold" />
            </div>
          </div>
          <h2 className="text-lg font-bold tracking-tight" style={{ color: theme?.text }}>
            {limitContext ? 'Unlock Unlimited Access' : 'Upgrade to Research'}
            {!limitContext && <span style={{ color: '#D4A030', fontWeight: 700, fontSize: '1.1em', verticalAlign: 'middle' }}>+</span>}
          </h2>
          <p className="text-xs mt-1 max-w-sm mx-auto" style={{ color: muted }}>
            {limitContext
              ? 'Your data is still safe. Upgrade to keep adding and tracking without limits.'
              : 'Full protocols, cloud sync, AI research, insights, and more.'}
          </p>
        </div>

        {/* Plan cards */}
        <div className="space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">

            {/* Monthly */}
            <PlanButton planKey="researchPlusMonthly">
              <div
                className="text-left rounded-xl border p-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] flex flex-col"
                style={{
                  borderColor: cardBorder,
                  backgroundColor: cardBg,
                  boxShadow: theme?.isDark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.05)',
                }}
              >
                <h3 className="text-sm font-bold" style={{ color: theme?.text }}>Monthly</h3>
                <p className="text-[11px] mt-0.5 mb-2 flex-1 leading-snug" style={{ color: muted }}>
                  {SUBSCRIPTION_PLANS.researchPlusMonthly?.description}
                </p>
                <div>
                  <div className="text-xl font-bold tabular-nums" style={{ color: theme?.text }}>{monthlyPrice}</div>
                  <div className="text-[11px]" style={{ color: muted }}>per month</div>
                  <div
                    className="mt-2.5 w-full py-2 rounded-lg text-center text-xs font-bold text-white"
                    style={{ backgroundColor: primary }}
                  >
                    {SUBSCRIPTION_PLANS.researchPlusMonthly?.cta || 'Start Monthly'}
                  </div>
                </div>
              </div>
            </PlanButton>

            {/* Annual */}
            <PlanButton planKey="researchPlusAnnual">
              <div
                className="relative text-left rounded-xl border p-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99] flex flex-col"
                style={{
                  borderColor: primary,
                  background: theme?.isDark
                    ? `linear-gradient(180deg, ${primary}18 0%, ${cardBg} 55%)`
                    : `linear-gradient(180deg, ${primary}12 0%, #fff 50%)`,
                  boxShadow: `0 4px 16px ${primary}20`,
                }}
              >
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                  <span
                    className="px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide text-white"
                    style={{ backgroundColor: primaryDark }}
                  >
                    Popular
                  </span>
                </div>
                <h3 className="text-sm font-bold pt-0.5" style={{ color: theme?.text }}>Annual</h3>
                <p className="text-[11px] mt-0.5 mb-2 flex-1 leading-snug" style={{ color: muted }}>
                  {SUBSCRIPTION_PLANS.researchPlusAnnual?.description}
                </p>
                <div>
                  <div className="text-xl font-bold tabular-nums" style={{ color: theme?.text }}>{annualPrice}</div>
                  <div className="text-[11px]" style={{ color: muted }}>
                    per year{perMonthFromAnnual ? <span className="ml-1 opacity-90">(~{perMonthFromAnnual}/mo)</span> : null}
                  </div>
                  <div className="mt-1.5">
                    <span
                      className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold"
                      style={{
                        backgroundColor: theme?.isDark ? 'rgba(212,160,48,0.2)' : 'rgba(212,160,48,0.25)',
                        color: '#B45309',
                      }}
                    >
                      Save {annualSavings} vs monthly
                    </span>
                  </div>
                  <div
                    className="mt-2.5 w-full py-2 rounded-lg text-center text-xs font-bold text-white"
                    style={{ backgroundColor: primaryDark }}
                  >
                    {SUBSCRIPTION_PLANS.researchPlusAnnual?.cta || 'Start Annual'}
                  </div>
                </div>
              </div>
            </PlanButton>
          </div>

          {/* Lifetime */}
          <PlanButton planKey="researchPlusLifetime">
            <div
              className="relative text-left rounded-xl border p-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.99]"
              style={{
                borderColor: cardBorder,
                backgroundColor: cardBg,
                boxShadow: theme?.isDark ? '0 2px 12px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.05)',
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${primary} 0%, ${primaryDark} 100%)` }}
                >
                  <Crown className="w-4 h-4 text-white" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm" style={{ color: theme?.text }}>Lifetime</div>
                  <div className="text-[11px] leading-snug" style={{ color: muted }}>
                    {SUBSCRIPTION_PLANS.researchPlusLifetime?.description}
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="text-base font-bold tabular-nums" style={{ color: theme?.text }}>{lifetimePrice}</div>
                  <div className="text-[10px]" style={{ color: muted }}>one-time</div>
                </div>
              </div>
              <div
                className="mt-2.5 w-full py-2 rounded-lg text-center text-xs font-bold text-white"
                style={{ backgroundColor: primary }}
              >
                {SUBSCRIPTION_PLANS.researchPlusLifetime?.cta || 'Join Forever'}
              </div>
            </div>
          </PlanButton>

          <p className="text-[10px] text-center" style={{ color: muted }}>
            Secure checkout · Cancel anytime · Your data always stays yours.
          </p>
        </div>
      </div>
    </Modal>
  );
}
