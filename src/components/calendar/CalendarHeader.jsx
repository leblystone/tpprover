import React from 'react';
import { ChevronLeft, ChevronRight, HelpCircle } from 'lucide-react';
import ModernTooltip from '../ui/ModernTooltip';

const getWeekOfMonth = (date) => {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const dayOfMonth = date.getDate();
    const dayOfWeek = startOfMonth.getDay();
    return Math.ceil((dayOfMonth + dayOfWeek) / 7);
};

export default function CalendarHeader({ currentDate, weekStart, onPrev, onNext, onToday, viewMode, onChangeView, onShowIconKey, theme }) {
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();
  
  return (
    <div className="flex items-center justify-between mb-4 flex-wrap">
      <div className="hidden sm:flex items-center gap-4">
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
        <div className="flex items-center gap-3">
          <button onClick={onPrev} className="p-2 rounded-full transition-all" style={{ color: theme.isDark ? '#a8b5a0' : theme.primaryDark }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><ChevronLeft className="h-5 w-5" /></button>
          <h2 className="text-xl font-bold min-w-[180px] text-center" style={{ color: theme.isDark ? theme.text : theme.primaryDark }}>{monthName} {year}</h2>
          <button onClick={onNext} className="p-2 rounded-full transition-all" style={{ color: theme.isDark ? '#a8b5a0' : theme.primaryDark }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><ChevronRight className="h-5 w-5" /></button>
        </div>
      </div>
      
      <div className="hidden sm:flex items-center gap-2">
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
        {viewMode === 'month' && onShowIconKey && (
          <ModernTooltip text="Icon guide" position="bottom">
            <button onClick={onShowIconKey} className="p-2 rounded-full transition-all" style={{ color: theme.isDark ? '#a8b5a0' : theme.primaryDark }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
              <HelpCircle className="h-5 w-5" />
            </button>
          </ModernTooltip>
        )}
      </div>
        
        {/* Mobile-only controls */}
        <div className="flex sm:hidden items-center justify-between w-full order-1">
            <button onClick={onPrev} className="p-2 rounded-full transition-all" style={{ color: theme.isDark ? '#a8b5a0' : theme.primaryDark }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><ChevronLeft className="h-5 w-5" /></button>
            <h2 className="text-xl font-bold text-center flex-1" style={{ color: theme.isDark ? theme.text : theme.primaryDark }}>{monthName} {year}</h2>
            <button onClick={onNext} className="p-2 rounded-full transition-all" style={{ color: theme.isDark ? '#a8b5a0' : theme.primaryDark }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}><ChevronRight className="h-5 w-5" /></button>
        </div>
        <div className="flex sm:hidden items-center justify-between w-full order-3 mt-2">
             <div className="flex items-center gap-2">
               <button 
                 onClick={onToday} 
                 className="px-4 py-1.5 text-sm font-semibold rounded-lg transition-all text-white shadow-md" 
                 style={{ 
                   background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)'
                 }}
                 onMouseEnter={(e) => {
                   e.currentTarget.style.background = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
                 }}
                 onMouseLeave={(e) => {
                   e.currentTarget.style.background = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
                 }}
               >
                 Today
               </button>
             </div>
            <div className="flex items-center gap-2">
              <div className="flex gap-1 p-1 rounded-lg shadow-md" style={{ backgroundColor: theme.isDark ? '#1f2937' : theme.secondary }}>
                  <button 
                    onClick={() => onChangeView('month')} 
                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${viewMode === 'month' ? 'shadow-sm' : ''}`} 
                    style={viewMode === 'month' ? { backgroundColor: theme.primary, color: theme.textOnPrimary } : { color: theme.isDark ? theme.textLight : '#374151' }}
                  >
                    Month
                  </button>
                  <button 
                    onClick={() => onChangeView('week')} 
                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all ${viewMode === 'week' ? 'shadow-sm' : ''}`} 
                    style={viewMode === 'week' ? { backgroundColor: theme.primary, color: theme.textOnPrimary } : { color: theme.isDark ? theme.textLight : '#374151' }}
                  >
                    Week
                  </button>
              </div>
              {viewMode === 'month' && onShowIconKey && (
                <ModernTooltip text="Icon guide" position="bottom">
                  <button onClick={onShowIconKey} className="p-1.5 rounded-full border transition-all" style={{ borderColor: theme.border, color: theme.isDark ? '#a8b5a0' : theme.primaryDark }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <HelpCircle className="h-4 w-4" />
                  </button>
                </ModernTooltip>
              )}
            </div>
        </div>
    </div>
  )
 }


