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

      // More reliable production check - never show technical details to users
      const isProduction = typeof window !== 'undefined' && 
        (window.location.hostname !== 'localhost' && 
         window.location.hostname !== '127.0.0.1' &&
         !window.location.hostname.includes('localhost'));

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
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
          <div style={{
            maxWidth: '500px',
            width: '100%',
            backgroundColor: 'white',
            padding: '3rem 2rem',
            borderRadius: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            {/* Icon/Emoji */}
            <div style={{
              fontSize: '4rem',
              marginBottom: '1.5rem',
              lineHeight: '1'
            }}>
              {isChunkError ? '🔄' : '😔'}
            </div>

            <h1 style={{ 
              fontSize: '1.75rem', 
              marginBottom: '1rem', 
              color: '#1f2937',
              fontWeight: '700',
              lineHeight: '1.2'
            }}>
              {isChunkError ? 'Update Available' : 'Oops! Something Went Wrong'}
            </h1>
            
            <p style={{ 
              marginBottom: '2rem', 
              color: '#6b7280', 
              fontSize: '1rem',
              lineHeight: '1.6'
            }}>
              {isChunkError 
                ? 'The Pep Planner has been updated with new features. Please refresh your browser to continue.'
                : 'We encountered an unexpected issue. Don\'t worry, your data is safe! Try refreshing the page or clearing your browser cache.'
              }
            </p>

            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
              width: '100%'
            }}>
              <button
                onClick={this.handleReload}
                style={{
                  padding: '0.875rem 1.5rem',
                  fontSize: '1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
                  width: '100%'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#2563eb';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 6px 8px -1px rgba(59, 130, 246, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#3b82f6';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 6px -1px rgba(59, 130, 246, 0.3)';
                }}
              >
                Refresh Page
              </button>

              {!isChunkError && (
                <button
                  onClick={this.handleClearCacheAndReload}
                  style={{
                    padding: '0.875rem 1.5rem',
                    fontSize: '1rem',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: '1px solid #e5e7eb',
                    borderRadius: '0.75rem',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'all 0.2s',
                    width: '100%'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.backgroundColor = '#e5e7eb';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.backgroundColor = '#f3f4f6';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  Clear Cache & Refresh
                </button>
              )}
            </div>

            {/* NEVER show error details in production - only in local development */}
            {!isProduction && (
              <details style={{
                marginTop: '2rem',
                textAlign: 'left',
                fontSize: '0.75rem',
                color: '#64748b',
                backgroundColor: '#f9fafb',
                padding: '1rem',
                borderRadius: '0.5rem',
                border: '1px solid #e5e7eb'
              }}>
                <summary style={{ 
                  cursor: 'pointer', 
                  fontWeight: '600', 
                  marginBottom: '0.5rem',
                  color: '#374151'
                }}>
                  🔧 Technical Details (Dev Only)
                </summary>
                <pre style={{ 
                  overflow: 'auto', 
                  fontSize: '0.7rem',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  color: '#6b7280',
                  fontFamily: 'monospace'
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
              color: '#9ca3b8',
              lineHeight: '1.5'
            }}>
              If this problem continues, please contact our support team. We're here to help! 🚀
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChunkErrorBoundary;

