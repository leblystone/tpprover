import React, { useState, useEffect } from 'react';
import { HelpCircle } from 'lucide-react';
import ModernTooltip from '../ui/ModernTooltip';

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};

export default function CalendarHeader({ currentDate, weekStart, onPrev, onNext, onToday, viewMode, onChangeView, onShowIconKey, theme }) {
  const [timeOfDay, setTimeOfDay] = useState(getTimeOfDay());
  
  // Update time of day every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeOfDay(getTimeOfDay());
    }, 60000); // Update every minute
    return () => clearInterval(interval);
  }, []);

  const today = new Date();
  const isToday = currentDate.toDateString() === today.toDateString();
  
  // Format for modern clock display
  const dayName = currentDate.toLocaleString('default', { weekday: 'long' }).toUpperCase();
  const dayNumber = currentDate.getDate();
  const monthAbbr = currentDate.toLocaleString('default', { month: 'short' }).toUpperCase();
  
  return (
    <div className="flex flex-col items-center mb-4 gap-3">
      {/* Modern Clock-Style Date Display */}
      <div 
        className="flex flex-col items-center justify-center py-4 px-8 rounded-2xl shadow-lg w-full max-w-xs"
        style={{ 
          background: isToday 
            ? `linear-gradient(135deg, ${theme.primary}, ${theme.primaryDark || theme.primary})`
            : theme.isDark ? '#1f2937' : theme.cardBackground,
          border: !isToday ? `1px solid ${theme.border}` : 'none'
        }}
      >
        {/* Day Name */}
        <div 
          className="text-2xl font-bold tracking-wider"
          style={{ 
            color: isToday ? theme.textOnPrimary : theme.isDark ? theme.text : theme.primaryDark
          }}
        >
          {dayName}
        </div>
        
        {/* Time of Day */}
        <div 
          className="text-xs font-medium tracking-wide mt-1"
          style={{ 
            color: isToday ? theme.textOnPrimary : theme.textLight,
            opacity: 0.8
          }}
        >
          {isToday ? timeOfDay : '\u00A0'}
        </div>
        
        {/* Date Display */}
        <div 
          className="text-3xl font-bold mt-2 tracking-tight"
          style={{ 
            color: isToday ? theme.textOnPrimary : theme.isDark ? theme.text : theme.primaryDark
          }}
        >
          {dayNumber} <span className="opacity-50">|</span> {monthAbbr}
        </div>
      </div>

      {/* View Controls */}
      <div className="flex items-center justify-center gap-3 w-full">
        {/* Today Button */}
        <button 
          onClick={onToday} 
          className="px-4 py-2 rounded-lg text-sm font-semibold transition-all text-white shadow-md hover:shadow-lg" 
          style={{ 
            background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          Today
        </button>

        {/* View Mode Toggles */}
        <div className="inline-flex rounded-lg p-1 shadow-md" style={{ backgroundColor: theme.isDark ? '#1f2937' : theme.secondary }}>
          <button 
            onClick={() => onChangeView('month')} 
            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${viewMode === 'month' ? 'shadow-sm' : 'hover:bg-opacity-20'}`} 
            style={viewMode === 'month' ? { backgroundColor: theme.primary, color: theme.textOnPrimary } : { color: theme.isDark ? theme.textLight : '#374151' }}
          >
            Month
          </button>
          <button 
            onClick={() => onChangeView('week')} 
            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${viewMode === 'week' ? 'shadow-sm' : 'hover:bg-opacity-20'}`} 
            style={viewMode === 'week' ? { backgroundColor: theme.primary, color: theme.textOnPrimary } : { color: theme.isDark ? theme.textLight : '#374151' }}
          >
            Week
          </button>
        </div>

        {/* Icon Key Button */}
        {viewMode === 'month' && onShowIconKey && (
          <ModernTooltip text="Icon guide" position="bottom">
            <button onClick={onShowIconKey} className="p-2 rounded-full transition-all" style={{ color: theme.isDark ? '#a8b5a0' : theme.primaryDark }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <HelpCircle className="h-5 w-5" />
            </button>
          </ModernTooltip>
        )}
      </div>
    </div>
  )
}


