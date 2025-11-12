import React, { useMemo, useState, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { themes, defaultThemeName } from '../theme/themes'
import { PlusCircle, Store, Globe, Users } from 'lucide-react'
import VendorDetailsModal from '../components/vendors/VendorDetailsModal'
import VendorCard from '../components/vendors/VendorCard'
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
	const [searchQuery, setSearchQuery] = useState('')

	// DISABLED: Dangerous cleanup function that caused data loss
	// This function has been permanently disabled due to critical data loss incident
	// Manual cleanup can be done through UI if needed
	const cleanupDuplicateVendors = () => {
		console.warn('⚠️ Automatic cleanup disabled for safety. Use manual cleanup if needed.');
		return false;
	};

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

		// Listen for topbar search events for page-specific search
		const handleSearch = (e) => {
			setSearchQuery(e.detail.query);
		};
		window.addEventListener('tpp:vendors-search', handleSearch);
		
		// Cleanup on unmount
		return () => {
			window.dispatchEvent(new CustomEvent('tpp:clear-topbar-tabs'));
			window.removeEventListener('tpp:vendors-search', handleSearch);
		};
	}, [activeTab, isReadOnly]);

	const filteredVendors = useMemo(() => {
		let filtered = vendors.filter(v => (v.type || 'domestic') === activeTab);
		if (searchQuery) {
			filtered = filtered.filter(v => 
				(v.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
				(v.contact1 || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
				(v.website || '').toLowerCase().includes(searchQuery.toLowerCase())
			);
		}
		return filtered;
	}, [vendors, activeTab, searchQuery]);

	return (
		<>
			<VendorsHelpPanel theme={theme} />
			
			{filteredVendors.length === 0 ? (
				searchQuery ? (
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
						<h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>No Results Found</h3>
						<p className="text-sm" style={{ color: theme.textLight }}>
							No vendors match your search query.
						</p>
					</div>
				) : vendors.filter(v => (v.type || 'domestic') === activeTab).length === 0 ? (
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
								? 'Add domestic vendors to track contact information, payment methods, and order history for research purposes. Organize suppliers and maintain accessible records.'
								: activeTab === 'international' 
								? 'Add international vendors to manage overseas suppliers, shipping information, and customs details for research purposes. Track global supply chain management.'
								: 'Add group buy vendors to organize collaborative purchasing efforts.'
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
								{activeTab === 'domestic' ? 'Add First Domestic Vendor' : 
								 activeTab === 'international' ? 'Add First International Vendor' : 
								 'Add First Group Buy Vendor'}
							</button>
						)}
					</div>
				) : null
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
							onForceDelete={(vendor) => {
								// Emergency delete for stuck cards
								console.log('🚨 Force delete triggered for vendor:', vendor);
								setVendors(prev => {
									const filtered = prev.filter((v, i) => {
										// Try multiple matching strategies
										if (v.id != null && vendor.id != null && String(v.id) === String(vendor.id)) return false;
										if (v.name && vendor.name && v.name.trim().toLowerCase() === vendor.name.trim().toLowerCase()) return false;
										if (i === idx) return false; // Fallback: remove by index
										return true;
									});
									console.log('✅ Force deleted - before:', prev.length, 'after:', filtered.length);
									return filtered;
								});
							}}
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
			console.log('📝 Manual save triggered:', { editingVendor, data });
			// Manual save: Always use addVendor which handles merge logic internally
			const vendorId = editingVendor?.id || data.id || Date.now();
			// When user manually saves (completes profile), remove stub status
			addVendor({ ...data, id: vendorId, isStub: false, needsCompletion: false });
			setShowAddModal(false)
			setEditingVendor(null)
		}}
			onDelete={(id) => {
				console.log('🗑️ Delete triggered for vendor ID:', id, 'editingVendor:', editingVendor);
				// Use the ID from editingVendor if provided ID is missing
				const targetId = id || editingVendor?.id;
				if (targetId) {
					deleteVendor(targetId);
					setShowAddModal(false)
					setEditingVendor(null)
				} else {
					console.error('❌ Cannot delete: No vendor ID available');
				}
			}}
			onForceDelete={(vendor) => {
				// Emergency force delete for stuck vendors
				console.log('🚨 Force delete triggered from modal for vendor:', vendor);
				if (window.confirm(`⚠️ Force delete "${vendor?.name || 'this vendor'}"?\n\nThis bypasses normal deletion and removes the vendor by array position. Use this only if normal delete fails.`)) {
					setVendors(prev => {
						const filtered = prev.filter((v) => {
							// Try multiple matching strategies
							if (v.id != null && vendor.id != null && String(v.id) === String(vendor.id)) return false;
							if (v.name && vendor.name && v.name.trim().toLowerCase() === vendor.name.trim().toLowerCase()) return false;
							return true;
						});
						console.log('✅ Force deleted - before:', prev.length, 'after:', filtered.length);
						return filtered;
					});
					setShowAddModal(false);
					setEditingVendor(null);
					window.dispatchEvent(new CustomEvent('tpp:toast', { 
						detail: { message: 'Vendor force-deleted successfully', type: 'success' } 
					}));
				}
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


