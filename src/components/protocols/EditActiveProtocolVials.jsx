import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Pipette, Pen, Droplets, CheckCircle, Plus, X, Package, Pill, FlaskConical, Archive } from 'lucide-react';
import SearchableDropdown from '../common/SearchableDropdown';
import TextInput from '../common/inputs/TextInput';
import VendorSuggestInput from '../vendors/VendorSuggestInput';
import ColorSwatchDropdown from '../common/inputs/ColorSwatchDropdown';
import { penColors } from '../../utils/penColors';
import { formatCurrency } from '../../utils/currencyUtils';
import { formatMMDDYYYY } from '../../utils/date';

const PeptideVialEditor = ({ peptide, peptideId, stockpile, setStockpile, linkedItem, onUpdate, theme, onRequestRecon }) => {
    const [action, setAction] = useState(null); // 'select', 'add', null, 'reconPrompt'
    const [quickAddForm, setQuickAddForm] = useState({ mg: '', quantity: '1', vendor: '' });
    const [pendingReconVialId, setPendingReconVialId] = useState(null);
    const [penTypeDropdownOpen, setPenTypeDropdownOpen] = useState(false);
    const [penTypeDropdownUp, setPenTypeDropdownUp] = useState(false);
    const [penTypeDropdownPosition, setPenTypeDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const penTypeDropdownRef = useRef(null);
    const penTypeButtonRef = useRef(null);

    const vialOptions = useMemo(() => {
        const peptideName = (peptide.name || '').toLowerCase();
        return stockpile
            .map(item => {
                const name = item.name || 'Unnamed compound';
                const vendor = item.vendor || 'Vendor not set';
                const quantity = Number(item.quantity) || 1;
                const cost = Number(item.cost) || 0;
                const priceUnit = (item.priceUnit || 'vial').toLowerCase();
                // Cost is stored as "cost per [priceUnit]" in stockpile (e.g. cost per vial). Only divide by quantity when it's total cost (legacy).
                const costPerVial = (priceUnit === 'vial') ? cost : (quantity > 0 ? cost / quantity : 0);
                const mgDisplay = item.mg ? `${item.mg}mg` : 'Amount not set';
                const capDisplay = item.capColor ? `${item.capColor} cap` : '';
                const costDisplay = costPerVial ? `${formatCurrency(costPerVial)}/vial` : 'Cost not set';
                return {
                    value: item.id,
                    label: [name, vendor, mgDisplay, capDisplay, costDisplay].filter(Boolean).join(' • '),
                    _matchScore: (name || '').toLowerCase() === peptideName ? 0 : 1
                };
            })
            .sort((a, b) => {
                if (a._matchScore !== b._matchScore) return a._matchScore - b._matchScore;
                return a.label.localeCompare(b.label);
            })
            .map(({ _matchScore, ...option }) => option);
    }, [stockpile, peptide]);

    const isSkipped = linkedItem?.status === 'skipped';
    const isLinked = linkedItem?.status === 'linked';
    const deliveryMethod = linkedItem?.deliveryMethod || {};

    // Close dropdown when clicking outside (supports both mouse and touch)
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (penTypeDropdownRef.current && !penTypeDropdownRef.current.contains(event.target)) {
                setPenTypeDropdownOpen(false);
            }
        };
        if (penTypeDropdownOpen) {
            // Support both mouse and touch events for mobile compatibility
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('touchstart', handleClickOutside);
            };
        }
    }, [penTypeDropdownOpen]);

    // Check if dropdown should open upward and calculate position
    useEffect(() => {
        if (penTypeDropdownOpen && penTypeButtonRef.current) {
            const rect = penTypeButtonRef.current.getBoundingClientRect();
            const dropdownHeight = 300; // Approximate dropdown height
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            
            // If not enough space below but enough above, open upward
            const shouldOpenUp = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;
            setPenTypeDropdownUp(shouldOpenUp);
            
            // Calculate position for fixed dropdown
            setPenTypeDropdownPosition({
                top: shouldOpenUp ? rect.top - dropdownHeight : rect.bottom,
                left: rect.left,
                width: rect.width
            });
        }
    }, [penTypeDropdownOpen]);

    const archiveCurrentVial = () => {
        if (!linkedItem?.vialId) return linkedItem;
        const currentVial = stockpile.find(s => s.id === linkedItem.vialId);
        const archivedEntry = {
            vialId: linkedItem.vialId,
            reconId: linkedItem.reconId || null,
            deliveryMethod: linkedItem.deliveryMethod || null,
            name: currentVial?.name || peptide.name,
            mg: currentVial?.mg || null,
            vendor: currentVial?.vendor || null,
            cost: currentVial?.cost || null,
            linkedAt: linkedItem.linkedAt || null,
            usedAt: new Date().toISOString()
        };
        return {
            ...linkedItem,
            vialHistory: [...(linkedItem.vialHistory || []), archivedEntry]
        };
    };

    const snapshotVialDetails = (vialId) => {
        const vial = stockpile.find(s => s.id === vialId);
        if (!vial) return {};
        return {
            vialName: vial.name || null,
            vialMg: vial.mg || null,
            vialMgUnit: vial.mgUnit || 'mg',
            vialVendor: vial.vendor || null,
            vialVendorId: vial.vendorId || null,
            vialCost: vial.cost || null,
            vialOrderId: vial.orderId || null,
            vialPurchaseDate: vial.purchaseDate || null,
        };
    };

    const handleSelectVial = (vialId) => {
        const base = linkedItem?.vialId && linkedItem.vialId !== vialId
            ? archiveCurrentVial()
            : linkedItem;
        const details = snapshotVialDetails(vialId);
        const updated = {
            ...base,
            ...details,
            status: 'linked',
            vialId,
            reconId: null,
            linkedAt: new Date().toISOString()
        };
        onUpdate(updated);
        setAction('reconPrompt');
        setPendingReconVialId(vialId);
    };

    const handleSaveNew = () => {
        const newItem = {
            id: `stock-${Date.now()}`,
            name: peptide.name,
            ...quickAddForm,
            notes: "Added during protocol edit. Review details."
        };
        
        const updatedStockpile = [newItem, ...stockpile];
        try {
            localStorage.setItem('tpprover_stockpile', JSON.stringify(updatedStockpile));
        } catch (e) {
            console.error('Failed to save stockpile:', e);
        }
        
        if (setStockpile) {
            setStockpile(updatedStockpile);
        }
        
        const base = linkedItem?.vialId
            ? archiveCurrentVial()
            : linkedItem;
        const details = snapshotVialDetails(newItem.id);
        const updated = {
            ...base,
            ...details,
            vialName: newItem.name || peptide.name,
            vialMg: newItem.mg || null,
            vialVendor: newItem.vendor || null,
            status: 'linked',
            vialId: newItem.id,
            reconId: null,
            linkedAt: new Date().toISOString()
        };
        onUpdate(updated);
        
        setQuickAddForm({ mg: '', quantity: '1', vendor: '' });
        setAction('reconPrompt');
        setPendingReconVialId(newItem.id);
    };

    const handleMarkAsFinished = () => {
        const updated = archiveCurrentVial();
        onUpdate({
            ...updated,
            status: 'pending',
            vialId: null,
            reconId: null,
            deliveryMethod: null,
            linkedAt: null
        });
        setAction(null);
    };

    const handleUnlink = () => {
        onUpdate({
            ...linkedItem,
            status: 'pending'
        });
    };

    const vialHistory = linkedItem?.vialHistory || [];

    const handleSkip = () => {
        onUpdate({
            status: 'skipped',
            deliveryMethod: {
                deliveryMethod: 'pipette',
                administrationRoute: 'subq',
                penType: '',
                penColor: ''
            }
        });
    };

    const handleDeliveryMethodChange = (field, value) => {
        onUpdate({
            ...linkedItem,
            deliveryMethod: {
                ...deliveryMethod,
                [field]: value
            }
        });
    };

    if (isLinked && linkedItem.vialId) {
        const selectedVial = stockpile.find(item => item.id === linkedItem.vialId);
        return (
            <div className="space-y-3">
                {/* Finished vials list */}
                {vialHistory.length > 0 && (
                    <div className="space-y-1.5">
                        <div className="text-[10px] font-medium uppercase tracking-wider px-1" style={{ color: theme.textLight }}>
                            Finished Vials ({vialHistory.length})
                        </div>
                        {vialHistory.map((hv, hi) => (
                            <div key={hi} className="p-2.5 rounded-md" style={{
                                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                                border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`
                            }}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Archive size={12} style={{ color: theme.textLight, opacity: 0.5 }} />
                                        <span className="text-xs line-through" style={{ color: theme.textLight, opacity: 0.6 }}>
                                            {hv.name || 'Peptide'}{hv.mg ? ` · ${hv.mg}mg` : ''}{hv.vendor ? ` · ${hv.vendor}` : ''}
                                        </span>
                                    </div>
                                    <span className="text-[10px] tabular-nums" style={{ color: theme.textLight, opacity: 0.4 }}>
                                        {hv.usedAt ? formatMMDDYYYY(hv.usedAt) : ''}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Current active vial */}
                <div className="p-3 rounded-md" style={{ 
                    backgroundColor: theme.isDark ? '#1f2937' : (theme.primary + '10'),
                    boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
                }}>
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <p className="font-semibold text-sm" style={{ color: theme.text }}>{peptide.name}</p>
                            <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                                {selectedVial ? `Linked: ${selectedVial.mg ?? ''} ${selectedVial.mgUnit || 'mg'} from ${selectedVial.vendor}` : 'Linked'}
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5" style={{ color: theme.primary }} />
                        </div>
                    </div>
                    
                    {action === 'select' && (
                        <div className="mt-3">
                            <SearchableDropdown
                                options={vialOptions}
                                onChange={handleSelectVial}
                                theme={theme}
                                placeholder="Type to search your stockpile..."
                                idleMessage="Start typing to search your stockpile."
                                emptyMessage="No stockpile entries found. Keep typing to refine your search."
                            />
                            <div className="mt-2 flex items-center justify-between">
                                <button onClick={() => setAction('add')} className="text-xs text-gray-500 hover:text-gray-700 hover:underline">Or add new vial</button>
                                <button onClick={() => setAction(null)} className="text-xs text-gray-500 hover:underline">Cancel</button>
                            </div>
                        </div>
                    )}
                    
                    {action === 'add' && (
                        <div className="mt-2 space-y-2.5">
                            <SearchableDropdown
                                options={vialOptions}
                                onChange={handleSelectVial}
                                theme={theme}
                                placeholder="Search stockpile..."
                                idleMessage="Search your stockpile"
                                emptyMessage="No matches found."
                            />
                            <div className="flex items-center gap-2">
                                <div className="flex-1 border-t" style={{ borderColor: theme.border }}></div>
                                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: theme.textLight }}>or create new</span>
                                <div className="flex-1 border-t" style={{ borderColor: theme.border }}></div>
                            </div>
                            <div className="grid grid-cols-[1fr_2fr_1fr] gap-2">
                                <TextInput label="mg" value={quickAddForm.mg} onChange={v => setQuickAddForm(f => ({...f, mg: v}))} theme={theme} placeholder="10" outlined={true} customTextColor={theme.isDark ? null : "#181A18"} customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'} />
                                <VendorSuggestInput label="Vendor" value={quickAddForm.vendor} onChange={v => setQuickAddForm(f => ({...f, vendor: v}))} theme={theme} />
                                <TextInput label="Qty" value={quickAddForm.quantity} onChange={v => setQuickAddForm(f => ({...f, quantity: v}))} theme={theme} placeholder="1" outlined={true} customTextColor={theme.isDark ? null : "#181A18"} customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'} />
                            </div>
                            <div className="flex items-center justify-end gap-2">
                                <button onClick={() => setAction(null)} className="px-2.5 py-1 text-xs rounded-lg font-medium transition-all active:scale-95" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, color: theme.isDark ? '#ffffff' : theme.text, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12), inset 0 1px 2px rgba(0,0,0,0.08)' }}>Cancel</button>
                                <button onClick={handleSaveNew} className="px-2.5 py-1 text-xs rounded-lg font-medium transition-all active:scale-95" style={{ backgroundColor: theme.primary, color: '#ffffff', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15), inset 0 1px 2px rgba(0,0,0,0.1)' }}>Save & Link</button>
                            </div>
                        </div>
                    )}
                    
                    {action === 'reconPrompt' && (
                        <div className="mt-2 p-3 rounded-lg" style={{
                            backgroundColor: theme.isDark ? 'rgba(200,122,92,0.10)' : 'rgba(200,122,92,0.06)',
                            border: `1px solid ${theme.isDark ? 'rgba(181,104,74,0.35)' : 'rgba(163,90,63,0.25)'}`
                        }}>
                            <p className="text-xs font-medium mb-2" style={{ color: theme.text }}>
                                Vial linked! Would you like to reconstitute it now?
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => {
                                        setAction(null);
                                        setPendingReconVialId(null);
                                        if (onRequestRecon && pendingReconVialId) onRequestRecon(peptideId, pendingReconVialId);
                                    }}
                                    className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all active:scale-95"
                                    style={{
                                        background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)',
                                        color: '#ffffff',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15), inset 0 1px 2px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.08)'
                                    }}
                                >
                                    Open Recon Calculator
                                </button>
                                <button
                                    onClick={() => { setAction(null); setPendingReconVialId(null); }}
                                    className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all active:scale-95"
                                    style={{
                                        backgroundColor: theme.isDark ? '#374151' : theme.secondary,
                                        color: theme.isDark ? '#ffffff' : theme.text,
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12), inset 0 1px 2px rgba(0,0,0,0.08)'
                                    }}
                                >
                                    Skip for Now
                                </button>
                            </div>
                        </div>
                    )}

                    {!action && (
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <button
                                onClick={handleMarkAsFinished}
                                className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all active:scale-95 flex items-center gap-1.5"
                                style={{
                                    backgroundColor: theme.isDark ? 'rgba(239,68,68,0.15)' : '#fef2f2',
                                    color: theme.isDark ? '#fca5a5' : '#dc2626',
                                    border: `1px solid ${theme.isDark ? 'rgba(239,68,68,0.2)' : '#fecaca'}`,
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 2px rgba(0,0,0,0.06)'
                                }}
                            >
                                <Archive size={12} />
                                Mark as Finished
                            </button>
                            <button onClick={() => setAction('add')} className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all active:scale-95" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, color: theme.isDark ? '#ffffff' : theme.text, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12), inset 0 1px 2px rgba(0,0,0,0.08)' }}>Add New Vial</button>
                            <button onClick={() => setAction('select')} className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all active:scale-95" style={{ backgroundColor: theme.primary, color: '#ffffff', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15), inset 0 1px 2px rgba(0,0,0,0.1)' }}>Change Vial</button>
                        </div>
                    )}
                    
                    {/* Delivery Method Editor for Linked Vials */}
                    <div className="mt-3">
                        <div className="flex flex-wrap justify-center gap-2">
                            {[
                                { key: 'pipette', label: 'Syringe', Icon: Pipette },
                                { key: 'pen', label: 'Pen', Icon: Pen },
                                { key: 'nasal', label: 'Nasal', Icon: Droplets },
                                { key: 'oral', label: 'Oral', Icon: Pill },
                                { key: 'topical', label: 'Topical', Icon: FlaskConical },
                            ].map(({ key, label, Icon }) => {
                                const isActive = deliveryMethod.deliveryMethod === key;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => handleDeliveryMethodChange('deliveryMethod', key)}
                                        className="flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-semibold transition-all active:scale-95"
                                        style={{
                                            flex: '0 1 calc(33.333% - 0.5rem)',
                                            minWidth: '90px',
                                            backgroundColor: isActive ? '#445952' : (theme.isDark ? '#1f2937' : '#f5f4f0'),
                                            color: isActive ? '#fff' : theme.text,
                                            border: isActive ? '1px solid #3B4240' : `1px solid ${theme.border}`,
                                            boxShadow: isActive
                                                ? 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.1)'
                                                : 'inset 0 1px 3px rgba(0,0,0,0.06)'
                                        }}
                                    >
                                        <Icon size={14} /> {label}
                                    </button>
                                );
                            })}
                        </div>
                        
                        {/* Administration Route for Syringe */}
                        {deliveryMethod.deliveryMethod === 'pipette' && (
                            <div className="mt-3 pt-3 relative">
                                <div className="absolute top-0 left-[5%] right-[5%] h-px" style={{ background: 'linear-gradient(to right, transparent 0%, rgba(127,158,149,0.2) 30%, rgba(127,158,149,0.3) 50%, rgba(127,158,149,0.2) 70%, transparent 100%)' }} />
                                <div 
                                    className="flex items-center gap-1 p-1 rounded-lg" 
                                    style={{ 
                                        backgroundColor: theme.isDark ? '#1a2028' : '#f0efe9',
                                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)'
                                    }}
                                >
                                    {['subq', 'im', 'iv'].map(route => {
                                        const isActive = deliveryMethod.administrationRoute === route;
                                        return (
                                        <button
                                            key={route}
                                            type="button"
                                            onClick={() => handleDeliveryMethodChange('administrationRoute', route)}
                                            className="flex-1 px-2 sm:px-3 py-2 text-xs font-semibold rounded-md transition-all active:scale-95"
                                            style={{
                                                backgroundColor: isActive ? '#6B7F77' : 'transparent',
                                                color: isActive ? '#fff' : theme.textLight,
                                                boxShadow: isActive ? 'inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)' : 'none'
                                            }}
                                        >
                                            {route.toUpperCase()}
                                        </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        
                        {/* Pen Type and Color for Pen */}
                        {deliveryMethod.deliveryMethod === 'pen' && (
                            <div className="mt-3 pt-3 relative">
                                <div className="absolute top-0 left-[5%] right-[5%] h-px" style={{ background: 'linear-gradient(to right, transparent 0%, rgba(127,158,149,0.2) 30%, rgba(127,158,149,0.3) 50%, rgba(127,158,149,0.2) 70%, transparent 100%)' }} />
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Pen Type Selection */}
                                    <div className="relative" ref={penTypeDropdownRef}>
                                        <button
                                            ref={penTypeButtonRef}
                                            type="button"
                                            onClick={() => setPenTypeDropdownOpen(!penTypeDropdownOpen)}
                                            onMouseDown={(e) => {
                                              // Prevent any parent blur events on mobile
                                              e.preventDefault();
                                            }}
                                            onTouchStart={(e) => {
                                              // Prevent any parent blur events on touch devices
                                              e.preventDefault();
                                            }}
                                            className="w-full px-3 py-2 text-sm border rounded-md flex items-center justify-between transition-all hover:border-gray-400 touch-manipulation relative z-20"
                                            style={{
                                                borderColor: penTypeDropdownOpen ? theme.primary : theme.border,
                                                backgroundColor: theme.cardBackground,
                                                color: deliveryMethod.penType ? theme.text : theme.textLight,
                                                WebkitTapHighlightColor: 'transparent'
                                            }}
                                        >
                                            <span>
                                                {deliveryMethod.penType ? (
                                                    deliveryMethod.penType === 'bird-pen' ? 'Bird Pen' : 
                                                    deliveryMethod.penType === 'v1' ? 'V1' : 
                                                    deliveryMethod.penType === 'v2' ? 'V2' : 
                                                    deliveryMethod.penType === 'v3' ? 'V3' : 
                                                    deliveryMethod.penType.charAt(0).toUpperCase() + deliveryMethod.penType.slice(1)
                                                ) : 'Pen Type'}
                                            </span>
                                            <ChevronDown 
                                                size={16} 
                                                className={`transition-transform duration-200 ${penTypeDropdownOpen ? 'rotate-180' : ''}`}
                                                style={{ color: theme.textLight }}
                                            />
                                        </button>
                                        {penTypeDropdownOpen && createPortal(
                                            <div 
                                                className="fixed rounded-lg shadow-lg border overflow-hidden"
                                                style={{
                                                    backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                                                    borderColor: theme.border,
                                                    width: `${penTypeDropdownPosition.width}px`,
                                                    top: `${penTypeDropdownPosition.top}px`,
                                                    left: `${penTypeDropdownPosition.left}px`,
                                                    maxHeight: '300px',
                                                    overflowY: 'auto',
                                                    zIndex: 2147483647,
                                                    boxShadow: theme.isDark ? '0 10px 25px rgba(0,0,0,0.3)' : '0 10px 25px rgba(0,0,0,0.15)'
                                                }}
                                                data-dropdown-container
                                            >
                                                {[
                                                    { value: '', label: 'Pen Type' },
                                                    { value: 'savvio', label: 'Savvio' },
                                                    { value: 'novo', label: 'Novo' },
                                                    { value: 'v1', label: 'V1' },
                                                    { value: 'v2', label: 'V2' },
                                                    { value: 'v3', label: 'V3' },
                                                    { value: 'bird-pen', label: 'Bird Pen' },
                                                    { value: 'luxura', label: 'Luxura' },
                                                    { value: 'gansulin', label: 'Gansulin' },
                                                    { value: 'other', label: 'Other' }
                                                ].map((option, optIdx) => (
                                                    <React.Fragment key={option.value}>
                                                        {optIdx > 0 && (
                                                            <div 
                                                                className="h-px mx-2"
                                                                style={{ backgroundColor: theme.border }}
                                                            />
                                                        )}
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => {
                                                              // Prevent blur events on mobile
                                                              e.preventDefault();
                                                            }}
                                                            onTouchStart={(e) => {
                                                              // Prevent blur events on touch devices
                                                              e.preventDefault();
                                                            }}
                                                            onClick={(e) => {
                                                              e.preventDefault();
                                                              e.stopPropagation();
                                                              handleDeliveryMethodChange('penType', option.value);
                                                              setPenTypeDropdownOpen(false);
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                                                            style={{
                                                                color: deliveryMethod.penType === option.value ? theme.primary : theme.text,
                                                                backgroundColor: 'transparent',
                                                                WebkitTapHighlightColor: 'transparent'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                                                e.currentTarget.style.color = theme.primary;
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                                e.currentTarget.style.color = deliveryMethod.penType === option.value ? theme.primary : theme.text;
                                                            }}
                                                        >
                                                            {option.label}
                                                        </button>
                                                    </React.Fragment>
                                                ))}
                                            </div>,
                                            document.body
                                        )}
                                    </div>

                                    {/* Pen Color Selection */}
                                    <ColorSwatchDropdown
                                        value={penColors.find(p => p.name === deliveryMethod.penColor)?.hex || '#9ca3af'}
                                        onChange={(hex) => {
                                            const selectedColor = penColors.find(p => p.hex === hex);
                                            if (selectedColor) {
                                                handleDeliveryMethodChange('penColor', selectedColor.name);
                                            }
                                        }}
                                        colors={penColors}
                                        theme={theme}
                                        placeholder="Pen Color"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    if (isSkipped) {
        return (
            <div className="space-y-3">
                <div className="p-3 rounded-md" style={{ 
                    backgroundColor: theme.isDark ? '#374151' : '#f9fafb',
                    boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
                }}>
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex-1">
                            <p className="font-semibold text-sm" style={{ color: theme.text }}>{peptide.name}</p>
                        </div>
                        <button 
                            onClick={() => setAction('add')} 
                            className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all ml-2 flex items-center gap-1.5 active:scale-95"
                            style={{ 
                                backgroundColor: theme.primary, 
                                color: '#ffffff',
                                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15), inset 0 1px 2px rgba(0,0,0,0.1)'
                            }}
                        >
                            <Package size={12} />
                            Add Vial
                        </button>
                    </div>
                    
                    {action === 'add' && (
                        <div className="mb-3 p-2.5 rounded-md space-y-2.5" style={{ 
                            backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                            border: `1px solid ${theme.border}`
                        }}>
                            <SearchableDropdown
                                options={vialOptions}
                                onChange={handleSelectVial}
                                theme={theme}
                                placeholder="Search stockpile..."
                                idleMessage="Search your stockpile"
                                emptyMessage="No matches found."
                            />
                            <div className="flex items-center gap-2">
                                <div className="flex-1 border-t" style={{ borderColor: theme.border }}></div>
                                <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: theme.textLight }}>or create new</span>
                                <div className="flex-1 border-t" style={{ borderColor: theme.border }}></div>
                            </div>
                            <div className="grid grid-cols-[1fr_2fr_1fr] gap-2">
                                <TextInput label="mg" value={quickAddForm.mg} onChange={v => setQuickAddForm(f => ({...f, mg: v}))} theme={theme} placeholder="10" outlined={true} customTextColor={theme.isDark ? null : "#181A18"} customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'} />
                                <VendorSuggestInput label="Vendor" value={quickAddForm.vendor} onChange={v => setQuickAddForm(f => ({...f, vendor: v}))} theme={theme} />
                                <TextInput label="Qty" value={quickAddForm.quantity} onChange={v => setQuickAddForm(f => ({...f, quantity: v}))} theme={theme} placeholder="1" outlined={true} customTextColor={theme.isDark ? null : "#181A18"} customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'} />
                            </div>
                            <div className="flex items-center justify-end gap-2">
                                <button onClick={() => setAction(null)} className="px-2.5 py-1 text-xs rounded-lg font-medium transition-all active:scale-95" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, color: theme.isDark ? '#ffffff' : theme.text, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12), inset 0 1px 2px rgba(0,0,0,0.08)' }}>Cancel</button>
                                <button onClick={handleSaveNew} className="px-2.5 py-1 text-xs rounded-lg font-medium transition-all active:scale-95" style={{ backgroundColor: theme.primary, color: '#ffffff', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15), inset 0 1px 2px rgba(0,0,0,0.1)' }}>Save & Link</button>
                            </div>
                        </div>
                    )}
                    
                    {/* Delivery Method Selection */}
                    <div>
                        <div className="flex flex-wrap justify-center gap-2">
                            {[
                                { key: 'pipette', label: 'Syringe', Icon: Pipette },
                                { key: 'pen', label: 'Pen', Icon: Pen },
                                { key: 'nasal', label: 'Nasal', Icon: Droplets },
                                { key: 'oral', label: 'Oral', Icon: Pill },
                                { key: 'topical', label: 'Topical', Icon: FlaskConical },
                            ].map(({ key, label, Icon }) => {
                                const isActive = deliveryMethod.deliveryMethod === key;
                                return (
                                    <button
                                        key={key}
                                        onClick={() => handleDeliveryMethodChange('deliveryMethod', key)}
                                        className="flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-semibold transition-all active:scale-95"
                                        style={{
                                            flex: '0 1 calc(33.333% - 0.5rem)',
                                            minWidth: '90px',
                                            backgroundColor: isActive ? '#445952' : (theme.isDark ? '#1f2937' : '#f5f4f0'),
                                            color: isActive ? '#fff' : theme.text,
                                            border: isActive ? '1px solid #3B4240' : `1px solid ${theme.border}`,
                                            boxShadow: isActive
                                                ? 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.1)'
                                                : 'inset 0 1px 3px rgba(0,0,0,0.06)'
                                        }}
                                    >
                                        <Icon size={14} /> {label}
                                    </button>
                                );
                            })}
                        </div>
                        
                        {/* Administration Route for Syringe */}
                        {deliveryMethod.deliveryMethod === 'pipette' && (
                            <div className="mt-3 pt-3 relative">
                                <div className="absolute top-0 left-[5%] right-[5%] h-px" style={{ background: 'linear-gradient(to right, transparent 0%, rgba(127,158,149,0.2) 30%, rgba(127,158,149,0.3) 50%, rgba(127,158,149,0.2) 70%, transparent 100%)' }} />
                                <div 
                                    className="flex items-center gap-1 p-1 rounded-lg" 
                                    style={{ 
                                        backgroundColor: theme.isDark ? '#1a2028' : '#f0efe9',
                                        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)'
                                    }}
                                >
                                    {['subq', 'im', 'iv'].map(route => {
                                        const isActive = deliveryMethod.administrationRoute === route;
                                        return (
                                        <button
                                            key={route}
                                            type="button"
                                            onClick={() => handleDeliveryMethodChange('administrationRoute', route)}
                                            className="flex-1 px-2 sm:px-3 py-2 text-xs font-semibold rounded-md transition-all active:scale-95"
                                            style={{
                                                backgroundColor: isActive ? '#6B7F77' : 'transparent',
                                                color: isActive ? '#fff' : theme.textLight,
                                                boxShadow: isActive ? 'inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)' : 'none'
                                            }}
                                        >
                                            {route.toUpperCase()}
                                        </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        
                        {/* Pen Type and Color for Pen */}
                        {deliveryMethod.deliveryMethod === 'pen' && (
                            <div className="mt-3 pt-3 relative">
                                <div className="absolute top-0 left-[5%] right-[5%] h-px" style={{ background: 'linear-gradient(to right, transparent 0%, rgba(127,158,149,0.2) 30%, rgba(127,158,149,0.3) 50%, rgba(127,158,149,0.2) 70%, transparent 100%)' }} />
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Pen Type Selection */}
                                    <div className="relative" ref={penTypeDropdownRef}>
                                        <button
                                            ref={penTypeButtonRef}
                                            type="button"
                                            onClick={() => setPenTypeDropdownOpen(!penTypeDropdownOpen)}
                                            onMouseDown={(e) => {
                                              // Prevent any parent blur events on mobile
                                              e.preventDefault();
                                            }}
                                            onTouchStart={(e) => {
                                              // Prevent any parent blur events on touch devices
                                              e.preventDefault();
                                            }}
                                            className="w-full px-3 py-2 text-sm border rounded-md flex items-center justify-between transition-all hover:border-gray-400 touch-manipulation relative z-20"
                                            style={{
                                                borderColor: penTypeDropdownOpen ? theme.primary : theme.border,
                                                backgroundColor: theme.cardBackground,
                                                color: deliveryMethod.penType ? theme.text : theme.textLight,
                                                WebkitTapHighlightColor: 'transparent'
                                            }}
                                        >
                                            <span>
                                                {deliveryMethod.penType ? (
                                                    deliveryMethod.penType === 'bird-pen' ? 'Bird Pen' : 
                                                    deliveryMethod.penType === 'v1' ? 'V1' : 
                                                    deliveryMethod.penType === 'v2' ? 'V2' : 
                                                    deliveryMethod.penType === 'v3' ? 'V3' : 
                                                    deliveryMethod.penType.charAt(0).toUpperCase() + deliveryMethod.penType.slice(1)
                                                ) : 'Pen Type'}
                                            </span>
                                            <ChevronDown 
                                                size={16} 
                                                className={`transition-transform duration-200 ${penTypeDropdownOpen ? 'rotate-180' : ''}`}
                                                style={{ color: theme.textLight }}
                                            />
                                        </button>
                                        {penTypeDropdownOpen && createPortal(
                                            <div 
                                                className="fixed rounded-lg shadow-lg border overflow-hidden"
                                                style={{
                                                    backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                                                    borderColor: theme.border,
                                                    width: `${penTypeDropdownPosition.width}px`,
                                                    top: `${penTypeDropdownPosition.top}px`,
                                                    left: `${penTypeDropdownPosition.left}px`,
                                                    maxHeight: '300px',
                                                    overflowY: 'auto',
                                                    zIndex: 2147483647,
                                                    boxShadow: theme.isDark ? '0 10px 25px rgba(0,0,0,0.3)' : '0 10px 25px rgba(0,0,0,0.15)'
                                                }}
                                                data-dropdown-container
                                            >
                                                {[
                                                    { value: '', label: 'Pen Type' },
                                                    { value: 'savvio', label: 'Savvio' },
                                                    { value: 'novo', label: 'Novo' },
                                                    { value: 'v1', label: 'V1' },
                                                    { value: 'v2', label: 'V2' },
                                                    { value: 'v3', label: 'V3' },
                                                    { value: 'bird-pen', label: 'Bird Pen' },
                                                    { value: 'luxura', label: 'Luxura' },
                                                    { value: 'gansulin', label: 'Gansulin' },
                                                    { value: 'other', label: 'Other' }
                                                ].map((option, optIdx) => (
                                                    <React.Fragment key={option.value}>
                                                        {optIdx > 0 && (
                                                            <div 
                                                                className="h-px mx-2"
                                                                style={{ backgroundColor: theme.border }}
                                                            />
                                                        )}
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => {
                                                              // Prevent blur events on mobile
                                                              e.preventDefault();
                                                            }}
                                                            onTouchStart={(e) => {
                                                              // Prevent blur events on touch devices
                                                              e.preventDefault();
                                                            }}
                                                            onClick={(e) => {
                                                              e.preventDefault();
                                                              e.stopPropagation();
                                                              handleDeliveryMethodChange('penType', option.value);
                                                              setPenTypeDropdownOpen(false);
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                                                            style={{
                                                                color: deliveryMethod.penType === option.value ? theme.primary : theme.text,
                                                                backgroundColor: 'transparent',
                                                                WebkitTapHighlightColor: 'transparent'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                                                e.currentTarget.style.color = theme.primary;
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                                e.currentTarget.style.color = deliveryMethod.penType === option.value ? theme.primary : theme.text;
                                                            }}
                                                        >
                                                            {option.label}
                                                        </button>
                                                    </React.Fragment>
                                                ))}
                                            </div>,
                                            document.body
                                        )}
                                    </div>

                                    {/* Pen Color Selection */}
                                    <ColorSwatchDropdown
                                        value={penColors.find(p => p.name === deliveryMethod.penColor)?.hex || '#9ca3af'}
                                        onChange={(hex) => {
                                            const selectedColor = penColors.find(p => p.hex === hex);
                                            if (selectedColor) {
                                                handleDeliveryMethodChange('penColor', selectedColor.name);
                                            }
                                        }}
                                        colors={penColors}
                                        theme={theme}
                                        placeholder="Pen Color"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    const FinishedVialsList = () => vialHistory.length > 0 ? (
        <div className="space-y-1.5 mb-2">
            <div className="text-[10px] font-medium uppercase tracking-wider px-1" style={{ color: theme.textLight }}>
                Finished Vials ({vialHistory.length})
            </div>
            {vialHistory.map((hv, hi) => (
                <div key={hi} className="p-2.5 rounded-md" style={{
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                    border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`
                }}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Archive size={12} style={{ color: theme.textLight, opacity: 0.5 }} />
                            <span className="text-xs line-through" style={{ color: theme.textLight, opacity: 0.6 }}>
                                {hv.name || 'Peptide'}{hv.mg ? ` · ${hv.mg}mg` : ''}{hv.vendor ? ` · ${hv.vendor}` : ''}
                            </span>
                        </div>
                        <span className="text-[10px] tabular-nums" style={{ color: theme.textLight, opacity: 0.4 }}>
                            {hv.usedAt ? formatMMDDYYYY(hv.usedAt) : ''}
                        </span>
                    </div>
                </div>
            ))}
        </div>
    ) : null;

    // Pending state - no vial linked yet
    if (action === 'select') {
        return (
            <div className="space-y-0">
                <FinishedVialsList />
                <div className="p-3 rounded-md" style={{ 
                    backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                    boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
                }}>
                <p className="font-semibold text-sm mb-2" style={{ color: theme.text }}>{peptide.name}</p>
                <SearchableDropdown
                    options={vialOptions}
                    onChange={handleSelectVial}
                    theme={theme}
                    placeholder="Type to search your stockpile..."
                    idleMessage="Start typing to search your stockpile."
                    emptyMessage="No stockpile entries found. Keep typing to refine your search."
                />
                <div className="mt-2 flex items-center justify-between">
                    <button onClick={() => setAction('add')} className="text-xs text-gray-500 hover:text-gray-700 hover:underline">Or add new vial</button>
                    <button onClick={() => setAction(null)} className="text-xs text-gray-500 hover:underline">Cancel</button>
                </div>
            </div>
            </div>
        );
    }
    
    if (action === 'add') {
        const handleSaveNewAndClose = () => {
            handleSaveNew();
            setAction(null);
        };
        return (
            <div className="space-y-0">
                <FinishedVialsList />
            <div className="p-2.5 rounded-md space-y-2.5" style={{ 
                backgroundColor: theme.isDark ? '#1f2937' : '#f9fafb',
                border: `1px solid ${theme.border}`
            }}>
                <SearchableDropdown
                    options={vialOptions}
                    onChange={handleSelectVial}
                    theme={theme}
                    placeholder="Search stockpile..."
                    idleMessage="Search your stockpile"
                    emptyMessage="No matches found."
                />
                <div className="flex items-center gap-2">
                    <div className="flex-1 border-t" style={{ borderColor: theme.border }}></div>
                    <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: theme.textLight }}>or create new</span>
                    <div className="flex-1 border-t" style={{ borderColor: theme.border }}></div>
                </div>
                <div className="grid grid-cols-[1fr_2fr_1fr] gap-2">
                    <TextInput label="mg" value={quickAddForm.mg} onChange={v => setQuickAddForm(f => ({...f, mg: v}))} theme={theme} placeholder="10" outlined={true} customTextColor={theme.isDark ? null : "#181A18"} customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'} />
                    <VendorSuggestInput label="Vendor" value={quickAddForm.vendor} onChange={v => setQuickAddForm(f => ({...f, vendor: v}))} theme={theme} />
                    <TextInput label="Qty" value={quickAddForm.quantity} onChange={v => setQuickAddForm(f => ({...f, quantity: v}))} theme={theme} placeholder="1" outlined={true} customTextColor={theme.isDark ? null : "#181A18"} customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'} />
                </div>
                <div className="flex items-center justify-end gap-2">
                    <button onClick={() => setAction(null)} className="px-2.5 py-1 text-xs rounded-lg font-medium transition-all active:scale-95" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, color: theme.isDark ? '#ffffff' : theme.text, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12), inset 0 1px 2px rgba(0,0,0,0.08)' }}>Cancel</button>
                    <button onClick={handleSaveNewAndClose} className="px-2.5 py-1 text-xs rounded-lg font-medium transition-all active:scale-95" style={{ backgroundColor: theme.primary, color: '#ffffff', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15), inset 0 1px 2px rgba(0,0,0,0.1)' }}>Save & Link</button>
                </div>
            </div>
            </div>
        );
    }
    
    // Default view with choices
    return (
        <div className="space-y-0">
            <FinishedVialsList />
            <div className="p-3 rounded-md flex items-center justify-between" style={{ 
                backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
            }}>
                <p className="font-semibold text-sm" style={{ color: theme.text }}>{peptide.name}</p>
                <div className="flex items-center gap-2">
                    <button onClick={handleSkip} className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all active:scale-95" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, color: theme.isDark ? '#ffffff' : theme.text, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12), inset 0 1px 2px rgba(0,0,0,0.08)' }}>Skip</button>
                    <button onClick={() => setAction('add')} className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all active:scale-95" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, color: theme.isDark ? '#ffffff' : theme.text, boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.12), inset 0 1px 2px rgba(0,0,0,0.08)' }}>Add New</button>
                    <button onClick={() => setAction('select')} className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all active:scale-95" style={{ backgroundColor: theme.primary, color: '#ffffff', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.15), inset 0 1px 2px rgba(0,0,0,0.1)' }}>Select Vial</button>
                </div>
            </div>
        </div>
    );
};

export default function EditActiveProtocolVials({ protocol, stockpile, setStockpile, theme, onUpdate, onRequestRecon }) {
    const [linkedItems, setLinkedItems] = useState(() => {
        // Initialize from protocol.linkedItems
        const items = {};
        if (protocol?.peptides) {
            protocol.peptides.forEach((p, index) => {
                const peptideId = p.id || `peptide-${index}`;
                items[peptideId] = protocol.linkedItems?.[peptideId] || { status: 'pending' };
            });
        }
        return items;
    });

    // Update linkedItems when protocol changes (e.g., when modal reopens)
    useEffect(() => {
        if (protocol?.peptides) {
            const items = {};
            protocol.peptides.forEach((p, index) => {
                const peptideId = p.id || `peptide-${index}`;
                items[peptideId] = protocol.linkedItems?.[peptideId] || { status: 'pending' };
            });
            setLinkedItems(items);
        }
    }, [protocol?.id]); // Only reset when protocol ID changes

    // Update parent when linkedItems change
    useEffect(() => {
        if (onUpdate) {
            onUpdate(linkedItems);
        }
    }, [linkedItems]); // eslint-disable-line react-hooks/exhaustive-deps

    const handlePeptideUpdate = (peptideId, updatedItem) => {
        setLinkedItems(prev => ({
            ...prev,
            [peptideId]: updatedItem
        }));
    };

    if (!protocol?.peptides) return null;

    return (
        <div className="space-y-3">
            {protocol.peptides.map((p, index) => {
                const peptideId = p.id || `peptide-${index}`;
                return (
                    <PeptideVialEditor
                        key={peptideId}
                        peptide={p}
                        peptideId={peptideId}
                        stockpile={stockpile}
                        setStockpile={setStockpile}
                        linkedItem={linkedItems[peptideId] || { status: 'pending' }}
                        onUpdate={(updated) => handlePeptideUpdate(peptideId, updated)}
                        theme={theme}
                        onRequestRecon={onRequestRecon}
                    />
                );
            })}
        </div>
    );
}

