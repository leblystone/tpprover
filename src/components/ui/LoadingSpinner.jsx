import React from 'react'

const LoadingSpinner = ({ size = 'md', theme, message = '' }) => {
  const sizes = {
    sm: { container: 'h-8 w-8', ring: 'inset-0', innerRing: 'inset-0.5', icon: 'w-3 h-3' },
    md: { container: 'h-12 w-12', ring: 'inset-0', innerRing: 'inset-1', icon: 'w-5 h-5' },
    lg: { container: 'h-20 w-20', ring: 'inset-0', innerRing: 'inset-2', icon: 'w-8 h-8' },
    xl: { container: 'h-28 w-28', ring: 'inset-0', innerRing: 'inset-3', icon: 'w-12 h-12' },
  };

  const currentSize = sizes[size];
  const primaryColor = theme?.primary || '#7F9E95';
  const primaryLight = theme?.primaryLight || '#A0B9B3';

  return (
    <div className="flex flex-col items-center justify-center space-y-3">
      {/* Modern animated spinner */}
      <div className={`relative ${currentSize.container}`}>
        {/* Outer rotating gradient ring */}
        <div 
          className={`absolute ${currentSize.ring} rounded-full`}
          style={{ 
            background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryLight} 100%)`,
            opacity: 0.25,
            animation: 'spin 2s linear infinite'
          }}
        />
        
        {/* Middle pulsing ring */}
        <div 
          className={`absolute ${currentSize.innerRing} rounded-full`}
          style={{ 
            background: `linear-gradient(135deg, ${primaryLight} 0%, ${primaryColor} 100%)`,
            opacity: 0.2,
            animation: 'pulse 1.5s ease-in-out infinite'
          }}
        />
        
        {/* Inner rotating border */}
        <div 
          className={`absolute ${currentSize.innerRing} rounded-full border-2`}
          style={{ 
            borderColor: 'transparent',
            borderTopColor: primaryColor,
            animation: 'spin 1s linear infinite'
          }}
        />
      </div>

      {message && (
        <p 
          className="text-sm text-center font-medium animate-pulse" 
          style={{ color: theme?.textLight || '#6B7D7A' }}
        >
          {message}
        </p>
      )}
      
      {/* Keyframe animations */}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.05); opacity: 0.3; }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner;