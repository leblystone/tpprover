 import React from 'react'

export default function ViewContainer({ theme, className = '', children, transparent = false, noMinHeight = false }) {
  return (
    <div
      className={`${noMinHeight ? '' : 'min-h-screen'} ${className}`}
      style={{ backgroundColor: transparent ? 'transparent' : (theme?.background || '#FFFFFF') }}
    >
      {children}
    </div>
  )
}


