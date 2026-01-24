import React from 'react';
import { themes } from '../../theme/themes';
import SupportModal from './SupportModal';
import { safeReload } from '../../utils/safeReload';
import errorImage from '../../assets/error-opps.png';

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

  getUserId = () => {
    try {
      const savedUser = localStorage.getItem('tpprover_user');
      if (savedUser) {
        const user = JSON.parse(savedUser);
        return user.uid || user.id;
      }
    } catch (error) {
      console.warn('Could not get user ID for safe reload:', error);
    }
    return null;
  };

  handleReload = async () => {
    // Clear the force refresh flag
    window.sessionStorage.removeItem('page_has_been_force_refreshed');
    
    // Get user ID for safe reload
    const userId = this.getUserId();
    
    if (userId) {
      // Use safe reload to sync data first
      await safeReload(userId, 'chunk-error-boundary-refresh', false);
    } else {
      // No user logged in, safe to reload immediately
      window.location.reload();
    }
  };

  handleOpenSupport = () => {
    this.setState({ showSupportModal: true });
  };

  handleCloseSupport = () => {
    this.setState({ showSupportModal: false });
  };

  handleClearCacheAndReload = async () => {
    try {
      // Get user ID for safe reload
      const userId = this.getUserId();
      
      // Use safe reload with cache clearing
      if (userId) {
        await safeReload(userId, 'chunk-error-boundary-cache-clear', true);
      } else {
        // No user, clear caches manually and reload
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
      }
    } catch (error) {
      console.error('❌ Error clearing cache:', error);
      // Fallback to simple reload
      window.location.reload();
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
          backgroundColor: '#E8E4DC'
        }}>
          {/* Custom Error Image */}
          <img 
            src={errorImage} 
            alt="Error" 
            style={{
              maxWidth: '600px',
              width: '90%',
              height: 'auto',
              marginBottom: '3rem'
            }}
          />

          {/* Refresh Button */}
          <button
            onClick={this.handleReload}
            style={{
              padding: '1rem 3rem',
              fontSize: '1.1rem',
              backgroundColor: '#7B8A7A',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              transition: 'all 0.2s',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = '#5F7F76';
              e.target.style.transform = 'translateY(-2px)';
              e.target.style.boxShadow = '0 6px 12px rgba(0, 0, 0, 0.15)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = '#7B8A7A';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
            }}
          >
            Refresh Page
          </button>
          
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

