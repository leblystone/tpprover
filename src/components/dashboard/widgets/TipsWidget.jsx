import React, { useState, useEffect } from 'react';
import { Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';

const TipsWidget = ({ widget, theme }) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);

  const tips = [
    {
      icon: '📋',
      title: 'Task Syncing',
      description: 'Tasks automatically sync across all your devices. When you complete a protocol, it automatically deducts from your stockpile!'
    },
    {
      icon: '🔄',
      title: 'Auto-Reconstitution',
      description: 'When you reconstitute a peptide, The Pep Planner automatically adds it to your stockpile and creates your protocol tasks.'
    },
    {
      icon: '📦',
      title: 'Track Shipments',
      description: 'Add tracking numbers to your orders. We\'ll monitor delivery status and notify you when peptides arrive.'
    },
    {
      icon: '🎯',
      title: 'Set Research Goals',
      description: 'Track your research goals and bio-metrics over time. Perfect for monitoring protocol effectiveness.'
    },
    {
      icon: '💰',
      title: 'Budget Tracking',
      description: 'Monitor your spending across vendors. The app tracks monthly and total costs automatically.'
    },
    {
      icon: '🔔',
      title: 'Smart Reminders',
      description: 'Never miss a dose with research reminders! Get notified for low peptides in your stockpile or protocols that are supposed to be cycled soon!'
    },
    {
      icon: '📊',
      title: 'Compliance Streaks',
      description: 'Build momentum! Your Research Consistency widget tracks your adherence streaks and completion rates.'
    },
    {
      icon: '🏪',
      title: 'Vendor Management',
      description: 'Save your favorite vendors with notes and ratings. Track which peptides you get from each source.'
    },
    {
      icon: '⏰',
      title: 'Consistent Scheduling',
      description: 'Stay on track with proper protocol timing! The app ensures your research follows consistent, protocol-based schedules for optimal results.'
    },
    {
      icon: '📱',
      title: 'Offline Mode',
      description: 'The app works offline! Your data syncs automatically when you\'re back online.'
    },
    {
      icon: '🔍',
      title: 'Research Glossary',
      description: 'Not sure what a term means? Use the glossary widget for instant peptide research definitions.'
    },
    {
      icon: '💧',
      title: 'Hydration Tracking',
      description: 'Many peptides work better with proper hydration. Use the water tracker to monitor your daily intake.'
    },
    {
      icon: '🏆',
      title: 'Achievement Badges',
      description: 'Earn badges for consistency milestones! Track your progress and celebrate your research journey.'
    },
    {
      icon: '📝',
      title: 'Quick Notes',
      description: 'Jot down observations or side effects instantly with the Research Notes widget.'
    },
    {
      icon: '⚡',
      title: 'Quick Actions',
      description: 'Use the Quick Actions widget to reconstitute, add orders, vendors, or protocols with one tap.'
    },
    {
      icon: '🎨',
      title: 'Customize Dashboard',
      description: 'Tap the customize button to rearrange widgets, resize them, or hide ones you don\'t need.'
    },
    {
      icon: '🔐',
      title: 'Secure & Private',
      description: 'Your data is encrypted and stored securely. We never share your research information.'
    },
    {
      icon: '📅',
      title: 'Group Buys',
      description: 'Schedule upcoming purchases in advance. Never forget to restock your peptides before running out!'
    },
    {
      icon: '💧',
      title: 'Stockpile Workflow',
      description: 'Once your stockpile is set up, everything flows! Click the droplet icon to import vial details into the calculator, or select vials when creating protocols. Saving automatically updates your stock!'
    },
    {
      icon: '🚀',
      title: 'Getting Started',
      description: 'New to the app? Start by importing your stockpile first - include what you already have reconstituted in your fridge. Then add some protocols, and everything else falls into place!'
    },
    {
      icon: '📊',
      title: 'Detailed Inventory Stats',
      description: 'Track everything about your peptides! The app keeps detailed stats: vendor, purity, dates, even COAs to upload. Same peptide from multiple vendors? It tracks exactly how much you have from each!'
    },
    {
      icon: '🔗',
      title: 'Precision Inventory',
      description: 'When you use the recon calculator or schedule protocols, pull directly from your stockpile. Everything syncs automatically - grab peptide A from vendor Z, and your inventory stays precise!'
    },
    {
      icon: '⭐',
      title: 'Your Favorite Vendors',
      description: 'Vendors are always changing, but it\'s nice to have a spot for them - especially your favorites! Keep all your trusted sources organized in one place.'
    },
    {
      icon: '🚫',
      title: 'Stop Over-Ordering',
      description: 'Get notified when peptides run low! Track all order details and vendors in one place. View any vendor to see all orders you\'ve placed with them. No more over-ordering!'
    },
    {
      icon: '💉',
      title: 'Delivery Methods',
      description: 'Using pens? The app tracks pen colors and types! Manage different delivery methods alongside your vials for complete research tracking.'
    },
    {
      icon: '🔄',
      title: 'Washout Reminders',
      description: 'Taking breaks between cycles? Set washout reminders to notify you when it\'s time to restart. Perfect for protocols requiring rest periods between cycles.'
    },
    {
      icon: '💊',
      title: 'Supplement Tracking',
      description: 'Track your complete supplement stack! The app manages your supplements alongside peptides, with schedules, adherence tracking, and reminders for your entire routine.'
    },
    {
      icon: '💉',
      title: 'Injection Site Rotation',
      description: 'Track your injection sites and history for proper rotation. The app helps you avoid overusing the same spots and maintain healthy injection practices.'
    },
    {
      icon: '⏳',
      title: 'Expiration Tracking',
      description: 'Monitor peptide expiration dates - both before and after reconstitution! Get notified before vials expire so nothing goes to waste.'
    },
    {
      icon: '📈',
      title: 'Dose Titration',
      description: 'Adjust and track dose changes over time as you dial in your protocols. Perfect for finding your optimal dosing schedule.'
    },
    {
      icon: '📜',
      title: 'Protocol History',
      description: 'View your past protocols to see what worked! Replicate successful cycles and learn from your research history.'
    },
    {
      icon: '💾',
      title: 'Data Export',
      description: 'Backup your complete research data for safekeeping. Export everything to keep your records secure outside the app.'
    },
    {
      icon: '🎨',
      title: 'Dark Mode',
      description: 'Switch between light and dark themes for comfortable viewing any time of day. Easy on the eyes during late-night research sessions!'
    },
    {
      icon: '🔍',
      title: 'Search & Filter',
      description: 'Quickly find specific peptides, vendors, or protocols in your stockpile. No more scrolling through long lists!'
    },
    {
      icon: '📸',
      title: 'COA Uploads',
      description: 'Attach Certificate of Analysis documents directly to your vials for easy reference. Keep all your quality verification in one place!'
    }
  ];

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setCurrentTipIndex((prev) => (prev + 1) % tips.length);
        setFadeIn(true);
      }, 300);
    }, 20000); // Rotate every 20 seconds

    return () => clearInterval(interval);
  }, [isPaused, tips.length]);

  const handlePrevious = () => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentTipIndex((prev) => (prev - 1 + tips.length) % tips.length);
      setFadeIn(true);
    }, 300);
  };

  const handleNext = () => {
    setFadeIn(false);
    setTimeout(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
      setFadeIn(true);
    }, 300);
  };

  const currentTip = tips[currentTipIndex];

  return (
    <div 
      className="h-full flex flex-col"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div 
        className={`px-4 py-2 ${theme.isDark ? '' : 'border-b'}`} 
        style={{ borderColor: theme.isDark ? 'transparent' : theme.border }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: theme.text }}>
            Helpful Tips
            <Lightbulb size={16} style={{ color: theme.primary }} />
          </h3>
          <div className="flex items-center gap-2">
            <ExpandableTooltip content={WIDGET_TOOLTIPS.tips} theme={theme} />
          </div>
        </div>
      </div>
      
      <div className="flex-1 flex items-center p-3 gap-2">
        {/* Left Navigation Arrow */}
        <button
          onClick={handlePrevious}
          className="p-1.5 rounded transition-all duration-200 hover:scale-110 flex-shrink-0"
          style={{ 
            backgroundColor: `${theme.primary}15`,
            color: theme.text
          }}
          aria-label="Previous tip"
        >
          <ChevronLeft size={16} />
        </button>

        {/* Tip Content - Two Column Layout */}
        <div 
          className="flex-1 flex items-center gap-3 transition-opacity duration-300"
          style={{ 
            opacity: fadeIn ? 1 : 0,
            flexDirection: currentTipIndex % 2 === 0 ? 'row' : 'row-reverse'
          }}
        >
          {/* Left/Right Side - Icon and Title */}
          <div className="flex flex-col items-center justify-center space-y-1 flex-shrink-0" style={{ width: '80px' }}>
            <div 
              className="text-3xl"
              role="img"
              aria-label={currentTip.title}
            >
              {currentTip.icon}
            </div>
            <h4 
              className="text-xs font-bold text-center leading-tight"
              style={{ color: theme.text }}
            >
              {currentTip.title}
            </h4>
          </div>
          
          {/* Right/Left Side - Description */}
          <div className="flex-1 flex items-center justify-center">
            <p 
              className="text-sm leading-relaxed text-center"
              style={{ 
                color: theme.textLight,
                hyphens: 'none',
                wordBreak: 'normal',
                overflowWrap: 'break-word'
              }}
            >
              {currentTip.description}
            </p>
          </div>
        </div>

        {/* Right Navigation Arrow */}
        <button
          onClick={handleNext}
          className="p-1.5 rounded transition-all duration-200 hover:scale-110 flex-shrink-0"
          style={{ 
            backgroundColor: `${theme.primary}15`,
            color: theme.text
          }}
          aria-label="Next tip"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default TipsWidget;

