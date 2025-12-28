/**
 * App Store Subscription Modal
 * Uses App Store In-App Purchase native UI for iOS platform
 * 
 * TODO: Implement App Store IAP integration
 * This will launch App Store's native purchase dialog
 */

import React, { useState } from 'react';
import Modal from '../common/Modal';
import { subscribe } from '../../services/payment/paymentService';
import { useAppContext } from '../../context/AppContext';
import { SUBSCRIPTION_PLANS } from '../../utils/subscriptionPlans';

export default function AppStoreSubscriptionModal({ isOpen, onClose, theme, currentPlan }) {
  const { user } = useAppContext();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSelectPlan = async (planKey) => {
    const plan = SUBSCRIPTION_PLANS[planKey];
    if (!plan) {
      console.warn('Unknown plan selected:', planKey);
      return;
    }

    console.log('🚀 AppStoreSubscriptionModal: Selected plan:', plan);
    setIsProcessing(true);
    setError(null);
    
    try {
      // Use payment service router (will route to App Store for iOS)
      await subscribe(planKey, {
        userEmail: user?.email || '',
        userId: user?.uid || '',
        plan: plan
      });
      
      // App Store IAP will handle the UI flow
      // The purchase result will be handled by the IAP service
      
    } catch (error) {
      console.error('❌ AppStoreSubscriptionModal: Subscription error:', error);
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
            className="px-6 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all"
          >
            Maybe Later
          </button>
        </div>
      }
    >
      <div className="p-4 space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        <div className="text-center mb-4">
          <p className="text-sm" style={{ color: theme.textLight }}>
            Select a subscription plan. App Store will handle your payment securely.
          </p>
        </div>

        {/* Subscription Plans */}
        <div className="space-y-3">
          {/* Monthly Plan */}
          <button
            onClick={() => handleSelectPlan('monthly')}
            disabled={isProcessing}
            className="w-full p-4 rounded-lg border-2 transition-all hover:shadow-lg disabled:opacity-50"
            style={{ 
              borderColor: theme.border, 
              backgroundColor: theme.cardBackground 
            }}
          >
            <div className="text-left">
              <div className="font-bold text-lg mb-1" style={{ color: theme.text }}>
                {SUBSCRIPTION_PLANS.monthly.label}
              </div>
              <div className="text-sm" style={{ color: theme.textLight }}>
                Flexible monthly billing
              </div>
            </div>
          </button>

          {/* Annual Plan */}
          <button
            onClick={() => handleSelectPlan('annual')}
            disabled={isProcessing}
            className="w-full p-4 rounded-lg border-2 transition-all hover:shadow-lg disabled:opacity-50 relative"
            style={{ 
              borderColor: theme.primary, 
              backgroundColor: theme.cardBackground 
            }}
          >
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <span className="px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: theme.primary }}>
                Most Popular
              </span>
            </div>
            <div className="text-left">
              <div className="font-bold text-lg mb-1" style={{ color: theme.text }}>
                {SUBSCRIPTION_PLANS.annual.label}
              </div>
              <div className="text-sm" style={{ color: theme.textLight }}>
                Best value - Save with annual billing
              </div>
            </div>
          </button>

          {/* Lifetime Plan */}
          <button
            onClick={() => handleSelectPlan('lifetime')}
            disabled={isProcessing}
            className="w-full p-4 rounded-lg border-2 transition-all hover:shadow-lg disabled:opacity-50"
            style={{ 
              borderColor: theme.border, 
              backgroundColor: theme.cardBackground 
            }}
          >
            <div className="text-left">
              <div className="font-bold text-lg mb-1" style={{ color: theme.text }}>
                {SUBSCRIPTION_PLANS.lifetime.label}
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
              Opening App Store...
            </div>
          </div>
        )}

        <div className="text-xs text-center pt-2" style={{ color: theme.textLight }}>
          Your subscription will be managed through App Store
        </div>
      </div>
    </Modal>
  );
}

