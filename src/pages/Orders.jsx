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

export default function Orders() {
	const { theme } = useOutletContext()
	const { orders, setOrders, vendors, addVendor, setStockpile } = useAppContext();
	const { isReadOnly } = useSubscriptionAccess();
	const location = useLocation()
	const [activeTab, setActiveTab] = useState('domestic')
	const [showAddModal, setShowAddModal] = useState(false)
	const [editingOrder, setEditingOrder] = useState(null)
	const [showUpgradeModal, setShowUpgradeModal] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	

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
			const orderCategory = o.category || o.type || 'domestic';
			return orderCategory === activeTab;
		})
	}, [filteredOrders, activeTab]);

	const handleStockpileUpdate = (previousOrder, newOrder) => {
		const prevStatus = (previousOrder?.status || '').toLowerCase();
		const newStatus = (newOrder?.status || '').toLowerCase();
		
		const wasDelivered = prevStatus.includes('delivered');
		const isDelivered = newStatus.includes('delivered');

		// Check if shipping costs should be included
		const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
		const includeShipping = settings.orders?.includeShippingInCosts ?? true;
		console.log('📦 Stockpile update - includeShipping setting:', includeShipping, 'from settings:', settings.orders);

		// If both orders are delivered, we need to update existing stockpile items
		if (wasDelivered && isDelivered && previousOrder && newOrder) {
			const orderIdPrefix = `orderitem-${newOrder.id}-`;
			
			// Remove old stockpile items for this order
			setStockpile(prev => prev.filter(stockItem => !stockItem.id?.startsWith(orderIdPrefix)));
			
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
					vendor: newOrder.vendor || '',
					vendorId: newOrder.vendorId,
					purchaseDate: newOrder.date,
					notes: `From order #${newOrder.id}`,
					orderId: newOrder.id
				};
			});
			setStockpile(prev => [...prev, ...updatedStockItems]);
			return;
		}

		// Status changed TO Delivered: Add items to stockpile.
		if (!wasDelivered && isDelivered) {
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
					vendor: newOrder.vendor || '',
					vendorId: newOrder.vendorId,
					purchaseDate: newOrder.date,
					notes: `From order #${newOrder.id}`,
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
			setStockpile(prev => prev.filter(stockItem => !stockItem.id?.startsWith(orderIdPrefix)));
		}
	};

	const advanceOrderStatus = (order) => {
		const currentStatus = (order.status || 'Order Placed').toLowerCase();
		let nextStatus = 'Order Placed';
		if (currentStatus.includes('placed') || currentStatus.includes('delayed')) {
			nextStatus = 'Shipped';
		} else if (currentStatus.includes('ship') || currentStatus.includes('transit')) {
			nextStatus = 'Delivered';
		} else {
			return; // Don't cycle past 'Delivered'
		}

		const updatedOrder = { ...order, status: nextStatus };
		if (nextStatus === 'Delivered' && !order.deliveryDate) {
			updatedOrder.deliveryDate = new Date().toISOString();
		}
		
		handleStockpileUpdate(order, updatedOrder);
		setOrders(prev => prev.map(o => o.id === order.id ? updatedOrder : o));
		
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
						{filteredOrders.length > 0 ? (
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
								<div className="lg:col-span-2">
									<OrderList 
										orders={filteredOrders} 
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
											setOrders(prev => prev.filter(o => o.id !== id));
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
								setOrders(prev => prev.filter(o => o.id !== id));
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
						const updatedOrder = { ...editingOrder, ...data, vendorId };
						console.log('📋 Updating existing order:', updatedOrder);
						handleStockpileUpdate(editingOrder, updatedOrder);
						setOrders(prev => prev.map(o => o.id === editingOrder.id ? updatedOrder : o));
					} else {
						// Use 'category' field for consistency, fallback to activeTab for new orders
						const category = data.category || activeTab;
						const newOrder = { id: generateId(), ...data, vendorId, category, type: category };
						console.log('📋 Creating new order:', newOrder);
						handleStockpileUpdate(null, newOrder);
						setOrders(prev => {
							console.log('📋 Adding to orders list, current length:', prev.length);
							return [newOrder, ...prev];
						});
					}
					setShowAddModal(false)
					setEditingOrder(null)
				}}
				onDelete={(id) => {
					const orderToDelete = orders.find(o => o.id === id);
					if (orderToDelete) {
						handleStockpileUpdate(orderToDelete, { ...orderToDelete, status: 'Cancelled' });
					}
					setOrders(prev => prev.filter(o => o.id !== id));
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