import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuth } from 'firebase/auth';
import { createCheckoutSession } from '../services/stripe';
import { STRIPE_CONFIG } from '../config/stripe';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const SUBSCRIPTION_TYPES = {
  monthly: {
    label: 'Monthly',
    description: 'Test monthly subscription checkout',
    interval: 'month',
    icon: '📅'
  },
  annual: {
    label: 'Annual',
    description: 'Test annual subscription checkout',
    interval: 'year',
    icon: '📆'
  },
  lifetime: {
    label: 'Lifetime',
    description: 'Test lifetime one-time payment',
    interval: 'one-time',
    icon: '👑'
  }
};

export default function TestAnnualCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [selectedType, setSelectedType] = useState('annual');
  const navigate = useNavigate();

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleTestCheckout = async (type) => {
    if (!user) {
      setError('Please log in first to test checkout');
      return;
    }

    setSelectedType(type);
    setIsLoading(true);
    setError(null);

    try {
      const priceId = STRIPE_CONFIG.prices[type];
      
      console.log(`🧪 Testing ${SUBSCRIPTION_TYPES[type].label} Checkout:`);
      console.log('Price ID:', priceId);
      console.log('User Email:', user.email);
      console.log('User ID:', user.uid);

      if (!priceId) {
        throw new Error(`${SUBSCRIPTION_TYPES[type].label} price ID not found in configuration`);
      }

      await createCheckoutSession(
        priceId,
        user.email,
        user.uid,
        '/test-annual-checkout',
        false,
        { 
          planName: `${SUBSCRIPTION_TYPES[type].label} Subscription Test`,
          successPath: `/test-annual-checkout?success=true&type=${type}`,
          cancelPath: '/test-annual-checkout?canceled=true'
        }
      );
    } catch (err) {
      console.error('❌ Test checkout error:', err);
      setError(err.message || 'Failed to start checkout');
      setIsLoading(false);
    }
  };

  // Check for success/cancel parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true') {
      setError(null);
    } else if (params.get('canceled') === 'true') {
      setError('Checkout was canceled');
    }
  }, []);

  const params = new URLSearchParams(window.location.search);
  const successType = params.get('type') || 'annual';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[#D4D7CD] to-[#A3B18A]">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-[#344E41] mb-2">
            🧪 Subscription Checkout Tester
          </h1>
          <p className="text-[#5C7659]">
            Test all subscription types and verify Stripe configuration
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="bg-[#F8F9FA] rounded-lg p-4">
            <div className="text-sm font-semibold text-[#344E41] mb-3">
              Current Configuration:
            </div>
            <div className="text-xs text-[#5C7659] space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div>
                  <strong>Monthly:</strong>{' '}
                  <code className="bg-white px-2 py-1 rounded text-[10px] break-all">
                    {STRIPE_CONFIG.prices.monthly || 'Not configured'}
                  </code>
                </div>
                <div>
                  <strong>Annual:</strong>{' '}
                  <code className="bg-white px-2 py-1 rounded text-[10px] break-all">
                    {STRIPE_CONFIG.prices.annual || 'Not configured'}
                  </code>
                </div>
                <div>
                  <strong>Lifetime:</strong>{' '}
                  <code className="bg-white px-2 py-1 rounded text-[10px] break-all">
                    {STRIPE_CONFIG.prices.lifetime || 'Not configured'}
                  </code>
                </div>
              </div>
              <div className="pt-2 border-t border-[#D4D7CD]">
                <strong>User:</strong> {user ? user.email : 'Not logged in'}
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          {params.get('success') === 'true' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle className="text-green-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="text-sm text-green-700">
                <strong>{SUBSCRIPTION_TYPES[successType]?.label} checkout completed successfully!</strong>
                <div className="mt-1 text-xs">
                  Check your Stripe dashboard to verify the subscription interval is set to "{SUBSCRIPTION_TYPES[successType]?.interval}".
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {!user ? (
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-[#344E41] text-white py-3 px-4 rounded-lg font-semibold hover:bg-[#2d3f35] transition-colors"
            >
              Log In to Test
            </button>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(SUBSCRIPTION_TYPES).map(([type, config]) => (
                <button
                  key={type}
                  onClick={() => handleTestCheckout(type)}
                  disabled={isLoading}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedType === type
                      ? 'border-[#344E41] bg-[#F8F9FA]'
                      : 'border-[#D4D7CD] hover:border-[#A3B18A]'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="text-2xl mb-2">{config.icon}</div>
                  <div className="font-semibold text-[#344E41] text-sm mb-1">
                    {config.label}
                  </div>
                  <div className="text-xs text-[#5C7659] mb-3">
                    {config.description}
                  </div>
                  {isLoading && selectedType === type ? (
                    <div className="flex items-center justify-center gap-2 text-xs text-[#5C7659]">
                      <Loader2 className="animate-spin" size={14} />
                      Starting...
                    </div>
                  ) : (
                    <div className="text-xs font-mono bg-white px-2 py-1 rounded text-[10px] break-all">
                      {STRIPE_CONFIG.prices[type] || 'N/A'}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          <button
            onClick={() => navigate('/app/account/subscription')}
            className="w-full bg-[#D4D7CD] text-[#344E41] py-3 px-4 rounded-lg font-semibold hover:bg-[#c4c7bd] transition-colors"
          >
            Go to Subscription Page
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-[#D4D7CD]">
          <div className="text-xs text-[#5C7659] space-y-2">
            <div><strong>What to verify in Stripe Dashboard:</strong></div>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Checkout redirects to Stripe successfully</li>
              <li>Price ID matches the configuration above</li>
              <li>For <strong>Annual</strong>: Verify interval is "year" (not "month")</li>
              <li>For <strong>Monthly</strong>: Verify interval is "month"</li>
              <li>For <strong>Lifetime</strong>: Verify it's a one-time payment (no recurring interval)</li>
              <li>Verify billing period matches the selected plan type</li>
            </ul>
            <div className="mt-3 pt-3 border-t border-[#D4D7CD] text-[10px] italic">
              💡 This test page is kept for future subscription testing and verification
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

