import React from 'react';
import errorImage from '../../assets/error-opps.png';

/**
 * Reusable error fallback UI with error-opps.png.
 * Used by ChunkErrorBoundary and AppRouteError (route errorElement).
 */
export default function AppErrorFallback({ onReload }) {
  const handleReload = onReload ?? (() => window.location.reload());

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: '2rem',
        textAlign: 'center',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        backgroundColor: '#E8E4DC',
      }}
    >
      <img
        src={errorImage}
        alt="Error"
        style={{
          maxWidth: '600px',
          width: '90%',
          height: 'auto',
          marginBottom: '3rem',
        }}
      />
      <button
        onClick={handleReload}
        style={{
          padding: '0.55rem 1.6rem',
          fontSize: '0.9rem',
          backgroundColor: '#7B8A7A',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600',
          transition: 'all 0.2s',
          boxShadow: '0 4px 10px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.12)',
          letterSpacing: '0.02em',
        }}
        onMouseOver={(e) => {
          e.target.style.backgroundColor = '#5F7F76';
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 6px 16px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.12)';
        }}
        onMouseOut={(e) => {
          e.target.style.backgroundColor = '#7B8A7A';
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = '0 4px 10px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.12)';
        }}
      >
        Replenish &amp; Refresh
      </button>
    </div>
  );
}
