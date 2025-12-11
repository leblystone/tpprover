import React, { useMemo, useState, useEffect } from 'react'
import { useOutletContext, useLocation } from 'react-router-dom'
import { PlusCircle, Package } from 'lucide-react'
import OrderList from '../components/orders/OrderList'
import OrderDetailsModal from '../components/orders/OrderDetailsModal'
import OrdersHelpPanel from '../components/orders/OrdersHelpPanel'
import Tabs from '../components/common/Tabs'
import ScheduledBuysPanel from '../components/orders/ScheduledBuysPanel'
import { useAppContext } from '../context/AppContext'
import { generateId } from '../utils/string'
import { syncOrderDocumentationToStockpile, updateSyncedDocumentation, removeSyncedDocumentation } from '../utils/documentationSync'
import useLocalStorage from '../utils/hooks'
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess'
import UpgradeModal from '../components/common/UpgradeModal'
import { ensurePublicOrderNumbers, getNextPublicOrderNumber } from '../utils/orderNumbers'
import { saveAppData } from '../services/cloudStorage'
import { useFirebase } from '../context/FirebaseContext'
import { safeLocalStorageGet } from '../utils/dataBleedDiagnostic'
import { recordDeletion, getDeletionTracking } from '../utils/deletionTracking'
import { syncAllOrdersFromTracking } from '../utils/trackingStatusSync'

export default function Orders() {
	const { theme } = useOutletContext()
	const { orders: appOrders, setOrders, vendors, addVendor, stockpile, setStockpile, protocols, reconItems, reconHistory, supplements, metrics, calendarNotes, scheduledBuys } = useAppContext();
	const orders = useMemo(() => ensurePublicOrderNumbers(appOrders), [appOrders]);
	const { isReadOnly } = useSubscriptionAccess();
	const { firebaseUser } = useFirebase();
	const location = useLocation()
	const [activeTab, setActiveTab] = useState('domestic')
	const [showAddModal, setShowAddModal] = useState(false)
	const [editingOrder, setEditingOrder] = useState(null)
	const [showUpgradeModal, setShowUpgradeModal] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [groupBuysEnabled, setGroupBuysEnabled] = useState(true);
	const [deletingOrderId, setDeletingOrderId] = useState(null);
	
	// Helper function to delete order with immediate cloud sync
	const handleDeleteOrder = async (id, retryCount = 0) => {
		// Find the order being deleted for logging
		const orderToDelete = orders.find(o => o.id === id);
		
		if (orderToDelete) {
			console.log('🗑️ Deleting order:', orderToDelete.publicOrderNumber || orderToDelete.id || 'Unknown');
		}
		
		// Set loading state
		setDeletingOrderId(id);
		
		// Store original state for error recovery
		const originalOrders = [...orders];
		const originalStockpile = [...(stockpile || [])];
		
		try {
			// Step 1: Record deletion BEFORE removing from state with item snapshot
			// This ensures deletion is tracked and can be restored if needed
			if (orderToDelete) {
				recordDeletion('orders', id, orderToDelete);
			} else {
				recordDeletion('orders', id);
			}
			
			// Step 2: Remove stockpile items associated with this order
			const orderIdPrefix = `orderitem-${id}-`;
			const stockpileItemsToDelete = [];
			const updatedStockpile = (stockpile || []).filter(stockItem => {
				const itemId = stockItem?.id;
				if (!itemId || typeof itemId !== 'string') return true;
				const shouldKeep = !itemId.startsWith(orderIdPrefix);
				if (!shouldKeep) {
					stockpileItemsToDelete.push({ itemId, itemData: stockItem });
				}
				return shouldKeep;
			});
			
			// Record stockpile item deletions with snapshots
			stockpileItemsToDelete.forEach(({ itemId, itemData }) => {
				recordDeletion('stockpile', itemId, itemData);
			});
			
			// Update stockpile state immediately
			if (updatedStockpile.length !== (stockpile || []).length) {
				setStockpile(updatedStockpile);
				console.log('🧹 Removed stockpile items for deleted order');
			}
			
			// Step 3: Remove from local orders state
			const updatedOrders = orders.filter(o => o.id !== id);
			setOrders(updatedOrders);
			
			// Step 4: Wait a brief moment to ensure state updates complete
			await new Promise(resolve => setTimeout(resolve, 100));
			
			// Step 5: Get deletion tracking to include in sync
			const deletionTracking = getDeletionTracking();
			
			// Step 6: Force immediate cloud sync with skipMerge to ensure deletion persists
			// This prevents server data from restoring deleted items
			if (firebaseUser) {
				const userId = firebaseUser.uid;
				const userEmail = firebaseUser.email;
				// Use safe localStorage getter to prevent data bleed
				const taskCompletion = safeLocalStorageGet('tpprover_task_completion', userEmail) || {};
				const calendarDone = safeLocalStorageGet('tpprover_calendar_done', userEmail) || {};
				
				const appData = {
					protocols: protocols || [],
					reconItems: reconItems || [],
					reconHistory: reconHistory || [],
					supplements: supplements || [],
					orders: updatedOrders, // Use updated orders with deletion
					metrics: metrics || [],
					vendors: vendors || [],
					calendarNotes: calendarNotes || {},
					stockpile: updatedStockpile, // Use updated stockpile with items removed
					scheduledBuys: scheduledBuys || [],
					taskCompletion,
					calendarDone,
					deletionTracking // Include deletion tracking in sync
				};
				
				// Force immediate sync with skipMerge to overwrite server data
				const syncResult = await saveAppData(userId, appData, { skipMerge: true });
				
				if (syncResult) {
					console.log('✅ Deleted order synced to cloud immediately');
					window.dispatchEvent(new CustomEvent('tpp:toast', {
						detail: {
							message: 'Order deleted successfully! 🗑️',
							type: 'success',
							duration: 3000
						}
					}));
				} else {
					// Retry once if sync failed
					if (retryCount < 1) {
						console.log('🔄 Retrying order deletion sync...');
						await new Promise(resolve => setTimeout(resolve, 1000));
						return handleDeleteOrder(id, retryCount + 1);
					} else {
						console.error('❌ Failed to sync deleted order to cloud after retry');
						window.dispatchEvent(new CustomEvent('tpp:toast', {
							detail: {
								message: 'Order deleted locally, but sync failed. It may reappear. Please try again.',
								type: 'error',
								duration: 5000
							}
						}));
						// Restore the original state since sync failed
						setOrders(originalOrders);
						setStockpile(originalStockpile);
					}
				}
			} else {
				// User not logged in - deletion is local only
				// CRITICAL: Explicitly save to localStorage to ensure persistence
				// The useEffect in AppContext should handle this, but we'll do it explicitly here
				// to ensure it happens even if there's a timing issue
				try {
					localStorage.setItem('tpprover_orders', JSON.stringify(updatedOrders));
					localStorage.setItem('tpprover_stockpile', JSON.stringify(updatedStockpile));
					// Deletion tracking is already saved by recordDeletion function
					console.log('💾 Deleted order saved to localStorage (local only)');
				} catch (localError) {
					console.error('❌ Failed to save deletion to localStorage:', localError);
				}
				
				window.dispatchEvent(new CustomEvent('tpp:toast', {
					detail: {
						message: 'Order deleted successfully! 🗑️',
						type: 'success',
						duration: 3000
					}
				}));
			}
		} catch (error) {
			console.error('❌ Error deleting order:', error);
			window.dispatchEvent(new CustomEvent('tpp:toast', {
				detail: {
					message: 'Failed to delete order. Please try again.',
					type: 'error',
					duration: 4000
				}
			}));
			// Restore the original state on error
			setOrders(originalOrders);
			setStockpile(originalStockpile);
		} finally {
			setDeletingOrderId(null);
		}
	};

	useEffect(() => {
		if (location.state?.activeTab) {
			setActiveTab(location.state.activeTab)
		}
		if (location.state?.openOrderId) {
			const orderToOpen = orders.find(o => o.id === location.state.openOrderId);
			if (orderToOpen) {
				setEditingOrder(orderToOpen);
				setShowAddModal(true);
				// Optional: clear state after use
				window.history.replaceState({}, document.title)
			}
		}
		
		// Check for ?new=true query parameter to open new order modal
		const params = new URLSearchParams(location.search);
		if (params.get('new') === 'true') {
			if (isReadOnly) {
				setShowUpgradeModal(true);
			} else {
				setShowAddModal(true);
			}
			// Clear the query parameter
			window.history.replaceState({}, document.title, location.pathname);
		}
	}, [location.state, location.search, location.pathname, orders, isReadOnly])

	// Sync editingOrder with updated orders when order changes (e.g., from quick buttons)
	useEffect(() => {
		if (editingOrder?.id && showAddModal) {
			const updatedOrder = orders.find(o => o.id === editingOrder.id);
			if (updatedOrder) {
				// Check if status or other key fields changed
				const statusChanged = updatedOrder.status !== editingOrder.status;
				const shipDateChanged = updatedOrder.shipDate !== editingOrder.shipDate;
				const deliveryDateChanged = updatedOrder.deliveryDate !== editingOrder.deliveryDate;
				const updatedAtChanged = updatedOrder.updatedAt !== editingOrder.updatedAt;
				
				if (statusChanged || shipDateChanged || deliveryDateChanged || updatedAtChanged) {
					setEditingOrder(updatedOrder);
				}
			}
		}
	}, [orders, editingOrder?.id, showAddModal])

	// Automatically sync order status from tracking data
	useEffect(() => {
		let syncInterval;
		let isSyncing = false;
		const lastSyncRef = { time: 0 };
		
		const syncOrdersFromTracking = async () => {
			// Prevent concurrent syncs and throttle to at most once per minute
			const now = Date.now();
			if (isSyncing) {
				console.log('⏸️ Tracking sync already in progress, skipping...');
				return;
			}
			if ((now - lastSyncRef.time) < 60000) {
				console.log(`⏸️ Tracking sync throttled (last sync ${Math.round((now - lastSyncRef.time) / 1000)}s ago)`);
				return;
			}
			
			isSyncing = true;
			lastSyncRef.time = now;
			
			try {
				// Get current orders from localStorage (most up-to-date source)
				const currentOrders = JSON.parse(localStorage.getItem('tpprover_orders') || '[]');
				const ordersWithTracking = currentOrders.filter(o => o?.tracking && o.tracking.trim() !== '');
				console.log(`📦 Tracking sync: Found ${ordersWithTracking.length} order(s) with tracking numbers out of ${currentOrders.length} total`);
				
				if (ordersWithTracking.length === 0) {
					console.log('ℹ️ No orders with tracking numbers to sync');
					return;
				}
				
				console.log(`🔄 Syncing ${ordersWithTracking.length} order(s) from tracking...`);
				const updatedOrders = await syncAllOrdersFromTracking(currentOrders);
				
				if (updatedOrders.length === 0) {
					console.log('ℹ️ No order statuses changed from tracking data');
				}
				
				if (updatedOrders.length > 0) {
					console.log(`✅ Successfully synced ${updatedOrders.length} order(s) from tracking`);
					
					// Update each order that changed
					updatedOrders.forEach(updatedOrder => {
						const originalOrder = currentOrders.find(o => o.id === updatedOrder.id);
						if (originalOrder) {
							// Update stockpile if status changed to/from delivered
							handleStockpileUpdate(originalOrder, updatedOrder);
							
							// Update orders state using functional update
							setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
							
							// Show toast notification
							if (updatedOrder.status === 'Shipped') {
								window.dispatchEvent(new CustomEvent('tpp:toast', { 
									detail: { 
										message: `🚚 Order #${updatedOrder.publicOrderNumber || updatedOrder.id} is now in transit!`, 
										type: 'info',
										duration: 4000
									} 
								}));
							} else if (updatedOrder.status === 'Delivered') {
								window.dispatchEvent(new CustomEvent('tpp:toast', { 
									detail: { 
										message: `📦 Order #${updatedOrder.publicOrderNumber || updatedOrder.id} has been delivered!`, 
										type: 'success',
										duration: 5000
									} 
								}));
							}
						}
					});
					
					// Save to cloud after state updates
					setTimeout(async () => {
						try {
							// Get updated orders from localStorage (they should be saved by AppContext useEffect)
							const savedOrders = JSON.parse(localStorage.getItem('tpprover_orders') || '[]');
							
							// Sync to cloud if user is logged in
							const currentFirebaseUser = firebaseUser; // Access from closure
							if (currentFirebaseUser && updatedOrders.length > 0) {
								const userId = currentFirebaseUser.uid;
								const userEmail = currentFirebaseUser.email;
								const taskCompletion = safeLocalStorageGet('tpprover_task_completion', userEmail) || {};
								const calendarDone = safeLocalStorageGet('tpprover_calendar_done', userEmail) || {};
								const currentStockpile = JSON.parse(localStorage.getItem('tpprover_stockpile') || '[]');
								
								const appData = {
									protocols: protocols || [],
									reconItems: reconItems || [],
									reconHistory: reconHistory || [],
									supplements: supplements || [],
									orders: savedOrders,
									metrics: metrics || [],
									vendors: vendors || [],
									calendarNotes: calendarNotes || {},
									stockpile: currentStockpile,
									scheduledBuys: scheduledBuys || [],
									taskCompletion,
									calendarDone
								};
								
								await saveAppData(userId, appData);
								console.log('✅ Synced order status updates to cloud');
							}
						} catch (error) {
							console.error('❌ Failed to sync order status updates to cloud:', error);
						}
					}, 200);
				}
			} catch (error) {
				console.error('❌ Error syncing orders from tracking:', error);
			} finally {
				isSyncing = false;
			}
		};
		
		// Sync immediately on mount (with a small delay to let component settle)
		console.log('🔄 Orders page mounted - setting up tracking sync');
		const initialTimeout = setTimeout(() => {
			console.log('🔄 Starting initial tracking sync...');
			syncOrdersFromTracking();
		}, 2000);
		
		// Then sync every 5 minutes (tracking cache is 30 minutes, so this is reasonable)
		syncInterval = setInterval(() => {
			console.log('🔄 Running periodic tracking sync...');
			syncOrdersFromTracking();
		}, 5 * 60 * 1000);
		
		return () => {
			console.log('🔄 Orders page unmounting - cleaning up tracking sync');
			clearTimeout(initialTimeout);
			if (syncInterval) {
				clearInterval(syncInterval);
			}
		};
	}, []) // Empty deps - only run once on mount/unmount

	// Set topbar tabs via custom event
	useEffect(() => {
		const tabs = [
			{ value: 'domestic', label: 'Domestic' },
			{ value: 'international', label: 'International' },
			{ value: 'groupbuy', label: 'Group Buy' }
		];
		
		const handleAddClick = () => {
			if (isReadOnly) {
				setShowUpgradeModal(true);
				return;
			}
			setShowAddModal(true);
		};
		
		window.dispatchEvent(new CustomEvent('tpp:set-topbar-tabs', { 
			detail: { 
				tabs, 
				activeTab, 
				onTabChange: setActiveTab,
				onActionClick: handleAddClick,
				actionDisabled: isReadOnly
			} 
		}));
		
		// Listen for topbar search events for page-specific search
		const handleSearch = (e) => {
			setSearchQuery(e.detail.query);
		};
		window.addEventListener('tpp:orders-search', handleSearch);
		
		return () => {
			window.dispatchEvent(new CustomEvent('tpp:clear-topbar-tabs'));
			window.removeEventListener('tpp:orders-search', handleSearch);
		};
	}, [activeTab, isReadOnly])


	const filteredOrders = useMemo(() => {
		if (searchQuery) {
			return orders.filter(o => {
				const peptideMatch = (o.peptide || '').toLowerCase().includes(searchQuery.toLowerCase());
				const vendorMatch = (o.vendor || '').toLowerCase().includes(searchQuery.toLowerCase());
				return peptideMatch || vendorMatch;
			});
		}
		return orders;
	}, [orders, searchQuery]);
	
	const filteredOrdersByCategory = useMemo(() => {
		return filteredOrders.filter(o => {
			const orderCategory = (o.category || o.type || 'domestic').toLowerCase();
			return orderCategory === activeTab;
		})
	}, [filteredOrders, activeTab]);

	const handleStockpileUpdate = (previousOrder, newOrder) => {
		if (!newOrder) {
			console.log('⚠️ handleStockpileUpdate: newOrder is null/undefined, skipping');
			return;
		}

		const prevStatus = (previousOrder?.status || '').toLowerCase();
		const newStatus = (newOrder?.status || '').toLowerCase();
		
		const wasDelivered = prevStatus.includes('delivered');
		const isDelivered = newStatus.includes('delivered');

		// Check if shipping costs should be included
		const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
		const includeShipping = settings.orders?.includeShippingInCosts ?? true;
		console.log('📦 Stockpile update - includeShipping setting:', includeShipping, 'from settings:', settings.orders);
		console.log('📦 Stockpile update - previousOrder:', previousOrder?.id, 'status:', prevStatus, 'wasDelivered:', wasDelivered);
		console.log('📦 Stockpile update - newOrder:', newOrder.id, 'status:', newStatus, 'isDelivered:', isDelivered);
		console.log('📦 Stockpile update - newOrder.items:', newOrder.items?.length || 0, 'items');

		// If both orders are delivered, we need to update existing stockpile items
		if (wasDelivered && isDelivered && previousOrder && newOrder) {
			const orderIdPrefix = `orderitem-${newOrder.id}-`;
			
			// Remove old stockpile items for this order
			setStockpile(prev => prev.filter(stockItem => {
				const itemId = stockItem?.id;
				// Type safety: ensure itemId is a string before calling startsWith
				if (!itemId || typeof itemId !== 'string') return true;
				return !itemId.startsWith(orderIdPrefix);
			}));
			
			// Add updated stockpile items
			const updatedStockItems = (newOrder.items || []).map(item => {
				const quantity = Number(item.quantity) || 1;
				const isKit = (item.unit || '').toLowerCase() === 'kit';
				const vialsPerItem = isKit ? 10 : 1;
				const price = Number(item.price) || 0;
				
				let costPerVial;
				if (includeShipping) {
					const shippingCost = parseFloat(newOrder.shippingCost) || 0;
					const totalOrderCost = (newOrder.items || []).reduce((sum, orderItem) => {
						const orderItemPrice = parseFloat(orderItem.price) || 0;
						const orderItemQuantity = parseInt(orderItem.quantity, 10) || 1;
						return sum + (orderItemPrice * orderItemQuantity);
					}, 0) + shippingCost;
					const itemCostShare = totalOrderCost > 0 ? (price * quantity) / (totalOrderCost - shippingCost) : 1;
					const itemShippingShare = shippingCost * itemCostShare;
					const totalItemCost = (price * quantity) + itemShippingShare;
					costPerVial = vialsPerItem > 1 ? totalItemCost / vialsPerItem : totalItemCost;
				} else {
					costPerVial = vialsPerItem > 1 ? price / vialsPerItem : price;
				}

				return {
					id: `orderitem-${newOrder.id}-${item.id}`,
					name: item.name || '',
					mg: item.mg || '',
					mgUnit: item.mgUnit || 'mg', // Fix: Include mgUnit field
					quantity: quantity * vialsPerItem,
					unit: 'vial',
					cost: costPerVial,
					costPerMg: item.costPerMg || '', // Include costPerMg if set
					vendor: newOrder.vendor || '',
					vendorId: newOrder.vendorId,
					purchaseDate: newOrder.date,
					notes: `From order #${newOrder.publicOrderNumber ?? newOrder.id}`,
					orderId: newOrder.id
				};
			});
			setStockpile(prev => [...prev, ...updatedStockItems]);
			return;
		}

		// Status changed TO Delivered: Add items to stockpile.
		if (!wasDelivered && isDelivered) {
			// Ensure we have items to add
			if (!newOrder.items || newOrder.items.length === 0) {
				console.log('⚠️ handleStockpileUpdate: Order is delivered but has no items, skipping stockpile update');
				return;
			}

			console.log('📦 Adding items to stockpile for delivered order:', newOrder.id);
			const newStockItems = (newOrder.items || []).map(item => {
				const quantity = Number(item.quantity) || 1;
				const isKit = (item.unit || '').toLowerCase() === 'kit';
				const vialsPerItem = isKit ? 10 : 1;
				const price = Number(item.price) || 0;
				
				let costPerVial;
				if (includeShipping) {
					const shippingCost = parseFloat(newOrder.shippingCost) || 0;
					const totalOrderCost = (newOrder.items || []).reduce((sum, orderItem) => {
						const orderItemPrice = parseFloat(orderItem.price) || 0;
						const orderItemQuantity = parseInt(orderItem.quantity, 10) || 1;
						return sum + (orderItemPrice * orderItemQuantity);
					}, 0) + shippingCost;
					const itemCostShare = totalOrderCost > 0 ? (price * quantity) / (totalOrderCost - shippingCost) : 1;
					const itemShippingShare = shippingCost * itemCostShare;
					const totalItemCost = (price * quantity) + itemShippingShare;
					costPerVial = vialsPerItem > 1 ? totalItemCost / vialsPerItem : totalItemCost;
				} else {
					costPerVial = vialsPerItem > 1 ? price / vialsPerItem : price;
				}

				return {
					id: `orderitem-${newOrder.id}-${item.id}`,
					name: item.name || '',
					mg: item.mg || '',
					mgUnit: item.mgUnit || 'mg', // Fix: Include mgUnit field
					quantity: quantity * vialsPerItem,
					unit: 'vial',
					cost: costPerVial,
					costPerMg: item.costPerMg || '', // Include costPerMg if set
					vendor: newOrder.vendor || '',
					vendorId: newOrder.vendorId,
					purchaseDate: newOrder.date,
					notes: `From order #${newOrder.publicOrderNumber ?? newOrder.id}`,
					orderId: newOrder.id
				};
			});

			// Sync documentation from order to stockpile items
			const stockItemsWithDocs = syncOrderDocumentationToStockpile(newOrder, newStockItems);
			setStockpile(prev => [...prev, ...stockItemsWithDocs]);
		} 
		// Status changed FROM Delivered: Remove items from stockpile.
		else if (wasDelivered && !isDelivered) {
			const orderIdPrefix = `orderitem-${previousOrder.id}-`;
			setStockpile(prev => prev.filter(stockItem => {
				const itemId = stockItem?.id;
				// Type safety: ensure itemId is a string before calling startsWith
				if (!itemId || typeof itemId !== 'string') return true;
				return !itemId.startsWith(orderIdPrefix);
			}));
		}
	};

	const advanceOrderStatus = async (order) => {
		const currentStatus = (order.status || 'Order Placed').toLowerCase();
		let nextStatus = 'Order Placed';
		if (currentStatus.includes('placed') || currentStatus.includes('delayed')) {
			nextStatus = 'Shipped';
		} else if (currentStatus.includes('ship') || currentStatus.includes('transit')) {
			nextStatus = 'Delivered';
		} else {
			return; // Don't cycle past 'Delivered'
		}

		const now = new Date().toISOString();
		const updatedOrder = { 
			...order, 
			status: nextStatus,
			updatedAt: now,
			// Mark this as a manual status change to prevent tracking sync from overriding
			statusSource: 'manual',
			statusManuallySetAt: now
		};
		if (nextStatus === 'Shipped' && !order.shipDate) {
			updatedOrder.shipDate = now.slice(0, 10); // YYYY-MM-DD format
		}
		if (nextStatus === 'Delivered' && !order.deliveryDate) {
			updatedOrder.deliveryDate = now.slice(0, 10); // YYYY-MM-DD format
		}
		
		handleStockpileUpdate(order, updatedOrder);
		
		// Calculate updated orders list
		const updatedOrders = orders.map(o => o.id === order.id ? updatedOrder : o);
		
		// Update local state
		setOrders(updatedOrders);
		
		// Explicitly save to localStorage immediately
		try {
			localStorage.setItem('tpprover_orders', JSON.stringify(updatedOrders));
		} catch (error) {
			console.error('❌ Failed to save order status to localStorage:', error);
		}
		
		// Sync to cloud if user is logged in (async, fire and forget)
		if (firebaseUser) {
			// Use a small delay to ensure stockpile state has updated from handleStockpileUpdate
			setTimeout(async () => {
				try {
					const userId = firebaseUser.uid;
					const userEmail = firebaseUser.email;
					const taskCompletion = safeLocalStorageGet('tpprover_task_completion', userEmail) || {};
					const calendarDone = safeLocalStorageGet('tpprover_calendar_done', userEmail) || {};
					
					// Get current stockpile from localStorage to ensure we have the latest
					const currentStockpile = JSON.parse(localStorage.getItem('tpprover_stockpile') || '[]');
					
					const appData = {
						protocols: protocols || [],
						reconItems: reconItems || [],
						reconHistory: reconHistory || [],
						supplements: supplements || [],
						orders: updatedOrders,
						metrics: metrics || [],
						vendors: vendors || [],
						calendarNotes: calendarNotes || {},
						stockpile: currentStockpile,
						scheduledBuys: scheduledBuys || [],
						taskCompletion,
						calendarDone
					};
					
					await saveAppData(userId, appData);
					console.log('✅ Order status synced to cloud');
				} catch (error) {
					console.error('❌ Failed to sync order status to cloud:', error);
					// Don't show error to user - local change is saved, cloud sync will retry later
				}
			}, 100); // Small delay to allow stockpile state to update
		}
		
		// Show toast notification
		if (nextStatus === 'Shipped') {
			window.dispatchEvent(new CustomEvent('tpp:toast', { 
				detail: { 
					message: '🚚 Order marked as shipped!', 
					type: 'info' 
				} 
			}));
		} else if (nextStatus === 'Delivered') {
			window.dispatchEvent(new CustomEvent('tpp:toast', { 
				detail: { 
					message: '📦 Order marked as delivered!', 
					type: 'success' 
				} 
			}));
		}
	};

	return (
		<section>
			<OrdersHelpPanel theme={theme} />

			<div className="mt-6">
				{activeTab === 'groupbuy' ? (
					<div>
						{filteredOrdersByCategory.length > 0 ? (
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
								<div className="lg:col-span-2">
									<OrderList 
										orders={filteredOrdersByCategory} 
										onEdit={(order) => { 
											if (isReadOnly) {
												setShowUpgradeModal(true);
												return;
											}
											setEditingOrder(order); 
											setShowAddModal(true); 
										}}
										onDelete={(id) => {
											// Allow deletion in read-only mode for data management
											handleDeleteOrder(id);
										}}
										onAdvance={(order) => {
											if (isReadOnly) {
												setShowUpgradeModal(true);
												return;
											}
											advanceOrderStatus(order);
										}}
										theme={theme}
										vendors={vendors}
									/>
								</div>
						{groupBuysEnabled && (
							<div>
								<ScheduledBuysPanel theme={theme} />
							</div>
						)}
							</div>
						) : (
							<div className="flex flex-col items-center justify-center py-12 px-6 text-center">
								<div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
									<Package size={32} style={{ color: theme.primary }} />
								</div>
								<h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>No Group Buy Orders Yet</h3>
								<p className="text-sm mb-6 max-w-md" style={{ color: theme.textLight }}>
									Track group buy orders separately to manage timing, coordination, and delivery. 
									Group buys often have unique timelines and require special attention to order status and fulfillment dates.
								</p>
								{!isReadOnly && (
									<button
										onClick={() => setShowAddModal(true)}
										className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90 hover:scale-105"
										style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
									>
										<PlusCircle size={18} />
										Add First Group Buy Order
									</button>
								)}
							</div>
						)}
					</div>
				) : (
					filteredOrdersByCategory.length > 0 ? (
						<OrderList 
							orders={filteredOrdersByCategory} 
							onEdit={(order) => { 
								if (isReadOnly) {
									setShowUpgradeModal(true);
									return;
								}
								setEditingOrder(order); 
								setShowAddModal(true); 
							}}
							onDelete={(id) => {
								// Allow deletion in read-only mode for data management
								handleDeleteOrder(id);
							}}
							onAdvance={(order) => {
								if (isReadOnly) {
									setShowUpgradeModal(true);
									return;
								}
								advanceOrderStatus(order);
							}}
							theme={theme}
							vendors={vendors}
						/>
					) : (
						<div className="flex flex-col items-center justify-center py-12 px-6 text-center">
							<div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
								<Package size={32} style={{ color: theme.primary }} />
							</div>
							<h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
								{activeTab === 'domestic' ? 'No Domestic Orders Yet' : 'No International Orders Yet'}
							</h3>
							<p className="text-sm mb-6 max-w-md" style={{ color: theme.textLight }}>
								{activeTab === 'domestic' 
									? 'Track domestic orders to monitor shipping status, delivery dates, and manage research supply chain. Stay organized and never miss a delivery.'
									: 'Track international orders with extended shipping times, customs clearance, and delivery updates.'
								}
							</p>
							{!isReadOnly && (
								<button
									onClick={() => setShowAddModal(true)}
									className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90 hover:scale-105"
									style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
								>
									<PlusCircle size={18} />
									{activeTab === 'domestic' ? 'Add First Domestic Order' : 'Add First International Order'}
								</button>
							)}
						</div>
					)
				)}
			</div>
			
			<OrderDetailsModal 
				open={showAddModal}
				onClose={() => { setShowAddModal(false); setEditingOrder(null) }}
				theme={theme}
				order={editingOrder}
				vendors={vendors}
				activeTab={activeTab}
				isDeleting={deletingOrderId === editingOrder?.id}
				onSave={(data) => {
					console.log('📋 Orders page received data:', data);
					console.log('📋 Current activeTab:', activeTab);
					console.log('📋 Editing order:', editingOrder);
					
					// Auto-create new vendor if it doesn't exist (same logic as stockpile)
					if (data.vendor && !vendors.some(v => v.name.toLowerCase() === data.vendor.toLowerCase())) {
						addVendor({ name: data.vendor, isStub: true });
					}
					
					const vendorId = vendors.find(v => v.name === data.vendor)?.id || null;
					if (editingOrder) {
						const now = new Date().toISOString();
						const previousStatus = (editingOrder.status || 'Order Placed').toLowerCase();
						const newStatus = (data.status || editingOrder.status || 'Order Placed').toLowerCase();
						const statusChanged = previousStatus !== newStatus;
						
						const updatedOrder = { 
							...editingOrder, 
							...data, 
							vendorId,
							publicOrderNumber: editingOrder.publicOrderNumber ?? data.publicOrderNumber,
							updatedAt: now,
							// Mark as manual if status changed (data already has statusSource from modal if user clicked status button)
							...(statusChanged && data.statusSource === 'manual' ? {
								statusSource: 'manual',
								statusManuallySetAt: data.statusManuallySetAt || now
							} : {})
						};
						console.log('📋 Updating existing order:', updatedOrder);
						handleStockpileUpdate(editingOrder, updatedOrder);
						setOrders(prev => {
							const normalizedPrev = ensurePublicOrderNumbers(prev);
							return normalizedPrev.map(o => o.id === editingOrder.id ? updatedOrder : o);
						});
					} else {
						// Use 'category' field for consistency, fallback to activeTab for new orders
						const category = data.category || activeTab;
						const nextPublicNumber = getNextPublicOrderNumber(orders);
						const now = new Date().toISOString();
						const newOrder = { 
							id: generateId(), 
							publicOrderNumber: nextPublicNumber,
							...data, 
							vendorId, 
							category, 
							type: category,
							createdAt: now,
							updatedAt: now,
							// Mark as manual if status was set (data already has statusSource from modal if user clicked status button)
							...(data.statusSource === 'manual' ? {
								statusSource: 'manual',
								statusManuallySetAt: data.statusManuallySetAt || now
							} : {})
						};
						console.log('📋 Creating new order:', newOrder);
						handleStockpileUpdate(null, newOrder);
						setOrders(prev => {
							console.log('📋 Adding to orders list, current length:', prev.length);
							const normalizedPrev = ensurePublicOrderNumbers(prev);
							return [newOrder, ...normalizedPrev];
						});
					}
					setShowAddModal(false)
					setEditingOrder(null)
				}}
				onDelete={async (id) => {
					// Note: handleDeleteOrder now handles stockpile cleanup internally
					await handleDeleteOrder(id);
					setShowAddModal(false);
					setEditingOrder(null);
				}}
			/>

			<UpgradeModal 
				isOpen={showUpgradeModal}
				onClose={() => setShowUpgradeModal(false)}
				actionAttempted="manage orders"
				theme={theme}
			/>
		</section>
	)
}