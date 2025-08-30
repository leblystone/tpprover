 import React from 'react'

export default function LoadingOverlay({ isVisible, message = 'Loading...', theme }) {
  if (!isVisible) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl flex items-center space-x-3" style={{ backgroundColor: theme?.cardBackground || '#fff' }}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: theme?.primary || '#8A9A8F' }}></div>
        <span style={{ color: theme?.text || '#1A202C' }}>{message}</span>
      </div>
    </div>
  )
}


