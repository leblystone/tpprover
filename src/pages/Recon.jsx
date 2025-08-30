import React, { useEffect, useMemo, useState } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import { themes, defaultThemeName } from '../theme/themes'
import TextInput from '../components/common/inputs/TextInput'
import { Edit, Trash2, PlusCircle, Filter, FileText, Eye, Syringe, PenTool, Search, Package, Calendar, Beaker, Droplet, Calculator, Save, CheckCircle } from 'lucide-react'
import VendorSuggestInput from '../components/vendors/VendorSuggestInput'
import { ReconCalculatorPanel } from '../components/recon/ReconCalculatorPanel'
import { getChromeGradient } from '../utils/recon'
import Tabs from '../components/common/Tabs'
import Modal from '../components/common/Modal'
import { calculateRecon } from '../utils/recon'
import { formatMMDDYYYY } from '../utils/date'
import { useAppContext } from '../context/AppContext'
import { generateId } from '../utils/string'

const PEN_COLORS = {
    Gold: '#B8860B', Silver: '#C0C0C0', Black: '#000000', Purple: '#800080',
    'Hot Pink': '#FF69B4', 'Light Pink': '#FFB6C1', 'Dark Blue': '#00008B',
    'Light Blue': '#ADD8E6', Teal: '#0080B0', 'Lime Green': '#32CD32',
    Yellow: '#FFFF00', White: '#FFFFFF', Brown: '#8B4513', Burgundy: '#800020'
};

export default function Recon() {
	const { theme } = useOutletContext()
    const { reconItems, setReconItems, vendors, reconHistory, setReconHistory } = useAppContext();
	const [searchParams] = useSearchParams()
	const [editingItem, setEditingItem] = useState(null)
	const [showEditModal, setShowEditModal] = useState(false)
	const [viewItem, setViewItem] = useState(null)
	const [stockpile, setStockpile] = useState([])
	const [prefill, setPrefill] = useState(null)
	const [activeTab, setActiveTab] = useState('reconstituted') // reconstituted | history
	const [searchOpen, setSearchOpen] = useState(false)
	const [searchQuery, setSearchQuery] = useState('')
	const [showHistoryFilters, setShowHistoryFilters] = useState(false)
	const [historyFilters, setHistoryFilters] = useState({ peptide: '', vendor: '' })

    useEffect(() => {
		try {
			localStorage.setItem('tpprover_recon_history', JSON.stringify(reconHistory));
		} catch (e) {
			console.error("Failed to save recon history", e);
		}
	}, [reconHistory]);

	useEffect(() => {
		try {
			const raw = localStorage.getItem('tpprover_recon_prefill')
			if (raw) {
				setPrefill(JSON.parse(raw))
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

	return (
		<section>
			<div className="flex items-center justify-between mb-4">
				<h1 className="text-2xl font-bold" style={{ color: theme.primaryDark }}>Reconstitution</h1>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<div className="order-2 lg:order-1 lg:col-span-2">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-2 flex-1">
							<Tabs theme={theme} value={activeTab} onChange={setActiveTab} compact stretch options={[
								{ value: 'reconstituted', label: 'Reconstituted' },
								{ value: 'history', label: 'History' },
							]} />
							<button className="p-2 rounded-md" style={{ color: theme.text }} title="Search entries" onClick={() => setSearchOpen(v => !v)}>
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

					{activeTab === 'reconstituted' ? (
						<div className="space-y-3">
							{sortedItems.map(item => {
								const isBlend = Array.isArray(item.peptides) && item.peptides.length > 0;
                                const totalMg = isBlend ? item.peptides.reduce((sum, p) => sum + (Number(p.mg) || 0), 0) : item.mg;
                                const totalDoseInMcg = isBlend 
                                    ? item.peptides.reduce((sum, p) => {
                                        const dose = Number(p.dose) || 0;
                                        return p.doseUnit === 'mg' ? sum + (dose * 1000) : sum + dose;
                                    }, 0)
                                    : item.dose;

								const calc = calculateRecon({ ...item, mg: totalMg, dose: totalDoseInMcg });
								const costPerDose = item.cost ? `$${(item.cost / calc.dosesPerVial).toFixed(2)}` : null
								return (
									<div key={item.id} className="rounded-lg border p-4 shadow-sm content-card flex flex-col justify-between" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
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
													<div className="flex items-center gap-2"><Syringe size={14} /> {totalDoseInMcg} mcg total dose</div>
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
													<div 
                                                        className="flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-full" 
                                                        style={{ 
                                                            background: getChromeGradient(PEN_COLORS[item.penColor] || item.penColor), 
                                                            color: ['Gold', 'Silver', 'Light Pink', 'Light Blue', 'Lime Green', 'Yellow', 'White'].includes(item.penColor) ? theme.text : theme.textOnPrimary 
                                                        }}
                                                    >
														<PenTool size={12} />
														<span>{item.penColor} Pen</span>
													</div>
												) : (
                                                    <div className="flex items-center gap-2 text-xs font-semibold px-2 py-1 rounded-full" style={{ backgroundColor: theme.secondary, color: theme.text }}>
                                                        <Syringe size={12} />
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
							})}
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

				<div className="order-1 lg:order-2">
					<ReconCalculatorPanel theme={theme} prefill={prefill} onSave={(data) => {
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
						setReconItems(prev => [newItem, ...prev])
					}} />
				</div>
			</div>

			<Modal open={showEditModal} onClose={() => { setShowEditModal(null); setEditingItem(null) }} title={editingItem ? 'Edit Reconstitution' : 'New Entry'} theme={theme} footer={
				<div className="w-full flex justify-between">
					<div>
						{editingItem && <button onClick={() => handleDelete(editingItem.id)} className="px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 text-sm">Delete</button>}
					</div>
					<div className="flex items-center gap-2">
						<button onClick={() => { setShowEditModal(null); setEditingItem(null) }} className="px-3 py-2 rounded-md border text-sm">Cancel</button>
						<button onClick={() => handleSave(editingItem)} className="px-3 py-2 rounded-md text-white text-sm" style={{ backgroundColor: theme.primary }}>Save</button>
					</div>
				</div>
			}>
				<div className="space-y-4">
                    <TextInput label="Peptide Name" value={editingItem?.peptide || ''} onChange={v => setEditingItem(i => ({ ...i, peptide: v }))} theme={theme} />
                    <VendorSuggestInput 
                        label="Vendor" 
                        value={editingItem?.vendorId ? vendorMap[editingItem.vendorId] : (editingItem?.vendor || '')} 
                        onChange={v => {
                            const selectedVendor = vendors.find(vendor => vendor.name === v);
                            setEditingItem(i => ({ ...i, vendor: v, vendorId: selectedVendor ? selectedVendor.id : null }))
                        }} 
                        theme={theme} 
                    />
                    <div className="grid grid-cols-3 gap-3">
                        <TextInput label="mg/vial" type="number" value={editingItem?.mg || ''} onChange={v => setEditingItem(i => ({ ...i, mg: v }))} theme={theme} />
                        <TextInput label="Water (mL)" type="number" value={editingItem?.water || ''} onChange={v => setEditingItem(i => ({ ...i, water: v }))} theme={theme} />
                        <TextInput label="Dose (mcg)" type="number" value={editingItem?.dose || ''} onChange={v => setEditingItem(i => ({ ...i, dose: v }))} theme={theme} />
                    </div>
                    <div>
                        <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>Delivery Method</div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => setEditingItem(i => ({ ...i, deliveryMethod: 'syringe' }))}
                                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-md border text-sm font-semibold`}
                                style={{
                                    backgroundColor: (editingItem?.deliveryMethod || 'syringe') === 'syringe' ? theme.primary : theme.secondary,
                                    color: (editingItem?.deliveryMethod || 'syringe') === 'syringe' ? theme.textOnPrimary : theme.text,
                                    borderColor: (editingItem?.deliveryMethod || 'syringe') === 'syringe' ? theme.primary : theme.border
                                }}
                            >
                                <Syringe size={16} /> Syringe
                            </button>
                            <button 
                                onClick={() => setEditingItem(i => ({ ...i, deliveryMethod: 'pen' }))}
                                className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-md border text-sm font-semibold`}
                                style={{
                                    backgroundColor: editingItem?.deliveryMethod === 'pen' ? theme.primary : theme.secondary,
                                    color: editingItem?.deliveryMethod === 'pen' ? theme.textOnPrimary : theme.text,
                                    borderColor: editingItem?.deliveryMethod === 'pen' ? theme.primary : theme.border
                                }}
                            >
                                <PenTool size={16} /> Pen
                            </button>
                        </div>
                        {editingItem?.deliveryMethod === 'pen' && (
                            <div className="mt-3">
                                <label className="text-sm font-medium mb-1 block" style={{ color: theme.text }}>Pen Color</label>
                                <div className="flex gap-2 flex-wrap">
                                    {Object.entries(PEN_COLORS).map(([name, hex]) => {
                                        const style = { background: getChromeGradient(hex), borderColor: hex, ringColor: theme.primary };
                                        if (name === 'White') { style.boxShadow = 'inset 0 0 0 1px #ddd'; }
                                        return (
                                            <button 
                                                key={name}
                                                type="button"
                                                title={name}
                                                onClick={() => setEditingItem(i => ({ ...i, penColor: name }))}
                                                className={`w-8 h-8 rounded-full border-2 transition-transform duration-150 transform hover:scale-110 ${editingItem?.penColor === name ? 'ring-2 ring-offset-2' : ''}`}
                                                style={style}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                    <TextInput label="Notes" value={editingItem?.notes || ''} onChange={v => setEditingItem(i => ({ ...i, notes: v }))} theme={theme} multiline />
                </div>
			</Modal>

			<Modal open={!!viewItem} onClose={() => setViewItem(null)} title="Recon History Details" theme={theme}>
				{viewItem && (() => {
					const calc = calculateRecon(viewItem)
					const costPerDose = viewItem.cost ? `$${(viewItem.cost / calc.dosesPerVial).toFixed(2)}` : null
					return (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
							<div><div className="text-xs" style={{ color: theme.textLight }}>Date</div><div className="font-medium">{formatMMDDYYYY(viewItem.date)}</div></div>
							<div><div className="text-xs" style={{ color: theme.textLight }}>Vendor</div><div className="font-medium">{viewItem.vendorId ? vendorMap[viewItem.vendorId] : viewItem.vendor}</div></div>
							<div><div className="text-xs" style={{ color: theme.textLight }}>mg</div><div className="font-medium">{viewItem.mg}</div></div>
							<div><div className="text-xs" style={{ color: theme.textLight }}>Water (mL)</div><div className="font-medium">{viewItem.water}</div></div>
							<div><div className="text-xs" style={{ color: theme.textLight }}>Dose (mcg)</div><div className="font-medium">{viewItem.dose}</div></div>
							<div className="sm:col-span-2"><div className="text-xs" style={{ color: theme.textLight }}>Delivery Method</div><div className="font-medium">{String(viewItem.deliveryMethod || 'syringe').toLowerCase() === 'pen' ? `Pen${viewItem.penColor ? ` (${viewItem.penColor})` : ''}` : 'Syringe'}</div></div>
							<div><div className="text-xs" style={{ color: theme.textLight }}>Units</div><div>{calc.unitsPerDose ? `${calc.unitsPerDose.toFixed(0)} u` : '-'}</div></div>
							<div><div className="text-xs" style={{ color: theme.textLight }}>Doses/Vial</div><div>{calc.dosesPerVial || '-'}</div></div>
							<div><div className="text-xs" style={{ color: theme.textLight }}>Cost/Dose</div><div>{costPerDose || '-'}</div></div>
							{viewItem.capColor ? (<div className="sm:col-span-2"><div className="text-xs" style={{ color: theme.textLight }}>Cap Color</div><div className="font-medium">{viewItem.capColor}</div></div>) : null}
							{viewItem.notes ? (<div className="sm:col-span-2"><div className="text-xs" style={{ color: theme.textLight }}>Notes</div><div className="font-medium">{viewItem.notes}</div></div>) : null}
						</div>
					)
				})()}
			</Modal>
		</section>
	)
}


