import React, { useMemo, useState, useEffect } from 'react'
import { useOutletContext, useLocation } from 'react-router-dom'
import { PlusCircle } from 'lucide-react'
import OrderList from '../components/orders/OrderList'
import OrderDetailsModal from '../components/orders/OrderDetailsModal'
import Tabs from '../components/common/Tabs'
import ScheduledBuysPanel from '../components/orders/ScheduledBuysPanel'
import { useAppContext } from '../context/AppContext'
import { generateId } from '../utils/string'

// Local lightweight useLocalStorage helper
function useLocalStorage(key, initialValue) {
	const [value, setValue] = React.useState(() => {
		try {
			const item = localStorage.getItem(key)
			return item ? JSON.parse(item) : initialValue
		} catch {
			return initialValue
		}
	})
	React.useEffect(() => {
		try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
	}, [key, value])
	return [value, setValue]
}

export default function Orders() {
	const { theme } = useOutletContext()
	const { orders, setOrders, vendors, setStockpile } = useAppContext();
	const location = useLocation()
	const [activeTab, setActiveTab] = useState('domestic')
	const [showAddModal, setShowAddModal] = useState(false)
	const [editingOrder, setEditingOrder] = useState(null)

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
	}, [location.state, orders])

	const filteredOrders = useMemo(() => {
		return orders.filter(o => (o.type || 'domestic') === activeTab)
	}, [orders, activeTab]);

	const handleStockpileUpdate = (previousOrder, newOrder) => {
		const prevStatus = (previousOrder?.status || '').toLowerCase();
		const newStatus = (newOrder?.status || '').toLowerCase();

		if (prevStatus.includes('delivered') === newStatus.includes('delivered')) {
			return; // No change related to delivery status
		}

		// Status changed TO Delivered: Add items to stockpile.
		if (newStatus.includes('delivered')) {
			const newStockItems = (newOrder.items || []).map(item => {
				const quantity = Number(item.quantity) || 1;
				const isKit = (item.unit || '').toLowerCase() === 'kit';
				const vialsPerItem = isKit ? 10 : 1;
				const price = Number(item.price) || 0;
				const costPerVial = vialsPerItem > 1 ? price / vialsPerItem : price;

				return {
					id: `orderitem-${newOrder.id}-${item.id}`,
					name: item.name,
					mg: item.mg,
					quantity: quantity * vialsPerItem,
					unit: 'vial',
					cost: costPerVial,
					vendor: newOrder.vendor,
					vendorId: newOrder.vendorId,
					purchaseDate: newOrder.date,
					notes: `From order #${newOrder.id}`,
					orderId: newOrder.id
				};
			});
			setStockpile(prev => [...prev, ...newStockItems]);
		} 
		// Status changed FROM Delivered: Remove items from stockpile.
		else if (prevStatus.includes('delivered')) {
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
	};

	return (
		<section>
			<div className="flex items-center justify-between mb-4">
				<h1 className="text-2xl font-bold" style={{ color: theme.primaryDark }}>Orders</h1>
			</div>

			<div className="flex items-center justify-between mb-6">
				<Tabs
					value={activeTab}
					onChange={v => setActiveTab(v)}
					theme={theme}
					stretch
					options={[
						{ value: 'domestic', label: 'Domestic' },
						{ value: 'international', label: 'International' },
						{ value: 'groupbuy', label: 'Group Buy' },
					]}
				/>
				<button className="px-3 py-2 rounded-md text-sm font-semibold inline-flex items-center gap-2" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }} onClick={() => setShowAddModal(true)}><PlusCircle className="h-4 w-4" /> Add Order</button>
			</div>

			<div className="mt-6">
				{activeTab === 'groupbuy' ? (
					<div>
						{filteredOrders.length > 0 ? (
							<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
								<div className="lg:col-span-2">
									<OrderList 
										orders={filteredOrders} 
										onEdit={(order) => { setEditingOrder(order); setShowAddModal(true); }}
										onDelete={(id) => setOrders(prev => prev.filter(o => o.id !== id))}
										onAdvance={advanceOrderStatus}
										theme={theme}
										vendors={vendors}
									/>
								</div>
								<div>
									<ScheduledBuysPanel theme={theme} />
								</div>
							</div>
						) : (
							<div>
								<p className="w-full text-sm mb-4" style={{ color: theme?.textLight || '#666' }}>No orders.</p>
								<div className="flex justify-end">
									<div className="w-full lg:w-1/2 xl:w-1/3">
										<ScheduledBuysPanel theme={theme} />
									</div>
								</div>
							</div>
						)}
					</div>
				) : (
					<OrderList 
						orders={filteredOrders} 
						onEdit={(order) => { setEditingOrder(order); setShowAddModal(true); }}
						onDelete={(id) => setOrders(prev => prev.filter(o => o.id !== id))}
						onAdvance={advanceOrderStatus}
						theme={theme}
						vendors={vendors}
					/>
				)}
			</div>
			
			<OrderDetailsModal 
				open={showAddModal}
				onClose={() => { setShowAddModal(false); setEditingOrder(null) }}
				theme={theme}
				order={editingOrder}
				vendors={vendors}
				onSave={(data) => {
					const vendorId = vendors.find(v => v.name === data.vendor)?.id || null;
					if (editingOrder) {
						const updatedOrder = { ...editingOrder, ...data, vendorId };
						handleStockpileUpdate(editingOrder, updatedOrder);
						setOrders(prev => prev.map(o => o.id === editingOrder.id ? updatedOrder : o));
					} else {
						const newOrder = { id: generateId(), ...data, vendorId, type: activeTab };
						handleStockpileUpdate(null, newOrder);
						setOrders(prev => [newOrder, ...prev]);
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
		</section>
	)
}