// Subscription Ended - Resubscribe Page
import React, { useState } from 'react';
import { CreditCard, Download, Trash2, Eye, BookOpenCheck, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { themes, defaultThemeName } from '../theme/themes';
import { useAppContext } from '../context/AppContext';
import { useFounderOffer } from '../context/FounderOfferContext';
import { STRIPE_CONFIG } from '../config/stripe';
import { formatCurrency } from '../utils/currencyUtils';
import { SUBSCRIPTION_PLANS, getPlanPricing } from '../utils/subscriptionPlans';
import { isAndroid, isIOS } from '../utils/platform';
import { getAndroidSubscriptionMessage, getNativeSubscriptionMessage } from '../utils/paymentCompliance';
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

  const [isCheckoutProcessing, setIsCheckoutProcessing] = useState(false);

  const handleSubscribe = async (plan) => {
    if (isCheckoutProcessing) {
      return;
    }

    try {
      if (!user?.email) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Please log in to resubscribe', type: 'error' } 
        }));
        return;
      }

      setIsCheckoutProcessing(true);
      await subscribe(plan.key, {
        userEmail: user.email,
        userId: user.uid || user.email,
        plan: {
          label: plan.name,
          key: plan.key
        },
        founderOffer: founderOffer
      });
    } catch (error) {
      console.error('Subscription error:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: error.message || 'Unable to resubscribe. Please try again.', type: 'error' } 
      }));
    } finally {
      setIsCheckoutProcessing(false);
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
        <div className="text-center mb-4">
          <div className="flex items-center justify-center mb-3">
            <div 
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg"
              style={{ backgroundColor: theme.primary }}
            >
              <BookOpenCheck size={28} style={{ color: theme.textOnPrimary || '#ffffff' }} />
            </div>
          </div>
          <h1 className="text-3xl mb-1" style={{ color: theme.primaryDark }}>
            Subscription Has Ended
          </h1>
          <p className="text-base" style={{ color: theme.textLight }}>
            Resubscribe to continue your research
          </p>
          {subscriptionEndDate && (
            <p className="text-sm mt-2" style={{ color: theme.textLight }}>
              Your subscription ended on {subscriptionEndDate.toLocaleDateString('en-US', { 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </p>
          )}
        </div>

        {/* Subscription Section (Conversion First) */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans.map((plan) => {
              // Hide payment buttons on Android, show text message instead
              const showPaymentButton = !isAndroid() && !isIOS();
              
              return (
                <div
                  key={plan.name}
                  className={`content-section relative rounded-2xl border-2 p-5 flex flex-col transition-all hover:shadow-md ${isCheckoutProcessing ? 'opacity-60 cursor-wait' : ''}`}
                  style={{
                    borderColor: plan.popular ? theme?.primary : (theme?.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'),
                  }}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span 
                        className="px-3 py-1 rounded-full text-[10px] uppercase tracking-tighter"
                        style={{ 
                          backgroundColor: theme?.primary, 
                          color: theme?.textOnPrimary || '#ffffff' 
                        }}
                      >
                        {founderOffer.isFounder ? 'Founder Locked' : 'Best Value'}
                      </span>
                    </div>
                  )}
                  
                  <div className="text-center flex-1">
                    <h3 className="text-lg mb-1" style={{ color: theme.primaryDark }}>
                      {plan.name}
                    </h3>
                    
                    <div className="mb-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <span className="text-2xl" style={{ color: theme.primary }}>
                          {discountActive ? plan.display.founder : plan.display.base}
                        </span>
                        <span className="text-[10px] opacity-60" style={{ color: theme.textLight }}>
                          {plan.intervalLabel}
                        </span>
                      </div>
                      {discountActive && (
                        <p className="text-[10px] line-through opacity-40" style={{ color: theme.textLight }}>
                          Regularly {plan.display.base}
                        </p>
                      )}
                    </div>
                    
                    <p className="text-[11px] mb-4 leading-snug" style={{ color: theme.textLight }}>
                      {plan.description}
                    </p>
                  </div>

                  {showPaymentButton ? (
                    <button
                      onClick={() => !isCheckoutProcessing && handleSubscribe(plan)}
                      disabled={isCheckoutProcessing}
                      className="w-full py-3 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm disabled:opacity-60"
                      style={{
                        backgroundColor: theme.primary,
                        color: theme.textOnPrimary || '#ffffff'
                      }}
                    >
                      <CreditCard size={16} />
                      {isCheckoutProcessing ? 'Processing…' : plan.cta}
                    </button>
                  ) : (
                    <div className="w-full py-3 rounded-xl text-xs text-center" style={{ color: theme.textLight }}>
                      {getNativeSubscriptionMessage()}
                    </div>
                  )}
                </div>
              );
            })}
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
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
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
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
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
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
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
