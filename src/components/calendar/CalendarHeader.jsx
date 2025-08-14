 import React from 'react'

export default function CalendarHeader({ currentDate, onPrev, onNext, viewMode, onChangeView, theme }) {
  const monthLabel = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <button className="px-2 py-1 rounded border" onClick={onPrev} style={{ borderColor: theme.border }}>&lt;</button>
        <div className="h3" style={{ color: theme.primaryDark }}>{monthLabel}</div>
        <button className="px-2 py-1 rounded border" onClick={onNext} style={{ borderColor: theme.border }}>&gt;</button>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-full shadow-inner">
          <button onClick={() => onChangeView('month')} className={`px-4 py-1.5 text-sm font-semibold rounded-full ${viewMode === 'month' ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`} style={viewMode === 'month' ? { backgroundColor: theme.primary } : {}}>Month</button>
          <button onClick={() => onChangeView('week')} className={`px-4 py-1.5 text-sm font-semibold rounded-full ${viewMode === 'week' ? 'text-white' : 'text-gray-700 hover:bg-gray-200'}`} style={viewMode === 'week' ? { backgroundColor: theme.primary } : {}}>Week</button>
          {/* day view opens from week panel via button in Calendar.jsx */}
        </div>
      </div>
    </div>
  )
 }


