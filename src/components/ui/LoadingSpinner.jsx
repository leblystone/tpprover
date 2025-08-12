import React from 'react'

const LoadingSpinner = ({ size = 'md', theme, message = '' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <div className="flex flex-col items-center justify-center space-y-2">
      <div
        className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-300`}
        style={{ borderTopColor: theme?.primary || '#9E948A' }}
      />
      {message && (
        <p className="text-sm text-center" style={{ color: theme?.textLight || '#666' }}>
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner;