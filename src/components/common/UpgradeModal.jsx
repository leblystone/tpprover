import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Lock, ArrowRight } from 'lucide-react';
import Modal from './Modal';

/**
 * Modal displayed when user tries to perform an action in read-only mode
 * Prompts them to upgrade their subscription
 */
export default function UpgradeModal({ isOpen, onClose, actionAttempted = 'perform this action', theme }) {
  const navigate = useNavigate();

  const handleUpgradeClick = () => {
    navigate('/account');
    onClose();
  };

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title=""
      theme={theme}
      maxWidth="max-w-md"
      footer={
        <div className="w-full flex justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm font-medium transition-all"
            style={{ backgroundColor: theme?.border || '#E5E7EB', color: theme?.text || '#000' }}
          >
            Maybe Later
          </button>
          <button
            onClick={handleUpgradeClick}
            className="px-6 py-2 rounded-md text-sm font-semibold transition-all flex items-center gap-2"
            style={{ 
              background: 'linear-gradient(135deg, #3A5A40 0%, #5C7659 100%)',
              color: '#FFFFFF'
            }}
          >
            Choose a Plan
            <ArrowRight size={16} />
          </button>
        </div>
      }
    >
      <div className="text-center py-6">
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg, rgba(58, 90, 64, 0.1) 0%, rgba(92, 118, 89, 0.1) 100%)' }}
        >
          <Lock size={32} style={{ color: '#3A5A40' }} />
        </div>

        {/* Title */}
        <h3 className="text-2xl font-bold mb-3" style={{ color: '#344E41' }}>
          Upgrade to Continue
        </h3>

        {/* Message */}
        <p className="text-base mb-4" style={{ color: '#5C7659' }}>
          Your trial has ended. To {actionAttempted}, please choose a subscription plan.
        </p>

        {/* Info about data access */}
        <div className="text-left bg-blue-50 rounded-lg p-3 mb-4 border border-blue-200">
          <p className="text-xs font-medium mb-1" style={{ color: '#1E40AF' }}>
            You can still:
          </p>
          <p className="text-xs" style={{ color: '#3B82F6' }}>
            • View all your data<br/>
            • Delete items from your account<br/>
            • Export your information
          </p>
        </div>

        {/* Features List */}
        <div className="text-left bg-gray-50 rounded-lg p-4 mb-4">
          <p className="text-sm font-semibold mb-3" style={{ color: '#344E41' }}>
            With a subscription, you can:
          </p>
          <ul className="space-y-2 text-sm" style={{ color: '#5C7659' }}>
            <li className="flex items-start gap-2">
              <Crown size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#3A5A40' }} />
              <span>Add and edit unlimited protocols</span>
            </li>
            <li className="flex items-start gap-2">
              <Crown size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#3A5A40' }} />
              <span>Track supplements and orders</span>
            </li>
            <li className="flex items-start gap-2">
              <Crown size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#3A5A40' }} />
              <span>Access all research tools</span>
            </li>
          </ul>
        </div>

        {/* Pricing Preview */}
        <p className="text-xs" style={{ color: '#6B7280' }}>
          Plans start at just <strong>$8.99/month</strong>
        </p>
      </div>
    </Modal>
  );
}

