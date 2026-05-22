import React from 'react'

const overlayStyles = `
  @keyframes lo-bounce {
    0%, 80%, 100% { transform: translateY(0) scale(1); }
    40%           { transform: translateY(-10px) scale(1.15); }
  }
  @keyframes lo-fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to   { opacity: 1; transform: scale(1); }
  }
  .lo-dot {
    display: inline-block;
    width: 9px;
    height: 9px;
    border-radius: 50%;
    animation: lo-bounce 1.3s infinite ease-in-out both;
  }
  .lo-dot:nth-child(1) { animation-delay: 0s; }
  .lo-dot:nth-child(2) { animation-delay: 0.18s; }
  .lo-dot:nth-child(3) { animation-delay: 0.36s; }
  .lo-card {
    animation: lo-fadeIn 0.25s ease both;
  }
`

export default function LoadingOverlay({ isVisible, message = 'Just a moment…', theme }) {
  if (!isVisible) return null
  const primary = theme?.primary || '#4a7c59'
  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <style>{overlayStyles.replace(/#4a7c59/g, primary)}</style>
      <div className="lo-card rounded-2xl shadow-2xl px-8 py-6 text-center" style={{ backgroundColor: theme?.cardBackground || '#fff', minWidth: '200px' }}>
        <div style={{ fontSize: '24px', marginBottom: '10px' }}>🌿</div>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '10px' }}>
          <span className="lo-dot" style={{ backgroundColor: primary }} />
          <span className="lo-dot" style={{ backgroundColor: primary, opacity: 0.7 }} />
          <span className="lo-dot" style={{ backgroundColor: primary, opacity: 0.45 }} />
        </div>
        <p style={{ color: theme?.textLight || '#6B7280', fontSize: '13px', fontWeight: '500', margin: 0 }}>{message}</p>
      </div>
    </div>
  )
}

