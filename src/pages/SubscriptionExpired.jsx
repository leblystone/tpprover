// Subscription Ended - Resubscribe Page
import React, { useState } from 'react';
import { CreditCard, Download, Trash2, Eye, BookOpenCheck, FileText, Crown, Sparkles } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { themes, defaultThemeName } from '../theme/themes';
import { useAppContext } from '../context/AppContext';
import { useFounderOffer } from '../context/FounderOfferContext';
import { STRIPE_CONFIG } from '../config/stripe';
import { formatCurrency } from '../utils/currencyUtils';
import { SUBSCRIPTION_PLANS, getPlanPricing } from '../utils/subscriptionPlans';

import { subscribe } from '../services/payment/paymentService';
import { exportUserDataToCSV, exportUserDataToPDF } from '../utils/export';
import DeleteAccountModal from '../components/common/DeleteAccountModal';
import DataViewModal from '../components/common/DataViewModal';

export default function SubscriptionExpired() {
  const theme = themes[defaultThemeName];
  const navigate = useNavigate();
  const { user, subscription } = useAppContext();
  const { 
    protocols, orders, stockpile, vendors, reconItems, reconHistory, 
    supplements, metrics, calendarNotes, scheduledBuys, glossary, goals, protocolHistory
  } = useAppContext();
  const founderOffer = useFounderOffer();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDataModal, setShowDataModal] = useState(false);

  // Calculate subscription end date + 1 day for safety
  const getSubscriptionEndDate = () => {
    if (!subscription?.currentPeriodEnd) return null;
    const endDate = new Date(subscription.currentPeriodEnd);
    // Add 1 day for safety
    endDate.setDate(endDate.getDate() + 1);
    return endDate;
  };

  const subscriptionEndDate = getSubscriptionEndDate();

  const discount = founderOffer.founderActive ? founderOffer.discountPercent : 0;

  const buildPlanDisplay = (key) => {
    const data = getPlanPricing(key, discount);
    return {
      ...data,
      base: formatCurrency(data.price),
      founder: formatCurrency(data.founderPrice),
      savings: formatCurrency(Math.max(data.savings, 0))
    };
  };

  const planPricing = {
    monthly: buildPlanDisplay('monthly'),
    annual: buildPlanDisplay('annual'),
    lifetime: buildPlanDisplay('lifetime'),
  };
  const discountActive = discount > 0;

  const [processingPlan, setProcessingPlan] = useState(null);

  const handleSubscribe = async (plan) => {
    if (processingPlan) {
      return;
    }

    try {
      if (!user?.email) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Please log in to resubscribe', type: 'error' } 
        }));
        return;
      }

      setProcessingPlan(plan.key);
      await subscribe(plan.key, {
        userEmail: user.email,
        userId: user.uid || user.email,
        plan: {
          label: plan.name,
          key: plan.key
        },
        founderOffer: founderOffer
      });
      // Purchase succeeded -- navigate to the app
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: '🎉 Subscription reactivated! Welcome back.', type: 'success' }
      }));
      navigate('/app');
    } catch (error) {
      console.error('Subscription error:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: error.message || 'Unable to resubscribe. Please try again.', type: 'error' } 
      }));
    } finally {
      setProcessingPlan(null);
    }
  };

  const getAllData = () => {
    return {
      protocols: protocols || [],
      orders: orders || [],
      stockpile: stockpile || [],
      supplements: supplements || [],
      vendors: vendors || [],
      calendarNotes: calendarNotes || {},
      scheduledBuys: scheduledBuys || [],
      reconItems: reconItems || [],
      reconHistory: reconHistory || [],
      metrics: metrics || [],
      glossary: glossary || [],
      goals: goals || [],
      protocolHistory: protocolHistory || [],
    };
  };

  const handleExportCSV = () => {
    const data = getAllData();
    exportUserDataToCSV(data);
    
    window.dispatchEvent(new CustomEvent('tpp:toast', { 
      detail: { message: 'Data exported successfully as CSV!', type: 'success' } 
    }));
  };

  const handleExportPDF = async () => {
    try {
      const data = getAllData();
      await exportUserDataToPDF(data, null, theme);
      
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Data exported successfully as PDF!', type: 'success' } 
      }));
    } catch (error) {
      console.error('PDF export error:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'PDF export failed. Please try again.', type: 'error' } 
      }));
    }
  };

  const plans = [
    {
      key: 'monthly',
      name: SUBSCRIPTION_PLANS.monthly.label,
      intervalLabel: 'per month',
      description: 'Most Flexible',
      priceId: STRIPE_CONFIG.prices.monthly,
      display: planPricing.monthly,
      cta: SUBSCRIPTION_PLANS.monthly.cta,
      badge: discountActive ? `Save ${planPricing.monthly.savings} / mo` : null,
    },
    {
      key: 'annual',
      name: SUBSCRIPTION_PLANS.annual.label,
      intervalLabel: 'per year',
      description: 'Same price as our planners!',
      priceId: STRIPE_CONFIG.prices.annual,
      display: planPricing.annual,
      cta: SUBSCRIPTION_PLANS.annual.cta,
      popular: true,
      badge: discountActive ? `Save ${planPricing.annual.savings} / yr` : 'Save $17.89',
    },
    {
      key: 'lifetime',
      name: SUBSCRIPTION_PLANS.lifetime.label,
      intervalLabel: 'one-time',
      description: 'Pay Once',
      priceId: STRIPE_CONFIG.prices.lifetime,
      display: planPricing.lifetime,
      cta: SUBSCRIPTION_PLANS.lifetime.cta,
      badge: discountActive ? `Save ${planPricing.lifetime.savings} one-time` : 'Best Value',
    }
  ];

  return (
    <>
    <div className="page-bg min-h-screen flex flex-col items-center justify-center p-4 lg:p-8">
      <div className="w-full max-w-4xl space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-2">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: theme.text }}>Subscription Has Ended</h1>
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                {subscriptionEndDate 
                  ? `Ended ${subscriptionEndDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} · Resubscribe to continue`
                  : 'Resubscribe to continue your research'
                }
              </span>
            </div>
          </div>
        </div>
        <div className="h-px w-full mb-6 opacity-10" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}></div>

        {/* Subscription Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Monthly Plan */}
            <div 
              className={`content-section p-6 rounded-3xl border relative btn-primary-inset ${processingPlan && processingPlan !== 'monthly' ? 'opacity-40 cursor-not-allowed' : ''}`}
              style={{ 
                borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
              }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold" style={{ color: theme.text }}>Monthly Plan</h3>
                <CreditCard size={20} className="opacity-40" style={{ color: theme.text }} />
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold" style={{ color: theme.text }}>
                    {planPricing.monthly.base}
                  </span>
                  <span className="text-sm opacity-40" style={{ color: theme.text }}>/month</span>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-60" style={{ color: theme.text }}>
                  CANCEL ANYTIME
                </p>
              </div>
              <button
                onClick={() => !processingPlan && handleSubscribe(plans[0])}
                disabled={!!processingPlan}
                className="w-full py-2.5 rounded-xl font-semibold transition-all hover:opacity-90 text-sm disabled:opacity-60"
                style={{ 
                  backgroundColor: 'transparent',
                  color: theme.text,
                  border: `2px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
                }}
              >
                {processingPlan === 'monthly' ? 'Processing...' : 'Select Monthly'}
              </button>
            </div>

            {/* Annual Plan */}
            <div 
              className={`content-section p-6 rounded-3xl border relative btn-primary-inset ${processingPlan && processingPlan !== 'annual' ? 'opacity-40 cursor-not-allowed' : ''}`}
              style={{ 
                borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
              }}
            >
              <div 
                className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-tighter"
                style={{ 
                  backgroundColor: theme.primary,
                  color: '#ffffff'
                }}
              >
                Best Value
              </div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold" style={{ color: theme.text }}>Annual Plan</h3>
                <Crown size={20} className="opacity-40" style={{ color: theme.text }} />
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold" style={{ color: theme.text }}>
                    {planPricing.annual.base}
                  </span>
                  <span className="text-sm opacity-40" style={{ color: theme.text }}>/year</span>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.primary }}>
                  SAVE {planPricing.annual.savings}
                </p>
              </div>
              <button
                onClick={() => !processingPlan && handleSubscribe(plans[1])}
                disabled={!!processingPlan}
                className="w-full py-2.5 rounded-xl font-semibold transition-all hover:opacity-90 text-sm disabled:opacity-60"
                style={{ 
                  backgroundColor: 'transparent',
                  color: theme.text,
                  border: `2px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
                }}
              >
                {processingPlan === 'annual' ? 'Processing...' : 'Select Annual'}
              </button>
            </div>

            {/* Lifetime Plan */}
            <div 
              className={`content-section p-6 rounded-3xl border relative btn-primary-inset ${processingPlan && processingPlan !== 'lifetime' ? 'opacity-40 cursor-not-allowed' : ''}`}
              style={{ 
                borderColor: theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
              }}
            >
              <div 
                className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-4 py-1.5 rounded-full text-[10px] font-semibold uppercase tracking-wide"
                style={{ 
                  backgroundColor: theme.primary,
                  color: '#ffffff'
                }}
              >
                LIMITED TIME
              </div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-semibold" style={{ color: theme.text }}>Lifetime Plan</h3>
                <Sparkles size={20} className="opacity-40" style={{ color: theme.text }} />
              </div>
              <div className="mb-6">
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-4xl font-bold" style={{ color: theme.text }}>
                    {planPricing.lifetime.base}
                  </span>
                  <span className="text-sm opacity-40" style={{ color: theme.text }}>/once</span>
                </div>
                <p className="text-xs font-semibold uppercase tracking-wide opacity-60" style={{ color: theme.text }}>
                  ONE-TIME COST
                </p>
              </div>
              <button
                onClick={() => !processingPlan && handleSubscribe(plans[2])}
                disabled={!!processingPlan}
                className="w-full py-2.5 rounded-xl font-semibold transition-all hover:opacity-90 text-sm disabled:opacity-60"
                style={{ 
                  backgroundColor: 'transparent',
                  color: theme.text,
                  border: `2px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`
                }}
              >
                {processingPlan === 'lifetime' ? 'Processing...' : 'Select Lifetime'}
              </button>
            </div>
          </div>
        </div>

        {/* Data Access Section (Lower for Conversion) */}
        <div 
          className="content-section rounded-2xl p-6 shadow-sm mt-8"
          style={{
            border: `1px solid ${theme?.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
          }}
        >
          <div className="text-center mb-5">
            <h3 className="text-sm mb-1" style={{ color: theme?.text }}>
              Your Research is Yours!
            </h3>
            <p className="text-xs max-w-lg mx-auto" style={{ color: theme?.textLight }}>
              You still have full read-only access and can export your entries anytime.<br />
              Come back anytime and resume where you left off. Your research is safe.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={() => setShowDataModal(true)}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98] btn-primary-inset"
              style={{
                backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                color: theme?.text
              }}
            >
              <Eye size={16} />
              View Data
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98] btn-primary-inset"
                style={{
                  backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  color: theme?.text
                }}
              >
                <Download size={16} />
                Export CSV
              </button>
              <button
                onClick={handleExportPDF}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98] btn-primary-inset"
                style={{
                  backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                  color: theme?.text
                }}
              >
                <FileText size={16} />
                Export PDF
              </button>
            </div>
          </div>
        </div>

        {/* Subtle Footer Action */}
        <div className="text-center pt-4">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="text-[10px] uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity flex items-center gap-1.5 mx-auto"
            style={{ color: theme?.text }}
          >
            <Trash2 size={12} />
            Delete Account
          </button>
        </div>

        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 pt-6 text-xs">
          <Link to="/terms" className="underline hover:opacity-80" style={{ color: theme.primary }}>Terms of Use</Link>
          <Link to="/privacy" className="underline hover:opacity-80" style={{ color: theme.primary }}>Privacy Policy</Link>
        </div>
      </div>
    </div>

    {/* Delete Account Modal */}
    <DeleteAccountModal
      open={showDeleteModal}
      onClose={() => setShowDeleteModal(false)}
      theme={theme}
    />

    {/* Data View Modal */}
    <DataViewModal
      open={showDataModal}
      onClose={() => setShowDataModal(false)}
      theme={theme}
      userData={{
        protocols,
        orders,
        stockpile,
        vendors,
        reconItems,
        reconHistory,
        supplements,
        metrics,
        calendarNotes,
        scheduledBuys,
        glossary,
        goals,
        protocolHistory
      }}
    />
    </>
  );
}
