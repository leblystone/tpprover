 import React from 'react'

export default function ViewContainer({ theme, className = '', children, transparent = false, noMinHeight = false }) {
  return (
    <div
      className={`${noMinHeight ? '' : 'min-h-screen'} w-full max-w-full overflow-x-hidden ${className}`}
      style={{ 
        backgroundColor: transparent ? 'transparent' : (theme?.background || '#FFFFFF'),
        minWidth: 0,
        boxSizing: 'border-box'
      }}
    >
      {children}
    </div>
  )
}


