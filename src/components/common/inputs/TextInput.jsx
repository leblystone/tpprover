import React, { useState } from 'react'

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
  rows = 3,
  uppercase = false,
  customShadow = null,
  outlined = false,
  customTextColor = null,
  maxLength = null
}) {
  const [isFocused, setIsFocused] = useState(false);
  // Ensure value is always a string to prevent controlled/uncontrolled warnings
  const safeValue = value != null ? String(value) : '';
  const hasValue = safeValue && safeValue.trim() !== '';
  const isLabelActive = isFocused || hasValue;
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
        /* Keep placeholder in normal case even when input is uppercase */
        .themed-input-uppercase::placeholder,
        .themed-textarea-uppercase::placeholder {
          text-transform: none !important;
        }
        /* Outlined input styles */
        .outlined-input-wrapper {
          position: relative;
        }
        .outlined-input-label {
          position: absolute;
          left: ${dense ? '12px' : '16px'};
          top: ${dense ? '10px' : '14px'};
          pointer-events: none;
          transition: all 0.2s ease;
          color: ${theme.textLight || theme.text};
          font-size: ${dense ? '0.9375rem' : '1rem'};
          font-weight: 500;
        }
        .outlined-input-label.active {
          top: -8px;
          left: 12px;
          font-size: 0.875rem;
          padding: 0 4px;
          background: ${theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')};
          color: ${theme.primary};
          font-weight: 500;
        }
        .outlined-input:focus + .outlined-input-label,
        .outlined-input:not(:placeholder-shown) + .outlined-input-label {
          top: -8px;
          left: 12px;
          font-size: 0.875rem;
          padding: 0 4px;
          background: ${theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')};
          color: ${theme.primary};
          font-weight: 500;
        }
      `}</style>
      {outlined ? (
        <div className="outlined-input-wrapper">
          {multiline ? (
            <textarea
              name={name || `outlined-input-${label?.replace(/\s+/g, '-').toLowerCase()}`}
              id={name || `outlined-input-${label?.replace(/\s+/g, '-').toLowerCase()}`}
              value={safeValue}
              rows={rows}
              onChange={e => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
              onFocus={(e) => {
                setIsFocused(true);
                if (onFocus) onFocus(e);
              }}
              onBlur={(e) => {
                setIsFocused(false);
                if (onBlur) onBlur(e);
              }}
              placeholder={isLabelActive ? placeholder : ' '}
              aria-label={label || placeholder}
              className={`w-full ${dense ? 'p-2 text-sm' : 'p-3'} rounded-lg transition-all focus:outline-none outlined-input ${uppercase ? 'themed-input-uppercase' : ''} resize-y`}
              style={{ 
                border: `1px solid ${isFocused ? theme.primary : '#f0eee7'}`,
                backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'), 
                color: customTextColor && !theme.isDark ? customTextColor : theme.text,
                boxShadow: customShadow || (theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'),
                whiteSpace: 'pre-wrap',
                wordWrap: 'break-word',
                overflowWrap: 'break-word',
                textTransform: uppercase ? 'uppercase' : 'none'
              }}
            />
          ) : (
            <input
              name={name || `outlined-input-${label?.replace(/\s+/g, '-').toLowerCase()}`}
              id={name || `outlined-input-${label?.replace(/\s+/g, '-').toLowerCase()}`}
              type={type}
              value={safeValue}
              onChange={e => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
              onFocus={(e) => {
                setIsFocused(true);
                if (onFocus) onFocus(e);
              }}
              onBlur={(e) => {
                setIsFocused(false);
                if (onBlur) onBlur(e);
              }}
              placeholder={isLabelActive ? placeholder : ' '}
              aria-label={label || placeholder}
              maxLength={maxLength}
              className={`w-full ${dense ? 'p-2 text-sm' : 'p-3'} rounded-lg transition-all focus:outline-none outlined-input ${uppercase ? 'themed-input-uppercase' : ''} ${type === 'number' ? 'no-spin' : ''}`}
              style={{ 
                border: `1px solid ${isFocused ? theme.primary : '#f0eee7'}`,
                backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'), 
                color: customTextColor && !theme.isDark ? customTextColor : theme.text,
                boxShadow: customShadow || (theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'),
                textTransform: uppercase ? 'uppercase' : 'none'
              }}
            />
          )}
          {label && (
            <label 
              htmlFor={name || `outlined-input-${label?.replace(/\s+/g, '-').toLowerCase()}`}
              className={`outlined-input-label ${isLabelActive ? 'active' : ''}`}
            >
              {label}
            </label>
          )}
        </div>
      ) : (
      <label className="block w-full">
        {label && <span id={`${name || 'input'}-label`} className={`block ${dense ? 'text-xs' : 'text-sm'} font-medium mb-1`} style={{ color: theme.text }}>{label}</span>}
        {multiline ? (
          <textarea
            name={name}
            value={safeValue}
            rows={rows}
            onChange={e => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            aria-label={label || placeholder}
            aria-describedby={label ? `${name || 'input'}-label` : undefined}
            className={`w-full ${dense ? 'p-2 text-sm' : 'p-3'} rounded-lg transition-all focus:outline-none themed-textarea ${uppercase ? 'themed-textarea-uppercase' : ''} resize-y`}
            style={{
              border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
              backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
              color: theme.text,
              boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)',
              whiteSpace: 'pre-wrap',
              wordWrap: 'break-word',
              overflowWrap: 'break-word',
              textTransform: uppercase ? 'uppercase' : 'none'
            }}
          />
        ) : (
          <input
            name={name}
            type={type}
            value={safeValue}
            onChange={e => onChange(uppercase ? e.target.value.toUpperCase() : e.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            placeholder={placeholder}
            aria-label={label || placeholder}
            aria-describedby={label ? `${name || 'input'}-label` : undefined}
            maxLength={maxLength}
            className={`w-full ${dense ? 'p-2 text-sm' : 'p-3'} rounded-lg transition-all focus:outline-none themed-input ${uppercase ? 'themed-input-uppercase' : ''} ${type === 'number' ? 'no-spin' : ''}`}
            style={{ 
              border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
              backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'), 
              color: theme.text,
              boxShadow: customShadow || (theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'),
              textTransform: uppercase ? 'uppercase' : 'none'
            }}
          />
        )}
      </label>
      )}
    </>
  )
}


