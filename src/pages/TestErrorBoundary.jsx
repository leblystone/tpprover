import React from 'react';
import ChunkErrorBoundary from '../components/common/ChunkErrorBoundary';

/**
 * TEMPORARY TEST COMPONENT - REMOVE BEFORE PRODUCTION
 * 
 * This component is used to test the ChunkErrorBoundary error page design.
 * It throws an error during render to trigger the error boundary.
 * 
 * Navigate to /test-error-boundary to see the error page.
 */

// Component that throws an error during render
function ErrorThrower() {
  // Throw an error during render to trigger the error boundary
  throw new Error('Test Error Boundary - This is a test error to verify the error page design! The error boundary should catch this and display the user-friendly error page.');
}

export default function TestErrorBoundary() {
  // Wrap in ChunkErrorBoundary to catch the error
  // Note: This nested boundary will catch the error before React Router's boundary
  return (
    <ChunkErrorBoundary>
      <ErrorThrower />
    </ChunkErrorBoundary>
  );
}

