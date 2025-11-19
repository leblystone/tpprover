import React from 'react';
import { FlaskConicalOff, RefreshCw } from 'lucide-react';
import { themes } from '../../theme/themes';
import SupportModal from './SupportModal';

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
      errorInfo: null,
      showSupportModal: false
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

  handleOpenSupport = () => {
    this.setState({ showSupportModal: true });
  };

  handleCloseSupport = () => {
    this.setState({ showSupportModal: false });
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

      // Get sage theme colors
      const sageTheme = themes.sage;

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
          backgroundColor: sageTheme.background
        }}>
          <div style={{
            maxWidth: '500px',
            width: '100%',
            backgroundColor: sageTheme.cardBackground,
            padding: '3rem 2rem',
            borderRadius: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            border: `1px solid ${sageTheme.border}`
          }}>
            {/* Icon */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              marginBottom: '1.5rem'
            }}>
              {isChunkError ? (
                <RefreshCw size={64} color={sageTheme.primary} />
              ) : (
                <FlaskConicalOff size={64} color={sageTheme.primary} />
              )}
            </div>

            <h1 style={{ 
              fontSize: '1.75rem', 
              marginBottom: '1rem', 
              color: sageTheme.text,
              fontWeight: '700',
              lineHeight: '1.2'
            }}>
              {isChunkError ? 'Update Available' : 'Synthesis Interrupted'}
            </h1>
            
            <p style={{ 
              marginBottom: '2rem', 
              color: sageTheme.textLight, 
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
                  backgroundColor: sageTheme.primary,
                  color: sageTheme.textOnPrimary,
                  border: 'none',
                  borderRadius: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: '600',
                  transition: 'all 0.2s',
                  boxShadow: '0 4px 6px -1px rgba(127, 158, 149, 0.3)',
                  width: '100%'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = sageTheme.primaryDark;
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 6px 8px -1px rgba(95, 127, 118, 0.4)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = sageTheme.primary;
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 6px -1px rgba(127, 158, 149, 0.3)';
                }}
              >
                Refresh Page
              </button>
            </div>

            <p style={{ 
              marginTop: '1.5rem', 
              fontSize: '0.875rem', 
              color: sageTheme.textLight,
              lineHeight: '1.5'
            }}>
              If this problem continues, please contact{' '}
              <button
                onClick={this.handleOpenSupport}
                style={{
                  background: 'none',
                  border: 'none',
                  color: sageTheme.primary,
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: 0,
                  fontSize: 'inherit',
                  fontFamily: 'inherit'
                }}
                onMouseOver={(e) => {
                  e.target.style.color = sageTheme.primaryDark;
                }}
                onMouseOut={(e) => {
                  e.target.style.color = sageTheme.primary;
                }}
              >
                support
              </button>
              .
            </p>
          </div>
          
          {/* Render SupportModal directly - AppContext should still be available since providers are above this boundary */}
          <SupportModal 
            open={this.state.showSupportModal}
            onClose={this.handleCloseSupport}
            theme={sageTheme}
          />
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChunkErrorBoundary;

