import React, { useState, useEffect } from 'react';
import { Lightbulb, X, FileText, Play, Calendar } from 'lucide-react';
import useLocalStorage from '../../utils/hooks';

const ProtocolsTipsBanner = ({ theme }) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useLocalStorage('tpprover_protocols_tips_dismissed', false);
  const [fadeIn, setFadeIn] = useState(true);

  // Simplified tips for protocols section (max 2 lines)
  const tips = [
    {
      text: 'Build protocols with dosing schedules & cycles📋',
      icon: FileText
    },
    {
      text: 'Activate protocols to track adherence & progress▶️'
    },
    {
      text: 'Monitor daily dosing, cycle timing & rest periods📅'
    },
    {
      text: 'Log doses taken & maintain consistency records✅'
    },
    {
      text: 'Review completion rates & identify patterns📊'
    },
    {
      text: 'Access past cycles & analyze research approaches🔍'
    },
    {
      text: 'Set AM/PM reminders for your research schedule⏰'
    },
    {
      text: 'Protocols auto-deduct from your stockpile!➖'
    },
    {
      text: 'Track multiple protocols simultaneously🔄'
    },
    {
      text: 'Add notes during & after protocol completion📝',
      icon: Calendar
    },
    {
      text: 'History tab shows all past protocol runs📈'
    },
    {
      text: 'Link vials from stockpile to active protocols🔗'
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

export default ProtocolsTipsBanner;






