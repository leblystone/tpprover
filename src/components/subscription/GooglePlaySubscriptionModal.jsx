/**
 * Google Play Subscription Modal
 * Uses Google Play Billing native UI for Android platform
 * 
 * TODO: Implement Google Play Billing Library integration
 * This will launch Google Play's native subscription dialog
 */

import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { subscribe } from '../../services/payment/paymentService';
import { useAppContext } from '../../context/AppContext';
import { SUBSCRIPTION_PLANS, isFoundingMember, getCheckoutPlanKeys } from '../../utils/subscriptionPlans';

export default function GooglePlaySubscriptionModal({ isOpen, onClose, theme, currentPlan }) {
  const { user } = useAppContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [error, setError] = useState(null);

  const founderEligible = isFoundingMember(user);
  const planKeys = getCheckoutPlanKeys(founderEligible);

  // Helper to convert hex to rgba
  const hexToRgba = (hex, alpha) => {
    if (!hex) return `rgba(127, 158, 149, ${alpha})`; // fallback sage
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

    console.log('🚀 GooglePlaySubscriptionModal: Selected plan:', plan);
    setSelectedPlan(planKey);
    setIsProcessing(true);
    setError(null);
    
    // Brief delay to show visual feedback
    await new Promise(resolve => setTimeout(resolve, 600));
    
    try {
      // Use payment service router (will route to Google Play for Android)
      await subscribe(planKey, {
        userEmail: user?.email || '',
        userId: user?.uid || '',
        plan: plan
      });
      
      // Google Play Billing will handle the UI flow
      // The purchase result will be handled by the billing service
      
    } catch (error) {
      console.error('❌ GooglePlaySubscriptionModal: Subscription error:', error);
      setError(error.message || 'Failed to start subscription. Please try again.');
      
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: error.message || 'Failed to start subscription. Please try again.', type: 'error' } 
      }));
    } finally {
      setIsProcessing(false);
    }
  };

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
            style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', color: theme.isDark ? '#e5e7eb' : '#374151' }}
          >
            Maybe Later
          </button>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        {error && (
          <div className="p-3 rounded-lg border text-sm" style={{ backgroundColor: theme.isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2', borderColor: theme.isDark ? 'rgba(239,68,68,0.2)' : '#fecaca', color: theme.isDark ? '#fca5a5' : '#b91c1c' }}>
            {error}
          </div>
        )}

        <div className="text-center mb-4">
          <p className="text-sm" style={{ color: theme.textLight }}>
            Select a subscription plan. Google Play will handle your payment securely.
          </p>
        </div>

        {/* Subscription Plans */}
        <div className="space-y-3">
          {/* Monthly Plan */}
          <button
            onClick={() => handleSelectPlan(planKeys.monthly)}
            disabled={isProcessing}
            className="w-full p-4 rounded-lg border-2 transition-all hover:shadow-lg disabled:opacity-50"
            style={{ 
              borderColor: selectedPlan === planKeys.monthly ? theme.primary : theme.border, 
              backgroundColor: selectedPlan === planKeys.monthly ? hexToRgba(theme.primary, 0.1) : theme.cardBackground,
              boxShadow: selectedPlan === planKeys.monthly ? `0 0 0 3px ${hexToRgba(theme.primary, 0.2)}` : 'none'
            }}
          >
            <div className="text-left">
              <div className="font-semibold text-lg mb-1 flex items-center gap-2" style={{ color: theme.text }}>
                {SUBSCRIPTION_PLANS[planKeys.monthly].label}
                {selectedPlan === planKeys.monthly && (
                  <span className="text-xs" style={{ color: theme.primary }}>● Processing...</span>
                )}
              </div>
              <div className="text-sm" style={{ color: theme.textLight }}>
                Flexible monthly billing
              </div>
            </div>
          </button>

          {/* Annual Plan */}
          <button
            onClick={() => handleSelectPlan(planKeys.annual)}
            disabled={isProcessing}
            className="w-full p-4 rounded-lg border-2 transition-all hover:shadow-lg disabled:opacity-50 relative"
            style={{ 
              borderColor: theme.primary, 
              backgroundColor: selectedPlan === planKeys.annual ? hexToRgba(theme.primary, 0.15) : theme.cardBackground,
              boxShadow: selectedPlan === planKeys.annual ? `0 0 0 3px ${hexToRgba(theme.primary, 0.3)}` : 'none'
            }}
          >
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: theme.primary }}>
                Most Popular
              </span>
            </div>
            <div className="text-left">
              <div className="font-semibold text-lg mb-1 flex items-center gap-2" style={{ color: theme.text }}>
                {SUBSCRIPTION_PLANS[planKeys.annual].label}
                {selectedPlan === planKeys.annual && (
                  <span className="text-xs" style={{ color: theme.primary }}>● Processing...</span>
                )}
              </div>
              <div className="text-sm" style={{ color: theme.textLight }}>
                Best value - Save with annual billing
              </div>
            </div>
          </button>

          {/* Lifetime Plan */}
          <button
            onClick={() => handleSelectPlan(planKeys.lifetime)}
            disabled={isProcessing}
            className="w-full p-4 rounded-lg border-2 transition-all hover:shadow-lg disabled:opacity-50"
            style={{ 
              borderColor: selectedPlan === planKeys.lifetime ? theme.primary : theme.border, 
              backgroundColor: selectedPlan === planKeys.lifetime ? hexToRgba(theme.primary, 0.1) : theme.cardBackground,
              boxShadow: selectedPlan === planKeys.lifetime ? `0 0 0 3px ${hexToRgba(theme.primary, 0.2)}` : 'none'
            }}
          >
            <div className="text-left">
              <div className="font-semibold text-lg mb-1 flex items-center gap-2" style={{ color: theme.text }}>
                {SUBSCRIPTION_PLANS[planKeys.lifetime].label}
                {selectedPlan === planKeys.lifetime && (
                  <span className="text-xs" style={{ color: theme.primary }}>● Processing...</span>
                )}
              </div>
              <div className="text-sm" style={{ color: theme.textLight }}>
                One-time payment, lifetime access
              </div>
            </div>
          </button>
        </div>

        {isProcessing && (
          <div className="text-center py-2">
            <div className="text-sm" style={{ color: theme.textLight }}>
              Opening Google Play...
            </div>
          </div>
        )}

        <div className="text-xs text-center pt-2" style={{ color: theme.textLight }}>
          Your subscription will be managed through Google Play
        </div>
      </div>
    </Modal>
  );
}

