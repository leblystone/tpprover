import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { themes, defaultThemeName } from '../theme/themes'
import { Store, Globe, Users, ChevronDown, Plus, Lock, ArrowRight, Download } from 'lucide-react'
import { UsersThree } from '@phosphor-icons/react'
import VendorDetailsModal from '../components/vendors/VendorDetailsModal'
import VendorCard from '../components/vendors/VendorCard'
import CustomDropdown from '../components/common/inputs/CustomDropdown'
import { useAppContext } from '../context/AppContext'
import { useSubscriptionAccess, useTierAccess } from '../utils/useSubscriptionAccess'
import UpgradeModal from '../components/common/UpgradeModal'
import { exportToCSV } from '../utils/export'
import VendorsTipsBanner from '../components/vendors/VendorsTipsBanner'
import { generateId } from '../utils/string'
import { filterByOwner, OWNER_ALL, OWNER_SELF } from '../utils/buddies'
import { featureFlags } from '../config/featureFlags'
import CommunityPanel from '../components/community/CommunityPanel'

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

export default function Vendors() {
	const { theme } = useOutletContext()
	const { vendors, addVendor, updateVendor, deleteVendor, setVendors, ownerFilter, setOwnerFilter, buddies = [] } = useAppContext();
	const { isReadOnly } = useSubscriptionAccess();
	const { canAddVendor, caps } = useTierAccess();
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
	const [showAddMenu, setShowAddMenu] = useState(false)

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
				// Communities locked on free plan — show upgrade modal instead
				if (caps.enforced) {
					setShowUpgradeModal(true);
					return;
				}
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
					if (isReadOnly) { setShowUpgradeModal(true); return; }
					setShowAddMenu(true);
				},
				actionLabel: 'Add New',
				actionDisabled: false
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
	}, [isReadOnly, canAddVendor, caps.enforced, communityEnabled, pageTab, setSearchParams]);

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

	const ownerOptions = useMemo(() => {
		const owners = Array.isArray(buddies) ? buddies : [];
		return [
			{ value: OWNER_ALL, label: 'All Owners' },
			{ value: OWNER_SELF, label: 'Mine' },
			...owners.map((b) => ({
				value: b.id,
				label: b.name || 'Buddy',
			})),
		];
	}, [buddies]);

	const showOwnerDropdown = featureFlags.ENABLE_BUDDY && ownerOptions.length > 2;

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

		{/* ── Free-plan: slot OPEN — no vendors yet or slot freed up ─────── */}
		{caps.enforced && caps.maxVendors !== null && caps.vendorCount === 0 && vendors.length === 0 && null /* handled in empty state */}

		{/* ── Free-plan: slot FULL — at cap ────────────────────────────────── */}
		{caps.enforced && caps.maxVendors !== null && caps.vendorCount >= caps.maxVendors && (
			<div
				className="rounded-xl px-4 py-3 mb-5 flex items-start gap-3"
				style={{
					backgroundColor: theme.isDark ? 'rgba(234,179,8,0.10)' : 'rgba(234,179,8,0.08)',
					border: '1px solid rgba(234,179,8,0.25)',
				}}
			>
				<Lock size={16} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
				<div className="flex-1 min-w-0">
					<p className="text-sm font-semibold" style={{ color: theme.text }}>1 vendor slot used</p>
					<p className="text-xs mt-0.5" style={{ color: theme.textLight }}>
						Free plan includes 1 vendor.{' '}
						<button onClick={() => setShowUpgradeModal(true)} className="underline font-semibold" style={{ color: theme.primary }}>
							Upgrade for unlimited
						</button>
					</p>
				</div>
			</div>
		)}

		{/* Filter dropdown - same pattern as Stockpile / Orders */}
			<div className="mb-6">
				<div className="flex items-center gap-2">
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
					{showOwnerDropdown && (
						<div className="w-[170px] flex-shrink-0">
							<CustomDropdown
								value={ownerFilter || OWNER_ALL}
								onChange={setOwnerFilter}
								options={ownerOptions}
								theme={theme}
								placeholder="Owner"
								outlined={true}
								customShadow={true}
							/>
						</div>
					)}
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
						{categoryFilter === 'domestic' ? <Store size={32} style={{ color: theme.primary }} />
						: categoryFilter === 'international' ? <Globe size={32} style={{ color: theme.primary }} />
						: categoryFilter === 'groupbuy' ? <Users size={32} style={{ color: theme.primary }} />
						: <Store size={32} style={{ color: theme.primary }} />}
					</div>
					<h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
						{categoryFilter === 'all' ? 'No vendors yet' : categoryFilter === 'domestic' ? 'No domestic vendors yet' : categoryFilter === 'international' ? 'No international vendors yet' : 'No group buy vendors yet'}
					</h3>
					{caps.enforced ? (
						<>
							<div
								className="flex items-center gap-2 px-4 py-2 rounded-full mb-4"
								style={{ backgroundColor: `${theme.primary}15`, border: `1px solid ${theme.primary}30` }}
							>
								<span className="text-xs font-bold" style={{ color: theme.primary }}>1 FREE VENDOR SLOT AVAILABLE</span>
							</div>
							<p className="text-sm mb-6 max-w-sm" style={{ color: theme.textLight }}>
								Track contact info, payment methods, and order history for your go-to source.
							</p>
							<button
								type="button"
								onClick={() => { setEditingVendor({}); setShowAddModal(true); }}
								className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 touch-manipulation btn-primary-inset"
								style={{ color: theme.textOnPrimary, backgroundColor: theme.primary, WebkitTapHighlightColor: 'transparent' }}
							>
								<Plus size={15} />
								Add My Vendor
							</button>
							<button
								type="button"
								onClick={() => setShowUpgradeModal(true)}
								className="mt-3 text-xs font-medium underline"
								style={{ color: theme.textLight }}
							>
								Need more? Upgrade for unlimited vendors
							</button>
						</>
					) : (
						<>
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
						</>
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
							if (isReadOnly) { setShowUpgradeModal(true); return; }
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

		{/* Add dropdown — same pattern as Protocols */}
		{showAddMenu && (
			<>
				<div className="fixed inset-0 z-[100]" onClick={() => setShowAddMenu(false)} />
				<div
					className="fixed top-16 right-4 z-[101] rounded-lg shadow-xl overflow-hidden min-w-[200px]"
					style={{
						backgroundColor: theme.cardBackground,
						border: `1px solid ${theme.border}`,
						boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
					}}
				>
				<button
					type="button"
					onClick={() => {
						setShowAddMenu(false);
						if (!canAddVendor) { setShowUpgradeModal(true); return; }
						setEditingVendor({});
						setShowAddModal(true);
					}}
					className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left border-b"
					style={{ color: theme.text, borderColor: theme.border }}
					onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'; }}
					onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
				>
					<Store size={18} style={{ color: canAddVendor ? theme.primary : theme.textLight }} />
					<div className="flex-1">
						<div className="font-semibold" style={{ color: canAddVendor ? theme.text : theme.textLight }}>Add Vendor</div>
						<div className="text-xs opacity-60">
							{canAddVendor ? 'Track a supplier or source' : 'Upgrade to add more vendors'}
						</div>
					</div>
					{!canAddVendor && <Lock size={13} style={{ color: theme.textLight, flexShrink: 0 }} />}
				</button>
				{communityEnabled && (
					<button
						type="button"
						onClick={() => {
							setShowAddMenu(false);
							if (caps.enforced) { setShowUpgradeModal(true); return; }
							if (pageTab !== 'community') {
								setPageTab('community');
								setSearchParams({ tab: 'community' }, { replace: true });
							}
							setTimeout(() => communityRef.current?.openAddModal?.(), 50);
						}}
						className="w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors text-left"
						style={{ color: theme.text }}
						onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)'; }}
						onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
					>
						<UsersThree size={18} weight="bold" style={{ color: caps.enforced ? theme.textLight : theme.primary }} />
						<div className="flex-1">
							<div className="font-semibold" style={{ color: caps.enforced ? theme.textLight : theme.text }}>Add Community</div>
							<div className="text-xs opacity-60">
								{caps.enforced ? 'Research+ only' : 'Track a forum, group, or channel'}
							</div>
						</div>
						{caps.enforced && <Lock size={13} style={{ color: theme.textLight, flexShrink: 0 }} />}
					</button>
				)}
				</div>
			</>
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

				theme={theme}
			/>
		</section>
	)
}


