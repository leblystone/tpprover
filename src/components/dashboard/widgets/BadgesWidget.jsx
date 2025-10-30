import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, Trophy } from 'lucide-react';
import { useBadgeStats } from '../../../utils/badges';

const BadgesWidget = ({ widget, theme }) => {
  const navigate = useNavigate();
  const { totalBadges, earnedCount, progressPercentage } = useBadgeStats();
  const { showProgress = true } = widget.settings;

  return (
    <div className="h-full flex flex-col widget-card-hover">
      {/* Header */}
      <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
            Badges
          </h3>
          <Award size={20} style={{ color: theme.primary }} className="icon-hover" />
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 p-4 flex flex-col">
        <div className="flex-1 flex flex-col justify-center items-center">
          <div className="text-center mb-3">
            <div className="flex items-center justify-center mb-2">
              <Trophy size={32} style={{ color: theme.isDark ? '#f07268' : theme.primary }} className="icon-hover" />
            </div>
            <div className="text-2xl font-bold" style={{ color: theme.text }}>
              {earnedCount}/{totalBadges}
            </div>
            <div className="text-xs" style={{ color: theme.textLight }}>
              badges earned
            </div>
          </div>
          
          {showProgress && (
            <div className="w-full">
              <div className="h-2 w-full bg-gray-200 rounded-full mb-2">
                <div 
                  className="h-2 rounded-full transition-all duration-300" 
                  style={{ 
                    width: `${progressPercentage}%`, 
                    backgroundColor: theme.isDark ? '#f07268' : theme.primary 
                  }}
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Bottom aligned button */}
        {showProgress && (
          <div className="text-center mt-auto">
            <button 
              onClick={() => navigate('/app/badges')}
              className="text-xs px-3 py-1 rounded-full border transition-all hover:opacity-80" 
              style={{ borderColor: theme.primary, color: theme.primary }}
            >
              View All
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BadgesWidget;
