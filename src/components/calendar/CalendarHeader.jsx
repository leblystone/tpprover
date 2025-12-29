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
    <div className="flex flex-col items-center mb-4">
      {/* Modern Clock-Style Date Display - No Card Wrap */}
      <div className="flex flex-col items-center justify-center py-2 w-full">
        {/* Day Name */}
        <div 
          className="text-2xl font-bold tracking-wider"
          style={{ 
            color: theme.isDark ? theme.text : theme.primaryDark
          }}
        >
          {dayName}
        </div>
        
        {/* Time of Day */}
        <div 
          className="text-[10px] font-medium tracking-wide uppercase"
          style={{ 
            color: theme.textLight,
            opacity: 0.7
          }}
        >
          {isToday ? timeOfDay : '\u00A0'}
        </div>
        
        {/* Date Display */}
        <div 
          className="text-3xl font-bold mt-1 tracking-tight"
          style={{ 
            color: theme.isDark ? theme.text : theme.primaryDark
          }}
        >
          {dayNumber} <span className="opacity-30">|</span> {monthAbbr}
        </div>
      </div>

      {/* View Controls - All Together */}
      <div className="flex items-center justify-center gap-2 mt-2 w-full">
        <div className="inline-flex rounded-xl p-1 shadow-sm border" style={{ backgroundColor: theme.isDark ? '#1f2937' : theme.secondary, borderColor: theme.border }}>
          <button 
            onClick={onToday} 
            className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${isToday ? 'shadow-sm' : 'hover:bg-opacity-20'}`}
            style={isToday ? { backgroundColor: theme.primary, color: theme.textOnPrimary } : { color: theme.isDark ? theme.textLight : '#374151' }}
          >
            Today
          </button>
          <div className="w-[1px] my-1 mx-0.5 opacity-20" style={{ backgroundColor: theme.textLight }}></div>
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
            <button onClick={onShowIconKey} className="p-2 rounded-full transition-all border" style={{ borderColor: theme.border, color: theme.isDark ? '#a8b5a0' : theme.primaryDark }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <HelpCircle className="h-5 w-5" />
            </button>
          </ModernTooltip>
        )}
      </div>
    </div>
  )
}


