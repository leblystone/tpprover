import React from 'react'

export default function TextArea({ label, value, onChange, placeholder, theme, name, rows = 3, onFocus, onBlur, dense = false }) {
  return (
    <>
      <style>{`
        .themed-textarea:focus {
          border-color: ${theme.primary};
          box-shadow: 0 0 0 2px ${theme.primaryLight};
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
            borderColor: theme.border, 
            backgroundColor: theme.cardBackground, 
            color: theme.text 
          }}
        />
      </label>
    </>
  )
}