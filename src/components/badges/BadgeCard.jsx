import React, { useState } from 'react';
import { CheckCircle, Lock, TrendingUp, Star } from 'lucide-react';
import BadgeImage from './BadgeImage';

export default function BadgeCard({ badge, isEarned, theme, showProgress = true, className = '', stats = {} }) {
  const [isHovered, setIsHovered] = useState(false);
  
  const cardStyle = {
    backgroundColor: theme.cardBackground,
    color: theme.text,
    opacity: isEarned ? 1 : 0.7,
    transform: isHovered && isEarned ? 'translateY(-1px)' : 'translateY(0)',
    boxShadow: isEarned 
      ? isHovered 
        ? `0 4px 12px ${theme.primary}20` 
        : `0 2px 8px ${theme.primary}15`
      : '0 2px 6px rgba(0,0,0,0.1)',
  };

  const progress = badge.progress ? badge.progress(stats) : 0;
  const progressPercentage = Math.min(Math.round(progress * 100), 100);

  return (
    <div 
      className={`p-3 md:p-4 rounded-lg transition-all duration-300 cursor-pointer relative overflow-hidden ${
        isEarned ? 'badge-card-earned' : ''
      } ${className}`}
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status indicator */}
      <div className="absolute top-2 right-2">
        {isEarned ? (
          <CheckCircle className="w-4 h-4" style={{ color: theme.primary }} />
        ) : (
          <Lock className="w-4 h-4 opacity-50" style={{ color: theme.text }} />
        )}
      </div>

      {/* Badge image and content */}
      <div className="flex flex-col items-center text-center space-y-2 md:space-y-3">
        <div className="relative">
          <div className="w-12 h-12 md:w-14 md:h-14">
            <BadgeImage name={badge.name} isEarned={isEarned} theme={theme} caption={false} size={48} />
          </div>
        </div>

        <div className="space-y-1 md:space-y-1.5">
          <h3 className={`font-bold text-sm md:text-base leading-tight line-clamp-2 ${
            isEarned ? '' : 'opacity-60'
          }`} style={{ color: isEarned ? theme.primaryDark : theme.text }}>
            {badge.name}
          </h3>
          <p className="text-xs md:text-sm leading-relaxed opacity-80 line-clamp-2" style={{ color: theme.text }}>
            {badge.description}
          </p>
        </div>

        {/* Progress bar for unearned badges */}
        {!isEarned && showProgress && progress > 0 && (
          <div className="w-full space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1" style={{ color: theme.accent }}>
                <TrendingUp className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">Progress</span>
              </span>
              <span className="font-medium" style={{ color: theme.accent }}>
                {progressPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div 
                className="h-1.5 rounded-full transition-all duration-500 badge-progress-bar" 
                style={{ 
                  backgroundColor: theme.accent, 
                  width: `${progressPercentage}%`,
                  '--progress-width': `${progressPercentage}%`
                }}
              />
            </div>
          </div>
        )}

        {/* Earned badge celebration */}
        {isEarned && (
          <div className="flex items-center gap-1 text-xs font-medium" style={{ color: theme.primary }}>
            <Star className="w-2.5 h-2.5" />
            <span>Earned!</span>
          </div>
        )}
      </div>

      {/* Hover effect overlay */}
      {isEarned && isHovered && (
        <div 
          className="absolute inset-0 rounded-xl opacity-10 pointer-events-none"
          style={{ 
            background: `linear-gradient(135deg, ${theme.primary}20, ${theme.accent}20)` 
          }}
        />
      )}
    </div>
  );
}
