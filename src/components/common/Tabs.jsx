import React from 'react'

/**
 * Tabs Component
 * Used for Level 3 navigation (page-level content filtering)
 * Now with 'subtle' mode for visual hierarchy differentiation
 */
export default function Tabs({ value, onChange, options = [], theme, compact = false, stretch = false, subtle = false }) {
  // Subtle mode: smaller, lighter, less prominent (for Level 3 tabs)
  // Normal mode: current behavior (can also be used for Level 3)
  
  const containerClass = `
    ${stretch ? 'w-full flex-1' : ''} 
    ${subtle 
      ? 'flex gap-1 p-1 rounded-lg justify-start' 
      : compact 
        ? 'flex gap-1 p-1.5 rounded-xl justify-center' 
        : 'flex gap-2 p-2.5 rounded-xl justify-center'
    }
  `.trim()
  
  const baseBtn = `
    ${subtle 
      ? 'px-3 py-1.5 text-xs' 
      : compact 
        ? 'px-4 py-2 text-sm' 
        : 'px-5 py-2.5 text-sm'
    } 
    ${stretch ? 'flex-1 text-center' : ''}
    ${subtle ? 'font-medium' : 'font-semibold'} 
    rounded-lg transition-all duration-200 focus:outline-none
  `.trim()

  return (
    <div 
      className={containerClass} 
      style={{ 
        backgroundColor: subtle ? 'transparent' : theme.secondary,
        borderBottom: subtle ? `1px solid ${theme.border}` : 'none'
      }}
      role="tablist"
      aria-label="Navigation tabs"
    >
      {options.map(opt => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`${baseBtn} ${value === opt.value ? (subtle ? '' : 'shadow-md') : (subtle ? '' : 'shadow-sm hover:shadow-md')}`}
          style={{ 
            backgroundColor: value === opt.value 
              ? (subtle ? theme.primaryLight || theme.primary : theme.primary)
              : (subtle ? 'transparent' : theme.cardBackground), 
            color: value === opt.value 
              ? (subtle ? theme.primary : theme.textOnPrimary)
              : theme.textLight,
            borderBottom: subtle && value === opt.value ? `2px solid ${theme.primary}` : 'none'
          }}
          role="tab"
          aria-selected={value === opt.value}
          aria-controls={`tabpanel-${opt.value}`}
          tabIndex={value === opt.value ? 0 : -1}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}


