import React, { useState, useEffect } from 'react';
import { Lightbulb, ChevronLeft, ChevronRight } from 'lucide-react';

const TipsWidget = ({ widget, theme }) => {
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);

  const tips = [
    {
      icon: '📋',
      title: 'Task Syncing',
      description: 'Tasks automatically sync across all your devices. Complete a protocol on your phone, see it update on desktop instantly!'
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
      description: 'Never miss a dose! Get notifications for morning, afternoon, and evening research protocols.'
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
      title: 'Flexible Scheduling',
      description: 'Create custom time slots for protocols. Set specific times or use our default morning/afternoon/evening slots.'
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
        className={`px-4 py-3 ${theme.isDark ? '' : 'border-b'}`} 
        style={{ borderColor: theme.isDark ? 'transparent' : theme.border }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
            Tips & Features
          </h3>
          <Lightbulb size={18} style={{ color: theme.primary }} />
        </div>
      </div>
      
      <div className="flex-1 flex flex-col p-4">
        {/* Tip Content */}
        <div 
          className="flex-1 flex flex-col justify-center items-center text-center space-y-3 transition-opacity duration-300"
          style={{ opacity: fadeIn ? 1 : 0 }}
        >
          <div 
            className="text-4xl mb-2"
            role="img"
            aria-label={currentTip.title}
          >
            {currentTip.icon}
          </div>
          
          <h4 
            className="text-base font-bold"
            style={{ color: theme.text }}
          >
            {currentTip.title}
          </h4>
          
          <p 
            className="text-sm leading-relaxed"
            style={{ color: theme.textLight }}
          >
            {currentTip.description}
          </p>
        </div>

        {/* Navigation Controls */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t" style={{ borderColor: theme.border }}>
          <button
            onClick={handlePrevious}
            className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
            style={{ 
              backgroundColor: `${theme.primary}15`,
              color: theme.text
            }}
            aria-label="Previous tip"
          >
            <ChevronLeft size={16} />
          </button>

          <div className="flex items-center gap-1">
            {tips.map((_, index) => (
              <div
                key={index}
                className="rounded-full transition-all duration-300"
                style={{
                  width: index === currentTipIndex ? '20px' : '6px',
                  height: '6px',
                  backgroundColor: index === currentTipIndex ? theme.primary : `${theme.primary}30`
                }}
              />
            ))}
          </div>

          <button
            onClick={handleNext}
            className="p-2 rounded-lg transition-all duration-200 hover:scale-110"
            style={{ 
              backgroundColor: `${theme.primary}15`,
              color: theme.text
            }}
            aria-label="Next tip"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Auto-rotate indicator */}
        <div className="text-center mt-2">
          <span className="text-xs" style={{ color: theme.textLight, opacity: 0.6 }}>
            {isPaused ? '⏸️ Paused' : '🔄 Auto-rotating'}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TipsWidget;

