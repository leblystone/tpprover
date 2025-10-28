// Lab Access Expired Lockout Page
import React from 'react';
import { Clock, CreditCard } from 'lucide-react';
import { Zap } from '../icons/lucide-safe';
import { themes, defaultThemeName } from '../theme/themes';
import { useAppContext } from '../context/AppContext';
import { createCheckoutSession } from '../services/stripe';
import { STRIPE_CONFIG } from '../config/stripe';
import logo from '../assets/tpp_logo.png';

export default function TrialExpired() {
  const theme = themes[defaultThemeName];
  const { user } = useAppContext();

  const handleSubscribe = async (plan) => {
    try {
      if (!user?.email) {
        alert('Please log in to subscribe');
        return;
      }

      // TrialExpired shows during lockout - checkout will return to current location
      await createCheckoutSession(
        plan.priceId,
        user.email,
        user.uid || user.email
      );
    } catch (error) {
      console.error('Subscription error:', error);
      alert('Unable to start subscription. Please try again.');
    }
  };

  const plans = [
    {
      name: 'Monthly',
      price: '$6',
      interval: '/month',
      priceId: STRIPE_CONFIG.MONTHLY_PRICE_ID,
      description: 'Perfect for trying out premium features'
    },
    {
      name: 'Annual',
      price: '$79',
      interval: '/year',
      priceId: STRIPE_CONFIG.ANNUAL_PRICE_ID,
      description: 'Save $13 compared to monthly',
      popular: true,
      savings: 'Save $13'
    },
    {
      name: 'Lifetime',
      price: '$199',
      interval: 'one-time',
      priceId: STRIPE_CONFIG.LIFETIME_PRICE_ID,
      description: 'Pay once, use forever',
      savings: 'Best Value'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ backgroundColor: theme.background }}>
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <img src={logo} alt="The Pep Planner Logo" className="h-16 w-16 rounded-full shadow-lg object-cover mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2" style={{ color: theme.primaryDark }}>The Pep Planner</h1>
          <p className="text-lg text-gray-600">Your 7-day lab access has ended</p>
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
                    Most Popular
                  </span>
                </div>
              )}
              
              {plan.savings && !plan.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-1 rounded-full text-xs font-semibold">
                    {plan.savings}
                  </span>
                </div>
              )}

              <div className="text-center">
                <h3 className="text-xl font-bold mb-2" style={{ color: theme.primaryDark }}>
                  {plan.name}
                </h3>
                
                <div className="mb-4">
                  <span className="text-3xl font-bold" style={{ color: theme.primary }}>
                    {plan.price}
                  </span>
                  <span className="text-gray-600 ml-1">
                    {plan.interval}
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
                  Subscribe Now
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
