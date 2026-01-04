import React, { useState, useEffect } from 'react';
import { Lightbulb, X, Store, Globe, Phone } from 'lucide-react';
import useLocalStorage from '../../utils/hooks';

const VendorsTipsBanner = ({ theme }) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useLocalStorage('tpprover_vendors_tips_dismissed', false);
  const [fadeIn, setFadeIn] = useState(true);

  // Simplified tips for vendors section (max 2 lines)
  const tips = [
    {
      text: 'Create profiles with contact info & payment methods🏪',
      icon: Store
    },
    {
      text: 'Categorize as Domestic, International, or Group Buy🌍',
      icon: Globe
    },
    {
      text: 'Store contact details & payment preferences📞',
      icon: Phone
    },
    {
      text: 'Connect vendors to orders for tracking📦'
    },
    {
      text: 'Track trusted suppliers & shipping preferences✅'
    },
    {
      text: 'Quick access to vendor info from orders🔗'
    },
    {
      text: 'Add Telegram, WhatsApp, or email contacts📱'
    },
    {
      text: 'Payment methods: Crypto, Zelle, Venmo & more💳'
    },
    {
      text: 'Shipping info helps track delivery times🚚'
    },
    {
      text: 'Tap contact info to open directly!📲'
    },
    {
      text: 'Order history shows all past purchases📊'
    },
    {
      text: 'Organize suppliers for easy reference🗂️'
    }
  ];

  // Auto-rotate tips every 5 seconds
  useEffect(() => {
    if (isDismissed) return;

    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % tips.length);
        setFadeIn(true);
      }, 200);
    }, 5000);

    return () => clearInterval(interval);
  }, [isDismissed, tips.length]);


  if (isDismissed) return null;

  const currentTip = tips[currentTipIndex];

  return (
    <div 
      className="w-full px-3 sm:px-4 lg:px-6 py-2 border-b flex items-center justify-between gap-2 sm:gap-3 transition-all"
      style={{ 
        backgroundColor: theme.isDark ? '#1f2937' : '#f9fafb',
        borderColor: theme.border,
        borderTop: 'none',
        maxWidth: '97%',
        margin: '0.25rem auto 1rem auto',
        boxSizing: 'border-box'
      }}
    >
      {/* Left side - Lightbulb icon */}
      <div className="flex-shrink-0">
        <Lightbulb size={14} style={{ color: theme.primary }} />
      </div>

      {/* Center - Tip content */}
      <div className="flex items-center justify-center flex-1 min-w-0">
        <div 
          className="flex items-center justify-center gap-2 transition-opacity duration-200"
          style={{ opacity: fadeIn ? 1 : 0 }}
        >
          <span 
            className="text-xs lg:text-sm text-center"
            style={{ color: theme.textLight }}
          >
            {currentTip.text}
          </span>
          {currentTip.icon && React.createElement(currentTip.icon, { size: 14, style: { color: theme.primary } })}
        </div>
      </div>

      {/* Right side - Dismiss button */}
      <button
        onClick={() => setIsDismissed(true)}
        className="p-1 rounded transition-all hover:opacity-70 flex-shrink-0"
        style={{ color: theme.textLight }}
        aria-label="Dismiss tips"
        title="Dismiss tips"
      >
        <X size={14} />
      </button>
    </div>
  );
};

export default VendorsTipsBanner;



