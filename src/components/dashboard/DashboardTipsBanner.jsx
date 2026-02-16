import React, { useState, useEffect } from 'react';
import {
  Lightbulb,
  X,
  FlaskConical,
  GitMerge,
  TestTube,
  ClipboardList,
  RefreshCw,
  Droplets,
  Truck,
  LayoutDashboard,
  Calendar,
  MessageCircle,
  Clock,
  CheckCircle,
  Calculator,
  Ruler,
  FileText
} from 'lucide-react';
import useLocalStorage from '../../utils/hooks';

const DashboardTipsBanner = ({ theme }) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isDismissed, setIsDismissed] = useLocalStorage('tpprover_dashboard_tips_dismissed', false);
  const [fadeIn, setFadeIn] = useState(true);

  // Simplified tips for new users (kept short for single-line display)
  const tips = [
    { text: 'Open the fridge & add to your stockpile', icon: TestTube },
    { text: 'Research data syncs across all devices', icon: ClipboardList },
    { text: 'Recon pulls from Stockpile & updates inventory', icon: RefreshCw },
    { text: 'Click the droplet to recon that vial!', icon: Droplets },
    { text: 'Add order tracking for dashboard updates', icon: Truck },
    { text: 'Customize your dashboard experience', icon: LayoutDashboard },
    { text: 'Add protocols to start scheduling', icon: Calendar },
    { text: "We're in Beta!", icon: FlaskConical },
    { text: 'Tap vendor contact → Telegram takes you there!', icon: MessageCircle },
    { text: "Two of the same? Merge em'", icon: GitMerge },
    { text: 'New protocol history timeline', icon: Clock },
    { text: 'Delivered tracking? Order status auto-updates!', icon: CheckCircle },
    { text: 'Unit conversion widget: quick mg ↔ IU', icon: Calculator },
    { text: 'mg? g? mcg? IU? Measure correctly', icon: Ruler },
    { text: 'Protocol Notes: add during & final observations', icon: FileText }
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
      className="w-full px-3 sm:px-4 lg:px-6 py-2 flex items-center justify-between gap-2 sm:gap-3 transition-all glass-panel-minimal rounded-lg"
      style={{ 
        borderColor: 'transparent',
        borderTop: 'none',
        borderBottom: 'none',
        maxWidth: '97%',
        margin: '0.25rem auto 0 auto',
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

export default DashboardTipsBanner;

