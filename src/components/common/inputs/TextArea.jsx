import React from 'react';

export default function TextArea({ 
  value, 
  onChange, 
  placeholder, 
  rows = 3, 
  disabled = false,
  className = '',
  style = {},
  theme,
  ...props 
}) {
  const baseClasses = `
    w-full px-3 py-2 border rounded-lg 
    transition-colors duration-200 
    focus:outline-none focus:ring-2 focus:ring-opacity-50
    disabled:opacity-50 disabled:cursor-not-allowed
    resize-vertical
  `.trim();

  const defaultStyle = {
    backgroundColor: theme?.cardBackground || '#ffffff',
    borderColor: theme?.border || '#e5e7eb',
    color: theme?.text || '#374151',
    ...style
  };

  const focusStyle = {
    borderColor: theme?.primary || '#3b82f6',
    ringColor: theme?.primary || '#3b82f6'
  };

  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
      className={`${baseClasses} ${className}`}
      style={{
        ...defaultStyle,
        '--focus-border-color': focusStyle.borderColor,
        '--focus-ring-color': focusStyle.ringColor
      }}
      {...props}
    />
  );
}
