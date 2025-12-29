import React, { useState, useEffect } from 'react';
import { HelpCircle, ChevronLeft, ChevronRight } from 'lucide-react';
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
    <div className="flex flex-col items-center mb-3">
      {/* Modern Clock-Style Date Display with Navigation Arrows */}
      <div className="flex items-center gap-3 w-full max-w-md justify-center">
        {/* Previous Button */}
        <button
          onClick={onPrev}
          className="p-2 rounded-lg transition-all hover:scale-110 active:scale-95"
          style={{ 
            color: theme.isDark ? theme.textLight : theme.primaryDark,
            backgroundColor: theme.isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(255, 255, 255, 0.4)',
            border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
          }}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Date Display Card */}
        <div 
          className="flex flex-col items-center justify-center py-3 px-6 rounded-xl flex-1 max-w-xs relative"
          style={{ 
            backgroundColor: theme.isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(255, 255, 255, 0.4)',
            border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
            boxShadow: theme.isDark ? '0 1px 3px rgba(0, 0, 0, 0.3)' : '0 1px 2px rgba(0, 0, 0, 0.05)'
          }}
        >
          {/* Day Name - LARGER & BOLDER */}
          <div 
            className="text-3xl font-extrabold tracking-wider"
            style={{ 
              color: theme.isDark ? theme.text : theme.primaryDark,
              textShadow: isToday ? `0 0 20px ${theme.primary}40` : 'none'
            }}
          >
            {dayName}
          </div>
          
          {/* Time of Day - COLORED & SLIGHTLY LARGER */}
          <div 
            className="text-xs font-semibold tracking-widest uppercase mt-0.5"
            style={{ 
              color: isToday ? theme.primary : theme.textLight,
              opacity: isToday ? 0.9 : 0.6
            }}
          >
            {isToday ? timeOfDay : '\u00A0'}
          </div>
          
          {/* Date Display - ADJUSTED SIZE & BETTER SEPARATOR */}
          <div 
            className="text-2xl font-bold mt-1 tracking-wide"
            style={{ 
              color: theme.isDark ? theme.text : theme.primaryDark
            }}
          >
            {dayNumber} <span className="opacity-50 mx-1">|</span> {monthAbbr}
          </div>

          {/* Today Accent Line */}
          {isToday && (
            <div 
              className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-12 h-0.5 rounded-full"
              style={{ 
                backgroundColor: theme.primary,
                boxShadow: `0 0 8px ${theme.primary}`
              }}
            />
          )}
        </div>

        {/* Next Button */}
        <button
          onClick={onNext}
          className="p-2 rounded-lg transition-all hover:scale-110 active:scale-95"
          style={{ 
            color: theme.isDark ? theme.textLight : theme.primaryDark,
            backgroundColor: theme.isDark ? 'rgba(31, 41, 55, 0.3)' : 'rgba(255, 255, 255, 0.4)',
            border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)'}`,
          }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Subtle Gradient Divider */}
      <div 
        className="w-24 h-px my-2"
        style={{ 
          background: `linear-gradient(90deg, transparent, ${theme.isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}, transparent)`
        }}
      />

      {/* View Controls - TIGHTER INTEGRATION */}
      <div className="flex items-center justify-center gap-2 w-full">
        <div className="inline-flex rounded-xl p-1 shadow-md border" style={{ backgroundColor: theme.isDark ? '#1f2937' : theme.secondary, borderColor: theme.border }}>
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


