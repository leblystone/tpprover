import React, { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, CreditCard, Calendar, Crown, Gift, ExternalLink, RefreshCw, X } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { useFirebase } from '../context/FirebaseContext'
import { createCheckoutSession, createPortalSession, cancelSubscription as stripeCancel } from '../services/stripe'
import { handleCheckoutReturn } from '../utils/checkoutNavigation'
import { STRIPE_CONFIG } from '../config/stripe'
import { verifyStripeConfig } from '../utils/stripe-verify'
import GiftPurchaseModal from '../components/common/GiftPurchaseModal'

// Load subscription from cloud storage ONLY (no localStorage)
async function loadSubscription(firebaseUser) { 
  try { 
    const { loadUserSubscription } = await import('../services/cloudStorage');
    if (firebaseUser) {
      const subscription = await loadUserSubscription(firebaseUser.uid);
      if (subscription && !subscription.id?.includes('lab_access') && !subscription.id?.includes('demo') && !subscription.id?.includes('test') && subscription.status !== 'lab_access') {
        return subscription;
      }
    }
    return null;
  } catch (error) {
    console.error('❌ Failed to load subscription from cloud:', error);
    return null; 
  } 
}

export default function AccountSubscription() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const { user } = useAppContext()
  const { firebaseUser } = useFirebase()
  
  const [sub, setSub] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [pmDraft, setPmDraft] = useState({ brand: 'Visa', last4: '' })

  // Load subscription data
  useEffect(() => {
    const loadSubData = async () => {
      try {
        const subscription = await loadSubscription(firebaseUser);
        setSub(subscription);
      } catch (error) {
        console.error('Error loading subscription:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadSubData();
  }, [firebaseUser]);

  // Calculate time left for trial
  useEffect(() => {
    if (sub?.status === 'trialing' && sub?.trial_end) {
      const updateTimeLeft = () => {
        const now = Math.floor(Date.now() / 1000);
        const timeLeft = sub.trial_end - now;
        
        if (timeLeft <= 0) {
          setTimeLeft(null);
          return;
        }
        
        const days = Math.floor(timeLeft / 86400);
        const hours = Math.floor((timeLeft % 86400) / 3600);
        const minutes = Math.floor((timeLeft % 3600) / 60);
        
        setTimeLeft({ days, hours, minutes });
      };
      
      updateTimeLeft();
      const interval = setInterval(updateTimeLeft, 60000);
      return () => clearInterval(interval);
    }
  }, [sub]);

  const handleUpgrade = async () => {
    try {
      await verifyStripeConfig();
      const session = await createCheckoutSession(firebaseUser?.uid);
      handleCheckoutReturn(session.url);
    } catch (error) {
      console.error('Error creating checkout session:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Failed to start checkout', type: 'error' } 
      }));
    }
  };

  const handleManageBilling = async () => {
    try {
      // Check if Stripe is properly configured
      await verifyStripeConfig();
      const session = await createPortalSession(firebaseUser?.uid);
      
      if (session?.url) {
        window.open(session.url, '_blank');
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      console.error('Error creating portal session:', error);
      
      // Show a more helpful error message
      const errorMessage = error.message?.includes('INTERNAL') 
        ? 'Billing portal is temporarily unavailable. Please try again later or contact support.'
        : 'Failed to open billing portal. Please check your subscription status.';
        
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: errorMessage, type: 'error' } 
      }));
    }
  };

  const handleCancelSubscription = async () => {
    if (!sub?.id) return;
    
    try {
      await stripeCancel(sub.id);
      setSub(null);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Subscription cancelled', type: 'success' } 
      }));
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Failed to cancel subscription', type: 'error' } 
      }));
    }
  };

  const createSubscription = async (planData) => {
    try {
      await verifyStripeConfig();
      const session = await createCheckoutSession(firebaseUser?.uid, planData);
      handleCheckoutReturn(session.url);
    } catch (error) {
      console.error('Error creating subscription:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Failed to start checkout', type: 'error' } 
      }));
    }
  };

  const savePaymentMethod = () => {
    // Placeholder for payment method update
    window.dispatchEvent(new CustomEvent('tpp:toast', { 
      detail: { message: 'Payment method update not implemented', type: 'info' } 
    }));
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10B981';
      case 'trialing': return '#3B82F6';
      case 'past_due': return '#F59E0B';
      case 'cancelled': return '#EF4444';
      default: return theme.mutedText;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active': return 'Active';
      case 'trialing': return 'Trial';
      case 'past_due': return 'Past Due';
      case 'cancelled': return 'Cancelled';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <section className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate('/app/account')}
            className="p-2 rounded-lg hover:opacity-80 transition-all"
            style={{ backgroundColor: theme.secondary }}
          >
            <ArrowLeft size={20} style={{ color: theme.text }} />
          </button>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: theme.text }}>Research Subscription</h1>
            <p className="text-sm" style={{ color: theme.mutedText }}>Loading subscription details...</p>
          </div>
        </div>
        <div 
          className="p-8 rounded-lg text-center"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <RefreshCw size={48} className="mx-auto mb-4 animate-spin" style={{ color: theme.mutedText }} />
          <p className="text-sm" style={{ color: theme.mutedText }}>Loading...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/app/account')}
          className="p-2 rounded-lg hover:opacity-80 transition-all"
          style={{ backgroundColor: theme.secondary }}
        >
          <ArrowLeft size={20} style={{ color: theme.text }} />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: theme.text }}>Research Subscription</h1>
          <p className="text-sm" style={{ color: theme.mutedText }}>Manage subscription and billing</p>
        </div>
      </div>

      {/* Founder's Pricing Banner */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-6 text-center shadow-sm mb-6">
        <div className="flex items-center justify-center gap-3 mb-3">
          <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center shadow-md">
            <span className="text-white font-bold text-lg">👑</span>
          </div>
          <div className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
            Founder's Pricing
          </div>
        </div>
        
        <div className="bg-white/60 rounded-lg p-4 mb-4">
          <p className="text-amber-800 font-medium mb-2">
            🔒 <strong>Lock in these prices forever!</strong>
          </p>
          <p className="text-sm text-amber-700 leading-relaxed">
            As an early supporter, you get grandfathered pricing that <strong>never increases</strong> - 
            even as we add new features and raise prices for new users.
          </p>
        </div>
        
        <div className="flex items-center justify-center gap-2 text-xs text-amber-600 mb-3">
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
          <span className="font-medium">Limited time founder benefits</span>
          <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
        </div>
        
        <button 
          className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-all shadow-sm border border-amber-300" 
          style={{ 
            backgroundColor: 'rgba(245, 158, 11, 0.1)', 
            color: '#92400e',
            backdropFilter: 'blur(10px)'
          }}
          onClick={() => verifyStripeConfig()}
        >
          🔧 Verify Setup (Dev Tool)
        </button>
      </div>

      {sub ? (
        <div className="space-y-6">
          {/* Subscription Status */}
          <div 
            className="p-6 rounded-lg"
            style={{ backgroundColor: theme.cardBackground }}
          >
            {sub.status === 'trialing' && sub.startedAt && sub.currentPeriodEnd && (
              <TrialProgressBar 
                theme={theme} 
                startDate={sub.startedAt} 
                endDate={sub.currentPeriodEnd} 
              />
            )}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: theme.accent + '20' }}
                >
                  <Crown size={24} style={{ color: theme.accent }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
                    {sub.plan?.name || 'Research Subscription'}
                  </h3>
                  <div 
                    className="text-sm font-medium"
                    style={{ color: getStatusColor(sub.status) }}
                  >
                    {getStatusText(sub.status)}
                  </div>
                </div>
              </div>
              {sub.status === 'trialing' && timeLeft && (
                <div className="text-right">
                  <div className="text-sm" style={{ color: theme.mutedText }}>Trial ends in</div>
                  <div className="text-lg font-bold" style={{ color: theme.text }}>
                    {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m
                  </div>
                </div>
              )}
            </div>

            {/* Subscription Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InfoCard
                icon={CreditCard}
                label="Next Billing"
                value={sub.current_period_end ? new Date(sub.current_period_end * 1000).toLocaleDateString() : 'N/A'}
                theme={theme}
              />
              <InfoCard
                icon={Calendar}
                label="Started"
                value={sub.created ? new Date(sub.created * 1000).toLocaleDateString() : 'N/A'}
                theme={theme}
              />
            </div>
          </div>

          {/* Actions */}
          <div 
            className="p-4 rounded-lg space-y-3"
            style={{ backgroundColor: theme.cardBackground }}
          >
            <h4 className="text-sm font-medium mb-2" style={{ color: theme.text }}>Subscription Management</h4>
            <div className="space-y-2">
              <button
                onClick={handleManageBilling}
                className="w-full flex items-center justify-between p-3 rounded-lg transition-all hover:opacity-90"
                style={{ backgroundColor: theme.secondary }}
              >
                <div className="flex items-center gap-3">
                  <CreditCard size={20} style={{ color: theme.accent }} />
                  <span className="font-medium" style={{ color: theme.text }}>Manage Billing</span>
                </div>
                <ExternalLink size={16} style={{ color: theme.mutedText }} />
              </button>
              
              {sub.status === 'active' && (
                <button
                  onClick={handleCancelSubscription}
                  className="w-full flex items-center justify-between p-3 rounded-lg transition-all hover:opacity-90"
                  style={{ backgroundColor: theme.secondary }}
                >
                  <div className="flex items-center gap-3">
                    <X size={20} style={{ color: '#EF4444' }} />
                    <span className="font-medium" style={{ color: '#EF4444' }}>Cancel Subscription</span>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* No Subscription */}
          <div 
            className="p-8 rounded-lg text-center"
            style={{ backgroundColor: theme.cardBackground }}
          >
            <TrendingUp size={48} className="mx-auto mb-4" style={{ color: theme.mutedText }} />
            <h3 className="text-lg font-medium mb-2" style={{ color: theme.text }}>No Active Subscription</h3>
            <p className="text-sm mb-6" style={{ color: theme.mutedText }}>
              Upgrade to access advanced research features and tools
            </p>
            <button
              onClick={handleUpgrade}
              className="px-6 py-3 rounded-lg font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: theme.accent, color: theme.accentText }}
            >
              Upgrade Now
            </button>
          </div>

          {/* Gift Access */}
          <div 
            className="p-4 rounded-lg space-y-3"
            style={{ backgroundColor: theme.cardBackground }}
          >
            <h4 className="text-sm font-medium mb-2" style={{ color: theme.text }}>Gift Access</h4>
            <button
              onClick={() => setShowGiftModal(true)}
              className="w-full flex items-center justify-between p-3 rounded-lg transition-all hover:opacity-90"
              style={{ backgroundColor: theme.secondary }}
            >
              <div className="flex items-center gap-3">
                <Gift size={20} style={{ color: theme.accent }} />
                <span className="font-medium" style={{ color: theme.text }}>Redeem Gift Code</span>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Pricing Plans - Always visible */}
      <div 
        className="p-6 rounded-lg"
        style={{ backgroundColor: theme.cardBackground }}
      >
        <div className="text-center font-semibold text-lg mb-6" style={{ color: theme.text }}>
          {sub?.status === 'trialing' ? `Your trial ends on ${sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : 'Unknown'}` : 'Choose Your Plan'}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Monthly Plan */}
          <PlanCard
            theme={theme}
            title="Monthly"
            price="$6"
            interval="/mo"
            current={sub?.interval === 'month'}
            onSelect={() => createSubscription({ name: 'Pro Monthly', price: 6.00, interval: 'month' })}
          />
          {/* Annual Plan */}
          <PlanCard
            theme={theme}
            title="Annual"
            price="$79"
            interval="/yr"
            current={sub?.interval === 'year'}
            onSelect={() => createSubscription({ name: 'Pro Annual', price: 79.00, interval: 'year' })}
            popular
            subtitle="Save $13"
          />
          {/* Lifetime Plan */}
          <PlanCard
            theme={theme}
            title="Lifetime"
            price="$249.99"
            interval="one-time"
            current={sub?.interval === 'lifetime'}
            onSelect={() => createSubscription({ name: 'Lifetime', price: 249.99, interval: 'lifetime' })}
          />
        </div>
      </div>

      {/* Payment Method Section - Only for non-lifetime subscriptions */}
      {sub?.interval !== 'lifetime' && sub && (
        <div 
          className="p-4 rounded-lg"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <h4 className="text-sm font-medium mb-4" style={{ color: theme.text }}>Payment Method</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <div className="text-xs mb-1">Brand</div>
              <select 
                className="w-full p-2 rounded border" 
                value={pmDraft.brand} 
                onChange={e => setPmDraft(d => ({ ...d, brand: e.target.value }))} 
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
              >
                {['Visa','Mastercard','Amex','Discover'].map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <div className="text-xs mb-1">Last 4 Digits</div>
              <input 
                className="w-full p-2 rounded border" 
                maxLength={4} 
                value={pmDraft.last4} 
                onChange={e => setPmDraft(d => ({ ...d, last4: (e.target.value || '').replace(/\D/g,'').slice(0,4) }))} 
                placeholder="1234" 
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
              />
            </div>
          </div>
          <div className="text-right mt-3">
            <button 
              className="px-3 py-2 rounded-md text-sm hover:opacity-90" 
              style={{ backgroundColor: theme.accent, color: theme.accentText }} 
              onClick={savePaymentMethod}
            >
              Update Payment Method
            </button>
          </div>
        </div>
      )}

      <GiftPurchaseModal 
        open={showGiftModal} 
        onClose={() => setShowGiftModal(false)} 
        theme={theme} 
      />

    </section>
  )
}

const InfoCard = ({ icon: Icon, label, value, theme }) => (
  <div 
    className="flex items-center gap-3 p-3 rounded-lg"
    style={{ backgroundColor: theme.secondary }}
  >
    <div 
      className="w-8 h-8 rounded-full flex items-center justify-center"
      style={{ backgroundColor: theme.accent + '20' }}
    >
      <Icon size={16} style={{ color: theme.accent }} />
    </div>
    <div>
      <div className="text-sm font-medium" style={{ color: theme.text }}>{label}</div>
      <div className="text-xs" style={{ color: theme.mutedText }}>{value}</div>
    </div>
  </div>
)

const TrialProgressBar = ({ theme, startDate, endDate }) => {
  const [progress, setProgress] = React.useState(0);
  const [timeLeft, setTimeLeft] = React.useState('');

  React.useEffect(() => {
    const calculateProgress = () => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const now = new Date();

      const totalDuration = end.getTime() - start.getTime();
      const elapsedTime = now.getTime() - start.getTime();
      const percentage = Math.max(0, 100 - (elapsedTime / totalDuration * 100));
      setProgress(percentage);

      const remaining = end.getTime() - now.getTime();
      if (remaining <= 0) {
        setTimeLeft('Trial ended');
      } else {
        const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        setTimeLeft(`${days}d ${hours}h left`);
      }
    };

    calculateProgress();
    const interval = setInterval(calculateProgress, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [startDate, endDate]);

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center text-sm mb-1">
        <span className="font-semibold" style={{ color: theme.text }}>Trial Status</span>
        <span className="text-xs font-medium" style={{ color: theme.mutedText }}>{timeLeft}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div
          className="h-2.5 rounded-full"
          style={{
            width: `${progress}%`,
            backgroundColor: theme.primary,
            transition: 'width 0.5s ease-in-out'
          }}
        ></div>
      </div>
    </div>
  );
};

const PlanCard = ({ theme, title, price, interval, onSelect, current, popular, subtitle }) => {
  const isCurrent = !!current;
  return (
    <div 
      className={`relative rounded-lg border p-4 text-center transition-shadow hover:shadow-lg ${isCurrent ? 'border-2' : ''} ${popular ? 'border-2' : ''}`} 
      style={{ 
        borderColor: isCurrent || popular ? theme.accent : theme.border,
        backgroundColor: theme.cardBackground
      }}
    >
      {popular && (
        <div 
          className="absolute top-0 -translate-y-1/2 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-semibold rounded-full" 
          style={{ backgroundColor: theme.accent, color: theme.accentText }}
        >
          Most Popular
        </div>
      )}
      <div className="font-bold text-lg" style={{ color: theme.text }}>{title}</div>
      {subtitle && <div className="text-xs" style={{ color: theme.mutedText }}>{subtitle}</div>}
      <div className="text-3xl font-bold my-3" style={{ color: theme.text }}>
        {price || ''}<span className="text-base font-normal" style={{ color: theme.mutedText }}>{interval || ''}</span>
      </div>
      <button
        className="w-full px-4 py-2 rounded-md text-sm font-semibold hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: theme.accent, color: theme.accentText }}
        onClick={onSelect}
        disabled={isCurrent}
      >
        {isCurrent ? 'Current Plan' : 'Select Plan'}
      </button>
    </div>
  )
}
