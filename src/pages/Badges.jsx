import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Trophy, TrendingUp, Star, Award, Target, Clock, BarChart3 } from 'lucide-react';
import ViewContainer from '../components/ui/ViewContainer';
import { useBadgeStats } from '../utils/badges';
import BadgeCard from '../components/badges/BadgeCard';
import BadgeImage from '../components/badges/BadgeImage';
import BadgeProgressWidget from '../components/badges/BadgeProgressWidget';
import AchievementTimeline from '../components/badges/AchievementTimeline';
import '../styles/badges.css';

export default function Badges() {
  const { theme } = useOutletContext();
  const { allBadges, earnedBadges, totalBadges, earnedCount, progressPercentage, stats } = useBadgeStats();

  const earnedBadgeNames = new Set(earnedBadges.map(b => b.name));

  // Get unique categories
  const categories = useMemo(() => {
    const cats = ['All', ...new Set(allBadges.map(b => b.category || 'General'))];
    return cats;
  }, [allBadges]);

  // Use all badges (no filtering)
  const filteredBadges = allBadges;

  // Group filtered badges
  const groupedBadges = useMemo(() => {
    return filteredBadges.reduce((acc, badge) => {
    const category = badge.category || 'General';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(badge);
    return acc;
  }, {});
  }, [filteredBadges]);

  // Get recent badges (last 3 earned)
  const recentBadges = useMemo(() => {
    return earnedBadges.slice(-3).reverse();
  }, [earnedBadges]);

  // Calculate category progress
  const categoryProgress = useMemo(() => {
    const progress = {};
    Object.keys(groupedBadges).forEach(category => {
      const categoryBadges = groupedBadges[category];
      const earnedInCategory = categoryBadges.filter(b => earnedBadgeNames.has(b.name)).length;
      progress[category] = {
        earned: earnedInCategory,
        total: categoryBadges.length,
        percentage: Math.round((earnedInCategory / categoryBadges.length) * 100)
      };
    });
    return progress;
  }, [groupedBadges, earnedBadgeNames]);

  return (
    <ViewContainer theme={theme} title="Badges & Achievements">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-8">
        {/* Main Content */}
        <div className="md:col-span-2 lg:col-span-3 space-y-3 md:space-y-8">
        {/* Hero Section */}
        <div className="badge-hero-section relative overflow-hidden rounded-2xl p-3 md:p-8" style={{ 
          background: `linear-gradient(135deg, ${theme.primary}15, ${theme.accent}15)`,
          border: `1px solid ${theme.border}`
        }}>
          <div className="relative z-10">
            <div className="flex items-center gap-2 md:gap-4 mb-3 md:mb-6">
              <div className="p-1.5 md:p-3 rounded-full" style={{ backgroundColor: theme.primary }}>
                <Trophy className="w-5 h-5 md:w-8 md:h-8" style={{ color: theme.white }} />
              </div>
              <div>
                <h1 className="text-lg md:text-3xl font-bold" style={{ color: theme.primaryDark }}>
                  Achievement Gallery
                </h1>
                <p className="text-xs md:text-lg opacity-80" style={{ color: theme.text }}>
                  Track your progress and unlock new milestones
                </p>
              </div>
            </div>
            
            {/* Progress Overview */}
            <div className="grid grid-cols-3 md:grid-cols-3 gap-2 md:gap-6 mb-4 md:mb-6">
              <div className="text-center p-2 md:p-4 rounded-xl" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}>
                <div className="text-xl md:text-3xl font-bold mb-1 md:mb-2" style={{ color: theme.primary }}>
                  {earnedCount}/{totalBadges}
                </div>
                <div className="text-xs md:text-sm opacity-80" style={{ color: theme.text }}>
                  Badges Earned
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1.5 md:h-2 mt-2 md:mt-3">
                  <div 
                    className="h-1.5 md:h-2 rounded-full transition-all duration-500" 
                    style={{ 
                      backgroundColor: theme.primary, 
                      width: `${progressPercentage}%` 
                    }}
                  />
                </div>
              </div>
              
              <div className="text-center p-2 md:p-4 rounded-xl" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}>
                <div className="text-xl md:text-3xl font-bold mb-1 md:mb-2" style={{ color: theme.accent }}>
                  {progressPercentage}%
                </div>
                <div className="text-xs md:text-sm opacity-80" style={{ color: theme.text }}>
                  Completion Rate
                </div>
                <div className="flex justify-center mt-2 md:mt-3">
                  <Star className="w-4 h-4 md:w-5 md:h-5" style={{ color: theme.accent }} />
                </div>
              </div>
              
              <div className="text-center p-2 md:p-4 rounded-xl" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}>
                <div className="text-xl md:text-3xl font-bold mb-1 md:mb-2" style={{ color: theme.primaryDark }}>
                  {categories.length - 1}
                </div>
                <div className="text-xs md:text-sm opacity-80" style={{ color: theme.text }}>
                  Categories
                </div>
                <div className="flex justify-center mt-2 md:mt-3">
                  <Award className="w-4 h-4 md:w-5 md:h-5" style={{ color: theme.primaryDark }} />
                </div>
              </div>
            </div>
          </div>
          
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 opacity-10">
            <div className="w-full h-full rounded-full" style={{ 
              background: `radial-gradient(circle, ${theme.primary}40, transparent 70%)` 
            }} />
          </div>
        </div>

        {/* Recent Badges */}
        {recentBadges.length > 0 && (
          <div className="mb-4 md:mb-8">
            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-6">
              <Clock className="w-4 h-4 md:w-5 md:h-5" style={{ color: theme.primary }} />
              <h2 className="text-lg md:text-xl font-bold" style={{ color: theme.primaryDark }}>
                Recently Earned
              </h2>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 gap-1.5 md:gap-3">
              {recentBadges.map(badge => (
                <div key={badge.name} className="p-1.5 md:p-3 rounded-md border recently-earned-badge" style={{ 
                  backgroundColor: theme.cardBackground, 
                  borderColor: theme.primary
                }}>
                  <div className="flex flex-col items-center text-center space-y-1 md:space-y-2">
                    <div className="w-8 h-8 md:w-12 md:h-12 flex-shrink-0">
                      <BadgeImage 
                        name={badge.name} 
                        isEarned={true} 
                        theme={theme} 
                        caption={false} 
                        size={32} 
                      />
                    </div>
                    <div className="space-y-0.5 md:space-y-1 min-h-0">
                      <h3 className="font-bold text-xs md:text-sm leading-tight line-clamp-2" style={{ color: theme.primaryDark }}>
                        {badge.name}
                      </h3>
                      <p className="text-xs opacity-80 leading-relaxed hidden md:block line-clamp-2" style={{ color: theme.text }}>
                        {badge.description}
                      </p>
                      <div className="flex items-center justify-center gap-1 text-xs font-medium" style={{ color: theme.primary }}>
                        <Star className="w-2.5 h-2.5 md:w-3 md:h-3" />
                        <span className="hidden sm:inline">Earned!</span>
                        <span className="sm:hidden">✓</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}


        {/* Badge Categories */}
        {Object.entries(groupedBadges).map(([category, badges], categoryIndex) => {
          const progress = categoryProgress[category];
          return (
            <div key={category} className="category-section">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold" style={{ color: theme.primaryDark }}>
                    {category}
                  </h2>
                  <div className="px-3 py-1 rounded-full text-sm font-medium" style={{ 
                    backgroundColor: theme.primary + '20', 
                    color: theme.primary 
                  }}>
                    {progress.earned}/{progress.total}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" style={{ color: theme.accent }} />
                  <span className="text-sm font-medium" style={{ color: theme.accent }}>
                    {progress.percentage}%
                  </span>
                </div>
              </div>
              
              {/* Category Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-6">
                <div 
                  className="h-2 rounded-full transition-all duration-500" 
                  style={{ 
                    backgroundColor: theme.primary, 
                    width: `${progress.percentage}%` 
                  }}
                />
              </div>
              
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {badges.map((badge, badgeIndex) => (
                <BadgeCard
                  key={badge.name}
                  badge={badge}
                  isEarned={earnedBadgeNames.has(badge.name)}
                  theme={theme}
                    stats={stats}
                    className={`badge-card-stagger-${(badgeIndex % 6) + 1}`}
                />
              ))}
              </div>
            </div>
          );
        })}

        {/* Empty State */}
        {filteredBadges.length === 0 && (
          <div className="text-center py-12">
            <Target className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: theme.text }} />
            <h3 className="text-xl font-bold mb-2" style={{ color: theme.text }}>
              No badges found
            </h3>
            <p className="opacity-80" style={{ color: theme.text }}>
              Try adjusting your search or filter criteria
            </p>
          </div>
        )}
        </div>

        {/* Sidebar */}
        <div className="md:col-span-2 lg:col-span-1 space-y-3 md:space-y-6">
          {/* Progress Widget */}
          <div className="progress-widget p-3 md:p-6 rounded-xl" style={{ 
            backgroundColor: theme.cardBackground,
            border: `1px solid ${theme.border}`
          }}>
            <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
              <BarChart3 className="w-4 h-4 md:w-5 md:h-5" style={{ color: theme.primary }} />
              <h3 className="font-bold text-sm md:text-base" style={{ color: theme.primaryDark }}>
                Progress Overview
              </h3>
            </div>
            <BadgeProgressWidget 
              stats={{ earnedCount, totalBadges, progressPercentage }} 
              theme={theme} 
            />
          </div>

          {/* Achievement Timeline */}
          <div className="p-3 md:p-6 rounded-xl" style={{ 
            backgroundColor: theme.cardBackground,
            border: `1px solid ${theme.border}`
          }}>
            <AchievementTimeline earnedBadges={earnedBadges} theme={theme} />
          </div>
        </div>
      </div>
    </ViewContainer>
  );
}
