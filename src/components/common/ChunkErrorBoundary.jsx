import React from 'react';

/**
 * Error Boundary for Chunk Loading Failures
 * Catches errors from lazy-loaded components and provides recovery UI
 */
class ChunkErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('🚨 ChunkErrorBoundary caught an error:', error, errorInfo);
    
    // Check if this is a chunk loading error
    const isChunkError = 
      error?.message?.includes('Failed to fetch') ||
      error?.message?.includes('dynamically imported module') ||
      error?.message?.includes('Importing a module script failed') ||
      error?.name === 'ChunkLoadError';

    if (isChunkError) {
      console.error('📦 Chunk loading error detected');
    }

    this.setState({
      error,
      errorInfo
    });
  }

  handleReload = () => {
    // Clear the force refresh flag and reload
    window.sessionStorage.removeItem('page_has_been_force_refreshed');
    window.location.reload();
  };

  handleClearCacheAndReload = async () => {
    try {
      console.log('🧹 Clearing all caches...');
      
      // Clear all cache storage
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log(`🗑️ Deleting cache: ${cacheName}`);
            return caches.delete(cacheName);
          })
        );
      }

      // Unregister service workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          console.log('🗑️ Unregistering service worker');
          await registration.unregister();
        }
      }

      // Clear session storage flag
      window.sessionStorage.removeItem('page_has_been_force_refreshed');

      console.log('✅ Cache cleared, reloading...');
      window.location.reload();
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      // Fallback to simple reload
      this.handleReload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Check if this is a chunk loading error
      const isChunkError = 
        this.state.error?.message?.includes('Failed to fetch') ||
        this.state.error?.message?.includes('dynamically imported module') ||
        this.state.error?.message?.includes('Importing a module script failed') ||
        this.state.error?.name === 'ChunkLoadError';

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '2rem',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{
            maxWidth: '600px',
            backgroundColor: 'white',
            padding: '3rem',
            borderRadius: '1rem',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
          }}>
            <h1 style={{ 
              fontSize: '2rem', 
              marginBottom: '1rem', 
              color: isChunkError ? '#f59e0b' : '#ef4444',
              fontWeight: '700'
            }}>
              {isChunkError ? '⚠️ Update Available' : '❌ Something Went Wrong'}
            </h1>
            
            <p style={{ 
              marginBottom: '1.5rem', 
              color: '#64748b', 
              fontSize: '1.125rem',
              lineHeight: '1.75'
            }}>
              {isChunkError 
                ? 'The Pep Planner has been updated. Please reload to get the latest version.'
                : 'An unexpected error occurred. Please try reloading the page.'
              }
            </p>

            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '0.875rem 2rem',
                  fontSize: '1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'background-color 0.2s',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
              >
                🔄 Reload Page
              </button>

              <button
                onClick={this.handleClearCacheAndReload}
                style={{
                  padding: '0.875rem 2rem',
                  fontSize: '1rem',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'background-color 0.2s',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#059669'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#10b981'}
              >
                🧹 Clear Cache & Reload
              </button>
            </div>

            {/* Show error details in development */}
            {process.env.NODE_ENV === 'development' && (
              <details style={{
                marginTop: '2rem',
                textAlign: 'left',
                fontSize: '0.875rem',
                color: '#64748b',
                backgroundColor: '#f1f5f9',
                padding: '1rem',
                borderRadius: '0.5rem'
              }}>
                <summary style={{ cursor: 'pointer', fontWeight: '600', marginBottom: '0.5rem' }}>
                  Error Details (Dev Only)
                </summary>
                <pre style={{ 
                  overflow: 'auto', 
                  fontSize: '0.75rem',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word'
                }}>
                  {this.state.error?.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <p style={{ 
              marginTop: '1.5rem', 
              fontSize: '0.875rem', 
              color: '#94a3b8' 
            }}>
              If the problem persists, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChunkErrorBoundary;

