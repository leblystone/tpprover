import React from 'react';
import { TrendingUp, Target, Award, Zap } from 'lucide-react';

export default function BadgeProgressWidget({ stats, theme }) {
  const { earnedCount, totalBadges, progressPercentage } = stats;
  
  // Calculate next milestone
  const nextMilestone = Math.ceil(earnedCount / 5) * 5;
  const progressToNext = nextMilestone > totalBadges ? 100 : (earnedCount / nextMilestone) * 100;
  
  // Get achievement level based on progress
  const getAchievementLevel = (percentage) => {
    if (percentage >= 90) return { level: 'Master', color: theme.primary, icon: Award };
    if (percentage >= 70) return { level: 'Expert', color: theme.accent, icon: TrendingUp };
    if (percentage >= 50) return { level: 'Advanced', color: theme.primaryDark, icon: Target };
    if (percentage >= 25) return { level: 'Intermediate', color: theme.accent, icon: Zap };
    return { level: 'Beginner', color: theme.text, icon: Target };
  };
  
  const achievement = getAchievementLevel(progressPercentage);
  const AchievementIcon = achievement.icon;

  return (
    <div className="space-y-6">
      {/* Achievement Level */}
      <div className="text-center p-6 rounded-xl" style={{ 
        background: `linear-gradient(135deg, ${achievement.color}15, ${theme.accent}15)`,
        border: `1px solid ${theme.border}`
      }}>
        <div className="flex justify-center mb-4">
          <div 
            className="p-4 rounded-full"
            style={{ backgroundColor: achievement.color + '20' }}
          >
            <AchievementIcon className="w-8 h-8" style={{ color: achievement.color }} />
          </div>
        </div>
        <h3 className="text-2xl font-bold mb-2" style={{ color: achievement.color }}>
          {achievement.level}
        </h3>
        <p className="text-sm opacity-80" style={{ color: theme.text }}>
          Achievement Level
        </p>
      </div>

      {/* Progress Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="text-center p-4 rounded-lg" style={{ 
          backgroundColor: theme.cardBackground,
          border: `1px solid ${theme.border}`
        }}>
          <div className="text-2xl font-bold mb-1" style={{ color: theme.primary }}>
            {earnedCount}
          </div>
          <div className="text-xs opacity-80" style={{ color: theme.text }}>
            Badges Earned
          </div>
        </div>
        
        <div className="text-center p-4 rounded-lg" style={{ 
          backgroundColor: theme.cardBackground,
          border: `1px solid ${theme.border}`
        }}>
          <div className="text-2xl font-bold mb-1" style={{ color: theme.accent }}>
            {totalBadges - earnedCount}
          </div>
          <div className="text-xs opacity-80" style={{ color: theme.text }}>
            Remaining
          </div>
        </div>
      </div>

      {/* Next Milestone */}
      {nextMilestone <= totalBadges && (
        <div className="p-4 rounded-lg" style={{ 
          backgroundColor: theme.cardBackground,
          border: `1px solid ${theme.border}`
        }}>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-sm" style={{ color: theme.primaryDark }}>
              Next Milestone
            </h4>
            <span className="text-xs font-medium" style={{ color: theme.accent }}>
              {nextMilestone} badges
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
            <div 
              className="h-2 rounded-full transition-all duration-500" 
              style={{ 
                backgroundColor: theme.accent, 
                width: `${progressToNext}%` 
              }}
            />
          </div>
          
          <div className="text-xs opacity-80" style={{ color: theme.text }}>
            {nextMilestone - earnedCount} more badges to go
          </div>
        </div>
      )}

      {/* Motivational Message */}
      <div className="p-4 rounded-lg text-center" style={{ 
        backgroundColor: theme.primary + '10',
        border: `1px solid ${theme.primary}30`
      }}>
        <p className="text-sm font-medium" style={{ color: theme.primaryDark }}>
          {progressPercentage >= 90 
            ? "🏆 You're a badge master! Incredible dedication!"
            : progressPercentage >= 70
            ? "🔥 Almost there! You're doing amazing!"
            : progressPercentage >= 50
            ? "💪 Great progress! Keep up the momentum!"
            : progressPercentage >= 25
            ? "⭐ You're on the right track! Keep going!"
            : "🚀 Every journey begins with a single step!"
          }
        </p>
      </div>
    </div>
  );
}
