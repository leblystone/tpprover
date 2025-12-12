import React, { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { isValidRoute, clearCacheAndReload, hasAttemptedCacheClear, markCacheClearAttempt } from '../utils/routeCacheHelper'

export default function NotFound() {
  const location = useLocation()
  const navigate = useNavigate()
  const [isClearingCache, setIsClearingCache] = useState(false)
  const [shouldAutoClear, setShouldAutoClear] = useState(false)
  const [cacheClearFailed, setCacheClearFailed] = useState(false)

  useEffect(() => {
    const pathname = location.pathname
    
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
      <div className="text-center py-24">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4"></div>
        <h2 className="text-2xl font-semibold mb-2">Updating your app...</h2>
        <p className="text-gray-600 mb-6">
          We detected an outdated cache. Clearing it now and reloading...
        </p>
        <p className="text-sm text-gray-500">
          This should only take a moment.
        </p>
      </div>
    )
  }

  // Show fallback if cache clear was attempted but failed
  if (cacheClearFailed && shouldAutoClear) {
    return (
      <div className="text-center py-24">
        <h2 className="text-2xl font-semibold mb-2">Page not loading</h2>
        <p className="text-gray-600 mb-6">
          We tried to fix this automatically, but it didn't work. Please try refreshing the page.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleManualRefresh}
            className="inline-flex items-center px-4 py-2 rounded bg-gray-900 text-white hover:bg-gray-800"
          >
            Refresh Page
          </button>
          <Link
            className="inline-flex items-center px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
            to="/app"
          >
            Go to App
          </Link>
        </div>
      </div>
    )
  }

  // Normal 404 page for invalid routes
  return (
    <div className="text-center py-24">
      <h2 className="text-2xl font-semibold mb-2">Page not found</h2>
      <p className="text-gray-600 mb-6">The page you are looking for does not exist.</p>
      <Link className="inline-flex items-center px-4 py-2 rounded bg-gray-900 text-white" to="/app">Go to App</Link>
    </div>
  )
}