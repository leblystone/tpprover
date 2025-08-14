 import React from 'react'

export default function Tabs({ value, onChange, options = [], theme, compact = false }) {
  // Match Calendar Month/Week styling when compact is true
  const containerClass = compact ? 'flex gap-1 bg-gray-100 p-1 rounded-full shadow-inner' : 'flex gap-2 bg-gray-100 p-1 rounded-full shadow-inner'
  const baseBtn = compact ? 'px-4 py-1.5 text-sm' : 'px-5 py-2 text-sm'
  return (
    <div className={containerClass}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`${baseBtn} font-semibold rounded-full transition-all duration-200 focus:outline-none ${value === opt.value ? 'text-white shadow' : 'text-gray-600 hover:bg-gray-200'}`}
          style={value === opt.value ? { backgroundColor: theme?.primary, color: theme?.white } : {}}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}


