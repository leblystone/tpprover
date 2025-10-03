import React, { useMemo, useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { themes, defaultThemeName } from '../theme/themes'
import Tabs from '../components/common/Tabs'
import Modal from '../components/common/Modal'
import TextInput from '../components/common/inputs/TextInput'
import { PlusCircle, Store, Globe, Users } from 'lucide-react'
import VendorDetailsModal from '../components/vendors/VendorDetailsModal'
import VendorCard from '../components/vendors/VendorCard'
import ViewContainer from '../components/ui/ViewContainer'
import { useAppContext } from '../context/AppContext'
import useLocalStorage from '../utils/hooks'
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess'
import UpgradeModal from '../components/common/UpgradeModal'
import VendorsHelpPanel from '../components/vendors/VendorsHelpPanel'

export default function Vendors() {
	const { theme } = useOutletContext()
	const { vendors, addVendor, updateVendor, deleteVendor } = useAppContext();
	const { isReadOnly } = useSubscriptionAccess();
	const [editingVendor, setEditingVendor] = useState(null)
	const [activeTab, setActiveTab] = useLocalStorage('tpprover_vendors_tab', 'domestic')
	const [showAddModal, setShowAddModal] = useState(false)
	const [filters, setFilters] = useState({ payment: [], contact: [], label: [] })
	const [showUpgradeModal, setShowUpgradeModal] = useState(false)

	// DISABLED: Dangerous cleanup function that caused data loss
	// This function has been permanently disabled due to critical data loss incident
	// Manual cleanup can be done through UI if needed
	const cleanupDuplicateVendors = () => {
		console.warn('⚠️ Automatic cleanup disabled for safety. Use manual cleanup if needed.');
		return false;
	};

	const filteredVendors = vendors.filter(v => (v.type || 'domestic') === activeTab)

	// DISABLED: Auto-cleanup on component mount - caused data loss
	// useEffect(() => {
	// 	if (vendors.length > 0) {
	// 		cleanupDuplicateVendors();
	// 	}
	// }, [vendors.length]); // Only run when vendors are first loaded

	// Topbar tab integration
	useEffect(() => {
		const tabs = [
			{ value: 'domestic', label: 'Domestic' },
			{ value: 'international', label: 'International' },
			{ value: 'groupbuy', label: 'Group Buy' }
		];

		// Dispatch event to set topbar tabs
		window.dispatchEvent(new CustomEvent('tpp:set-topbar-tabs', {
			detail: {
				tabs,
				activeTab,
				onTabChange: setActiveTab,
				onActionClick: () => {
					if (isReadOnly) {
						setShowUpgradeModal(true);
						return;
					}
					setEditingVendor({});
					setShowAddModal(true);
				},
				actionLabel: 'New Vendor',
				actionDisabled: isReadOnly
			}
		}));

		// Cleanup on unmount
		return () => {
			window.dispatchEvent(new CustomEvent('tpp:clear-topbar-tabs'));
		};
	}, [activeTab, isReadOnly]);

	return (
		<>
			<VendorsHelpPanel theme={theme} />
			
			{filteredVendors.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-12 px-6 text-center">
					<div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
						{activeTab === 'domestic' ? (
							<Store size={32} style={{ color: theme.primary }} />
						) : activeTab === 'international' ? (
							<Globe size={32} style={{ color: theme.primary }} />
						) : (
							<Users size={32} style={{ color: theme.primary }} />
						)}
					</div>
					<h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
						{activeTab === 'domestic' ? 'No Domestic Vendors Yet' : 
						 activeTab === 'international' ? 'No International Vendors Yet' : 
						 'No Group Buy Vendors Yet'}
					</h3>
					<p className="text-sm mb-6 max-w-md" style={{ color: theme.textLight }}>
						{activeTab === 'domestic' 
							? 'Add domestic vendors to track contact information, payment methods, and order history. Keep your trusted suppliers organized and easily accessible.'
							: activeTab === 'international' 
							? 'Add international vendors to manage overseas suppliers, shipping information, and customs details. Track your global supply chain effectively.'
							: 'Add group buy vendors to coordinate bulk purchases, manage participant lists, and track group order status. Organize collaborative buying efforts.'
						}
					</p>
					{!isReadOnly && (
						<button
							onClick={() => {
								setEditingVendor({});
								setShowAddModal(true);
							}}
							className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90 hover:scale-105"
							style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
						>
							<PlusCircle size={18} />
							{activeTab === 'domestic' ? 'Add Your First Domestic Vendor' : 
							 activeTab === 'international' ? 'Add Your First International Vendor' : 
							 'Add Your First Group Buy Vendor'}
						</button>
					)}
				</div>
			) : (
				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					{filteredVendors.map((v, idx) => (
						<VendorCard
							key={v.id || `${v.name || 'vendor'}-${idx}`}
							vendor={v}
							theme={theme}
							onEditClick={(vendor) => { 
								if (isReadOnly) {
									setShowUpgradeModal(true);
									return;
								}
								setEditingVendor(vendor); 
								setShowAddModal(true);
							}}
							onManageProtocolClick={(vendor) => { alert(`Manage protocol for ${vendor.name}`) }}
						/>
					))}
				</div>
			)}
			
			<VendorDetailsModal 
				open={showAddModal}
				onClose={() => { setShowAddModal(false); setEditingVendor(null) }}
				theme={theme}
				vendor={editingVendor}
                activeTab={activeTab}
				onSave={(data) => {
					console.log('📝 Vendor save callback triggered:', { editingVendor, data }); // Debug log
					if (editingVendor?.id) {
						console.log('🔄 Updating existing vendor:', editingVendor.id);
						updateVendor({ ...editingVendor, ...data });
					} else {
						console.log('➕ Adding new vendor');
						addVendor({ id: Date.now(), ...data });
					}
					setShowAddModal(false)
					setEditingVendor(null)
				}}
				onDelete={(id) => {
					deleteVendor(id);
					setShowAddModal(false)
					setEditingVendor(null)
				}}
			/>

			<UpgradeModal 
				isOpen={showUpgradeModal}
				onClose={() => setShowUpgradeModal(false)}
				actionAttempted="manage vendors"
				theme={theme}
			/>
		</>
	)
}


