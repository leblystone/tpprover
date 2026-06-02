/**
 * App Store Subscription Modal
 * Native iOS IAP purchase flow — mirrors StripeSubscriptionModal structure.
 * Founder-eligible users see grandfathered Founder pricing; new users see Research+.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import Modal from '../common/Modal';
import { subscribe } from '../../services/payment/paymentService';
import { useAppContext } from '../../context/AppContext';
import { useFirebase } from '../../context/FirebaseContext';
import { formatCurrency } from '../../utils/currencyUtils';
import {
  SUBSCRIPTION_PLANS,
  getPlanPricing,
  isFoundingMember,
  getCheckoutPlanKeys,
} from '../../utils/subscriptionPlans';

function RestorePurchasesLink({ theme, onClose }) {
  const [status, setStatus] = React.useState('idle')
  const [msg, setMsg] = React.useState('')

  const handleRestore = async () => {
    setStatus('loading')
    setMsg('')
    try {
      const { restorePurchases } = await import('../../services/payment/appStoreIAPService')
      const result = await restorePurchases()
      if (result.purchasesVerified > 0) {
        setStatus('success')
        setMsg('Subscription synced!')
        setTimeout(() => { onClose?.(); window.location.reload() }, 1500)
      } else if (result.purchasesFound === 0) {
        setStatus('error')
        setMsg('No previous purchases found.')
      } else {
        setStatus('error')
        setMsg('Could not verify. Contact support.')
      }
    } catch (err) {
      setStatus('error')
      setMsg(err?.message || 'Restore failed.')
    }
  }

  return (
    <div className="pt-1">
      <button
        onClick={handleRestore}
        disabled={status === 'loading'}
        className="underline underline-offset-2 hover:opacity-80 disabled:opacity-40 transition-opacity"
        style={{ color: theme.primary }}
      >
        {status === 'loading' ? 'Syncing…' : 'Sync Subscription'}
      </button>
      {msg && (
        <p className="mt-1 text-[10px]" style={{ color: status === 'success' ? theme.primary : '#ef4444' }}>
          {msg}
        </p>
      )}
    </div>
  )
}

export default function AppStoreSubscriptionModal({ isOpen, onClose, theme, currentPlan }) {
  const { user } = useAppContext();
  const { firebaseUser } = useFirebase();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [selectedPlan, setSelectedPlan] = React.useState(null);
  const [error, setError] = React.useState(null);

  const userForFounder = React.useMemo(() => ({
    ...user,
    createdAt: user?.createdAt || firebaseUser?.metadata?.creationTime || null,
  }), [user, firebaseUser]);

  const founderEligible = isFoundingMember(userForFounder);
  const keys = React.useMemo(() => getCheckoutPlanKeys(founderEligible), [founderEligible]);

  const monthlyPlan  = getPlanPricing(keys.monthly,  0) || { price: 0 };
  const annualPlan   = getPlanPricing(keys.annual,   0) || { price: 0 };
  const lifetimePlan = getPlanPricing(keys.lifetime, 0) || { price: 0 };

  const hexToRgba = (hex, alpha) => {
    if (!hex) return `rgba(127, 158, 149, ${alpha})`;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const handleSelectPlan = async (planKey) => {
    const plan = SUBSCRIPTION_PLANS[planKey];
    if (!plan) {
      console.warn('Unknown plan selected:', planKey);
      return;
    }

    console.log('💳 AppStoreSubscriptionModal: Selected plan:', plan);
    setSelectedPlan(planKey);
    setIsProcessing(true);
    setError(null);

    await new Promise(resolve => setTimeout(resolve, 600));

    try {
      await subscribe(planKey, {
        userEmail: user?.email || '',
        userId: user?.uid || '',
        plan,
      });
    } catch (err) {
      console.error('❌ AppStoreSubscriptionModal: Subscription error:', err);
      const message = err?.message || 'Failed to start subscription. Please try again.';
      setError(message);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message, type: 'error' },
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const planRows = [
    {
      key: keys.monthly,
      label: monthlyPlan.label || (founderEligible ? 'Founder Monthly' : 'Research+ Monthly'),
      sublabel: `${formatCurrency(monthlyPlan.price)} / month`,
      description: 'Flexible monthly billing',
      highlight: false,
      badge: null,
    },
    {
      key: keys.annual,
      label: annualPlan.label || (founderEligible ? 'Founder Annual' : 'Research+ Annual'),
      sublabel: `${formatCurrency(annualPlan.price)} / year`,
      description: founderEligible ? 'Best value — save with annual billing' : 'Best value — effectively $3.33/month',
      highlight: true,
      badge: 'Most Popular',
    },
    {
      key: keys.lifetime,
      label: lifetimePlan.label || (founderEligible ? 'Founder Lifetime' : 'Research+ Lifetime'),
      sublabel: `${formatCurrency(lifetimePlan.price)} one-time`,
      description: 'One-time payment, lifetime access',
      highlight: false,
      badge: null,
    },
  ];

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Choose Your Plan"
      theme={theme}
      variant="modern"
      maxWidth="max-w-md"
      footer={
        <div className="flex justify-center w-full">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              color: theme.isDark ? '#e5e7eb' : '#374151',
            }}
          >
            Maybe Later
          </button>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        {error && (
          <div
            className="p-3 rounded-lg border text-sm"
            style={{
              backgroundColor: theme.isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2',
              borderColor: theme.isDark ? 'rgba(239,68,68,0.2)' : '#fecaca',
              color: theme.isDark ? '#fca5a5' : '#b91c1c',
            }}
          >
            {error}
          </div>
        )}

        <div className="text-center mb-4">
          <p className="text-sm" style={{ color: theme.textLight }}>
            {founderEligible
              ? 'Your founding-member pricing is locked in forever.'
              : 'Select a plan — App Store handles your payment securely.'}
          </p>
        </div>

        <div className="space-y-3">
          {planRows.map(({ key, label, sublabel, description, highlight, badge }) => (
            <button
              key={key}
              onClick={() => handleSelectPlan(key)}
              disabled={isProcessing}
              className="w-full p-4 rounded-lg border-2 transition-all hover:shadow-lg disabled:opacity-50 relative"
              style={{
                borderColor: (selectedPlan === key || highlight) ? theme.primary : theme.border,
                backgroundColor:
                  selectedPlan === key
                    ? hexToRgba(theme.primary, highlight ? 0.15 : 0.1)
                    : theme.cardBackground,
                boxShadow:
                  selectedPlan === key
                    ? `0 0 0 3px ${hexToRgba(theme.primary, highlight ? 0.3 : 0.2)}`
                    : 'none',
              }}
            >
              {badge && (
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: theme.primary }}
                  >
                    {badge}
                  </span>
                </div>
              )}
              <div className="text-left">
                <div
                  className="font-semibold text-lg mb-0.5 flex items-center gap-2"
                  style={{ color: theme.text }}
                >
                  {label}
                  {selectedPlan === key && (
                    <span className="text-xs" style={{ color: theme.primary }}>
                      ● Processing...
                    </span>
                  )}
                </div>
                <div className="text-sm font-medium mb-0.5" style={{ color: theme.primary }}>
                  {sublabel}
                </div>
                <div className="text-xs" style={{ color: theme.textLight }}>
                  {description}
                </div>
              </div>
            </button>
          ))}
        </div>

        {isProcessing && (
          <div className="text-center py-2">
            <div className="text-sm" style={{ color: theme.textLight }}>
              Opening App Store…
            </div>
          </div>
        )}

        <div className="text-xs text-center pt-2 space-y-1" style={{ color: theme.textLight }}>
          <p>Subscription managed through App Store. Cancel anytime.</p>
          <p className="flex flex-wrap justify-center gap-x-3 gap-y-1">
            <Link
              to="/terms"
              className="underline hover:opacity-80"
              style={{ color: theme.primary }}
              onClick={onClose}
            >
              Terms of Use
            </Link>
            <Link
              to="/privacy"
              className="underline hover:opacity-80"
              style={{ color: theme.primary }}
              onClick={onClose}
            >
              Privacy Policy
            </Link>
          </p>
          <RestorePurchasesLink theme={theme} onClose={onClose} />
        </div>
      </div>
    </Modal>
  );
}
