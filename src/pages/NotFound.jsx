import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isValidRoute, clearCacheAndReload, hasAttemptedCacheClear, markCacheClearAttempt } from '../utils/routeCacheHelper'
import { isNative, isIOS, isIOSBrowser, isIOSPWAInstalled } from '../utils/platform'
import error404Image from '../assets/404-error.png'

export default function NotFound() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isClearingCache, setIsClearingCache] = useState(false)
  const [shouldAutoClear, setShouldAutoClear] = useState(false)
  const [cacheClearFailed, setCacheClearFailed] = useState(false)

  useEffect(() => {
    const pathname = location.pathname
    
    // Skip auto-cache-clear logic for native apps - they don't use service workers
    // and cache clearing doesn't help with lazy loading issues on native
    if (isNative()) {
      console.log('📱 Native app detected - skipping auto-cache-clear logic')
      setShouldAutoClear(false)
      return
    }
    
    // Check if this is a valid route that should exist (likely a cache issue)
    if (isValidRoute(pathname)) {
      // Check if we've already tried to clear cache for this route
      if (!hasAttemptedCacheClear(pathname)) {
        console.log('🔍 Valid route detected but not found - likely cache issue:', pathname)
        setShouldAutoClear(true)
        setIsClearingCache(true)
        markCacheClearAttempt(pathname)
        
        // Auto-clear cache and reload
        clearCacheAndReload().catch(error => {
          console.error('❌ Failed to clear cache:', error)
          setIsClearingCache(false)
          setCacheClearFailed(true)
        })
      } else {
        console.log('⚠️ Already attempted cache clear for this route, showing error page')
        setShouldAutoClear(false)
        setCacheClearFailed(true)
      }
    } else {
      // Not a valid route, just show the error
      setShouldAutoClear(false)
    }
  }, [location.pathname])

  const handleManualRefresh = () => {
    // Clear cache and reload manually
    clearCacheAndReload()
  }

  // Show loading state while clearing cache
  if (isClearingCache && shouldAutoClear) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#E8E4DC]">
        <div className="text-center py-24">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#7B8A7A] mb-4"></div>
          <h2 className="text-2xl font-semibold mb-2 text-gray-800">Updating your app...</h2>
          <p className="text-gray-600 mb-6">
            We detected an outdated cache. Clearing it now and reloading...
          </p>
          <p className="text-sm text-gray-500">
            This should only take a moment.
          </p>
        </div>
      </div>
    )
  }

  // Show fallback if cache clear was attempted but failed
  if (cacheClearFailed && shouldAutoClear) {
    // Check if user is on iOS (Safari PWA or native)
    const isIOSDevice = isIOS() || isIOSBrowser() || isIOSPWAInstalled()
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#E8E4DC]">
        <div className="text-center py-24 px-4">
          <h2 className="text-2xl font-semibold mb-2 text-gray-800">Page not loading</h2>
          <p className="text-gray-600 mb-6">
            We tried to fix this automatically, but it didn't work. Please try refreshing the page.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <button
              onClick={handleManualRefresh}
              className="inline-flex items-center px-6 py-3 rounded-lg bg-[#7B8A7A] text-white hover:bg-[#6a7969] transition-colors font-medium shadow-lg"
            >
              Refresh Page
            </button>
            {!isIOSDevice && (
              <Link
                className="inline-flex items-center px-6 py-3 rounded-lg border-2 border-[#7B8A7A] text-[#7B8A7A] hover:bg-[#7B8A7A] hover:text-white transition-colors font-medium"
                to="/app"
              >
                Go to Dashboard
              </Link>
            )}
            {isIOSDevice && (
              <button
                onClick={() => navigate('/app')}
                className="inline-flex items-center px-6 py-3 rounded-lg border-2 border-[#7B8A7A] text-[#7B8A7A] hover:bg-[#7B8A7A] hover:text-white transition-colors font-medium"
              >
                Go to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Normal 404 page for invalid routes
  // Check if user is on iOS (Safari PWA or native)
  const isIOSDevice = isIOS() || isIOSBrowser() || isIOSPWAInstalled()
  return (
    <div className="flex items-center justify-center min-h-screen bg-[#E8E4DC] px-4">
      <div className="text-center max-w-2xl w-full">
        <img 
          src={error404Image} 
          alt="404 Error - Page not found" 
          className="w-full max-w-xl mx-auto mb-8"
          style={{ maxHeight: '70vh', objectFit: 'contain' }}
        />
        {!isIOSDevice && (
          <Link 
            className="inline-flex items-center px-6 py-3 rounded-lg bg-[#7B8A7A] text-white hover:bg-[#6a7969] transition-colors text-lg font-medium shadow-lg" 
            to="/app"
          >
            Go to Dashboard
          </Link>
        )}
        {isIOSDevice && (
          <button
            onClick={() => navigate('/app')}
            className="inline-flex items-center px-6 py-3 rounded-lg bg-[#7B8A7A] text-white hover:bg-[#6a7969] transition-colors text-lg font-medium shadow-lg"
          >
            Go to Dashboard
          </button>
        )}
      </div>
    </div>
  )
}