import React from 'react'

export default function TextInput({ label, value, onChange, placeholder, theme, name, type = 'text', onFocus, onBlur }) {
  return (
    <label className="block w-full">
      {label && <span className="block text-sm font-medium mb-1" style={{ color: theme?.text || '#111' }}>{label}</span>}
      <input
        name={name}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        className="w-full p-3 rounded-lg border transition-colors focus:outline-none focus:ring-2"
        style={{ borderColor: theme?.border || '#e5e7eb', backgroundColor: theme?.white || '#fff', color: theme?.text || '#111' }}
      />
    </label>
  )
}


