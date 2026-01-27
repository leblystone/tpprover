import React from 'react';
import Modal from './Modal';
import { Rocket, Clock } from 'lucide-react';

export default function TrialExpiredModal({ open, onClose, onSignUp, theme }) {
  const handleDismiss = () => {
    // Store that user dismissed the modal (you can add logic to show it again later)
    localStorage.setItem('tpprover_trial_expired_dismissed', new Date().toISOString());
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Your 30 day planner access has ended"
      theme={theme}
      maxWidth="max-w-lg"
      footer={(
        <div className="flex flex-col-reverse sm:flex-row gap-3 w-full">
          <button
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90"
            onClick={handleDismiss}
            style={{ backgroundColor: '#F3F4F6', color: '#374151' }}
          >
            Still Deciding
          </button>
          <button
            className="flex-1 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90 flex items-center justify-center gap-2"
            onClick={onSignUp}
            style={{ backgroundColor: theme.primary }}
          >
            <Rocket size={18} />
            Choose Your Plan
          </button>
        </div>
      )}
    >
      <div className="space-y-4">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ 
            background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%)`,
            boxShadow: `0 4px 6px -1px ${theme.primary}30`
          }}>
            <Clock size={32} className="text-white" />
          </div>
        </div>

        {/* Message */}
        <div className="text-center space-y-3">
          <p className="text-base text-gray-700">
            Your research trial has expired. To continue organizing your peptide research and accessing all features, please choose a subscription plan.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
            <p className="text-sm text-gray-700 font-medium mb-2">
              ✨ What you'll keep with a subscription:
            </p>
            <ul className="text-sm text-gray-600 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>Full access to protocol research tools</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>Advanced calendar and scheduling features</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>Vendor management and order tracking</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 mt-0.5">•</span>
                <span>All your data synced and backed up</span>
              </li>
            </ul>
          </div>

          <p className="text-xs text-gray-500 italic">
            Don't worry - your data is safe in read-only mode until you subscribe.
          </p>
        </div>
      </div>
    </Modal>
  );
}

