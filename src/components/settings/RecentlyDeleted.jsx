import React, { useState, useEffect } from 'react'
import { RotateCcw, Clock, Trash2, Plus, Eye } from 'lucide-react'
import { getDeletedItemsForRestore, clearDeletionRecord, isDeleted } from '../../utils/deletionTracking'
import { useAppContext } from '../../context/AppContext'
import { useFirebase } from '../../context/FirebaseContext'
import { saveAppData } from '../../services/cloudStorage'
import { prepareItemForSave } from '../../utils/userDataSave'
import Modal from '../common/Modal'

export default function RecentlyDeleted({ theme }) {
  const [deletedItems, setDeletedItems] = useState([])
  const [restoring, setRestoring] = useState(null) // itemId being restored
  const [showAllModal, setShowAllModal] = useState(false)
  const { 
    protocols = [], setProtocols,
    orders = [], setOrders,
    stockpile = [], setStockpile,
    scheduledBuys = [], setScheduledBuys,
    reconItems = [], setReconItems,
    reconHistory = [], setReconHistory,
    supplements = [], setSupplements,
    vendors = [], setVendors,
    metrics = [], setMetrics
  } = useAppContext()
  const { firebaseUser } = useFirebase()

  // Load deleted items
  useEffect(() => {
    loadDeletedItems()
    // Refresh every 10 seconds in case new deletions occur
    const interval = setInterval(loadDeletedItems, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadDeletedItems = () => {
    const items = getDeletedItemsForRestore()
    setDeletedItems(items)
  }

  const getItemLabel = (dataType) => {
    switch (dataType) {
      case 'protocols':
        return 'Protocol'
      case 'orders':
        return 'Order'
      case 'stockpile':
        return 'Stockpile Item'
      case 'scheduledBuys':
        return 'Scheduled Buy'
      case 'reconItems':
        return 'Reconstitution'
      case 'reconHistory':
        return 'Recon History'
      case 'supplements':
        return 'Supplement'
      case 'vendors':
        return 'Vendor'
      case 'metrics':
        return 'Body Metric'
      case 'goals':
        return 'Goal'
      case 'userNotes':
        return 'Note'
      default:
        return 'Item'
    }
  }

  const getItemDisplayName = (item) => {
    const { dataType, itemData } = item
    
    switch (dataType) {
      case 'protocols':
        return itemData.protocolName || itemData.name || 'Unnamed Protocol'
      case 'orders':
        return itemData.publicOrderNumber || itemData.peptide || `Order ${item.itemId.slice(-6)}`
      case 'stockpile':
        return itemData.name || `${itemData.mg || ''}mg`
      case 'scheduledBuys':
        return itemData.name || itemData.peptideName || itemData.item || 'Scheduled Buy'
      case 'reconItems':
        return `${itemData.peptide || 'Unknown'} ${itemData.mg || ''}mg`
      case 'reconHistory':
        return `${itemData.peptide || 'Unknown'} - ${itemData.date || 'No date'}`
      case 'supplements':
        return itemData.name || 'Unnamed Supplement'
      case 'vendors':
        return itemData.name || 'Unnamed Vendor'
      case 'metrics':
        return itemData.name || itemData.type || 'Body Metric'
      case 'goals':
        return itemData.title || 'Unnamed Goal'
      case 'userNotes':
        return itemData.title || itemData.content?.substring(0, 30) || 'Note'
      default:
        return `${dataType} ${item.itemId.slice(-6)}`
    }
  }

  const formatDate = (timestamp) => {
    const date = new Date(timestamp)
    const now = Date.now()
    const diffMs = now - timestamp
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60))
        return diffMins <= 1 ? 'Just now' : `${diffMins} minutes ago`
      }
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
    } else if (diffDays === 1) {
      return 'Yesterday'
    } else if (diffDays < 7) {
      return `${diffDays} days ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  const formatFullDate = (timestamp) => {
    if (!timestamp) return 'Unknown'
    const date = new Date(timestamp)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getCreatedDate = (itemData) => {
    // Try multiple possible fields for creation date
    return itemData.createdAt || itemData.date || itemData.startDate || itemData.created || null
  }

  const handleRestore = async (item) => {
    const { dataType, itemId, itemData } = item
    setRestoring(itemId)

    try {
      // CRITICAL: Clear deletion record FIRST before restoring
      // This prevents mergeWithTimestamps from excluding the restored item
      console.log(`🔄 Restoring ${dataType}/${itemId}...`)
      clearDeletionRecord(dataType, itemId)
      console.log(`✅ Deletion record cleared for ${dataType}/${itemId}`)
      
      // Verify deletion record is actually cleared
      if (isDeleted(dataType, itemId)) {
        console.error(`❌ Deletion record still exists after clear! This will cause restore to fail.`)
        throw new Error('Failed to clear deletion record')
      }
      
      // Add item back to the appropriate array
      switch (dataType) {
        case 'protocols': {
          // Check if item already exists (prevent duplicates)
          const existing = protocols.find(p => p.id === itemData.id)
          if (existing) {
            console.warn('⚠️ Protocol already exists, skipping restore:', itemData.id)
            break
          }
          // Update item timestamp for proper sync
          const restoredItem = prepareItemForSave(itemData)
          const updated = [...(protocols || []), restoredItem]
          setProtocols(updated)
          // Update localStorage immediately
          try {
            localStorage.setItem('tpprover_protocols', JSON.stringify(updated))
            // Trigger update event for components that might be listening
            window.dispatchEvent(new CustomEvent('tpp:protocols-updated', { detail: { protocols: updated } }))
          } catch (e) {
            console.error('Failed to save protocols to localStorage:', e)
          }
          if (firebaseUser) {
            console.log(`☁️ Syncing restored protocol to cloud: ${itemData.id}`)
            await saveAppData(firebaseUser.uid, { protocols: updated }, { skipMerge: false })
            console.log(`✅ Protocol restored and synced: ${itemData.id}`)
          }
          break
        }
        case 'orders': {
          // Check if item already exists (prevent duplicates)
          const existing = orders.find(o => o.id === itemData.id)
          if (existing) {
            console.warn('⚠️ Order already exists, skipping restore:', itemData.id)
            break
          }
          const restoredItem = prepareItemForSave(itemData)
          const updated = [...(orders || []), restoredItem]
          setOrders(updated)
          // Update localStorage immediately
          try {
            localStorage.setItem('tpprover_orders', JSON.stringify(updated))
            // Trigger update event for components that might be listening
            window.dispatchEvent(new CustomEvent('tpp:orders-updated', { detail: { orders: updated } }))
          } catch (e) {
            console.error('Failed to save orders to localStorage:', e)
          }
          if (firebaseUser) {
            await saveAppData(firebaseUser.uid, { orders: updated }, { skipMerge: false })
          }
          break
        }
        case 'stockpile': {
          // Check if item already exists (prevent duplicates)
          const existing = stockpile.find(s => s.id === itemData.id)
          if (existing) {
            console.warn('⚠️ Stockpile item already exists, skipping restore:', itemData.id)
            break
          }
          const restoredItem = prepareItemForSave(itemData)
          const updated = [...(stockpile || []), restoredItem]
          setStockpile(updated)
          // Update localStorage immediately
          try {
            localStorage.setItem('tpprover_stockpile', JSON.stringify(updated))
            // Trigger update event for components that might be listening
            window.dispatchEvent(new CustomEvent('tpp:stockpile-updated', { detail: { stockpile: updated } }))
          } catch (e) {
            console.error('Failed to save stockpile to localStorage:', e)
          }
          if (firebaseUser) {
            await saveAppData(firebaseUser.uid, { stockpile: updated }, { skipMerge: false })
          }
          break
        }
        case 'scheduledBuys': {
          const restoredItem = prepareItemForSave(itemData)
          const updated = [...(scheduledBuys || []), restoredItem]
          setScheduledBuys(updated)
          // Also update localStorage for scheduled buys
          try {
            localStorage.setItem('tpprover_scheduled_buys', JSON.stringify(updated))
            localStorage.setItem('tpprover_scheduledBuys_lastUpdate', String(Date.now()))
            window.dispatchEvent(new CustomEvent('tpp:scheduled-buys-updated', {
              detail: { scheduledBuys: updated }
            }))
          } catch (e) {
            console.error('Failed to save scheduled buys to localStorage:', e)
          }
          if (firebaseUser) {
            await saveAppData(firebaseUser.uid, { scheduledBuys: updated }, { skipMerge: false })
          }
          break
        }
        case 'reconItems': {
          // Check if item already exists (prevent duplicates)
          const existing = reconItems.find(r => r.id === itemData.id)
          if (existing) {
            console.warn('⚠️ Recon item already exists, skipping restore:', itemData.id)
            break
          }
          const restoredItem = prepareItemForSave(itemData)
          const updated = [...(reconItems || []), restoredItem]
          setReconItems(updated)
          // Update localStorage immediately
          try {
            localStorage.setItem('tpprover_recon_items', JSON.stringify(updated))
            // Trigger update event for components that might be listening
            window.dispatchEvent(new CustomEvent('tpp:recon-items-updated', { detail: { reconItems: updated } }))
          } catch (e) {
            console.error('Failed to save recon items to localStorage:', e)
          }
          if (firebaseUser) {
            await saveAppData(firebaseUser.uid, { reconItems: updated }, { skipMerge: false })
          }
          break
        }
        case 'reconHistory': {
          // Check if item already exists (prevent duplicates)
          const existing = reconHistory.find(r => r.id === itemData.id)
          if (existing) {
            console.warn('⚠️ Recon history already exists, skipping restore:', itemData.id)
            break
          }
          const restoredItem = prepareItemForSave(itemData)
          const updated = [...(reconHistory || []), restoredItem]
          setReconHistory(updated)
          // Update localStorage immediately
          try {
            localStorage.setItem('tpprover_recon_history', JSON.stringify(updated))
            // Trigger update event for components that might be listening
            window.dispatchEvent(new CustomEvent('tpp:recon-history-updated', { detail: { reconHistory: updated } }))
          } catch (e) {
            console.error('Failed to save recon history to localStorage:', e)
          }
          if (firebaseUser) {
            await saveAppData(firebaseUser.uid, { reconHistory: updated }, { skipMerge: false })
          }
          break
        }
        case 'supplements': {
          // Check if item already exists (prevent duplicates)
          const existing = supplements.find(s => s.id === itemData.id)
          if (existing) {
            console.warn('⚠️ Supplement already exists, skipping restore:', itemData.id)
            break
          }
          const restoredItem = prepareItemForSave(itemData)
          const updated = [...(supplements || []), restoredItem]
          setSupplements(updated)
          // Update localStorage immediately
          try {
            localStorage.setItem('tpprover_supplements', JSON.stringify(updated))
            // Trigger update event for components that might be listening
            window.dispatchEvent(new CustomEvent('tpp:supplements-updated', { detail: { supplements: updated } }))
          } catch (e) {
            console.error('Failed to save supplements to localStorage:', e)
          }
          if (firebaseUser) {
            console.log(`☁️ Syncing restored supplement to cloud: ${itemData.id}`)
            await saveAppData(firebaseUser.uid, { supplements: updated }, { skipMerge: false })
            console.log(`✅ Supplement restored and synced: ${itemData.id}`)
          }
          break
        }
        case 'vendors': {
          // Check if item already exists (prevent duplicates)
          const existing = vendors.find(v => v.id === itemData.id)
          if (existing) {
            console.warn('⚠️ Vendor already exists, skipping restore:', itemData.id)
            break
          }
          const restoredItem = prepareItemForSave(itemData)
          const updated = [...(vendors || []), restoredItem]
          setVendors(updated)
          // Update localStorage immediately
          try {
            localStorage.setItem('tpprover_vendors', JSON.stringify(updated))
            // Trigger update event for components that might be listening
            window.dispatchEvent(new CustomEvent('tpp:vendors-updated', { detail: { vendors: updated } }))
          } catch (e) {
            console.error('Failed to save vendors to localStorage:', e)
          }
          if (firebaseUser) {
            await saveAppData(firebaseUser.uid, { vendors: updated }, { skipMerge: false })
          }
          break
        }
        case 'metrics': {
          // Check if item already exists (prevent duplicates)
          const existing = metrics.find(m => m.id === itemData.id)
          if (existing) {
            console.warn('⚠️ Metric already exists, skipping restore:', itemData.id)
            break
          }
          const restoredItem = prepareItemForSave(itemData)
          const updated = [...(metrics || []), restoredItem]
          setMetrics(updated)
          // Update localStorage immediately
          try {
            localStorage.setItem('tpprover_metrics', JSON.stringify(updated))
            // Trigger update event for components that might be listening
            window.dispatchEvent(new CustomEvent('tpp:metrics-updated', { detail: { metrics: updated } }))
          } catch (e) {
            console.error('Failed to save metrics to localStorage:', e)
          }
          if (firebaseUser) {
            await saveAppData(firebaseUser.uid, { metrics: updated }, { skipMerge: false })
          }
          break
        }
        case 'goals': {
          // Goals are stored in localStorage
          try {
            const allGoalsStr = localStorage.getItem('tpprover_user_goals')
            let allGoals = allGoalsStr ? JSON.parse(allGoalsStr) : []
            allGoals = [...allGoals, itemData]
            localStorage.setItem('tpprover_user_goals', JSON.stringify(allGoals))
            window.dispatchEvent(new CustomEvent('tpp:goals-updated'))
          } catch (e) {
            console.error('Failed to restore goal:', e)
          }
          break
        }
        case 'userNotes': {
          // User notes are stored in localStorage
          try {
            const notesStr = localStorage.getItem('tpprover_user_notes')
            let notes = notesStr ? JSON.parse(notesStr) : []
            notes = [...notes, itemData]
            localStorage.setItem('tpprover_user_notes', JSON.stringify(notes))
            window.dispatchEvent(new CustomEvent('tpp:notes-updated'))
          } catch (e) {
            console.error('Failed to restore note:', e)
          }
          break
        }
        default:
          console.warn('Unknown data type for restore:', dataType)
      }

      // Refresh the list (this will update deletedItems state)
      const updatedItems = getDeletedItemsForRestore()
      setDeletedItems(updatedItems)
      
      // Close modal if no items left
      if (updatedItems.length === 0 && showAllModal) {
        setShowAllModal(false)
      }

      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: {
          message: `${getItemLabel(dataType)} restored successfully! ✅`,
          type: 'success',
          duration: 3000
        }
      }))
    } catch (error) {
      console.error('Error restoring item:', error)
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: {
          message: 'Failed to restore item. Please try again.',
          type: 'error',
          duration: 4000
        }
      }))
    } finally {
      setRestoring(null)
    }
  }

  if (deletedItems.length === 0) {
    return (
      <div 
        className="p-4 rounded-[2rem] border-2 transition-all shadow-sm"
        style={{ backgroundColor: theme.cardBackground, borderColor: 'transparent' }}
      >
        <div className="mb-3">
          <p className="text-[10px] opacity-50 leading-relaxed text-center" style={{ color: theme.text }}>
            Items deleted in the last 14 days will appear here. You can restore accidentally deleted protocols, orders, or stockpile items.
          </p>
        </div>
        <div className="p-4 text-center rounded-xl border border-dashed" style={{ borderColor: theme.border }}>
          <p className="text-xs opacity-50" style={{ color: theme.text }}>
            No recently deleted items
          </p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="p-4 rounded-[2rem] border-2 transition-all shadow-sm"
      style={{ backgroundColor: theme.cardBackground, borderColor: 'transparent' }}
    >
      <div className="mb-3">
        <p className="text-[10px] opacity-50 leading-relaxed text-center" style={{ color: theme.text }}>
          Items deleted in the last 14 days. Click restore to recover accidentally deleted items.
        </p>
      </div>
      
      <div className="space-y-2">
        {deletedItems.slice(0, 2).map((item) => {
          const isRestoring = restoring === item.itemId
          return (
            <div
              key={`${item.dataType}-${item.itemId}`}
              className="flex items-center gap-3 p-3 rounded-xl border transition-all"
              style={{ 
                borderColor: theme.border,
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                opacity: isRestoring ? 0.6 : 1
              }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span 
                    className="text-xs font-semibold px-1.5 py-0.5 rounded"
                    style={{ 
                      backgroundColor: theme.primary + '20', 
                      color: theme.primary 
                    }}
                  >
                    {getItemLabel(item.dataType)}
                  </span>
                </div>
                <p 
                  className="text-sm font-medium truncate"
                  style={{ color: theme.text }}
                  title={getItemDisplayName(item)}
                >
                  {getItemDisplayName(item)}
                </p>
                <div className="flex flex-col gap-1 mt-1">
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} style={{ color: theme.mutedText }} />
                    <span className="text-xs" style={{ color: theme.mutedText }}>
                      Deleted: {formatDate(item.timestamp)}
                    </span>
                  </div>
                  {getCreatedDate(item.itemData) && (
                    <div className="flex items-center gap-1.5">
                      <Plus size={10} style={{ color: theme.mutedText, opacity: 0.6 }} />
                      <span className="text-xs opacity-75" style={{ color: theme.mutedText }}>
                        Created: {formatFullDate(getCreatedDate(item.itemData))}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleRestore(item)}
                disabled={isRestoring}
                className="px-4 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 active:scale-95"
                style={{
                  backgroundColor: theme.primary,
                  color: '#FFFFFF'
                }}
              >
                <RotateCcw 
                  size={12} 
                  className={isRestoring ? 'animate-spin' : ''} 
                />
                {isRestoring ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          )
        })}
      </div>
      
      {deletedItems.length > 2 && (
        <div className="mt-3">
          <button
            onClick={() => setShowAllModal(true)}
            className="w-full px-6 py-3 rounded-2xl font-medium uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border active:scale-95"
            style={{
              borderColor: theme.border,
              color: theme.text
            }}
          >
            <Eye size={14} />
            View All ({deletedItems.length})
          </button>
        </div>
      )}
      
      {/* View All Modal */}
      <Modal
        open={showAllModal}
        onClose={() => setShowAllModal(false)}
        title="All Recently Deleted Items"
        theme={theme}
        variant="modern"
        maxWidth="max-w-3xl"
      >
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {deletedItems.length === 0 ? (
            <div className="text-center py-8">
              <Trash2 size={32} className="mx-auto mb-2 opacity-50" style={{ color: theme.mutedText }} />
              <p className="text-sm" style={{ color: theme.mutedText }}>
                No recently deleted items
              </p>
            </div>
          ) : (
            deletedItems.map((item) => {
              const isRestoring = restoring === item.itemId
              return (
                <div
                  key={`${item.dataType}-${item.itemId}`}
                  className="flex items-center gap-3 p-3 rounded-lg border transition-all"
                  style={{ 
                    borderColor: theme.border,
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'transparent',
                    opacity: isRestoring ? 0.6 : 1
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span 
                        className="text-xs font-semibold px-1.5 py-0.5 rounded"
                        style={{ 
                          backgroundColor: theme.primary + '20', 
                          color: theme.primary 
                        }}
                      >
                        {getItemLabel(item.dataType)}
                      </span>
                    </div>
                    <p 
                      className="text-sm font-medium"
                      style={{ color: theme.text }}
                      title={getItemDisplayName(item)}
                    >
                      {getItemDisplayName(item)}
                    </p>
                    <div className="flex flex-col gap-1 mt-1">
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} style={{ color: theme.mutedText }} />
                        <span className="text-xs" style={{ color: theme.mutedText }}>
                          Deleted: {formatDate(item.timestamp)}
                        </span>
                      </div>
                      {getCreatedDate(item.itemData) && (
                        <div className="flex items-center gap-1.5">
                          <Plus size={10} style={{ color: theme.mutedText, opacity: 0.6 }} />
                          <span className="text-xs opacity-75" style={{ color: theme.mutedText }}>
                            Created: {formatFullDate(getCreatedDate(item.itemData))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      handleRestore(item)
                      if (deletedItems.length <= 1) {
                        setShowAllModal(false)
                      }
                    }}
                    disabled={isRestoring}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 flex-shrink-0"
                    style={{
                      backgroundColor: theme.primary,
                      color: theme.textOnPrimary || '#FFFFFF'
                    }}
                    onMouseEnter={(e) => {
                      if (!isRestoring) {
                        e.currentTarget.style.opacity = '0.9'
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1'
                    }}
                  >
                    <RotateCcw 
                      size={14} 
                      className={isRestoring ? 'animate-spin' : ''} 
                    />
                    {isRestoring ? 'Restoring...' : 'Restore'}
                  </button>
                </div>
              )
            })
          )}
        </div>
      </Modal>
    </div>
  )
}

