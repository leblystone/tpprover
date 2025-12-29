import React, { useState, useEffect } from 'react';
import { Lightbulb, X, Calculator, Droplet, Beaker } from 'lucide-react';
import useLocalStorage from '../../utils/hooks';

const ReconTipsBanner = ({ theme }) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useLocalStorage('tpprover_recon_tips_dismissed', false);
  const [fadeIn, setFadeIn] = useState(true);

  // Simplified tips for recon section (max 2 lines)
  const tips = [
    {
      text: 'Calculate units per dose & cost per vial🧮'
    },
    {
      text: 'Save vials with water volume, dosage & vendor info💧'
    },
    {
      text: 'Track delivery methods - syringes or pens with colors🎨'
    },
    {
      text: 'View all reconstituted vials with dosing calculations📦'
    },
    {
      text: 'Archive completed vials to track usage patterns📊'
    },
    {
      text: 'Jump from Stockpile with pre-filled peptide info!⚡',
      icon: Beaker
    },
    {
      text: 'Mix multiple peptides in one vial!🔀'
    },
    {
      text: 'Color-code your pens for easy identification🖍️'
    },
    {
      text: 'Recon auto-updates your stockpile inventory!➖➕'
    },
    {
      text: 'Calculator supports both single & blended peptides',
      icon: Calculator
    },
    {
      text: 'Vial history helps track vendor performance📈'
    },
    {
      text: 'Click💧droplet in Stockpile to quick-recon!'
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
        margin: '0.25rem auto 1.5rem auto',
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

export default ReconTipsBanner;

