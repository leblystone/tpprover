import React, { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, CreditCard, Calendar, Crown, Gift, ExternalLink, RefreshCw } from 'lucide-react'
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
      await verifyStripeConfig();
      const session = await createPortalSession(firebaseUser?.uid);
      window.open(session.url, '_blank');
    } catch (error) {
      console.error('Error creating portal session:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Failed to open billing portal', type: 'error' } 
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

      {sub ? (
        <div className="space-y-6">
          {/* Subscription Status */}
          <div 
            className="p-6 rounded-lg"
            style={{ backgroundColor: theme.cardBackground }}
          >
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
