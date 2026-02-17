import React from 'react'

export default function TextArea({ label, value, onChange, placeholder, theme, name, rows = 3, onFocus, onBlur, dense = false }) {
  return (
    <>
      <style>{`
        .themed-textarea:focus {
          border-color: ${theme.isDark ? 'rgba(255,255,255,0.25)' : theme.primary};
          box-shadow: ${theme.isDark 
            ? '0 0 0 2px rgba(255,255,255,0.12), 0 2px 8px rgba(0,0,0,0.4)' 
            : `0 0 0 2px ${theme.primaryLight}`};
        }
      `}</style>
      <label className="block w-full">
        {label && <span id={`${name || 'textarea'}-label`} className={`block ${dense ? 'text-xs' : 'text-sm'} font-medium mb-1`} style={{ color: theme.text }}>{label}</span>}
        <textarea
          name={name}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          rows={rows}
          aria-label={label || placeholder}
          aria-describedby={label ? `${name || 'textarea'}-label` : undefined}
          className={`w-full ${dense ? 'p-2 text-sm' : 'p-3'} rounded-lg border transition-colors focus:outline-none themed-textarea resize-vertical`}
          style={{ 
            borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.border, 
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : theme.cardBackground, 
            color: theme.text,
            boxShadow: theme.isDark ? 'inset 0 1px 3px rgba(0,0,0,0.3)' : 'none' 
          }}
        />
      </label>
    </>
  )
}