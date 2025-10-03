import React, { useState } from 'react';
import { CheckCircle, Lock, TrendingUp, Star } from 'lucide-react';
import BadgeImage from './BadgeImage';

export default function BadgeCard({ badge, isEarned, theme, showProgress = true, className = '', stats = {} }) {
  const [isHovered, setIsHovered] = useState(false);
  
  const cardStyle = {
    backgroundColor: theme.cardBackground,
    borderColor: isEarned ? theme.primary : theme.border,
    color: theme.text,
    opacity: isEarned ? 1 : 0.7,
    transform: isHovered && isEarned ? 'translateY(-2px)' : 'translateY(0)',
    boxShadow: isEarned 
      ? isHovered 
        ? `0 8px 25px ${theme.primary}30` 
        : `0 4px 15px ${theme.primary}20`
      : '0 2px 8px rgba(0,0,0,0.1)',
  };

  const progress = badge.progress ? badge.progress(stats) : 0;
  const progressPercentage = Math.min(Math.round(progress * 100), 100);

  return (
    <div 
      className={`p-5 rounded-xl border-2 transition-all duration-300 cursor-pointer relative overflow-hidden ${
        isEarned ? 'hover:scale-105 badge-card-earned' : ''
      } ${className}`}
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Status indicator */}
      <div className="absolute top-3 right-3">
        {isEarned ? (
          <CheckCircle className="w-5 h-5" style={{ color: theme.primary }} />
        ) : (
          <Lock className="w-5 h-5 opacity-50" style={{ color: theme.text }} />
        )}
      </div>

      {/* Badge image and content */}
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="relative">
          <div className="w-20 h-20">
            <BadgeImage name={badge.name} isEarned={isEarned} theme={theme} caption={false} />
          </div>
          
          {/* Glow effect for earned badges */}
          {isEarned && (
            <div 
              className="absolute inset-0 rounded-full blur-md opacity-30"
              style={{ 
                background: `radial-gradient(circle, ${theme.primary}40, transparent 70%)`,
                transform: 'scale(1.2)'
              }}
            />
          )}
        </div>

        <div className="space-y-2">
          <h3 className={`font-bold text-lg leading-tight ${
            isEarned ? '' : 'opacity-60'
          }`} style={{ color: isEarned ? theme.primaryDark : theme.text }}>
            {badge.name}
          </h3>
          <p className="text-sm leading-relaxed opacity-80" style={{ color: theme.text }}>
            {badge.description}
          </p>
        </div>

        {/* Progress bar for unearned badges */}
        {!isEarned && showProgress && progress > 0 && (
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1" style={{ color: theme.accent }}>
                <TrendingUp className="w-3 h-3" />
                Progress
              </span>
              <span className="font-medium" style={{ color: theme.accent }}>
                {progressPercentage}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="h-2 rounded-full transition-all duration-500 badge-progress-bar" 
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
            <Star className="w-3 h-3" />
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
