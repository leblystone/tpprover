import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import {
	IconContext,
	Storefront,
	Globe,
	Users,
	CaretDown,
	Plus,
	Lock,
	ArrowRight,
	DownloadSimple,
	UsersThree,
	Compass,
} from '@phosphor-icons/react'
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
import SupplyIndex from '../components/vendors/SupplyIndex'
import { useIsSimpleMode } from '../hooks/useIsSimpleMode'

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

export default function Vendors() {
	const { theme } = useOutletContext()
	const simpleMode = useIsSimpleMode()
	const { vendors, addVendor, updateVendor, deleteVendor, setVendors, ownerFilter, setOwnerFilter, buddies = [] } = useAppContext();
	const { isReadOnly } = useSubscriptionAccess();
	const { canAddVendor, caps } = useTierAccess();
	const [searchParams, setSearchParams] = useSearchParams()
	const communityEnabled = featureFlags.ENABLE_COMMUNITY
	const supplyIndexEnabled = featureFlags.ENABLE_SUPPLY_INDEX
	const communityRef = useRef(null)
	const supplyIndexRef = useRef(null)
	const urlTab = searchParams.get('tab')
	const [pageTab, setPageTab] = useState(() => {
		if (communityEnabled && urlTab === 'community') return 'community'
		if (supplyIndexEnabled && urlTab === 'index') return 'index'
		return 'vendors'
	})
	const [categoryFilter, setCategoryFilter] = useState('all') // 'all' | 'domestic' | 'international' | 'groupbuy'

	// Display-only: in Simple, list all categories (does not clear stored vendor.type)
	useEffect(() => {
		if (simpleMode && categoryFilter !== 'all') setCategoryFilter('all');
	}, [simpleMode, categoryFilter]);
	const [editingVendor, setEditingVendor] = useState(null)
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
		if (!supplyIndexEnabled && urlTab === 'index') {
			setSearchParams({}, { replace: true });
			setPageTab('vendors');
		}
	}, [communityEnabled, supplyIndexEnabled, urlTab, setSearchParams]);

	useEffect(() => {
		if (urlTab === 'community' && communityEnabled) { setPageTab('community'); return; }
		if (urlTab === 'index' && supplyIndexEnabled) { setPageTab('index'); return; }
		if (!urlTab) setPageTab('vendors');
	}, [communityEnabled, supplyIndexEnabled, urlTab]);

	// Topbar: Vendors + Community + Supply Index (when flags enabled)
	useEffect(() => {
		const tabs = [{ value: 'vendors', label: 'Vendors' }]
		if (communityEnabled) tabs.push({ value: 'community', label: 'Communities' })
		if (supplyIndexEnabled) tabs.push({ value: 'index', label: 'Discover' })

		const activeTab = pageTab;

		const onTabChange = (value) => {
			if (value === 'community') {
				if (!communityEnabled) return;
				if (caps.enforced) { setShowUpgradeModal(true); return; }
				setPageTab('community');
				setSearchParams({ tab: 'community' }, { replace: true });
			} else if (value === 'index') {
				if (!supplyIndexEnabled) return;
				setPageTab('index');
				setSearchParams({ tab: 'index' }, { replace: true });
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
				actionItems: [
					{
						label: 'Add Vendor',
						Icon: Storefront,
						onClick: () => {
							if (isReadOnly || !canAddVendor) { setShowUpgradeModal(true); return; }
							setEditingVendor(null);
							setShowAddModal(true);
						},
					},
					...(communityEnabled ? [{
						label: 'Add Community',
						Icon: UsersThree,
						onClick: () => {
							if (caps.enforced) { setShowUpgradeModal(true); return; }
							if (pageTab !== 'community') {
								setPageTab('community');
								setSearchParams({ tab: 'community' }, { replace: true });
							}
							setTimeout(() => communityRef.current?.openAddModal?.(), 50);
						},
					}] : []),
					...(supplyIndexEnabled ? [{
						label: 'Suggest Source',
						Icon: Compass,
						onClick: () => {
							if (pageTab !== 'index') {
								setPageTab('index');
								setSearchParams({ tab: 'index' }, { replace: true });
							}
							setTimeout(() => supplyIndexRef.current?.openSuggestModal?.(), 80);
						},
					}] : []),
				],
				actionDisabled: isReadOnly,
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
	}, [isReadOnly, canAddVendor, caps.enforced, communityEnabled, supplyIndexEnabled, pageTab, setSearchParams]);

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
		<IconContext.Provider value={{ weight: 'duotone' }}>
		<section className="page-bg pt-4 px-2 sm:px-4 md:px-6 lg:px-8">
		{pageTab === 'vendors' ? (
			<>
		<VendorsTipsBanner theme={theme} />

		{/* ── Free-plan: slot OPEN — no vendors yet or slot freed up ─────── */}
		{caps.enforced && caps.maxVendors !== null && caps.vendorCount === 0 && vendors.length === 0 && null /* handled in empty state */}

		{/* ── Free-plan: slot FULL — at cap ────────────────────────────────── */}
		{caps.enforced && caps.maxVendors !== null && caps.vendorCount >= caps.maxVendors && (
			<div
				className="rounded-2xl px-4 py-3.5 mb-5"
				style={{
					backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
					border: `1px solid ${theme.border}`,
					boxShadow: theme.isDark ? '0 2px 8px rgba(0,0,0,0.2)' : '0 2px 10px rgba(0,0,0,0.05)',
				}}
			>
				<div className="flex items-center gap-3">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-1.5 mb-0.5">
							<Lock size={16} style={{ color: theme.textLight }} />
							<p className="text-sm font-semibold" style={{ color: theme.text }}>
								{caps.vendorCount} / {caps.maxVendors} vendor slot used
							</p>
						</div>
						<p className="text-xs" style={{ color: theme.textLight }}>
							Free plan includes {caps.maxVendors} vendor — your data is always yours
						</p>
					</div>
					<div className="flex items-center gap-2 shrink-0">
						<button
							type="button"
							onClick={() => exportToCSV(
								(vendors || [])
									.filter(v => !v.deleted)
									.map(v => ({
										name: v.name || '',
										category: v.category || '',
										website: v.website || v.url || '',
										notes: v.notes || '',
									})),
								'vendors-export.csv'
							)}
							className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80 active:scale-95"
							style={{
								backgroundColor: theme.isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)',
								border: `1px solid ${theme.border}`,
								color: theme.textLight,
							}}
						>
							<DownloadSimple size={18} />
							Export All
						</button>
						<button
							type="button"
							onClick={() => setShowUpgradeModal(true)}
							className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90 active:scale-95"
							style={{
								backgroundColor: theme.primary,
								color: theme.textOnPrimary || '#fff',
							}}
						>
							Upgrade
							<ArrowRight size={18} />
						</button>
					</div>
				</div>
			</div>
		)}

		{/* Category toggle — Advanced only; owner filter stays when available */}
			{(!simpleMode || showOwnerDropdown) && (
			<div className="mb-5 space-y-3">
				{!simpleMode && (() => {
					const CATEGORY_TABS = [
						{ value: 'all', label: 'All' },
						{ value: 'domestic', label: 'Domestic' },
						{ value: 'international', label: 'International' },
						{ value: 'groupbuy', label: 'Group Buy' },
					];
					const tabIndex = Math.max(0, CATEGORY_TABS.findIndex((t) => t.value === categoryFilter));
					const tabCount = CATEGORY_TABS.length;
					return (
						<div
							role="group"
							aria-label="Vendor category"
							className="relative grid p-1 rounded-full"
							style={{
								gridTemplateColumns: `repeat(${tabCount}, minmax(0, 1fr))`,
								backgroundColor: theme.isDark
									? 'rgba(255,255,255,0.08)'
									: 'rgba(47,59,58,0.09)',
								boxShadow: theme.isDark
									? 'inset 0 2px 4px rgba(0,0,0,0.35), inset 0 1px 2px rgba(0,0,0,0.25), 0 1px 0 rgba(255,255,255,0.04)'
									: 'inset 0 2px 5px rgba(47,59,58,0.14), inset 0 1px 2px rgba(47,59,58,0.08), 0 1px 0 rgba(255,255,255,0.7)',
							}}
						>
							<div
								className="absolute top-1 bottom-1 left-1 rounded-full pointer-events-none"
								style={{
									width: `calc((100% - 8px) / ${tabCount})`,
									transform: `translateX(calc(${tabIndex} * 100%))`,
									transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)',
									backgroundColor: theme.primary || '#7F9E95',
									boxShadow: theme.isDark
										? `0 4px 14px ${theme.primary}77, 0 2px 4px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.22)`
										: `0 4px 14px ${theme.primary}55, 0 2px 4px rgba(47,59,58,0.16), inset 0 1px 0 rgba(255,255,255,0.35)`,
								}}
								aria-hidden="true"
							/>
							{CATEGORY_TABS.map((t) => {
								const active = categoryFilter === t.value;
								return (
									<button
										key={t.value}
										type="button"
										onClick={() => setCategoryFilter(t.value)}
										aria-pressed={active}
										className="relative z-[1] py-2 px-0.5 rounded-full text-[11px] sm:text-xs font-semibold transition-colors duration-200 leading-tight touch-manipulation"
										style={{
											color: active
												? (theme.textOnPrimary || '#ffffff')
												: theme.textLight,
										}}
									>
										{t.label}
									</button>
								);
							})}
						</div>
					);
				})()}
				{showOwnerDropdown && (
					<div className="w-full sm:w-[170px] sm:ml-auto">
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
			)}

			{filteredVendors.length === 0 ? (
				searchQuery ? (
					<div className="content-section flex flex-col items-center justify-center py-12 px-6 text-center">
						<div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
							<Storefront size={40} style={{ color: theme.primary }} />
						</div>
						<h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>No results found</h3>
						<p className="text-sm max-w-sm" style={{ color: theme.textLight }}>No vendors match your search.</p>
					</div>
				) : isEmptyCategory ? (
				<div className="content-section flex flex-col items-center justify-center py-12 px-6 text-center">
					<div className="w-20 h-20 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
						{categoryFilter === 'domestic' ? <Storefront size={40} style={{ color: theme.primary }} />
						: categoryFilter === 'international' ? <Globe size={40} style={{ color: theme.primary }} />
						: categoryFilter === 'groupbuy' ? <Users size={40} style={{ color: theme.primary }} />
						: <Storefront size={40} style={{ color: theme.primary }} />}
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
								onClick={() => { setEditingVendor(null); setShowAddModal(true); }}
								className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 touch-manipulation btn-primary-inset"
								style={{ color: theme.textOnPrimary, backgroundColor: theme.primary, WebkitTapHighlightColor: 'transparent' }}
							>
								<Plus size={22} />
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
									onClick={() => { setEditingVendor(null); setShowAddModal(true); }}
									className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-colors touch-manipulation"
									style={{
										color: theme.primary,
										backgroundColor: theme.isDark ? `${theme.primary}20` : `${theme.primary}15`,
										border: `1px solid ${theme.primary}40`,
										WebkitTapHighlightColor: 'transparent'
									}}
								>
									Add Vendor
									<CaretDown size={18} />
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
			) : pageTab === 'index' ? (
				<SupplyIndex ref={supplyIndexRef} theme={theme} />
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

				theme={theme}
			/>
		</section>
		</IconContext.Provider>
	)
}


