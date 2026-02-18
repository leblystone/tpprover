import React from 'react';
import { navigateToPayment, isNative } from '../../utils/platform';

const UpgradeButton = ({ 
  plan = 'monthly', 
  children = 'Upgrade to Pro',
  className = '',
  theme,
  variant = 'primary'
}) => {
  const handleUpgrade = () => {
    navigateToPayment(plan);
  };

  const getButtonStyles = () => {
    const baseStyles = "px-4 py-2 rounded-lg font-semibold transition-all duration-200 flex items-center gap-2";
    
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
            color: theme.primary,
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
      onClick={handleUpgrade}
      className={getButtonStyles()}
      style={getButtonColor()}
      title={isNative() ? "Opens in browser for secure payment" : "Upgrade your account"}
    >
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

export default UpgradeButton;






