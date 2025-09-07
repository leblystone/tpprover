import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ViewContainer from '../components/ui/ViewContainer';
import { useBadgeStats } from '../utils/badges';
import BadgeCard from '../components/badges/BadgeCard';

export default function Badges() {
  const { theme } = useOutletContext();
  const { allBadges, earnedBadges } = useBadgeStats();

  const earnedBadgeNames = new Set(earnedBadges.map(b => b.name));

  const groupedBadges = allBadges.reduce((acc, badge) => {
    const category = badge.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(badge);
    return acc;
  }, {});

  return (
    <ViewContainer theme={theme} title="Badges & Achievements">
      <div className="space-y-8">
        {Object.entries(groupedBadges).map(([category, badges]) => (
          <div key={category}>
            <h2 className="text-2xl font-bold mb-4" style={{ color: theme.primaryDark }}>{category}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {badges.map(badge => (
                <BadgeCard
                  key={badge.name}
                  badge={badge}
                  isEarned={earnedBadgeNames.has(badge.name)}
                  theme={theme}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </ViewContainer>
  );
}
