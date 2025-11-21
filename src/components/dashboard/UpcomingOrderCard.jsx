import React, { useState, useEffect } from 'react'
import { CheckCircle, Clock, Truck, MapPin, RefreshCw, Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { getCachedTrackingInfo, detectCarrier, getMockTrackingInfo } from '../../services/tracking'
import { formatMMDDYYYY } from '../../utils/date'

export default function UpcomingOrderCard({ orders, order, theme, hideHeader = false }) {
  const navigate = useNavigate()
  const [trackingInfo, setTrackingInfo] = useState(null)
  const [isLoadingTracking, setIsLoadingTracking] = useState(false)
  const [trackingError, setTrackingError] = useState(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  
  // Use orders array if provided, otherwise fall back to single order prop
  // Explicitly check if orders is provided (even if empty array) vs undefined
  const hasOrdersProp = orders !== undefined && orders !== null
  const ordersList = hasOrdersProp && Array.isArray(orders) 
    ? orders 
    : (order ? [order] : [])
  const currentOrder = ordersList[currentIndex] || null
  
  // Debug logging
  console.log('📦 UpcomingOrderCard orders:', {
    ordersProp: orders,
    ordersPropType: typeof orders,
    ordersPropIsArray: Array.isArray(orders),
    ordersPropLength: orders?.length,
    hasOrdersProp,
    orderProp: order,
    ordersList: ordersList,
    ordersListLength: ordersList.length,
    currentIndex,
    currentOrder: currentOrder?.id,
    showPagination: ordersList.length > 1
  })
  
  // Reset index if it's out of bounds
  useEffect(() => {
    if (ordersList.length === 0) {
      setCurrentIndex(0)
    } else if (currentIndex >= ordersList.length) {
      setCurrentIndex(Math.max(0, ordersList.length - 1))
    }
  }, [ordersList.length, currentIndex])
  
  // Reset tracking info when order changes
  useEffect(() => {
    setTrackingInfo(null)
    setTrackingError(null)
  }, [currentOrder?.id])
  
  const handlePrevious = (e) => {
    e?.stopPropagation()
    setCurrentIndex(prev => Math.max(0, prev - 1))
  }
  
  const handleNext = (e) => {
    e?.stopPropagation()
    setCurrentIndex(prev => Math.min(ordersList.length - 1, prev + 1))
  }
  
  // Fetch tracking information when order has tracking number
  useEffect(() => {
    async function fetchTracking() {
      if (!currentOrder?.tracking) return
      
      setIsLoadingTracking(true)
      setTrackingError(null)
      
      try {
        const carrier = detectCarrier(currentOrder.tracking)
        
        // Use real API if Shippo key is available, otherwise use mock data
        const hasRealApiKey = import.meta.env.VITE_SHIPPO_API_KEY && !import.meta.env.VITE_SHIPPO_API_KEY.includes('test');
        
        let tracking;
        if (hasRealApiKey) {
          tracking = await getCachedTrackingInfo(currentOrder.tracking, carrier)
        } else {
          // Use mock data for development
          tracking = getMockTrackingInfo(currentOrder.tracking)
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
  }, [currentOrder?.tracking])
  
  // Listen for manual refresh events
  useEffect(() => {
    const handleRefresh = (event) => {
      if (event.detail === currentOrder?.tracking) {
        // Clear cache and refetch
        if (currentOrder.tracking) {
          const cacheKey = `tracking_${currentOrder.tracking}`
          localStorage.removeItem(cacheKey)
          // Re-run fetch
          const fetchTracking = async () => {
            if (!currentOrder?.tracking) return
            
            setIsLoadingTracking(true)
            setTrackingError(null)
            
            try {
              const carrier = detectCarrier(currentOrder.tracking)
              const hasRealApiKey = import.meta.env.VITE_SHIPPO_API_KEY && !import.meta.env.VITE_SHIPPO_API_KEY.includes('test');
              
              let tracking;
              if (hasRealApiKey) {
                tracking = await getCachedTrackingInfo(currentOrder.tracking, carrier, false) // Force fresh data
              } else {
                tracking = getMockTrackingInfo(currentOrder.tracking)
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
  }, [currentOrder?.tracking])
  
  if (!currentOrder) return (
    <div className="p-4 rounded-xl content-card w-full" style={{ backgroundColor: theme.cardBackground }}>
      {!hideHeader && (
        <div className="px-3 py-2 border-b mb-3" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold" style={{ color: theme.text }}>
              Incoming Peptides
            </h3>
            <Truck size={18} style={{ color: theme.primary }} />
          </div>
        </div>
      )}
      <p className="text-sm">No active orders.</p>
    </div>
  )

  const steps = [
    { status: 'received', icon: <Clock size={20} color={theme.primary} />, label: 'Order Placed' },
    { status: 'shipped', icon: <Truck size={20} color={theme.primary} />, label: 'In Transit' },
    { status: 'delivered', icon: <CheckCircle size={20} color={theme.primary} />, label: 'Delivered' },
  ]
  
  // Use real tracking data if available, otherwise fall back to order status
  // IMPORTANT: Don't override manual order status with mock tracking data
  let current = 0
  let displayStatus = currentOrder?.status || 'Order Placed'
  let statusDetail = ''
  
  // Only use tracking data if it's REAL (not mock) and doesn't have errors
  const isRealTrackingData = trackingInfo && !trackingInfo.hasError && !trackingInfo.isMockData
  
  if (isRealTrackingData) {
    // Use real tracking data to override manual status
    current = trackingInfo.progress
    displayStatus = trackingInfo.status
    statusDetail = trackingInfo.statusDetail
  } else {
    // Use manual order status - respect what user entered
    const statusLower = (currentOrder?.status || '').toLowerCase()
    
    if (currentOrder?.deliveryDate || statusLower.includes('delivered')) {
      current = 2
      displayStatus = 'Delivered'
    } else if (statusLower.includes('ship') || statusLower.includes('transit') || statusLower.includes('in transit')) {
      current = 1
      displayStatus = currentOrder?.status || 'In Transit'
      statusDetail = 'Package in transit to destination'
    } else {
      current = 0
      displayStatus = currentOrder?.status || 'Order Placed'
    }
  }

  const handleWidgetClick = (e) => {
    // Don't navigate if clicking on interactive elements
    if (e.target.closest('a, button')) {
      return
    }
    if (currentOrder?.id) {
      navigate('/app/orders', { state: { openOrderId: currentOrder.id } })
    } else {
      navigate('/app/orders')
    }
  }

  return (
    <div 
      className={`${hideHeader ? 'p-3' : 'p-4'} w-full h-full flex flex-col transition-all min-h-0 rounded-xl content-card`} 
      style={{ 
        backgroundColor: theme.cardBackground, 
        borderColor: theme.border,
        cursor: currentOrder?.id ? 'pointer' : 'default'
      }}
      onClick={handleWidgetClick}
      onMouseEnter={(e) => {
        if (currentOrder?.id) {
          e.currentTarget.style.boxShadow = theme.isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)'
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {!hideHeader && (
        <div className="px-3 py-2 border-b mb-3 flex-shrink-0" style={{ borderColor: theme.border }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold" style={{ color: theme.text }}>
                Incoming Orders
              </h3>
              <Truck size={18} style={{ color: theme.primary }} />
            </div>
            {currentOrder?.tracking ? (
              <button
                onClick={(e) => {
                  e.stopPropagation() // Prevent widget click
                  // Force refresh tracking data
                  if (currentOrder.tracking) {
                    setTrackingInfo(null)
                    // Re-trigger the useEffect by updating a dependency
                    const event = new CustomEvent('refreshTracking', { detail: currentOrder.tracking })
                    window.dispatchEvent(event)
                  }
                }}
                disabled={isLoadingTracking}
                className="p-1.5 rounded-md transition-all flex-shrink-0 relative z-20 flex items-center justify-center min-w-[32px] min-h-[32px]"
                style={{ 
                  color: theme.primary,
                  cursor: isLoadingTracking ? 'not-allowed' : 'pointer',
                  backgroundColor: 'transparent',
                  border: 'none',
                  outline: 'none'
                }}
                title={isLoadingTracking ? 'Updating...' : 'Refresh Tracking'}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                <RefreshCw 
                  size={18} 
                  className={isLoadingTracking ? 'animate-spin' : ''}
                  style={{ 
                    color: theme.primary,
                    display: 'block'
                  }}
                />
              </button>
            ) : null}
          </div>
        </div>
      )}
      <div className="w-full flex flex-col mb-3 flex-shrink-0">
        <div className="text-base font-semibold mb-1 text-center" style={{ color: theme.primary }}>{currentOrder?.peptide || 'N/A'} {currentOrder?.mg || ''}mg</div>
        <div className="text-xs mb-2 text-center" style={{ color: theme.textLight }}>
          <span style={{ fontWeight: 500, color: theme.text }}>Vendor:</span> {currentOrder?.vendor || 'Unknown'}
        </div>
        
        {/* Only show location for REAL tracking data, not mock */}
        {isRealTrackingData && trackingInfo.location && (
          <div className="mb-2 text-center">
            <div className="text-xs flex items-center justify-center gap-1" style={{ color: theme.textLight }}>
              <MapPin size={10} />
              {[
                trackingInfo.location.city,
                trackingInfo.location.state,
                trackingInfo.location.country
              ].filter(Boolean).join(', ')}
            </div>
          </div>
        )}
        
        {/* Tracking number display */}
        {currentOrder?.tracking && (() => {
          // Prioritize carrier from API response (most accurate), then fall back to detection
          const detectedCarrier = detectCarrier(currentOrder.tracking)
          // Get carrier from trackingInfo - check both direct property and ensure it's a valid string
          const carrierFromAPI = trackingInfo?.carrier && typeof trackingInfo.carrier === 'string' && trackingInfo.carrier.trim() 
            ? trackingInfo.carrier.trim().toLowerCase() 
            : null
          
          const carrierToUse = carrierFromAPI || detectedCarrier
          const carrierDisplay = carrierToUse ? carrierToUse.toUpperCase() : 'USPS'
          
          // Create Google tracking URL
          const googleTrackingUrl = `https://www.google.com/search?q=${encodeURIComponent(currentOrder.tracking + ' tracking')}`
          
          return (
            <div className="mb-2">
              <a
                href={googleTrackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded transition-all hover:opacity-80 break-all w-full"
                style={{ 
                  backgroundColor: theme.secondary, 
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  textDecoration: 'none',
                  cursor: 'pointer'
                }}
                onClick={(e) => {
                  // Allow the link to work normally
                  e.stopPropagation()
                }}
              >
                <span style={{ color: theme.textLight, fontWeight: 500 }}>Tracking Number:</span>
                <span className="font-mono flex-1">{currentOrder.tracking}</span>
                <div className="text-xs px-2 py-0.5 rounded flex-shrink-0" style={{ 
                  backgroundColor: theme.primary + '20', 
                  color: theme.primary,
                  fontWeight: 600
                }}>
                  {carrierDisplay}
                </div>
                {isLoadingTracking && <RefreshCw size={12} className="animate-spin flex-shrink-0" style={{ color: theme.primary }} />}
              </a>
            </div>
          )
        })()}
        
        {/* Error display */}
        {trackingError && (
          <div className="text-xs mt-1 mb-2 px-2 py-1 rounded" style={{ backgroundColor: theme.errorBg || '#fee2e2', color: theme.error || '#dc2626' }}>
            {trackingError}
          </div>
        )}
      </div>
      <div className="w-full mb-4 flex-shrink-0">
        <div className="w-full flex items-center justify-between relative mb-2">
          <div 
            className="absolute top-1/2 -translate-y-1/2 left-0 right-0 h-1" 
            style={{ 
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
            <div key={s.status} className="flex flex-col items-center z-10 relative">
              <div
                className="rounded-full p-1.5 border-2 flex items-center justify-center"
                style={{ 
                  backgroundColor: idx <= current ? theme.primary : theme.cardBackground,
                  borderColor: idx <= current ? theme.primary : theme.secondary
                }}
              >
                {React.cloneElement(s.icon, { 
                  size: 16,
                  color: idx <= current ? theme.textOnPrimary : theme.textLight 
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="w-full flex justify-between flex-shrink-0">
          {steps.map((s, idx) => {
            // Get dates for display below "Order Placed" - only compute once for first step
            if (idx === 0) {
              const orderDate = currentOrder?.date || currentOrder?.shipDate;
              const deliveryDate = currentOrder?.deliveryDate;
              const hasDates = orderDate || deliveryDate;
              
              return (
                <div key={s.status} className="flex flex-col items-center flex-1">
                  <span
                    className="text-xs text-center"
                    style={{ color: idx <= current ? theme.primaryDark : theme.textLight, fontWeight: idx <= current ? '600' : '400' }}
                  >
                    {s.label}
                  </span>
                  {hasDates && (
                    <div className="flex flex-col items-center gap-0.5 mt-1 text-xs">
                      {orderDate && (
                        <div style={{ color: theme.textLight, fontSize: '10px' }}>
                          {formatMMDDYYYY(orderDate)}
                        </div>
                      )}
                      {deliveryDate && (
                        <div style={{ color: theme.textLight, fontSize: '10px' }}>
                          {formatMMDDYYYY(deliveryDate)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }
            
            return (
              <div key={s.status} className="flex flex-col items-center flex-1">
                <span
                  className="text-xs text-center"
                  style={{ color: idx <= current ? theme.primaryDark : theme.textLight, fontWeight: idx <= current ? '600' : '400' }}
                >
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Pagination controls */}
      {(() => {
        const shouldShow = ordersList.length > 1;
        console.log('🔍 Pagination check:', {
          ordersListLength: ordersList.length,
          shouldShow,
          ordersList: ordersList.map(o => o?.id)
        });
        if (!shouldShow) return null;
        
        return (
        <div className="mt-auto w-full flex items-center justify-center gap-2 pt-2 pb-2 border-t flex-shrink-0" style={{ borderColor: theme.border }} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="p-1.5 rounded-md transition-all flex items-center justify-center"
            style={{ 
              color: currentIndex === 0 ? theme.textLight : theme.primary,
              cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              opacity: currentIndex === 0 ? 0.5 : 1
            }}
            title="Previous order"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs" style={{ color: theme.textLight }}>
            {currentIndex + 1} / {ordersList.length}
          </span>
          <button
            onClick={handleNext}
            disabled={currentIndex >= ordersList.length - 1}
            className="p-1.5 rounded-md transition-all flex items-center justify-center"
            style={{ 
              color: currentIndex >= ordersList.length - 1 ? theme.textLight : theme.primary,
              cursor: currentIndex >= ordersList.length - 1 ? 'not-allowed' : 'pointer',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              opacity: currentIndex >= ordersList.length - 1 ? 0.5 : 1
            }}
            title="Next order"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        );
      })()}
    </div>
  )
}


