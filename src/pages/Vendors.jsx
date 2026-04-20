import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { themes, defaultThemeName } from '../theme/themes'
import { Store, Globe, Users, ChevronDown } from 'lucide-react'
import VendorDetailsModal from '../components/vendors/VendorDetailsModal'
import VendorCard from '../components/vendors/VendorCard'
import CustomDropdown from '../components/common/inputs/CustomDropdown'
import { useAppContext } from '../context/AppContext'
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess'
import UpgradeModal from '../components/common/UpgradeModal'
import VendorsTipsBanner from '../components/vendors/VendorsTipsBanner'
import { generateId } from '../utils/string'
import OwnerFilter from '../components/buddy/OwnerFilter'
import { filterByOwner } from '../utils/buddies'
import { featureFlags } from '../config/featureFlags'
import CommunityPanel from '../components/community/CommunityPanel'

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

export default function Vendors() {
	const { theme } = useOutletContext()
	const { vendors, addVendor, updateVendor, deleteVendor, setVendors, ownerFilter } = useAppContext();
	const { isReadOnly } = useSubscriptionAccess();
	const [searchParams, setSearchParams] = useSearchParams()
	const communityEnabled = featureFlags.ENABLE_COMMUNITY
	const communityRef = useRef(null)
	const urlTab = searchParams.get('tab')
	const [pageTab, setPageTab] = useState(() =>
		communityEnabled && urlTab === 'community' ? 'community' : 'vendors'
	)
	const [editingVendor, setEditingVendor] = useState(null)
	const [categoryFilter, setCategoryFilter] = useState('all') // 'all' | 'domestic' | 'international' | 'groupbuy'
	const [showAddModal, setShowAddModal] = useState(false)
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

	useEffect(() => {
		if (!communityEnabled && urlTab === 'community') {
			setSearchParams({}, { replace: true });
			setPageTab('vendors');
		}
	}, [communityEnabled, urlTab, setSearchParams]);

	useEffect(() => {
		if (!communityEnabled) {
			setPageTab('vendors');
			return;
		}
		if (urlTab === 'community') setPageTab('community');
		else setPageTab('vendors');
	}, [communityEnabled, urlTab]);

	// Topbar: Vendors + Community (when enabled); category filter stays in-page for Vendors
	useEffect(() => {
		const tabs = communityEnabled
			? [
				{ value: 'vendors', label: 'Vendors' },
				{ value: 'community', label: 'Communities' },
			]
			: [{ value: 'vendors', label: 'Vendors' }];

		const activeTab = communityEnabled ? pageTab : 'vendors';

		const onTabChange = (value) => {
			if (!communityEnabled) return;
			if (value === 'community') {
				setPageTab('community');
				setSearchParams({ tab: 'community' }, { replace: true });
			} else {
				setPageTab('vendors');
				setSearchParams({}, { replace: true });
			}
		};

		window.dispatchEvent(new CustomEvent('tpp:set-topbar-tabs', {
			detail: {
				tabs,
				activeTab,
				onTabChange,
				onActionClick: () => {
					if (pageTab === 'community') {
						communityRef.current?.openAddModal?.();
						return;
					}
					if (isReadOnly) {
						setShowUpgradeModal(true);
						return;
					}
					setEditingVendor({});
					setShowAddModal(true);
				},
				actionLabel: pageTab === 'community' ? 'Add Community' : 'New Vendor',
				actionDisabled: pageTab === 'community' ? false : isReadOnly
			}
		}));
		const handleSearch = (e) => {
			setSearchQuery(e.detail?.query ?? '');
		};
		window.addEventListener('tpp:vendors-search', handleSearch);
		return () => {
			window.dispatchEvent(new CustomEvent('tpp:clear-topbar-tabs'));
			window.removeEventListener('tpp:vendors-search', handleSearch);
		};
	}, [isReadOnly, communityEnabled, pageTab, setSearchParams]);

	const categoryCounts = useMemo(() => {
		const getType = (v) => (v.type || 'domestic').toLowerCase();
		let all = 0, domestic = 0, international = 0, groupbuy = 0;
		vendors.forEach(v => {
			const t = getType(v);
			all++;
			if (t === 'domestic') domestic++;
			else if (t === 'international') international++;
			else if (t === 'groupbuy') groupbuy++;
		});
		return { all, domestic, international, groupbuy };
	}, [vendors]);

	const filteredVendors = useMemo(() => {
		let filtered = filterByOwner(vendors, ownerFilter);
		if (categoryFilter !== 'all') {
			filtered = filtered.filter(v => (v.type || 'domestic').toLowerCase() === categoryFilter);
		}
		if (searchQuery) {
			filtered = filtered.filter(v =>
				(v.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
				(v.contact1 || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
				(v.website || '').toLowerCase().includes(searchQuery.toLowerCase())
			);
		}
		return filtered;
	}, [vendors, categoryFilter, searchQuery, ownerFilter]);

	const vendorsInCategory = useMemo(() => {
		if (categoryFilter === 'all') return vendors;
		return vendors.filter(v => (v.type || 'domestic').toLowerCase() === categoryFilter);
	}, [vendors, categoryFilter]);

	const isEmptyCategory = vendorsInCategory.length === 0 && !searchQuery;

	return (
		<section className="page-bg px-2 sm:px-4 md:px-6 lg:px-8">
			{pageTab === 'vendors' ? (
				<>
			<VendorsTipsBanner theme={theme} />

			<div className="mb-3">
				<OwnerFilter theme={theme} />
			</div>

			{/* Filter dropdown - same pattern as Stockpile / Orders */}
			<div className="mb-6">
				<div className="flex-1 min-w-0" style={{ minWidth: '180px' }}>
					<CustomDropdown
						value={categoryFilter}
						onChange={setCategoryFilter}
						options={[
							{ value: 'all', label: `View All (${categoryCounts.all})`, icon: <Store size={16} style={{ color: theme.textLight }} /> },
							{ value: 'domestic', label: `Domestic (${categoryCounts.domestic})`, icon: <Store size={16} style={{ color: theme.textLight }} /> },
							{ value: 'international', label: `International (${categoryCounts.international})`, icon: <Globe size={16} style={{ color: theme.textLight }} /> },
							{ value: 'groupbuy', label: `Group Buy (${categoryCounts.groupbuy})`, icon: <Users size={16} style={{ color: theme.textLight }} /> }
						]}
						theme={theme}
						placeholder="Filter vendors..."
						outlined={true}
						customShadow={true}
					/>
				</div>
			</div>

			{filteredVendors.length === 0 ? (
				searchQuery ? (
					<div className="content-section flex flex-col items-center justify-center py-12 px-6 text-center">
						<div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
							<Store size={32} style={{ color: theme.primary }} />
						</div>
						<h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>No results found</h3>
						<p className="text-sm max-w-sm" style={{ color: theme.textLight }}>No vendors match your search.</p>
					</div>
				) : isEmptyCategory ? (
					<div className="content-section flex flex-col items-center justify-center py-12 px-6 text-center">
						<div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
							{categoryFilter === 'domestic' ? (
								<Store size={32} style={{ color: theme.primary }} />
							) : categoryFilter === 'international' ? (
								<Globe size={32} style={{ color: theme.primary }} />
							) : categoryFilter === 'groupbuy' ? (
								<Users size={32} style={{ color: theme.primary }} />
							) : (
								<Store size={32} style={{ color: theme.primary }} />
							)}
						</div>
						<h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
							{categoryFilter === 'all' ? 'No vendors yet' : categoryFilter === 'domestic' ? 'No domestic vendors yet' : categoryFilter === 'international' ? 'No international vendors yet' : 'No group buy vendors yet'}
						</h3>
						<p className="text-sm mb-6 max-w-sm" style={{ color: theme.textLight }}>
							{categoryFilter === 'all' ? 'Add vendors to track contact, payment, and order history.' : 'Add vendors to track contacts and orders.'}
						</p>
						{!isReadOnly && (
							<button
								type="button"
								onClick={() => { setEditingVendor({}); setShowAddModal(true); }}
								className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors touch-manipulation"
								style={{
									color: theme.primary,
									backgroundColor: theme.isDark ? `${theme.primary}20` : `${theme.primary}15`,
									border: `1px solid ${theme.primary}40`,
									WebkitTapHighlightColor: 'transparent'
								}}
							>
								Add Vendor
								<ChevronDown size={14} />
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
								// Silent fallback delete for stuck cards (invisible to users)
								if (isDevelopment) {
									console.warn('⚠️ Fallback delete triggered for vendor:', vendor?.name);
								}
								setVendors(prev => {
									const filtered = prev.filter((v, i) => {
										// Try multiple matching strategies
										if (v.id != null && vendor.id != null && String(v.id) === String(vendor.id)) return false;
										if (v.name && vendor.name && v.name.trim().toLowerCase() === vendor.name.trim().toLowerCase()) return false;
										if (i === idx) return false; // Fallback: remove by index
										return true;
									});
									if (isDevelopment) {
										console.log('✅ Fallback delete completed - before:', prev.length, 'after:', filtered.length);
									}
									return filtered;
								});
							}}
						/>
					))}
				</div>
			)}
				</>
			) : (
				<CommunityPanel ref={communityRef} theme={theme} />
			)}

		<VendorDetailsModal 
			open={showAddModal}
			onClose={() => { setShowAddModal(false); setEditingVendor(null) }}
			theme={theme}
			vendor={editingVendor}
			defaultCategory={categoryFilter === 'all' ? 'domestic' : categoryFilter}
			activeTab={categoryFilter === 'all' ? 'domestic' : categoryFilter}
		onSave={(data) => {
			console.log('📝 Manual save triggered:', { editingVendor, data });
			// Manual save: Always use addVendor which handles merge logic internally
			const vendorId = editingVendor?.id || data.id || generateId();
			// When user manually saves (completes profile), remove stub status
			addVendor({ ...data, id: vendorId, isStub: false, needsCompletion: false });
			setShowAddModal(false)
			setEditingVendor(null)
		}}
			onDelete={async (id) => {
				const targetId = id || editingVendor?.id;
				if (!targetId) return;
				await deleteVendor(targetId);
				setShowAddModal(false);
				setEditingVendor(null);
				window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Vendor deleted', type: 'success' } }));
			}}
			onForceDelete={(vendor) => {
				// Silent fallback delete when normal delete fails (completely invisible to users)
				if (isDevelopment) {
					console.warn('⚠️ Normal delete failed, using fallback delete for vendor:', vendor?.name);
				}
				
				// Silently proceed with fallback delete - users should never see this
				setVendors(prev => {
					const filtered = prev.filter((v) => {
						// Try multiple matching strategies
						if (v.id != null && vendor.id != null && String(v.id) === String(vendor.id)) return false;
						if (v.name && vendor.name && v.name.trim().toLowerCase() === vendor.name.trim().toLowerCase()) return false;
						return true;
					});
					if (isDevelopment) {
						console.log('✅ Fallback delete completed - before:', prev.length, 'after:', filtered.length);
					}
					return filtered;
				});
				setShowAddModal(false);
				setEditingVendor(null);
				window.dispatchEvent(new CustomEvent('tpp:toast', { 
					detail: { message: 'Vendor deleted successfully', type: 'success' } 
				}));
			}}
		/>

			<UpgradeModal 
				isOpen={showUpgradeModal}
				onClose={() => setShowUpgradeModal(false)}
				actionAttempted="manage vendors"
				theme={theme}
			/>
		</section>
	)
}


