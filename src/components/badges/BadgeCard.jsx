import React from 'react';
import BadgeImage from './BadgeImage';

export default function BadgeCard({ badge, isEarned, theme }) {
  const cardStyle = {
    backgroundColor: theme.cardBackground,
    borderColor: isEarned ? theme.primary : theme.border,
    color: theme.text,
    opacity: isEarned ? 1 : 0.5,
  };

  return (
    <div 
      className={`p-4 rounded-lg border shadow-sm transition-all duration-300 ${isEarned ? 'transform hover:scale-105' : ''}`}
      style={cardStyle}
    >
      <div className="flex items-center gap-4">
        <div className="w-16 h-16">
          <BadgeImage name={badge.name} isEarned={isEarned} theme={theme} caption={false} />
        </div>
        <div>
          <h3 className={`font-bold text-lg ${isEarned ? '' : 'text-gray-500'}`} style={{ color: isEarned ? theme.primaryDark : theme.text }}>
            {badge.name}
          </h3>
          <p className="text-sm">{badge.description}</p>
        </div>
      </div>
    </div>
  );
}
