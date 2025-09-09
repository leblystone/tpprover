import React, { useState, useEffect } from 'react'
import { CheckCircle, Clock, Truck, MapPin, RefreshCw } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getCachedTrackingInfo, detectCarrier, getMockTrackingInfo } from '../../services/tracking'

export default function UpcomingOrderCard({ order, theme }) {
  const navigate = useNavigate()
  const [trackingInfo, setTrackingInfo] = useState(null)
  const [isLoadingTracking, setIsLoadingTracking] = useState(false)
  const [trackingError, setTrackingError] = useState(null)
  
  // Fetch tracking information when order has tracking number
  useEffect(() => {
    async function fetchTracking() {
      if (!order?.tracking) return
      
      setIsLoadingTracking(true)
      setTrackingError(null)
      
      try {
        const carrier = detectCarrier(order.tracking)
        console.log(`📦 Fetching tracking for ${order.tracking} via ${carrier}`)
        
        // Use real API if Shippo key is available, otherwise use mock data
        const hasRealApiKey = import.meta.env.VITE_SHIPPO_API_KEY && !import.meta.env.VITE_SHIPPO_API_KEY.includes('test');
        
        let tracking;
        if (hasRealApiKey) {
          tracking = await getCachedTrackingInfo(order.tracking, carrier)
        } else {
          // Use mock data for development
          tracking = getMockTrackingInfo(order.tracking)
          console.log('🧪 Using mock tracking data (no real API key)')
        }
        
        if (tracking.error) {
          setTrackingError(tracking.error)
        } else {
          setTrackingInfo(tracking)
        }
      } catch (error) {
        console.error('Tracking fetch error:', error)
        setTrackingError('Failed to load tracking information')
      } finally {
        setIsLoadingTracking(false)
      }
    }
    
    fetchTracking()
  }, [order?.tracking])
  
  // Listen for manual refresh events
  useEffect(() => {
    const handleRefresh = (event) => {
      if (event.detail === order?.tracking) {
        // Clear cache and refetch
        if (order.tracking) {
          const cacheKey = `tracking_${order.tracking}`
          localStorage.removeItem(cacheKey)
          // Re-run fetch
          const fetchTracking = async () => {
            if (!order?.tracking) return
            
            setIsLoadingTracking(true)
            setTrackingError(null)
            
            try {
              const carrier = detectCarrier(order.tracking)
              const hasRealApiKey = import.meta.env.VITE_SHIPPO_API_KEY && !import.meta.env.VITE_SHIPPO_API_KEY.includes('test');
              
              let tracking;
              if (hasRealApiKey) {
                tracking = await getCachedTrackingInfo(order.tracking, carrier, false) // Force fresh data
              } else {
                tracking = getMockTrackingInfo(order.tracking)
              }
              
              if (tracking.error) {
                setTrackingError(tracking.error)
              } else {
                setTrackingInfo(tracking)
              }
            } catch (error) {
              console.error('Tracking refresh error:', error)
              setTrackingError('Failed to refresh tracking information')
            } finally {
              setIsLoadingTracking(false)
            }
          }
          fetchTracking()
        }
      }
    }
    
    window.addEventListener('refreshTracking', handleRefresh)
    return () => window.removeEventListener('refreshTracking', handleRefresh)
  }, [order?.tracking])
  
  if (!order) return (
    <div className="p-8 rounded-xl content-card w-full" style={{ backgroundColor: theme.cardBackground }}>
      <h3 className="h3 mb-6 border-b pb-3" style={{ color: theme.primaryDark, borderColor: theme.border }}>Incoming Peptides</h3>
      <p>No active orders.</p>
    </div>
  )

  const steps = [
    { status: 'received', icon: <Clock size={24} color={theme.primary} />, label: 'Order Placed' },
    { status: 'shipped', icon: <Truck size={24} color={theme.primary} />, label: 'In Transit' },
    { status: 'delivered', icon: <CheckCircle size={24} color={theme.primary} />, label: 'Delivered' },
  ]
  
  // Use real tracking data if available, otherwise fall back to order status
  let current = 0
  let displayStatus = order.status || 'Order Placed'
  let statusDetail = ''
  let lastLocation = ''
  
  if (trackingInfo && !trackingInfo.hasError) {
    current = trackingInfo.progress
    displayStatus = trackingInfo.status
    statusDetail = trackingInfo.statusDetail
    if (trackingInfo.location?.city && trackingInfo.location?.state) {
      lastLocation = `${trackingInfo.location.city}, ${trackingInfo.location.state}`
    }
  } else {
    // Fallback to manual status
    if (order.deliveryDate) current = 2
    else if (order.shipDate || (order.status && order.status.toLowerCase().includes('ship'))) current = 1
  }

  return (
    <div className="p-8 rounded-xl content-card w-full h-full flex flex-col items-center transition-opacity" style={{ backgroundColor: theme.cardBackground }}>
      <h3 className="h3 mb-4 border-b pb-2 text-center" style={{ color: theme.primaryDark, borderColor: theme.border }}>Incoming Peptides</h3>
      <div className="w-full flex flex-col items-center mb-6">
        <div className="text-xl font-bold mb-0" style={{ color: theme.primary }}>{order.peptide} {order.mg}mg</div>
        <div className="text-base mb-2" style={{ color: theme.textLight }}>
          <span style={{ fontWeight: 500, color: theme.text }}>From:</span> {order.vendor}
        </div>
        
        {/* Real-time tracking status */}
        {trackingInfo && !trackingInfo.hasError && (
          <div className="text-center mb-2">
            <div className="text-sm font-semibold" style={{ color: theme.text }}>
              {displayStatus}
            </div>
            {statusDetail && (
              <div className="text-xs" style={{ color: theme.textLight }}>
                {statusDetail}
              </div>
            )}
            {lastLocation && (
              <div className="text-xs flex items-center justify-center gap-1 mt-1" style={{ color: theme.textLight }}>
                <MapPin size={12} />
                {lastLocation}
              </div>
            )}
          </div>
        )}
        
        {/* Tracking number display */}
        {order.tracking && (
          <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded" style={{ color: theme.text }}>
            {order.tracking}
            {isLoadingTracking && <RefreshCw size={12} className="inline ml-1 animate-spin" />}
          </div>
        )}
        
        {/* Error display */}
        {trackingError && (
          <div className="text-xs text-red-600 mt-1">
            {trackingError}
          </div>
        )}
      </div>
      <div className="w-full flex items-center justify-between relative mb-8 px-4">
          <div 
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1" 
            style={{ 
              width: '100%',
              backgroundColor: theme.secondary 
            }}
          />
          <div 
            className="absolute top-1/2 -translate-y-1/2 left-0 h-1" 
            style={{ 
              width: `${(current / (steps.length - 1)) * 100}%`,
              backgroundColor: theme.primary,
              transition: 'width 0.3s ease-in-out'
            }}
          />
          {steps.map((s, idx) => (
            <div key={s.status} className="flex flex-col items-center z-10">
              <div
                className="rounded-full p-3 border-4"
                style={{ 
                  backgroundColor: idx <= current ? theme.primary : theme.cardBackground,
                  borderColor: idx <= current ? theme.primary : theme.secondary
                }}
              >
                {React.cloneElement(s.icon, { color: idx <= current ? theme.textOnPrimary : theme.textLight })}
              </div>
            </div>
          ))}
      </div>

      <div className="w-full flex justify-between px-4">
        {steps.map((s, idx) => (
            <span
              key={s.status}
              className="text-xs text-center"
              style={{ color: idx <= current ? theme.primaryDark : theme.textLight, fontWeight: idx <= current ? '600' : '400' }}
            >
              {s.label}
            </span>
        ))}
      </div>
      
      <div className="mt-8 w-full space-y-2">
        {order.tracking && (
          <button
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 w-full flex items-center justify-center gap-2"
            style={{ backgroundColor: theme.secondary, color: theme.text }}
            onClick={() => {
              // Force refresh tracking data
              if (order.tracking) {
                setTrackingInfo(null)
                // Re-trigger the useEffect by updating a dependency
                const event = new CustomEvent('refreshTracking', { detail: order.tracking })
                window.dispatchEvent(event)
              }
            }}
            disabled={isLoadingTracking}
          >
            <RefreshCw size={16} className={isLoadingTracking ? 'animate-spin' : ''} />
            {isLoadingTracking ? 'Updating...' : 'Refresh Tracking'}
          </button>
        )}
        
        <button
          className="px-6 py-3 rounded-lg font-semibold transition-all duration-200 w-full"
          style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          onClick={() => navigate('/orders')}
        >
          View Orders
        </button>
      </div>
    </div>
  )
}


