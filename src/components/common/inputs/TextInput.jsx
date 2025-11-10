import React from 'react'

export default function TextInput({
  label,
  value,
  onChange,
  placeholder,
  theme,
  name,
  type = 'text',
  onFocus,
  onBlur,
  dense = false,
  multiline = false,
  rows = 3
}) {
  return (
    <>
      <style>{`
        .themed-input:focus {
          box-shadow: ${theme.isDark 
            ? `0 0 0 2px ${theme.primary}40, 0 2px 8px rgba(0,0,0,0.4)` 
            : `0 0 0 2px ${theme.primaryLight}, 0 1px 3px rgba(0,0,0,0.1)`};
        }
        .themed-textarea:focus {
          box-shadow: ${theme.isDark 
            ? `0 0 0 2px ${theme.primary}40, 0 2px 8px rgba(0,0,0,0.4)` 
            : `0 0 0 2px ${theme.primaryLight}, 0 1px 3px rgba(0,0,0,0.1)`};
        }
        /* Hide number input spinners (Chrome, Safari, Edge, Opera) */
        input[type=number].no-spin::-webkit-inner-spin-button,
        input[type=number].no-spin::-webkit-outer-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        /* Firefox */
        input[type=number].no-spin {
          -moz-appearance: textfield;
        }
      `}</style>
      <label className="block w-full">
        {label && <span id={`${name || 'input'}-label`} className={`block ${dense ? 'text-xs' : 'text-sm'} font-medium mb-1`} style={{ color: theme.text }}>{label}</span>}
        {multiline ? (
          <textarea
            name={name}
            value={value}
            rows={rows}
            onChange={e => onChange(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            aria-label={label || placeholder}
            aria-describedby={label ? `${name || 'input'}-label` : undefined}
            className={`w-full ${dense ? 'p-2 text-sm' : 'p-3'} rounded-lg transition-all focus:outline-none themed-textarea resize-y`}
            style={{
              border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
              backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
              color: theme.text,
              boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
              whiteSpace: 'pre-wrap'
            }}
          />
        ) : (
          <input
            name={name}
            type={type}
            value={value}
            onChange={e => onChange(e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            aria-label={label || placeholder}
            aria-describedby={label ? `${name || 'input'}-label` : undefined}
            className={`w-full ${dense ? 'p-2 text-sm' : 'p-3'} rounded-lg transition-all focus:outline-none themed-input ${type === 'number' ? 'no-spin' : ''}`}
            style={{ 
              border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
              backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'), 
              color: theme.text,
              boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
            }}
          />
        )}
      </label>
    </>
  )
}


