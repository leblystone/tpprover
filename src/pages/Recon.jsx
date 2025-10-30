import React, { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { themes, defaultThemeName } from '../theme/themes'
import TextInput from '../components/common/inputs/TextInput'
import { Edit, Trash2, PlusCircle, Filter, FileText, Eye, PenTool, Search, Package, Calendar, Beaker, Droplet, Calculator, Save, CheckCircle, History, Pipette } from 'lucide-react'
import AutoSaveIndicator from '../components/common/AutoSaveIndicator'
import useAutoSave from '../utils/useAutoSave'
import VendorSuggestInput from '../components/vendors/VendorSuggestInput'
import { ReconCalculatorPanel } from '../components/recon/ReconCalculatorPanel'
import ReconHelpPanel from '../components/recon/ReconHelpPanel'
import { formatCurrency } from '../utils/currencyUtils'
import { getChromeGradient } from '../utils/recon'
import { PEN_COLORS } from '../utils/penColors'
import Tabs from '../components/common/Tabs'
import Modal from '../components/common/Modal'
import { calculateRecon } from '../utils/recon'
import { formatMMDDYYYY } from '../utils/date'
import { useAppContext } from '../context/AppContext'
import { generateId } from '../utils/string'
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess'
import UpgradeModal from '../components/common/UpgradeModal'

export default function Recon() {
	const { theme } = useOutletContext()
    const { reconItems, setReconItems, vendors, reconHistory, setReconHistory } = useAppContext();
    const { isReadOnly } = useSubscriptionAccess();
	const [searchParams] = useSearchParams()
	const [editingItem, setEditingItem] = useState(null)
	const [showEditModal, setShowEditModal] = useState(false)
    const [viewItem, setViewItem] = useState(null)
	const [stockpile, setStockpile] = useState([])

    // Autosave for Add/Edit Recon modal
    const [draft, setDraft] = useState({})
    const { isSaving, lastSaved, clearSavedData, updateFormData } = useAutoSave('tpprover_recon_add_draft', draft, setDraft, 1200)
	const [prefill, setPrefill] = useState(null)
	const [activeTab, setActiveTab] = useState('reconstituted') // reconstituted | history | calculator
	const [searchOpen, setSearchOpen] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [showHistoryFilters, setShowHistoryFilters] = useState(false)
	const [historyFilters, setHistoryFilters] = useState({ peptide: '', vendor: '' })
	const [showUpgradeModal, setShowUpgradeModal] = useState(false)

    useEffect(() => {
		try {
			localStorage.setItem('tpprover_recon_history', JSON.stringify(reconHistory));
		} catch (e) {
			console.error("Failed to save recon history", e);
		}
	}, [reconHistory]);

	// Load prefill data from stockpile and auto-open calculator
	useEffect(() => {
		try {
			const raw = localStorage.getItem('tpprover_recon_prefill')
			if (raw) {
				const data = JSON.parse(raw)
				setPrefill(data)
				// Automatically switch to calculator tab when prefill data exists
				setActiveTab('calculator')
				// Show toast to let user know data was loaded
				window.dispatchEvent(new CustomEvent('tpp:toast', { 
					detail: { message: `✅ Loaded ${data.peptide} from stockpile`, type: 'success' } 
				}));
			}
		} catch {}
	}, [])

	const handleSave = (item) => {
		const next = editingItem?.id
			? reconItems.map(i => i.id === editingItem.id ? { ...i, ...item } : i)
			: [{ id: generateId(), ...item }, ...reconItems]
		setReconItems(next)
		setShowEditModal(false)
	}

	const handleSaveEdit = (editedData) => {
		setReconItems(prev => prev.map(item => item.id === editingItem.id ? { ...item, ...editedData } : item));
		setEditingItem(null);
	};

	const handleDelete = (id) => {
		setReconItems(prev => prev.filter(item => item.id !== id));
		setEditingItem(null);
		setShowEditModal(false);
	};

	const vendorMap = useMemo(() => vendors.reduce((acc, v) => ({ ...acc, [v.id]: v.name }), {}), [vendors]);

	// Helper functions to extract data from editing item
	const getEditingPeptideName = () => {
		if (!editingItem) return draft.peptide || '';
		if (editingItem.peptide) return editingItem.peptide;
		if (Array.isArray(editingItem.peptides) && editingItem.peptides.length > 0) {
			return editingItem.peptides.map(p => p.name || 'Unnamed').join(' + ');
		}
		return '';
	};

	const getEditingMg = () => {
		if (!editingItem) return draft.mg || '';
		if (editingItem.mg) return editingItem.mg;
		if (Array.isArray(editingItem.peptides) && editingItem.peptides.length > 0) {
			return editingItem.peptides.reduce((sum, p) => sum + (Number(p.mg) || 0), 0);
		}
		return '';
	};

	const getEditingDose = () => {
		if (!editingItem) return draft.dose || '';
		if (editingItem.dose) return editingItem.dose;
		if (Array.isArray(editingItem.peptides) && editingItem.peptides.length > 0) {
			return editingItem.peptides.reduce((sum, p) => {
				const dose = Number(p.dose) || 0;
				return p.doseUnit === 'mg' ? sum + (dose * 1000) : sum + dose;
			}, 0);
		}
		return '';
	};

	const getEditingDoseUnit = () => {
		if (!editingItem) return draft.doseUnit || 'mcg';
		if (editingItem.doseUnit) return editingItem.doseUnit;
		if (Array.isArray(editingItem.peptides) && editingItem.peptides.length > 0) {
			// If all peptides use the same unit, return that unit, otherwise default to mcg
			const units = [...new Set(editingItem.peptides.map(p => p.doseUnit || 'mcg'))];
			return units.length === 1 ? units[0] : 'mcg';
		}
		return 'mcg';
	};

	const filteredItems = reconItems.filter(i => {
		const vendorName = i.vendorId ? vendorMap[i.vendorId] || '' : (i.vendor || '');
		return (i.peptide || '').toLowerCase().includes(searchQuery.toLowerCase()) || vendorName.toLowerCase().includes(searchQuery.toLowerCase())
	})
	const sortedItems = [...filteredItems].sort((a, b) => new Date(b.date) - new Date(a.date))

	const filteredHistory = reconHistory.filter(i => (i.peptide || '').toLowerCase().includes(searchQuery.toLowerCase()) || (i.vendor || '').toLowerCase().includes(searchQuery.toLowerCase()))
	const sortedHistory = [...filteredHistory].sort((a, b) => new Date(b.usedDate) - new Date(a.usedDate));

    const handleMarkAsUsed = (itemToMove) => {
        setReconItems(prev => prev.filter(i => i.id !== itemToMove.id));
        setReconHistory(prev => [{ ...itemToMove, usedDate: new Date().toISOString() }, ...prev]);
    };

	// Set topbar tabs via custom event
	useEffect(() => {
		const updateTabs = () => {
			const isMobile = window.matchMedia('(max-width: 767px)').matches;
		const tabs = isMobile
			? [
				{ value: 'calculator', label: 'Calculator' },
				{ value: 'reconstituted', label: 'IN USE' },
				{ value: 'history', label: 'History' }
			]
			: [
				{ value: 'reconstituted', label: 'IN USE' },
				{ value: 'history', label: 'History' }
			];
			// Ensure we don't get stuck on a hidden tab on desktop
			if (!isMobile && activeTab === 'calculator') {
				setActiveTab('reconstituted');
			}
			window.dispatchEvent(new CustomEvent('tpp:set-topbar-tabs', { 
				detail: { 
					tabs, 
					activeTab, 
					onTabChange: setActiveTab,
					onActionClick: () => setShowEditModal(true),
					actionDisabled: false
				} 
			}));
		};

		updateTabs();
		window.addEventListener('resize', updateTabs);
		return () => {
			window.dispatchEvent(new CustomEvent('tpp:clear-topbar-tabs'));
			window.removeEventListener('resize', updateTabs);
		};
	}, [activeTab]);

	return (
		<>
			<ReconHelpPanel theme={theme} />
			
			{/* Calculator Tab - Full width centered on desktop when active */}
			{activeTab === 'calculator' && (
				<div className="flex justify-center">
					<div className="w-full lg:max-w-2xl">
					<ReconCalculatorPanel theme={theme} prefill={prefill} isReadOnly={isReadOnly} onUpgrade={() => setShowUpgradeModal(true)} onSave={(data) => {
						console.log('🔵 Recon.jsx: onSave called with data:', data);
						console.log('🔵 isReadOnly:', isReadOnly);
						
						if (isReadOnly) {
							console.log('🔴 BLOCKED: Read-only mode');
							setShowUpgradeModal(true);
							return;
						}
						
						const peptideNames = data.peptides.map(p => p.name || 'Unnamed').join(' + ');
						const totalMg = data.peptides.reduce((sum, p) => sum + (Number(p.mg) || 0), 0);
						const totalDose = data.peptides.reduce((sum, p) => {
							const dose = Number(p.dose) || 0;
							return p.doseUnit === 'mg' ? sum + (dose * 1000) : sum + dose;
						}, 0);

						const newItem = {
								id: generateId(),
								peptide: peptideNames,
								mg: totalMg,
								dose: totalDose, // This is now total mcg for calculation purposes
								vendor: data.vendor, // Keep original for history/legacy
								vendorId: vendors.find(v => v.name === data.vendor)?.id || null,
								water: data.water,
								deliveryMethod: data.deliveryMethod,
								penColor: data.penColor,
								cost: data.cost,
								date: new Date().toISOString(),
								peptides: data.peptides, // Save the full peptide list
								notes: ''
						};
						
						console.log('🔵 New item to save:', newItem);
						console.log('🔵 Calling setReconItems...');
						setReconItems(prev => {
							console.log('🔵 Previous reconItems:', prev);
							const updated = [newItem, ...prev];
							console.log('🔵 Updated reconItems:', updated);
							return updated;
						});
						
						// Clear prefill data
						setPrefill(null);
						try {
							localStorage.removeItem('tpprover_recon_prefill');
						} catch {}
						
						// Switch to IN USE tab to show saved calculation
						console.log('🔵 Switching to reconstituted tab');
						setActiveTab('reconstituted');
						
						// Show success toast
						console.log('🔵 Dispatching success toast');
						window.dispatchEvent(new CustomEvent('tpp:toast', { 
							detail: { message: 'Calculation saved successfully!', type: 'success' } 
						}));
					}} />
					</div>
				</div>
			)}

			<div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 ${activeTab === 'calculator' ? 'hidden' : ''}`}>
				{/* Desktop: Show calculator in sidebar on other tabs */}
				<div className="order-1 lg:order-2 hidden lg:block">
				<ReconCalculatorPanel theme={theme} prefill={prefill} isReadOnly={isReadOnly} onUpgrade={() => setShowUpgradeModal(true)} onSave={(data) => {
					if (isReadOnly) {
						setShowUpgradeModal(true);
						return;
					}
					
					const peptideNames = data.peptides.map(p => p.name || 'Unnamed').join(' + ');
					const totalMg = data.peptides.reduce((sum, p) => sum + (Number(p.mg) || 0), 0);
					const totalDose = data.peptides.reduce((sum, p) => {
                        const dose = Number(p.dose) || 0;
                        return p.doseUnit === 'mg' ? sum + (dose * 1000) : sum + dose;
                    }, 0);

					const newItem = {
							id: generateId(),
							peptide: peptideNames,
							mg: totalMg,
							dose: totalDose, // This is now total mcg for calculation purposes
							vendor: data.vendor, // Keep original for history/legacy
                            vendorId: vendors.find(v => v.name === data.vendor)?.id || null,
							water: data.water,
							deliveryMethod: data.deliveryMethod,
							penColor: data.penColor,
							cost: data.cost,
							date: new Date().toISOString(),
                            peptides: data.peptides, // Save the full peptide list
							notes: ''
					};
					setReconItems(prev => [newItem, ...prev]);
					
					// Clear prefill data
					setPrefill(null);
					try {
						localStorage.removeItem('tpprover_recon_prefill');
					} catch {}
					
					// Switch to IN USE tab to show saved calculation
					setActiveTab('reconstituted');
					
					// Show success toast
					window.dispatchEvent(new CustomEvent('tpp:toast', { 
						detail: { message: 'Calculation saved successfully!', type: 'success' } 
					}));
				}} />
				</div>

				{/* Main content area */}
				<div className={`order-2 lg:order-1 lg:col-span-2 ${activeTab === 'calculator' ? 'hidden lg:block' : 'block'}`}>
					{/* Search and Filter - show when not on calculator tab */}
					{activeTab !== 'calculator' && (
						<div className="flex items-center justify-between mb-4">
							<div className="flex items-center gap-2 flex-1">
								<button 
									className="p-2 rounded-md hover:bg-opacity-10 hover:bg-gray-500 transition-colors" 
									style={{ color: theme.text, backgroundColor: searchOpen ? theme.accent : 'transparent' }} 
									title="Search entries" 
									onClick={() => {
										console.log('Search button clicked, current state:', searchOpen);
										setSearchOpen(v => !v);
									}}
								>
									<Search className="h-4 w-4" />
								</button>
								{searchOpen && (
									<input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search entries..." className="ml-1 p-2 rounded border text-sm" style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }} />
								)}
							</div>
							{activeTab === 'history' && (
								<button className="p-2 rounded-md" title="Filter" onClick={() => setShowHistoryFilters(v => !v)}>
									<Filter className="h-4 w-4" />
								</button>
							)}
						</div>
					)}

					{activeTab === 'reconstituted' && (
						<div className="space-y-3">
							{/* Empty State - Show when no items */}
							{sortedItems.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-12 px-6 text-center">
									<div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
										<Beaker size={32} style={{ color: theme.primary }} />
									</div>
									<h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>No Vials In Use</h3>
									<p className="text-sm mb-6 max-w-md" style={{ color: theme.textLight }}>
										Add current reconstituted peptide vials to track dosages, delivery methods, and usage for research purposes. 
										This helps manage inventory and calculate proper dosing.
									</p>
									<button
										onClick={() => setShowEditModal(true)}
										className="flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all hover:opacity-90 hover:scale-105"
										style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
									>
										<PlusCircle size={18} />
										Add Your First Vial
									</button>
								</div>
							) : (
								sortedItems.map(item => {
								const isBlend = Array.isArray(item.peptides) && item.peptides.length > 0;
                                const totalMg = isBlend ? item.peptides.reduce((sum, p) => sum + (Number(p.mg) || 0), 0) : item.mg;
                                const totalDoseInMcg = isBlend 
                                    ? item.peptides.reduce((sum, p) => {
                                        const dose = Number(p.dose) || 0;
                                        return p.doseUnit === 'mg' ? sum + (dose * 1000) : sum + dose;
                                    }, 0)
                                    : item.dose;

								const calc = calculateRecon({ ...item, mg: totalMg, dose: totalDoseInMcg });
								const costPerDose = item.cost ? formatCurrency(item.cost / calc.dosesPerVial) : null
								return (
									<div key={item.id} className="rounded-lg p-4 shadow-md hover:shadow-lg transition-shadow content-card flex flex-col justify-between" style={{ backgroundColor: theme.cardBackground }}>
										<div>
											<div className="flex justify-between items-start">
												<div>
													<div className="font-semibold text-base" style={{ color: theme.text }}>{item.name || item.peptide}</div>
													<div className="text-sm flex items-center gap-2 mt-1" style={{ color: theme.textLight }}><Package size={14} /> {item.vendorId ? vendorMap[item.vendorId] : item.vendor}</div>
												</div>
												<div className="text-xs text-gray-500">{formatMMDDYYYY(item.date)}</div>
											</div>
											
                                            {Array.isArray(item.peptides) && item.peptides.length > 0 ? (
                                                <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: theme.border }}>
                                                    {item.peptides.map((p, idx) => (
                                                        <div key={idx} className="text-xs flex justify-between">
                                                            <span>- {p.name}</span>
                                                            <span className="font-semibold">{p.dose} {p.doseUnit || 'mcg'}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : null}

											<div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-3 pt-3 border-t" style={{ borderColor: theme.border }}>
												<div className="text-sm space-y-2" style={{ color: theme.textLight }}>
													<div className="flex items-center gap-2"><Beaker size={14} /> {totalMg} mg</div>
													<div className="flex items-center gap-2"><Droplet size={14} /> {item.water} mL water</div>
													<div className="flex items-center gap-2"><Droplet size={14} /> {totalDoseInMcg} mcg total dose</div>
												</div>
												<div className="text-sm space-y-2" style={{ color: theme.textLight }}>
													<div><span className="font-medium text-base pr-1" style={{color: theme.text}}>{calc.unitsPerDose ? calc.unitsPerDose.toFixed(0) : '-'}</span> units/dose</div>
													<div><span className="font-medium text-base pr-1" style={{color: theme.text}}>{calc.dosesPerVial || '-'}</span> doses/vial</div>
													<div><span className="font-medium text-base pr-1" style={{color: theme.text}}>{costPerDose || '-'}</span> / dose</div>
												</div>
											</div>
										</div>

										<div className="flex justify-between items-center mt-3 pt-3 border-t" style={{ borderColor: theme.border }}>
											<div className="flex items-center gap-2">
									{item.deliveryMethod === 'pen' && item.penColor ? (
													<div className="flex flex-col gap-1">
														<div 
                                                        className="flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-full" 
                                                        style={{ 
                                                            background: getChromeGradient(PEN_COLORS[item.penColor] || item.penColor), 
                                                            color: ['Gold', 'Silver', 'Light Pink', 'Light Blue', 'Lime Green', 'Yellow', 'White'].includes(item.penColor) ? theme.text : theme.textOnPrimary 
                                                        }}
                                                    >
															<PenTool size={12} />
															<span>{
                                                                // Handle both name format ("Light Blue") and hex format ("#ADD8E6")
                                                                item.penColor.startsWith('#') 
                                                                    ? Object.keys(PEN_COLORS).find(name => PEN_COLORS[name] === item.penColor) || 'Custom'
                                                                    : item.penColor
                                                            } Pen</span>
														</div>
														{item.penType && (
															<div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: theme.secondary, color: theme.text }}>
																{item.penType === 'other' ? 'Other Pen' : 
																	item.penType === 'savvio' ? 'Savvio' :
																	item.penType === 'novo' ? 'Novo' :
																	item.penType === 'v1' ? 'V1' :
																	item.penType === 'v2' ? 'V2' :
																	item.penType === 'v3' ? 'V3' :
																	item.penType === 'bird-pen' ? 'Bird Pen' :
																	item.penType === 'luxura' ? 'Luxura' :
																	item.penType === 'gansulin' ? 'Gansulin' :
																	item.penType
																}
															</div>
														)}
													</div>
												) : (
                                                    <div className="flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: theme.secondary, color: theme.text }}>
                                                        <Pipette size={12} />
                                                        <span>Syringe</span>
                                                    </div>
                                                )}
											</div>
                                            <div className="flex items-center">
											    <button className="p-2 rounded-md hover:bg-gray-100 text-xs flex items-center gap-1" style={{ color: theme.textLight }} onClick={() => handleMarkAsUsed(item)}>
                                                    <CheckCircle size={14} /> Mark as Used
                                                </button>
                                                <button className="p-2 rounded-md hover:bg-gray-100" style={{ color: theme.primary }} onClick={() => { setEditingItem(item); setShowEditModal(true) }}><Edit className="h-4 w-4" /></button>
                                            </div>
										</div>

										{item.notes && (
											<div className="mt-3 pt-3 border-t text-xs flex items-start gap-2" style={{ borderColor: theme.border, color: theme.textLight }}>
												<FileText size={14} className="mt-0.5" />
												<p>{item.notes}</p>
											</div>
										)}
									</div>
								)
							})
							)}
						</div>
					)}

					{activeTab === 'history' && (
						<div>
							{sortedHistory.length === 0 ? (
								<div className="flex flex-col items-center justify-center py-12 px-6 text-center">
									<div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: `${theme.primary}10` }}>
										<History size={32} style={{ color: theme.primary }} />
									</div>
									<h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>No History Yet</h3>
									<p className="text-sm mb-6 max-w-md" style={{ color: theme.textLight }}>
										Your reconstitution history will appear here once you mark vials as used. 
										This helps you track past usage patterns, vendors, and dosing information for future reference.
									</p>
								</div>
							) : (
								<div className="overflow-x-auto">
									{showHistoryFilters && (
										<div className="mb-3 p-3 rounded border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
											<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
												<TextInput label="Peptide" placeholder="Filter by peptide" value={historyFilters.peptide} onChange={v => setHistoryFilters(f => ({ ...f, peptide: v }))} theme={theme} />
												<TextInput label="Vendor" placeholder="Filter by vendor" value={historyFilters.vendor} onChange={v => setHistoryFilters(f => ({ ...f, vendor: v }))} theme={theme} />
											</div>
										</div>
									)}
									<table className="w-full text-left">
										<thead>
											<tr className="text-xs" style={{ color: theme.textLight }}>
												<th className="py-2 pr-3">Peptide</th>
												<th className="py-2 pr-3">Date</th>
												<th className="py-2 pr-3">Vendor</th>
												<th className="py-2 pr-3">mg</th>
												<th className="py-2 pr-3 text-right">Actions</th>
											</tr>
										</thead>
										<tbody>
											{sortedHistory.map(item => (
												<tr key={`h-${item.id}`} className="border-t" style={{ borderColor: theme.border }}>
													<td className="py-2 pr-3">{item.peptide}</td>
													<td className="py-2 pr-3">{formatMMDDYYYY(item.date)}</td>
													<td className="py-2 pr-3">{item.vendor}</td>
													<td className="py-2 pr-3">{item.mg}</td>
													<td className="py-2 pr-3 text-right"><button className="p-1 rounded" onClick={() => setViewItem(item)} title="View details" style={{ color: theme.textLight }}><Eye className="h-4 w-4" /></button></td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

            <Modal open={showEditModal} onClose={() => { setShowEditModal(null); setEditingItem(null); clearSavedData(); }} title={editingItem ? 'Edit Reconstitution' : 'New Reconstitution'} theme={theme} variant="modern" titleExtra={<AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} theme={theme} compact iconOnly={true} />} footer={
				<div className="w-full flex justify-between items-center">
					<div>
						{editingItem && <button onClick={() => handleDelete(editingItem.id)} className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-all">Delete</button>}
					</div>
					<div className="flex items-center gap-2">
						<button 
							onClick={() => { setShowEditModal(null); setEditingItem(null) }} 
							className="px-4 py-2 rounded-lg text-sm font-medium border transition-all" 
							style={{ borderColor: theme.border, color: theme.text }}
							onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.primary + '15'}
							onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
						>
							Cancel
						</button>
						<button 
							onClick={() => handleSave(editingItem)} 
							className="px-4 py-2 rounded-lg text-sm font-medium transition-all" 
							style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
							onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? theme.primary + 'dd' : theme.primary + 'cc'}
							onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.primary}
						>
							Save
						</button>
					</div>
				</div>
			}>
                <div className="space-y-3">
                    {/* VIAL DETAILS Section Header */}
                    <div className="px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
                        <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.isDark ? '#a8b5a0' : theme.primary }}>VIAL DETAILS</h4>
                    </div>

                    <TextInput label="Peptide Name" value={getEditingPeptideName()} onChange={v => { setEditingItem(i => ({ ...i, peptide: v })); updateFormData({ peptide: v }); }} theme={theme} />
                    <VendorSuggestInput 
                        label="Vendor" 
                        value={editingItem?.vendorId ? vendorMap[editingItem.vendorId] : (editingItem?.vendor || draft.vendor || '')} 
                        onChange={v => {
                            const selectedVendor = vendors.find(vendor => vendor.name === v);
                            setEditingItem(i => ({ ...i, vendor: v, vendorId: selectedVendor ? selectedVendor.id : null }));
                            updateFormData({ vendor: v, vendorId: selectedVendor ? selectedVendor.id : null });
                        }} 
                        theme={theme} 
                    />
                    {/* mg and water in one row */}
                    <div className="grid grid-cols-2 gap-3">
                        <TextInput label="mg" type="number" value={getEditingMg()} onChange={v => { setEditingItem(i => ({ ...i, mg: v })); updateFormData({ mg: v }); }} theme={theme} />
                        <TextInput label="Water (mL)" type="number" value={editingItem?.water || draft.water || ''} onChange={v => { setEditingItem(i => ({ ...i, water: v })); updateFormData({ water: v }); }} theme={theme} />
                    </div>
                    
                    {/* dose on its own row */}
                    <div>
                        <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Dose</label>
                        <div 
                            className="flex items-stretch rounded-lg overflow-hidden"
                            style={{ 
                                border: theme.isDark ? 'none' : `1px solid ${theme.border}`,
                                boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                            }}
                        >
                            <input 
                                type="number"
                                value={getEditingDose()} 
                                onChange={e => { 
                                    setEditingItem(i => ({ ...i, dose: e.target.value })); 
                                    updateFormData({ dose: e.target.value }); 
                                }} 
                                placeholder="250"
                                className="flex-1 px-3 py-2 outline-none min-w-0"
                                style={{
                                    backgroundColor: theme.isDark ? '#1f2937' : (theme.inputBackground || '#fff'),
                                    color: theme.text
                                }}
                            />
                            <div 
                                className="flex items-center gap-0.5 px-1 py-1 flex-shrink-0"
                                style={{ 
                                    borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid ${theme.border}`,
                                    backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb')
                                }}
                            >
                                {['mcg', 'mg', 'mL'].map(unit => (
                                    <button 
                                        key={unit} 
                                        type="button" 
                                        onClick={() => { 
                                            setEditingItem(i => ({ ...i, doseUnit: unit })); 
                                            updateFormData({ doseUnit: unit }); 
                                        }}
                                        className={`px-1.5 py-0.5 text-xs font-semibold rounded transition-all flex-shrink-0 ${
                                            getEditingDoseUnit() === unit 
                                                ? 'text-white shadow-sm' 
                                                : ''
                                        }`}
                                        style={getEditingDoseUnit() === unit ? { backgroundColor: theme.primary } : { color: theme.text }}
                                        onMouseEnter={(e) => {
                                            if (getEditingDoseUnit() !== unit) {
                                                e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#e5e7eb';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (getEditingDoseUnit() !== unit) {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        {unit}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* DELIVERY METHOD Section Header */}
                    <div className="px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
                        <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.isDark ? '#a8b5a0' : theme.primary }}>DELIVERY METHOD</h4>
                    </div>

                    <div>
                        <div className="flex rounded-lg p-1 gap-1" style={{ backgroundColor: theme.isDark ? '#1f2937' : '#f3f4f6' }}>
                            <button 
                                onClick={() => setEditingItem(i => ({ ...i, deliveryMethod: 'pipette' }))}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                    (editingItem?.deliveryMethod || 'pipette') === 'pipette' 
                                        ? 'text-white shadow-sm' 
                                        : ''
                                }`}
                                style={(editingItem?.deliveryMethod || 'pipette') === 'pipette' ? { backgroundColor: theme.primary } : { color: theme.text }}
                                onMouseEnter={(e) => {
                                    if ((editingItem?.deliveryMethod || 'pipette') !== 'pipette') {
                                        e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#e5e7eb';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if ((editingItem?.deliveryMethod || 'pipette') !== 'pipette') {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <Pipette size={16} /> Syringe
                            </button>
                            <button 
                                onClick={() => setEditingItem(i => ({ ...i, deliveryMethod: 'pen' }))}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                    editingItem?.deliveryMethod === 'pen' 
                                        ? 'text-white shadow-sm' 
                                        : ''
                                }`}
                                style={editingItem?.deliveryMethod === 'pen' ? { backgroundColor: theme.primary } : { color: theme.text }}
                                onMouseEnter={(e) => {
                                    if (editingItem?.deliveryMethod !== 'pen') {
                                        e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#e5e7eb';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (editingItem?.deliveryMethod !== 'pen') {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <PenTool size={16} /> Pen
                            </button>
                            <button 
                                onClick={() => setEditingItem(i => ({ ...i, deliveryMethod: 'nasal' }))}
                                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                    editingItem?.deliveryMethod === 'nasal' 
                                        ? 'text-white shadow-sm' 
                                        : ''
                                }`}
                                style={editingItem?.deliveryMethod === 'nasal' ? { backgroundColor: theme.primary } : { color: theme.text }}
                                onMouseEnter={(e) => {
                                    if (editingItem?.deliveryMethod !== 'nasal') {
                                        e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#e5e7eb';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (editingItem?.deliveryMethod !== 'nasal') {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }
                                }}
                            >
                                <Droplet size={16} /> Nasal
                            </button>
                        </div>
                        {(editingItem?.deliveryMethod === 'pipette' || !editingItem?.deliveryMethod) && (
                            <div className="mt-3">
                                <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Administration Route</label>
                                <div className="flex rounded-lg p-1 gap-1" style={{ backgroundColor: theme.isDark ? '#1f2937' : '#f3f4f6' }}>
                                    <button 
                                        onClick={() => setEditingItem(i => ({ ...i, administrationRoute: 'SubQ' }))}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                            (editingItem?.administrationRoute || 'SubQ') === 'SubQ' 
                                                ? 'text-white shadow-sm' 
                                                : ''
                                        }`}
                                        style={(editingItem?.administrationRoute || 'SubQ') === 'SubQ' ? { backgroundColor: theme.primary } : { color: theme.text }}
                                        onMouseEnter={(e) => {
                                            if ((editingItem?.administrationRoute || 'SubQ') !== 'SubQ') {
                                                e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#e5e7eb';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if ((editingItem?.administrationRoute || 'SubQ') !== 'SubQ') {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        SubQ
                                    </button>
                                    <button 
                                        onClick={() => setEditingItem(i => ({ ...i, administrationRoute: 'IM' }))}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                            editingItem?.administrationRoute === 'IM' 
                                                ? 'text-white shadow-sm' 
                                                : ''
                                        }`}
                                        style={editingItem?.administrationRoute === 'IM' ? { backgroundColor: theme.primary } : { color: theme.text }}
                                        onMouseEnter={(e) => {
                                            if (editingItem?.administrationRoute !== 'IM') {
                                                e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#e5e7eb';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (editingItem?.administrationRoute !== 'IM') {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        IM
                                    </button>
                                    <button 
                                        onClick={() => setEditingItem(i => ({ ...i, administrationRoute: 'IV' }))}
                                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                                            editingItem?.administrationRoute === 'IV' 
                                                ? 'text-white shadow-sm' 
                                                : ''
                                        }`}
                                        style={editingItem?.administrationRoute === 'IV' ? { backgroundColor: theme.primary } : { color: theme.text }}
                                        onMouseEnter={(e) => {
                                            if (editingItem?.administrationRoute !== 'IV') {
                                                e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#e5e7eb';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (editingItem?.administrationRoute !== 'IV') {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        IV
                                    </button>
                                </div>
                            </div>
                        )}
                        {editingItem?.deliveryMethod === 'pen' && (
                            <div className="mt-3">
                                <div className="grid grid-cols-2 gap-3">
                                    {/* Pen Type Selection */}
                                    <div>
                                        <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Pen Type</label>
                                        <select
                                            value={editingItem?.penType || ''}
                                            onChange={e => setEditingItem(i => ({ ...i, penType: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-opacity-50 transition-all"
                                            style={{
                                                borderColor: theme.border,
                                                backgroundColor: theme.cardBackground,
                                                color: theme.text,
                                                focusRingColor: theme.primary
                                            }}
                                        >
                                            <option value="">(Optional)</option>
                                            <option value="insulin">Insulin Pen</option>
                                            <option value="growth-hormone">Growth Hormone Pen</option>
                                            <option value="testosterone">Testosterone Pen</option>
                                            <option value="custom">Custom</option>
                                        </select>
                                    </div>
                                    {/* Pen Color Selection */}
                                    <div>
                                        <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Pen Color</label>
                                        <select
                                            value={editingItem?.penColor || ''}
                                            onChange={e => setEditingItem(i => ({ ...i, penColor: e.target.value }))}
                                            className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-opacity-50 transition-all"
                                            style={{
                                                borderColor: theme.border,
                                                backgroundColor: theme.cardBackground,
                                                color: theme.text,
                                                focusRingColor: theme.primary
                                            }}
                                        >
                                            <option value="">(Optional)</option>
                                            <option value="white">White</option>
                                            <option value="black">Black</option>
                                            <option value="blue">Blue</option>
                                            <option value="red">Red</option>
                                            <option value="green">Green</option>
                                            <option value="yellow">Yellow</option>
                                            <option value="purple">Purple</option>
                                            <option value="orange">Orange</option>
                                            <option value="pink">Pink</option>
                                            <option value="gray">Gray</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Page Break */}
                    <div className="border-t" style={{ borderColor: theme.border }}></div>

                    <TextInput label="Notes" value={editingItem?.notes || ''} onChange={v => setEditingItem(i => ({ ...i, notes: v }))} theme={theme} multiline />
                </div>
			</Modal>

            <Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Recon History Details" theme={theme} variant="modern">
				{viewItem && (() => {
					const calc = calculateRecon(viewItem)
					const costPerDose = viewItem.cost ? formatCurrency(viewItem.cost / calc.dosesPerVial) : null
					return (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
							<div><div className="text-xs" style={{ color: theme.textLight }}>Date</div><div className="font-medium">{formatMMDDYYYY(viewItem.date)}</div></div>
							<div><div className="text-xs" style={{ color: theme.textLight }}>Vendor</div><div className="font-medium">{viewItem.vendorId ? vendorMap[viewItem.vendorId] : viewItem.vendor}</div></div>
							<div><div className="text-xs" style={{ color: theme.textLight }}>mg</div><div className="font-medium">{viewItem.mg}</div></div>
							<div><div className="text-xs" style={{ color: theme.textLight }}>Water (mL)</div><div className="font-medium">{viewItem.water}</div></div>
							<div><div className="text-xs" style={{ color: theme.textLight }}>Dose (mcg)</div><div className="font-medium">{viewItem.dose}</div></div>
							<div className="sm:col-span-2"><div className="text-xs" style={{ color: theme.textLight }}>Delivery Method</div><div className="font-medium">{String(viewItem.deliveryMethod || 'pipette').toLowerCase() === 'pen' ? `Pen${viewItem.penColor ? ` (${viewItem.penColor})` : ''}` : 'Syringe'}</div></div>
							<div><div className="text-xs" style={{ color: theme.textLight }}>Units</div><div>{calc.unitsPerDose ? `${calc.unitsPerDose.toFixed(0)} u` : '-'}</div></div>
							<div><div className="text-xs" style={{ color: theme.textLight }}>Doses/Vial</div><div>{calc.dosesPerVial || '-'}</div></div>
							<div><div className="text-xs" style={{ color: theme.textLight }}>Cost/Dose</div><div>{costPerDose || '-'}</div></div>
							{viewItem.capColor ? (<div className="sm:col-span-2"><div className="text-xs" style={{ color: theme.textLight }}>Cap Color</div><div className="font-medium">{viewItem.capColor}</div></div>) : null}
							{viewItem.notes ? (<div className="sm:col-span-2"><div className="text-xs" style={{ color: theme.textLight }}>Notes</div><div className="font-medium">{viewItem.notes}</div></div>) : null}
						</div>
					)
				})()}
			</Modal>

			<UpgradeModal
				isOpen={showUpgradeModal}
				onClose={() => setShowUpgradeModal(false)}
				theme={theme}
			/>
		</>
	)
}


