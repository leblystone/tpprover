import React, { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, Crown, Gift, ExternalLink, RefreshCw, X, Settings } from 'lucide-react'
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
  // Research Subscription Page - Updated Layout
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const { user } = useAppContext()
  const { firebaseUser } = useFirebase()
  
  const [sub, setSub] = useState(null)
  const [timeLeft, setTimeLeft] = useState(null)
  const [showGiftModal, setShowGiftModal] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

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

  const handleSelectPlan = async (plan) => {
    console.log('🚀 AccountSubscription: Selected plan:', plan);
    
    try {
      // Determine the correct Stripe price ID based on plan
      let priceId = '';
      if (plan.name.toLowerCase() === 'monthly') {
        priceId = STRIPE_CONFIG.prices.monthly;
      } else if (plan.name.toLowerCase() === 'annual') {
        priceId = STRIPE_CONFIG.prices.annual;
      } else if (plan.name.toLowerCase() === 'lifetime') {
        priceId = STRIPE_CONFIG.prices.lifetime;
      }

      await createCheckoutSession(priceId, firebaseUser?.email || 'demo@example.com', firebaseUser?.uid || 'demo_user');
      
    } catch (error) {
      console.error('❌ AccountSubscription: Stripe checkout error:', error);
      
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Failed to start checkout. Please try again.', type: 'error' } 
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

      {/* Current Subscription Status */}
      {sub && (
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

          </div>

          {/* Subscription Plans - Show under trial countdown */}
          {sub.status === 'trialing' && (
            <div 
              className="p-6 rounded-lg"
              style={{ backgroundColor: theme.cardBackground }}
            >
              <div className="space-y-4">
                {/* Founder's Pricing Alert */}
                <div className="rounded-lg p-4 text-center shadow-sm" style={{ background: 'linear-gradient(to right, #D4D7CD, #A3B18A)', border: '2px solid #A3B18A' }}>
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to right, #3A5A40, #344E41)' }}>
                      <Crown size={12} className="text-white" />
                    </div>
                    <div className="text-lg font-bold" style={{ color: '#344E41' }}>
                      Founder's Pricing
                    </div>
                  </div>
                  
                  <div className="rounded-lg p-3 mb-2" style={{ backgroundColor: 'rgba(212, 215, 205, 0.8)' }}>
                    <p className="text-xs leading-relaxed" style={{ color: '#3A5A40' }}>
                      As an early supporter, you get grandfathered pricing that <strong>never increases</strong> - 
                      even as we add new features and increase value as we grow!
                    </p>
                  </div>
                </div>
                
                {/* Monthly and Annual in 2-column layout */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Monthly Plan */}
                  <div 
                    className={`relative rounded-lg border-2 p-3 transition-all duration-200 flex flex-col cursor-pointer hover:shadow-lg`}
                    style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
                    onClick={() => handleSelectPlan({ name: 'Monthly', price: 8.99, interval: 'month' })}
                  >
                    {/* Plan Title */}
                    <div className="text-center mb-3 flex-1 flex flex-col justify-center">
                      <h3 className="text-base font-bold" style={{ color: theme.text }}>Monthly</h3>
                      <div className="text-xl font-bold mt-1" style={{ color: theme.text }}>$8.99</div>
                      <div className="text-xs mt-1" style={{ color: theme.textLight }}>per month</div>
                    </div>

                    {/* Action Button */}
                    <button 
                      className="w-full py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90"
                      style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                    >
                      Start Monthly
                    </button>
                  </div>

                  {/* Annual Plan */}
                  <div 
                    className={`relative rounded-lg border-2 p-3 transition-all duration-200 flex flex-col cursor-pointer hover:shadow-lg`}
                    style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
                    onClick={() => handleSelectPlan({ name: 'Annual', price: 89.99, interval: 'year' })}
                  >
                    {/* Popular Badge */}
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <div className="px-6 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: theme.primaryDark }}>
                        Popular
                      </div>
                    </div>

                    {/* Plan Title */}
                    <div className="text-center mb-3 flex-1 flex flex-col justify-center">
                      <h3 className="text-base font-bold" style={{ color: theme.text }}>Annual</h3>
                      <div className="text-xl font-bold mt-1" style={{ color: theme.text }}>$89.99</div>
                      <div className="text-xs mt-1" style={{ color: theme.textLight }}>per year</div>
                      
                      {/* Subtitle Badge */}
                      <div className="text-center mt-1">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: theme.primary }}>
                          Save $17.89
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <button 
                      className="w-full py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90"
                      style={{ backgroundColor: theme.primaryDark, color: theme.textOnPrimary }}
                    >
                      Start Annual
                    </button>
                  </div>
                </div>
                
                {/* Lifetime plan in expanded single column */}
                <div 
                  className={`relative rounded-lg border-2 p-6 transition-all duration-200 cursor-pointer hover:shadow-lg`}
                  style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
                  onClick={() => handleSelectPlan({ name: 'Lifetime', price: 249.99, interval: 'lifetime' })}
                >
                  {/* Limited Time Badge */}
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <div className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
                      Limited Time Only
                    </div>
                  </div>
                  
                  {/* Content with more vertical space */}
                  <div className="flex items-center justify-between min-h-[80px]">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: theme.primary }}>
                        <Crown size={20} style={{ color: theme.textOnPrimary }} />
                      </div>
                      <div className="space-y-1">
                        <div className="font-bold text-lg" style={{ color: theme.text }}>Lifetime Access</div>
                        <div className="text-base font-semibold" style={{ color: theme.text }}>$249.99</div>
                        <div className="text-sm" style={{ color: theme.textLight }}>Never pay again • All features included</div>
                      </div>
                    </div>
                    <button 
                      className="px-6 py-3 rounded-lg text-sm font-medium transition-all hover:opacity-90 whitespace-nowrap shadow-md"
                      style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                    >
                      Join Forever
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Gift Access Button */}
              <div className="mt-6 pt-6 border-t" style={{ borderColor: theme.border }}>
                <div className="text-center">
                  <p className="text-sm mb-4" style={{ color: theme.textLight }}>Want to share The Pep Planner with someone?</p>
                  <button
                    onClick={() => setShowGiftModal(true)}
                    className="px-6 py-3 rounded-xl font-medium transition-all shadow-lg text-white hover:opacity-90"
                    style={{ 
                      background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark || theme.primary})`
                    }}
                  >
                    🎁 Give as a Gift
                  </button>
                </div>
              </div>
            </div>
          )}

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
                  <Settings size={20} style={{ color: theme.accent }} />
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
      )}

      {/* Subscription Plans - Show for non-trial users */}
      {!sub && (
        <div 
          className="p-6 rounded-lg"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <div className="space-y-4">
            {/* Founder's Pricing Alert */}
            <div className="rounded-lg p-4 text-center shadow-sm" style={{ background: 'linear-gradient(to right, #D4D7CD, #A3B18A)', border: '2px solid #A3B18A' }}>
              <div className="flex items-center justify-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shadow-md" style={{ background: 'linear-gradient(to right, #3A5A40, #344E41)' }}>
                  <Crown size={12} className="text-white" />
                </div>
                <div className="text-lg font-bold" style={{ color: '#344E41' }}>
                  Founder's Pricing
                </div>
              </div>
              
              <div className="rounded-lg p-3 mb-2" style={{ backgroundColor: 'rgba(212, 215, 205, 0.8)' }}>
                <p className="text-xs leading-relaxed" style={{ color: '#3A5A40' }}>
                  As an early supporter, you get grandfathered pricing that <strong>never increases</strong> - 
                  even as we add new features and increase value as we grow!
                </p>
              </div>
            </div>
            
            {/* Monthly and Annual in 2-column layout */}
            <div className="grid grid-cols-2 gap-3">
              {/* Monthly Plan */}
              <div 
                className={`relative rounded-lg border-2 p-3 transition-all duration-200 flex flex-col cursor-pointer hover:shadow-lg`}
                style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
                onClick={() => handleSelectPlan({ name: 'Monthly', price: 8.99, interval: 'month' })}
              >
                {/* Plan Title */}
                <div className="text-center mb-3 flex-1 flex flex-col justify-center">
                  <h3 className="text-base font-bold" style={{ color: theme.text }}>Monthly</h3>
                  <div className="text-xl font-bold mt-1" style={{ color: theme.text }}>$8.99</div>
                  <div className="text-xs mt-1" style={{ color: theme.textLight }}>per month</div>
                </div>

                {/* Action Button */}
                <button 
                  className="w-full py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90"
                  style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                >
                  Start Monthly
                </button>
              </div>

              {/* Annual Plan */}
              <div 
                className={`relative rounded-lg border-2 p-3 transition-all duration-200 flex flex-col cursor-pointer hover:shadow-lg`}
                style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
                onClick={() => handleSelectPlan({ name: 'Annual', price: 89.99, interval: 'year' })}
              >
                {/* Popular Badge */}
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <div className="px-6 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: theme.primaryDark }}>
                    Popular
                  </div>
                </div>

                {/* Plan Title */}
                <div className="text-center mb-3 flex-1 flex flex-col justify-center">
                  <h3 className="text-base font-bold" style={{ color: theme.text }}>Annual</h3>
                  <div className="text-xl font-bold mt-1" style={{ color: theme.text }}>$89.99</div>
                  <div className="text-xs mt-1" style={{ color: theme.textLight }}>per year</div>
                  
                  {/* Subtitle Badge */}
                  <div className="text-center mt-1">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: theme.primary }}>
                      Save $17.89
                    </span>
                  </div>
                </div>

                {/* Action Button */}
                <button 
                  className="w-full py-2 rounded-lg font-medium text-sm transition-all hover:opacity-90"
                  style={{ backgroundColor: theme.primaryDark, color: theme.textOnPrimary }}
                >
                  Start Annual
                </button>
              </div>
            </div>
            
            {/* Lifetime plan in expanded single column */}
            <div 
              className={`relative rounded-lg border-2 p-6 transition-all duration-200 cursor-pointer hover:shadow-lg`}
              style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
              onClick={() => handleSelectPlan({ name: 'Lifetime', price: 249.99, interval: 'lifetime' })}
            >
              {/* Limited Time Badge */}
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                <div className="px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
                  Limited Time Only
                </div>
              </div>
              
              {/* Content with more vertical space */}
              <div className="flex items-center justify-between min-h-[80px]">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-md" style={{ backgroundColor: theme.primary }}>
                    <Crown size={20} style={{ color: theme.textOnPrimary }} />
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold text-lg" style={{ color: theme.text }}>Lifetime Access</div>
                    <div className="text-base font-semibold" style={{ color: theme.text }}>$249.99</div>
                    <div className="text-sm" style={{ color: theme.textLight }}>Never pay again • All features included</div>
                  </div>
                </div>
                <button 
                  className="px-6 py-3 rounded-lg text-sm font-medium transition-all hover:opacity-90 whitespace-nowrap shadow-md"
                  style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                >
                  Join Forever
                </button>
              </div>
            </div>
          </div>
          
          {/* Gift Access Button */}
          <div className="mt-6 pt-6 border-t" style={{ borderColor: theme.border }}>
            <div className="text-center">
              <p className="text-sm mb-4" style={{ color: theme.textLight }}>Want to share The Pep Planner with someone?</p>
              <button
                onClick={() => setShowGiftModal(true)}
                className="px-6 py-3 rounded-xl font-medium transition-all shadow-lg text-white hover:opacity-90"
                style={{ 
                  background: `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark || theme.primary})`
                }}
              >
                🎁 Give as a Gift
              </button>
            </div>
          </div>
        </div>
      )}


      <GiftPurchaseModal 
        isOpen={showGiftModal} 
        onClose={() => setShowGiftModal(false)} 
        theme={theme} 
      />

    </section>
  )
}


const TrialProgressBar = ({ theme, startDate, endDate }) => {
  const [progress, setProgress] = useState(0);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
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