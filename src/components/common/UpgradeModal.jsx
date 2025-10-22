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
      title="Choose Your Plan"
      theme={theme}
      variant="modern"
      maxWidth="max-w-4xl"
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
      <div className="p-2">
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


        {/* Plan Selection */}
        <div className="mt-6 space-y-4">
          {/* Monthly and Annual in 2-column layout */}
          <div className="grid grid-cols-2 gap-3">
            {/* Monthly Plan */}
            <div 
              className="relative bg-white rounded-lg border-2 p-3 cursor-pointer hover:shadow-lg transition-all duration-200 flex flex-col"
              style={{ borderColor: '#D4D7CD' }}
              onClick={handleUpgradeClick}
            >
              {/* Plan Title */}
              <div className="text-center mb-3 flex-1 flex flex-col justify-center">
                <h3 className="text-base font-bold" style={{ color: '#344E41' }}>Monthly</h3>
                <div className="text-xl font-bold mt-1" style={{ color: '#344E41' }}>$8.99</div>
                <div className="text-xs mt-1" style={{ color: '#5C7659' }}>per month</div>
              </div>

              {/* Action Button */}
              <button 
                className="w-full py-2 rounded-lg text-white font-medium text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: '#344E41' }}
              >
                Start Monthly
              </button>
            </div>

            {/* Annual Plan */}
            <div 
              className="relative bg-white rounded-lg border-2 p-3 cursor-pointer hover:shadow-lg transition-all duration-200 flex flex-col"
              style={{ borderColor: '#D4D7CD' }}
              onClick={handleUpgradeClick}
            >
              {/* Popular Badge */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <div className="px-6 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: '#3A5A40' }}>
                  Popular
                </div>
              </div>

              {/* Plan Title */}
              <div className="text-center mb-3 flex-1 flex flex-col justify-center">
                <h3 className="text-base font-bold" style={{ color: '#344E41' }}>Annual</h3>
                <div className="text-xl font-bold mt-1" style={{ color: '#344E41' }}>$89.99</div>
                <div className="text-xs mt-1" style={{ color: '#5C7659' }}>per year</div>
                
                {/* Subtitle Badge */}
                <div className="text-center mt-1">
                  <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: '#A3B18A' }}>
                    Save $17.89
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <button 
                className="w-full py-2 rounded-lg text-white font-medium text-sm transition-all hover:opacity-90"
                style={{ backgroundColor: '#3A5A40' }}
              >
                Start Annual
              </button>
            </div>
          </div>
          
          {/* Lifetime plan in compact single column */}
          <div 
            className="relative bg-white rounded-lg border-2 p-5 cursor-pointer hover:shadow-lg transition-all duration-200"
            style={{ borderColor: '#D4D7CD' }}
            onClick={handleUpgradeClick}
          >
            {/* Limited Time Badge */}
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
              <div className="px-3 py-1 rounded-full text-xs font-semibold text-white whitespace-nowrap" style={{ backgroundColor: '#344E41' }}>
                Limited Time Only
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ backgroundColor: '#344E41' }}>
                  <Crown size={18} className="text-white" />
                </div>
                <div>
                  <div className="font-bold text-base" style={{ color: '#344E41' }}>Lifetime Access</div>
                  <div className="text-sm" style={{ color: '#5C7659' }}>$249.99 • Never pay again</div>
                </div>
              </div>
              <button 
                className="px-3 py-2 rounded-lg text-white text-sm font-medium transition-all hover:opacity-90 whitespace-nowrap"
                style={{ backgroundColor: '#344E41' }}
              >
                Join Forever
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

