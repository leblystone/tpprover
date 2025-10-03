import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Trophy, Search, Filter, TrendingUp, Star, Award, Target, Clock, BarChart3 } from 'lucide-react';
import ViewContainer from '../components/ui/ViewContainer';
import { useBadgeStats } from '../utils/badges';
import BadgeCard from '../components/badges/BadgeCard';
import BadgeProgressWidget from '../components/badges/BadgeProgressWidget';
import AchievementTimeline from '../components/badges/AchievementTimeline';
import '../styles/badges.css';

export default function Badges() {
  const { theme } = useOutletContext();
  const { allBadges, earnedBadges, totalBadges, earnedCount, progressPercentage, stats } = useBadgeStats();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const earnedBadgeNames = new Set(earnedBadges.map(b => b.name));

  // Get unique categories
  const categories = useMemo(() => {
    const cats = ['All', ...new Set(allBadges.map(b => b.category || 'General'))];
    return cats;
  }, [allBadges]);

  // Filter badges based on search and category
  const filteredBadges = useMemo(() => {
    return allBadges.filter(badge => {
      const matchesSearch = badge.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           badge.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || badge.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [allBadges, searchTerm, selectedCategory]);

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
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-3 space-y-8">
        {/* Hero Section */}
        <div className="badge-hero-section relative overflow-hidden rounded-2xl p-8" style={{ 
          background: `linear-gradient(135deg, ${theme.primary}15, ${theme.accent}15)`,
          border: `1px solid ${theme.border}`
        }}>
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-full" style={{ backgroundColor: theme.primary }}>
                <Trophy className="w-8 h-8" style={{ color: theme.white }} />
              </div>
              <div>
                <h1 className="text-3xl font-bold" style={{ color: theme.primaryDark }}>
                  Achievement Gallery
                </h1>
                <p className="text-lg opacity-80" style={{ color: theme.text }}>
                  Track your progress and unlock new milestones
                </p>
              </div>
            </div>
            
            {/* Progress Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 rounded-xl" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}>
                <div className="text-3xl font-bold mb-2" style={{ color: theme.primary }}>
                  {earnedCount}/{totalBadges}
                </div>
                <div className="text-sm opacity-80" style={{ color: theme.text }}>
                  Badges Earned
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div 
                    className="h-2 rounded-full transition-all duration-500" 
                    style={{ 
                      backgroundColor: theme.primary, 
                      width: `${progressPercentage}%` 
                    }}
                  />
                </div>
              </div>
              
              <div className="text-center p-4 rounded-xl" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}>
                <div className="text-3xl font-bold mb-2" style={{ color: theme.accent }}>
                  {progressPercentage}%
                </div>
                <div className="text-sm opacity-80" style={{ color: theme.text }}>
                  Completion Rate
                </div>
                <div className="flex justify-center mt-3">
                  <Star className="w-5 h-5" style={{ color: theme.accent }} />
                </div>
              </div>
              
              <div className="text-center p-4 rounded-xl" style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}>
                <div className="text-3xl font-bold mb-2" style={{ color: theme.primaryDark }}>
                  {categories.length - 1}
                </div>
                <div className="text-sm opacity-80" style={{ color: theme.text }}>
                  Categories
                </div>
                <div className="flex justify-center mt-3">
                  <Award className="w-5 h-5" style={{ color: theme.primaryDark }} />
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
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Clock className="w-5 h-5" style={{ color: theme.primary }} />
              <h2 className="text-xl font-bold" style={{ color: theme.primaryDark }}>
                Recently Earned
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recentBadges.map(badge => (
                <div key={badge.name} className="p-4 rounded-xl border-2 animate-pulse" style={{ 
                  backgroundColor: theme.cardBackground, 
                  borderColor: theme.primary,
                  animation: 'none'
                }}>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12">
                      <BadgeCard badge={badge} isEarned={true} theme={theme} stats={stats} />
                    </div>
                    <div>
                      <h3 className="font-bold" style={{ color: theme.primaryDark }}>
                        {badge.name}
                      </h3>
                      <p className="text-sm opacity-80" style={{ color: theme.text }}>
                        {badge.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search and Filter */}
        <div className="search-filter-container flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 opacity-50" style={{ color: theme.text }} />
            <input
              type="text"
              placeholder="Search badges..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border"
              style={{ 
                backgroundColor: theme.cardBackground, 
                borderColor: theme.border, 
                color: theme.text 
              }}
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 opacity-50" style={{ color: theme.text }} />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="pl-10 pr-8 py-3 rounded-lg border appearance-none bg-no-repeat bg-right"
              style={{ 
                backgroundColor: theme.cardBackground, 
                borderColor: theme.border, 
                color: theme.text,
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundSize: '1.5em 1.5em'
              }}
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        </div>

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
        <div className="lg:col-span-1 space-y-6">
          {/* Progress Widget */}
          <div className="progress-widget p-6 rounded-xl" style={{ 
            backgroundColor: theme.cardBackground,
            border: `1px solid ${theme.border}`
          }}>
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="w-5 h-5" style={{ color: theme.primary }} />
              <h3 className="font-bold" style={{ color: theme.primaryDark }}>
                Progress Overview
              </h3>
            </div>
            <BadgeProgressWidget 
              stats={{ earnedCount, totalBadges, progressPercentage }} 
              theme={theme} 
            />
          </div>

          {/* Achievement Timeline */}
          <div className="p-6 rounded-xl" style={{ 
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
