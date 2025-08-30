import React from 'react'

export default function TextInput({ label, value, onChange, placeholder, theme, name, type = 'text', onFocus, onBlur, dense = false }) {
  return (
    <>
      <style>{`
        .themed-input:focus {
          border-color: ${theme.primary};
          box-shadow: 0 0 0 2px ${theme.primaryLight};
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
        {label && <span className={`block ${dense ? 'text-xs' : 'text-sm'} font-medium mb-1`} style={{ color: theme.text }}>{label}</span>}
        <input
          name={name}
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`w-full ${dense ? 'p-2 text-sm' : 'p-3'} rounded-lg border transition-colors focus:outline-none themed-input ${type === 'number' ? 'no-spin' : ''}`}
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


