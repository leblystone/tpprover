import React from 'react';

// Component that crashes when shouldCrash is true
const ErrorTrigger = ({ shouldCrash }) => {
  if (shouldCrash) {
    throw new Error('Test error - This will trigger the ChunkErrorBoundary');
  }
  return null;
};

export default ErrorTrigger;
