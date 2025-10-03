import React from 'react';
import { Calendar, Trophy, Star, Clock } from 'lucide-react';

export default function AchievementTimeline({ earnedBadges, theme }) {
  // Sort badges by when they were likely earned (this is a simplified approach)
  // In a real app, you'd track the actual earning date
  const sortedBadges = [...earnedBadges].reverse().slice(0, 5);

  if (sortedBadges.length === 0) {
    return (
      <div className="text-center py-8">
        <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" style={{ color: theme.text }} />
        <h3 className="text-lg font-bold mb-2" style={{ color: theme.text }}>
          No achievements yet
        </h3>
        <p className="text-sm opacity-80" style={{ color: theme.text }}>
          Start using the app to earn your first badge!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-6">
        <Calendar className="w-5 h-5" style={{ color: theme.primary }} />
        <h3 className="text-lg font-bold" style={{ color: theme.primaryDark }}>
          Achievement Timeline
        </h3>
      </div>
      
      <div className="relative">
        {/* Timeline line */}
        <div 
          className="absolute left-6 top-0 bottom-0 w-0.5"
          style={{ backgroundColor: theme.border }}
        />
        
        {sortedBadges.map((badge, index) => (
          <div key={badge.name} className="timeline-item relative flex items-start gap-4 pb-6">
            {/* Timeline dot */}
            <div 
              className="relative z-10 w-12 h-12 rounded-full flex items-center justify-center border-2"
              style={{ 
                backgroundColor: theme.cardBackground,
                borderColor: theme.primary
              }}
            >
              <Trophy className="w-5 h-5" style={{ color: theme.primary }} />
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="p-4 rounded-lg" style={{ 
                backgroundColor: theme.cardBackground,
                border: `1px solid ${theme.border}`
              }}>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-sm" style={{ color: theme.primaryDark }}>
                    {badge.name}
                  </h4>
                  <div className="flex items-center gap-1 text-xs" style={{ color: theme.accent }}>
                    <Star className="w-3 h-3" />
                    <span>Earned</span>
                  </div>
                </div>
                <p className="text-xs opacity-80" style={{ color: theme.text }}>
                  {badge.description}
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs opacity-60" style={{ color: theme.text }}>
                  <Clock className="w-3 h-3" />
                  <span>Recently earned</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
