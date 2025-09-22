import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBadgeStats } from '../../../utils/badges';

const BadgesWidget = ({ widget, theme }) => {
  const navigate = useNavigate();
  const { totalBadges, earnedCount, progressPercentage } = useBadgeStats();
  const { showProgress = true } = widget.settings;

  return (
    <div className="p-6 h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: theme.text }}>
            Your Badges
          </h2>
          <p className="text-sm text-gray-500">
            You've earned {earnedCount} of {totalBadges} badges.
          </p>
        </div>
        <button 
          onClick={() => navigate('/badges')}
          className="px-4 py-2 rounded-md text-sm font-semibold" 
          style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
        >
          View Badges
        </button>
      </div>
      
      {showProgress && (
        <div className="mt-4">
          <div className="h-2 w-full bg-gray-200 rounded-full">
            <div 
              className="h-2 rounded-full transition-all duration-300" 
              style={{ 
                width: `${progressPercentage}%`, 
                backgroundColor: theme.primary 
              }}
            />
          </div>
          <div className="flex justify-between text-sm mt-2" style={{ color: theme.textLight }}>
            <span>{earnedCount} earned</span>
            <span>{progressPercentage}% complete</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default BadgesWidget;
