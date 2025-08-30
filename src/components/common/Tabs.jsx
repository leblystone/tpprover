import React from 'react'

export default function Tabs({ value, onChange, options = [], theme, compact = false, stretch = false }) {
  const containerClass = `
    ${stretch ? 'w-full flex-1' : ''} 
    ${compact ? 'flex gap-1 p-1.5 rounded-xl' : 'flex gap-2 p-2.5 rounded-xl'}
  `.trim()
  
  const baseBtn = `
    ${compact ? 'px-4 py-2 text-sm' : 'px-5 py-2.5 text-sm'} 
    ${stretch ? 'flex-1 text-center' : ''}
    font-semibold rounded-lg transition-all duration-200 focus:outline-none
  `.trim()

  return (
    <div className={containerClass} style={{ backgroundColor: theme.secondary }}>
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`${baseBtn} ${value === opt.value ? 'shadow-md' : 'shadow-sm hover:shadow-md'}`}
          style={{ 
            backgroundColor: value === opt.value ? theme.primary : theme.cardBackground, 
            color: value === opt.value ? theme.textOnPrimary : theme.textLight 
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}


