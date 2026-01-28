import React from 'react';
import { themes } from '../../theme/themes';
import SupportModal from './SupportModal';
import AppErrorFallback from './AppErrorFallback';
import { safeReload } from '../../utils/safeReload';

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
        
        // Clear all cache storage
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => {
              return caches.delete(cacheName);
            })
          );
        }

        // Unregister service workers
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        }

        // Clear session storage flag
        window.sessionStorage.removeItem('page_has_been_force_refreshed');

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
      return (
        <>
          <AppErrorFallback onReload={this.handleReload} />
          <SupportModal
            open={this.state.showSupportModal}
            onClose={this.handleCloseSupport}
            theme={themes.sage}
          />
        </>
      );
    }

    return this.props.children;
  }
}

export default ChunkErrorBoundary;

