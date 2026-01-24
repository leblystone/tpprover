import React from 'react';

/**
 * Test component that throws an error to trigger the ErrorBoundary
 * Only used for testing the error boundary UI
 */
const ErrorBoundaryTest = () => {
  throw new Error('Test error - This will trigger the ChunkErrorBoundary');
  return null;
};

export default ErrorBoundaryTest;
