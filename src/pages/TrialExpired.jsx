// Lab Access Expired Lockout Page
import React from 'react';
import { Clock, CreditCard } from 'lucide-react';
import { Zap } from '../icons/lucide-safe';
import { themes, defaultThemeName } from '../theme/themes';
import { useAppContext } from '../context/AppContext';
import { useFounderOffer } from '../context/FounderOfferContext';
import { createCheckoutSession } from '../services/stripe';
import { STRIPE_CONFIG } from '../config/stripe';
import { formatCurrency } from '../utils/currencyUtils';
import { SUBSCRIPTION_PLANS, getPlanPricing } from '../utils/subscriptionPlans';
import logo from '../assets/tpp_logo.png';

export default function TrialExpired() {
  const theme = themes[defaultThemeName];
  const { user } = useAppContext();
  const founderOffer = useFounderOffer();

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

  const handleSubscribe = async (plan) => {
    try {
      if (!user?.email) {
        alert('Please log in to subscribe');
        return;
      }

      let priceId = plan.priceId;
      if (plan.key === 'lifetime' && founderOffer.founderActive && STRIPE_CONFIG.founder?.lifetimePrice) {
        priceId = STRIPE_CONFIG.founder.lifetimePrice;
      }

      await createCheckoutSession(
        priceId,
        user.email,
        user.uid || user.email,
        null,
        false,
        { planName: plan.name }
      );
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Unable to start subscription. Please try again.');
    }
  };

  const plans = [
    {
      key: 'monthly',
      name: SUBSCRIPTION_PLANS.monthly.label,
      intervalLabel: 'per month',
      description: 'Perfect for trying out premium features',
      priceId: STRIPE_CONFIG.prices.monthly,
      display: planPricing.monthly,
      cta: SUBSCRIPTION_PLANS.monthly.cta,
      badge: discountActive ? `Save ${planPricing.monthly.savings} / mo` : null,
    },
    {
      key: 'annual',
      name: SUBSCRIPTION_PLANS.annual.label,
      intervalLabel: 'per year',
      description: 'Best value for consistent research',
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
      description: 'Pay once, use forever',
      priceId: STRIPE_CONFIG.prices.lifetime,
      display: planPricing.lifetime,
      cta: SUBSCRIPTION_PLANS.lifetime.cta,
      badge: discountActive ? `Save ${planPricing.lifetime.savings} one-time` : 'Best Value',
    }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: theme.background }}>
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={logo} alt="The Pep Planner Logo" className="h-16 w-16 rounded-full shadow-lg object-cover mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2" style={{ color: theme.primaryDark }}>The Pep Planner</h1>
          <p className="text-lg text-gray-600">Your research trial has ended</p>
        </div>

        {/* Lab Access Ended Message */}
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-8 mb-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center">
              <Clock size={32} className="text-white" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-orange-800 mb-3">
            Your Lab Access Has Expired
          </h2>
          
          <p className="text-orange-700 mb-4 text-lg">
            Thank you for exploring The Pep Planner! To continue organizing your research 
            and accessing all premium features, please choose a subscription plan below.
          </p>
          
          <div className="bg-white/50 rounded-lg p-4 text-sm text-orange-600">
            <strong>What you experienced during your lab access:</strong>
            <br />
            Full access to protocols, recon tracking, stockpile management, and all premium features
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-white rounded-xl border-2 p-6 transition-all hover:shadow-lg ${
                plan.popular 
                  ? 'border-blue-500 ring-2 ring-blue-200' 
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-1 rounded-full text-xs font-semibold">
                    {founderOffer.isFounder ? 'Founder Locked' : 'Most Popular'}
                  </span>
                </div>
              )}
              {!plan.popular && plan.badge && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-1 rounded-full text-xs font-semibold">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-xl font-bold mb-2" style={{ color: theme.primaryDark }}>
                  {plan.name}
                </h3>
                
                <div className="mb-4 flex items-center justify-center gap-2">
                  <span className="text-3xl font-bold flex items-center gap-2" style={{ color: theme.primary }}>
                    {discountActive ? (
                      <>
                        <span className="line-through text-xl text-gray-500">{plan.display.base}</span>
                        <span>{plan.display.founder}</span>
                      </>
                    ) : (
                      plan.display.base
                    )}
                  </span>
                  <span className="text-gray-600">
                    {plan.intervalLabel}
                  </span>
                </div>
                
                <p className="text-sm text-gray-600 mb-6">
                  {plan.description}
                </p>
                
                <button
                  onClick={() => handleSubscribe(plan)}
                  className={`w-full px-6 py-3 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90'
                      : 'hover:opacity-90'
                  }`}
                  style={
                    plan.popular
                      ? {}
                      : { backgroundColor: theme.primary, color: theme.textOnPrimary }
                  }
                >
                  <CreditCard size={16} />
                  {plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Features Reminder */}
        <div className="bg-white rounded-xl border p-6 text-center">
          <h3 className="text-lg font-semibold mb-4" style={{ color: theme.primaryDark }}>
            Continue Your Research Journey
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Zap size={16} style={{ color: theme.primary }} />
              <span>Protocol Management</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={16} style={{ color: theme.primary }} />
              <span>Recon Tracking</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={16} style={{ color: theme.primary }} />
              <span>Stockpile Organization</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
