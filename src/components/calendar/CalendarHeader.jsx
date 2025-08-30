 import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react';

const getWeekOfMonth = (date) => {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const dayOfMonth = date.getDate();
    const dayOfWeek = startOfMonth.getDay();
    return Math.ceil((dayOfMonth + dayOfWeek) / 7);
};

export default function CalendarHeader({ currentDate, weekStart, onPrev, onNext, onToday, viewMode, onChangeView, theme }) {
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const year = currentDate.getFullYear();
  
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <button onClick={onToday} className="px-4 py-2 rounded-lg text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>Today</button>
        <div className="flex items-center gap-1">
          <button onClick={onPrev} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeft className="h-5 w-5" /></button>
          <button onClick={onNext} className="p-2 rounded-full hover:bg-gray-100"><ChevronRight className="h-5 w-5" /></button>
        </div>
        <h2 className="text-xl font-bold ml-2" style={{ color: theme.primaryDark }}>{monthName} {year}</h2>
      </div>
      
      <div className="hidden sm:block">
        <div className="inline-flex rounded-md p-1 border" style={{ borderColor: theme.border, backgroundColor: theme.secondary }}>
            <button onClick={() => onChangeView('month')} className={`px-4 py-1.5 text-sm font-semibold rounded-lg ${viewMode === 'month' ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`} style={viewMode === 'month' ? { backgroundColor: theme.primary } : {}}>Month</button>
            <button onClick={() => onChangeView('week')} className={`px-4 py-1.5 text-sm font-semibold rounded-lg ${viewMode === 'week' ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`} style={viewMode === 'week' ? { backgroundColor: theme.primary } : {}}>Week</button>
        </div>
      </div>
        
        {/* Mobile-only controls */}
        <div className="flex sm:hidden items-center justify-between w-full order-1">
             <button onClick={onToday} className="px-4 py-1.5 text-sm font-semibold rounded-lg border" style={{ borderColor: theme.border }}>Today</button>
            <div className="flex gap-1 bg-gray-100 p-1 rounded-xl shadow-inner">
                <button onClick={() => onChangeView('month')} className={`px-4 py-1.5 text-sm font-semibold rounded-lg ${viewMode === 'month' ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`} style={viewMode === 'month' ? { backgroundColor: theme.primary } : {}}>Month</button>
                <button onClick={() => onChangeView('week')} className={`px-4 py-1.5 text-sm font-semibold rounded-lg ${viewMode === 'week' ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`} style={viewMode === 'week' ? { backgroundColor: theme.primary } : {}}>Week</button>
            </div>
        </div>
    </div>
  )
 }


