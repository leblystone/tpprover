import React from 'react';
import { navigateToBilling, isNative } from '../../utils/platform';
import { canShowPaymentButtons, getAndroidUpgradeMessage } from '../../utils/paymentCompliance';
import { isAndroid } from '../../utils/platform';

/**
 * Universal billing management button for all platforms
 * Android-compliant: Hides payment buttons on Android (Google Play policy)
 */
const BillingButton = ({ 
  children = 'Manage Billing',
  className = '',
  theme,
  variant = 'outline'
}) => {
  const handleBilling = () => {
    navigateToBilling();
  };

  // Android compliance: Hide payment buttons, show text-only message
  if (isAndroid()) {
    return (
      <div className="px-4 py-2 text-sm" style={{ color: theme?.textLight || '#6B7280' }}>
        {getAndroidUpgradeMessage()}
      </div>
    );
  }

  const getButtonStyles = () => {
    const baseStyles = "px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2";
    
    switch (variant) {
      case 'primary':
        return `${baseStyles} text-white hover:opacity-90 ${className}`;
      case 'secondary':
        return `${baseStyles} border-2 hover:opacity-90 ${className}`;
      case 'outline':
        return `${baseStyles} border border-gray-300 bg-transparent hover:bg-gray-50 ${className}`;
      default:
        return `${baseStyles} ${className}`;
    }
  };

  const getButtonColor = () => {
    if (theme) {
      switch (variant) {
        case 'primary':
          return { backgroundColor: theme.primary, color: theme.textOnPrimary };
        case 'secondary':
          return { 
            backgroundColor: theme.secondary, 
            color: theme.textOnSecondary,
            borderColor: theme.primary 
          };
        case 'outline':
          return { 
            color: theme.text,
            borderColor: theme.primary 
          };
        default:
          return {};
      }
    }
    return {};
  };

  return (
    <button
      onClick={handleBilling}
      className={getButtonStyles()}
      style={getButtonColor()}
      title={isNative() ? "Opens in browser for billing management" : "Manage your subscription"}
    >
      <svg 
        className="w-4 h-4" 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" 
        />
      </svg>
      {children}
      {isNative() && (
        <svg 
          className="w-4 h-4 ml-1" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" 
          />
        </svg>
      )}
    </button>
  );
};

export default BillingButton;






