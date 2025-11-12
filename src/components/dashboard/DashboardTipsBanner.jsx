import React, { useState, useEffect } from 'react';
import { Lightbulb, X, ChevronLeft, ChevronRight } from 'lucide-react';
import useLocalStorage from '../../utils/hooks';

const DashboardTipsBanner = ({ theme }) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useLocalStorage('tpprover_dashboard_tips_dismissed', false);
  const [fadeIn, setFadeIn] = useState(true);

  // Curated tips for new users - shorter, more actionable
  const tips = [
    {
      icon: '🚀',
      text: 'Start by adding your stockpile - include reconstituted vials in your fridge!'
    },
    {
      icon: '📋',
      text: 'Tasks sync across devices. Completing a protocol auto-deducts from stockpile!'
    },
    {
      icon: '🔄',
      text: 'Reconstituting a peptide? It automatically adds to stockpile and creates tasks.'
    },
    {
      icon: '🎯',
      text: 'Use Quick Actions widget to reconstitute, add orders, or create protocols instantly.'
    },
    {
      icon: '💧',
      text: 'Click the droplet icon on stockpile items to import details into the calculator.'
    },
    {
      icon: '📦',
      text: 'Add tracking numbers to orders - we\'ll monitor delivery status for you.'
    },
    {
      icon: '🎨',
      text: 'Customize your dashboard - tap the edit icon to rearrange widgets.'
    },
    {
      icon: '💾',
      text: 'Everything auto-saves! Your data syncs automatically across devices.'
    }
  ];

  // Auto-rotate tips every 15 seconds
  useEffect(() => {
    if (isDismissed) return;

    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % tips.length);
        setFadeIn(true);
      }, 200);
    }, 15000);

    return () => clearInterval(interval);
  }, [isDismissed, tips.length]);

  const handlePrevious = () => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentTipIndex((prev) => (prev - 1 + tips.length) % tips.length);
      setFadeIn(true);
    }, 200);
  };

  const handleNext = () => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
      setFadeIn(true);
    }, 200);
  };

  if (isDismissed) return null;

  const currentTip = tips[currentTipIndex];

  return (
    <div 
      className="w-full px-3 lg:px-6 py-2 border-b flex items-center justify-between gap-3 transition-all"
      style={{ 
        backgroundColor: theme.isDark ? '#1f2937' : '#f9fafb',
        borderColor: theme.border,
        borderTop: 'none'
      }}
    >
      {/* Left side - Icon and tip text */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="flex-shrink-0">
          <Lightbulb size={16} style={{ color: theme.primary }} />
        </div>
        
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {/* Navigation arrows */}
          <button
            onClick={handlePrevious}
            className="p-1 rounded transition-all hover:opacity-70 flex-shrink-0"
            style={{ color: theme.textLight }}
            aria-label="Previous tip"
          >
            <ChevronLeft size={14} />
          </button>

          {/* Tip content */}
          <div 
            className="flex items-center gap-2 flex-1 min-w-0 transition-opacity duration-200"
            style={{ opacity: fadeIn ? 1 : 0 }}
          >
            <span className="text-base flex-shrink-0">{currentTip.icon}</span>
            <span 
              className="text-xs lg:text-sm truncate"
              style={{ color: theme.textLight }}
            >
              {currentTip.text}
            </span>
          </div>

          <button
            onClick={handleNext}
            className="p-1 rounded transition-all hover:opacity-70 flex-shrink-0"
            style={{ color: theme.textLight }}
            aria-label="Next tip"
          >
            <ChevronRight size={14} />
          </button>
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

export default DashboardTipsBanner;

