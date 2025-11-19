import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Pipette, Pen, Droplets, CheckCircle, Plus, X, Package } from 'lucide-react';
import SearchableDropdown from '../common/SearchableDropdown';
import TextInput from '../common/inputs/TextInput';
import VendorSuggestInput from '../vendors/VendorSuggestInput';
import ColorSwatchDropdown from '../common/inputs/ColorSwatchDropdown';
import { penColors } from '../../utils/penColors';
import { formatCurrency } from '../../utils/currencyUtils';

const PeptideVialEditor = ({ peptide, peptideId, stockpile, setStockpile, linkedItem, onUpdate, theme }) => {
    const [action, setAction] = useState(null); // 'select', 'add', null
    const [quickAddForm, setQuickAddForm] = useState({ mg: '', quantity: '1', vendor: '' });
    const [penTypeDropdownOpen, setPenTypeDropdownOpen] = useState(false);
    const penTypeDropdownRef = useRef(null);

    const vialOptions = useMemo(() => {
        const peptideName = (peptide.name || '').toLowerCase();
        return stockpile
            .map(item => {
                const name = item.name || 'Unnamed compound';
                const vendor = item.vendor || 'Vendor not set';
                const quantity = Number(item.quantity) || 1;
                const cost = Number(item.cost) || 0;
                const costPerVial = quantity > 0 ? (cost / quantity) : 0;
                const mgDisplay = item.mg ? `${item.mg}mg` : 'Amount not set';
                const costDisplay = costPerVial ? `${formatCurrency(costPerVial)}/vial` : 'Cost not set';
                return {
                    value: item.id,
                    label: `${name} • ${vendor} • ${mgDisplay} • ${costDisplay}`,
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

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (penTypeDropdownRef.current && !penTypeDropdownRef.current.contains(event.target)) {
                setPenTypeDropdownOpen(false);
            }
        };
        if (penTypeDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [penTypeDropdownOpen]);

    const handleSelectVial = (vialId) => {
        onUpdate({
            ...linkedItem,
            status: 'linked',
            vialId
        });
        setAction(null);
    };

    const handleSaveNew = () => {
        const newItem = {
            id: `stock-${Date.now()}`,
            name: peptide.name,
            ...quickAddForm,
            notes: "Added during protocol edit. Review details."
        };
        
        // Add to stockpile
        const updatedStockpile = [newItem, ...stockpile];
        // Save to localStorage
        try {
            localStorage.setItem('tpprover_stockpile', JSON.stringify(updatedStockpile));
        } catch (e) {
            console.error('Failed to save stockpile:', e);
        }
        
        // Update stockpile state
        if (setStockpile) {
            setStockpile(updatedStockpile);
        }
        
        // Link the new vial
        onUpdate({
            ...linkedItem,
            status: 'linked',
            vialId: newItem.id
        });
        
        setAction(null);
        setQuickAddForm({ mg: '', quantity: '1', vendor: '' });
    };

    const handleUnlink = () => {
        onUpdate({
            ...linkedItem,
            status: 'pending'
        });
    };

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
                <div className="p-3 rounded-md" style={{ 
                    backgroundColor: theme.isDark ? '#1f2937' : (theme.primary + '10'),
                    boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
                }}>
                    <div className="flex items-center justify-between mb-2">
                        <div>
                            <p className="font-semibold text-sm" style={{ color: theme.text }}>{peptide.name}</p>
                            <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                                {selectedVial ? `Linked: ${selectedVial.mg}mg from ${selectedVial.vendor}` : 'Linked'}
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
                        <div className="mt-2 space-y-2">
                            {/* Search from stockpile option */}
                            <div>
                                <p className="text-xs font-medium mb-1" style={{ color: theme.text }}>Search from stockpile</p>
                                <SearchableDropdown
                                    options={vialOptions}
                                    onChange={handleSelectVial}
                                    theme={theme}
                                    placeholder="Type to search your stockpile..."
                                    idleMessage="Start typing to search your stockpile."
                                    emptyMessage="No stockpile entries found. Keep typing to refine your search."
                                />
                            </div>
                            
                            {/* Divider */}
                            <div className="flex items-center gap-2">
                                <div className="flex-1 border-t" style={{ borderColor: theme.border }}></div>
                                <span className="text-xs" style={{ color: theme.textLight }}>OR</span>
                                <div className="flex-1 border-t" style={{ borderColor: theme.border }}></div>
                            </div>
                            
                            {/* Add new vial form */}
                            <div className="space-y-1.5 p-2 rounded-md" style={{ backgroundColor: theme.isDark ? '#374151' : '#f9fafb' }}>
                                <p className="text-xs font-medium" style={{ color: theme.text }}>Add New Vial</p>
                                <div className="grid grid-cols-[1fr_2fr_1fr] gap-2">
                                    <TextInput label="mg" value={quickAddForm.mg} onChange={v => setQuickAddForm(f => ({...f, mg: v}))} theme={theme} placeholder="10" outlined={true} customTextColor="#181A18" customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'} />
                                    <VendorSuggestInput label="Vendor" value={quickAddForm.vendor} onChange={v => setQuickAddForm(f => ({...f, vendor: v}))} theme={theme} />
                                    <TextInput label="Qty" value={quickAddForm.quantity} onChange={v => setQuickAddForm(f => ({...f, quantity: v}))} theme={theme} placeholder="1" outlined={true} customTextColor="#181A18" customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'} />
                                </div>
                                <div className="flex items-center justify-end gap-2 mt-1.5">
                                    <button onClick={() => setAction(null)} className="px-2.5 py-1 text-xs rounded-lg font-medium transition-all" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, color: theme.isDark ? '#ffffff' : theme.text }}>Cancel</button>
                                    <button onClick={handleSaveNew} className="px-2.5 py-1 text-xs rounded-lg font-medium transition-all" style={{ backgroundColor: theme.primary, color: '#ffffff' }}>Save & Link</button>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {!action && (
                        <div className="flex items-center gap-2 mt-2">
                            <button onClick={() => setAction('add')} className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, color: theme.isDark ? '#ffffff' : theme.text }}>Add New Vial</button>
                            <button onClick={() => setAction('select')} className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all" style={{ backgroundColor: theme.primary, color: '#ffffff' }}>Change Vial</button>
                        </div>
                    )}
                    
                    {/* Delivery Method Editor for Linked Vials */}
                    <div className="mt-3 pt-3 border-t" style={{ borderColor: theme.border }}>
                        <div 
                            className="px-3 py-2 rounded-lg flex items-center justify-between mb-2" 
                            style={{ 
                                backgroundColor: theme.isDark ? '#374151' : theme.secondary, 
                                borderLeft: '4px solid #e0ded7' 
                            }}
                        >
                            <h4 
                                className="font-bold text-xs tracking-wider uppercase" 
                                style={{ 
                                    color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', 
                                    letterSpacing: '0.1em' 
                                }}
                            >
                                DELIVERY METHOD
                            </h4>
                            <Droplets size={16} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button 
                                onClick={() => handleDeliveryMethodChange('deliveryMethod', 'pipette')}
                                className={`w-full flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold transition-all`}
                                style={{
                                    backgroundColor: deliveryMethod.deliveryMethod === 'pipette' ? theme.primary : (theme.isDark ? '#1f2937' : theme.secondary),
                                    color: deliveryMethod.deliveryMethod === 'pipette' ? theme.textOnPrimary : theme.text,
                                    borderColor: deliveryMethod.deliveryMethod === 'pipette' ? theme.primary : theme.border
                                }}
                            >
                                <Pipette size={14} /> Syringe
                            </button>
                            <button 
                                onClick={() => handleDeliveryMethodChange('deliveryMethod', 'pen')}
                                className={`w-full flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold transition-all`}
                                style={{
                                    backgroundColor: deliveryMethod.deliveryMethod === 'pen' ? theme.primary : (theme.isDark ? '#1f2937' : theme.secondary),
                                    color: deliveryMethod.deliveryMethod === 'pen' ? theme.textOnPrimary : theme.text,
                                    borderColor: deliveryMethod.deliveryMethod === 'pen' ? theme.primary : theme.border
                                }}
                            >
                                <Pen size={14} /> Pen
                            </button>
                            <button 
                                onClick={() => handleDeliveryMethodChange('deliveryMethod', 'nasal')}
                                className={`w-full flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold transition-all`}
                                style={{
                                    backgroundColor: deliveryMethod.deliveryMethod === 'nasal' ? theme.primary : (theme.isDark ? '#1f2937' : theme.secondary),
                                    color: deliveryMethod.deliveryMethod === 'nasal' ? theme.textOnPrimary : theme.text,
                                    borderColor: deliveryMethod.deliveryMethod === 'nasal' ? theme.primary : theme.border
                                }}
                            >
                                <Droplets size={14} /> Nasal
                            </button>
                        </div>
                        
                        {/* Administration Route for Syringe */}
                        {deliveryMethod.deliveryMethod === 'pipette' && (
                            <div className="mt-3">
                                <div 
                                    className="flex items-center gap-1 p-1 rounded-md" 
                                    style={{ 
                                        backgroundColor: theme.isDark ? '#1f2937' : (theme.cardBackground || '#f9fafb'),
                                        boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    {['subq', 'im', 'iv'].map(route => (
                                        <button
                                            key={route}
                                            type="button"
                                            onClick={() => handleDeliveryMethodChange('administrationRoute', route)}
                                            className={`flex-1 px-2 sm:px-3 py-2 text-xs font-semibold rounded transition-all ${
                                                deliveryMethod.administrationRoute === route 
                                                    ? 'text-white shadow-sm' 
                                                    : 'text-gray-600 hover:bg-gray-200'
                                            }`}
                                            style={deliveryMethod.administrationRoute === route ? { backgroundColor: theme.primary } : {}}
                                        >
                                            {route.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Pen Type and Color for Pen */}
                        {deliveryMethod.deliveryMethod === 'pen' && (
                            <div className="mt-3">
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Pen Type Selection */}
                                    <div className="relative" ref={penTypeDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => setPenTypeDropdownOpen(!penTypeDropdownOpen)}
                                            className="w-full px-3 py-2 text-sm border rounded-md flex items-center justify-between transition-all hover:border-gray-400"
                                            style={{
                                                borderColor: penTypeDropdownOpen ? theme.primary : theme.border,
                                                backgroundColor: theme.cardBackground,
                                                color: deliveryMethod.penType ? theme.text : theme.textLight
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
                                        {penTypeDropdownOpen && (
                                            <div 
                                                className="absolute z-50 w-full mt-1 rounded-lg shadow-lg border overflow-hidden"
                                                style={{
                                                    backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                                                    borderColor: theme.border,
                                                    boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                                                }}
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
                                                            onClick={() => {
                                                                handleDeliveryMethodChange('penType', option.value);
                                                                setPenTypeDropdownOpen(false);
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm transition-all"
                                                            style={{
                                                                color: deliveryMethod.penType === option.value ? theme.primary : theme.text,
                                                                backgroundColor: 'transparent'
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
                                            </div>
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
                            <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                                Skipped reconstitution. Select delivery method below.
                            </p>
                        </div>
                        <button 
                            onClick={() => setAction('add')} 
                            className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all shadow-sm ml-2 flex items-center gap-1.5"
                            style={{ 
                                backgroundColor: theme.primary, 
                                color: '#ffffff' 
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = `0 4px 8px ${theme.primary}40`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '';
                            }}
                        >
                            <Package size={12} />
                            Add Vial
                        </button>
                    </div>
                    
                    {/* Add vial form */}
                    {action === 'add' && (
                        <div className="mb-3 p-2.5 rounded-md border-2" style={{ 
                            backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                            borderColor: theme.primary 
                        }}>
                            <p className="text-xs font-semibold mb-2" style={{ color: theme.primary }}>Add New Vial</p>
                            
                            {/* Search from stockpile option */}
                            <div className="mb-2">
                                <p className="text-xs font-medium mb-1" style={{ color: theme.text }}>Search from stockpile</p>
                                <SearchableDropdown
                                    options={vialOptions}
                                    onChange={handleSelectVial}
                                    theme={theme}
                                    placeholder="Type to search your stockpile..."
                                    idleMessage="Start typing to search your stockpile."
                                    emptyMessage="No stockpile entries found. Keep typing to refine your search."
                                />
                            </div>
                            
                            {/* Divider */}
                            <div className="flex items-center gap-2 my-2">
                                <div className="flex-1 border-t" style={{ borderColor: theme.border }}></div>
                                <span className="text-xs" style={{ color: theme.textLight }}>OR</span>
                                <div className="flex-1 border-t" style={{ borderColor: theme.border }}></div>
                            </div>
                            
                            {/* Add new vial form */}
                            <div className="space-y-1.5">
                                <p className="text-xs font-medium" style={{ color: theme.text }}>Create New</p>
                                <div className="grid grid-cols-[1fr_2fr_1fr] gap-2">
                                    <TextInput label="mg" value={quickAddForm.mg} onChange={v => setQuickAddForm(f => ({...f, mg: v}))} theme={theme} placeholder="10" outlined={true} customTextColor="#181A18" customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'} />
                                    <VendorSuggestInput label="Vendor" value={quickAddForm.vendor} onChange={v => setQuickAddForm(f => ({...f, vendor: v}))} theme={theme} />
                                    <TextInput label="Qty" value={quickAddForm.quantity} onChange={v => setQuickAddForm(f => ({...f, quantity: v}))} theme={theme} placeholder="1" outlined={true} customTextColor="#181A18" customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'} />
                                </div>
                            </div>
                            <div className="mt-2 flex items-center justify-end gap-2">
                                <button onClick={() => setAction(null)} className="px-2.5 py-1 text-xs rounded-lg font-medium transition-all" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, color: theme.isDark ? '#ffffff' : theme.text }}>Cancel</button>
                                <button onClick={handleSaveNew} className="px-2.5 py-1 text-xs rounded-lg font-medium transition-all" style={{ backgroundColor: theme.primary, color: '#ffffff' }}>Save & Link</button>
                            </div>
                        </div>
                    )}
                    
                    {/* Delivery Method Selection */}
                    <div>
                        <div 
                            className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" 
                            style={{ 
                                backgroundColor: theme.isDark ? '#374151' : theme.secondary, 
                                borderLeft: '4px solid #e0ded7' 
                            }}
                        >
                            <h4 
                                className="font-bold text-xs tracking-wider uppercase" 
                                style={{ 
                                    color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', 
                                    letterSpacing: '0.1em' 
                                }}
                            >
                                DELIVERY METHOD
                            </h4>
                            <Droplets size={16} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <button 
                                onClick={() => handleDeliveryMethodChange('deliveryMethod', 'pipette')}
                                className={`w-full flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold transition-all`}
                                style={{
                                    backgroundColor: deliveryMethod.deliveryMethod === 'pipette' ? theme.primary : (theme.isDark ? '#1f2937' : theme.secondary),
                                    color: deliveryMethod.deliveryMethod === 'pipette' ? theme.textOnPrimary : theme.text,
                                    borderColor: deliveryMethod.deliveryMethod === 'pipette' ? theme.primary : theme.border
                                }}
                            >
                                <Pipette size={14} /> Syringe
                            </button>
                            <button 
                                onClick={() => handleDeliveryMethodChange('deliveryMethod', 'pen')}
                                className={`w-full flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold transition-all`}
                                style={{
                                    backgroundColor: deliveryMethod.deliveryMethod === 'pen' ? theme.primary : (theme.isDark ? '#1f2937' : theme.secondary),
                                    color: deliveryMethod.deliveryMethod === 'pen' ? theme.textOnPrimary : theme.text,
                                    borderColor: deliveryMethod.deliveryMethod === 'pen' ? theme.primary : theme.border
                                }}
                            >
                                <Pen size={14} /> Pen
                            </button>
                            <button 
                                onClick={() => handleDeliveryMethodChange('deliveryMethod', 'nasal')}
                                className={`w-full flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold transition-all`}
                                style={{
                                    backgroundColor: deliveryMethod.deliveryMethod === 'nasal' ? theme.primary : (theme.isDark ? '#1f2937' : theme.secondary),
                                    color: deliveryMethod.deliveryMethod === 'nasal' ? theme.textOnPrimary : theme.text,
                                    borderColor: deliveryMethod.deliveryMethod === 'nasal' ? theme.primary : theme.border
                                }}
                            >
                                <Droplets size={14} /> Nasal
                            </button>
                        </div>
                        
                        {/* Administration Route for Syringe */}
                        {deliveryMethod.deliveryMethod === 'pipette' && (
                            <div className="mt-3">
                                <div 
                                    className="flex items-center gap-1 p-1 rounded-md" 
                                    style={{ 
                                        backgroundColor: theme.isDark ? '#1f2937' : (theme.cardBackground || '#f9fafb'),
                                        boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'
                                    }}
                                >
                                    {['subq', 'im', 'iv'].map(route => (
                                        <button
                                            key={route}
                                            type="button"
                                            onClick={() => handleDeliveryMethodChange('administrationRoute', route)}
                                            className={`flex-1 px-2 sm:px-3 py-2 text-xs font-semibold rounded transition-all ${
                                                deliveryMethod.administrationRoute === route 
                                                    ? 'text-white shadow-sm' 
                                                    : 'text-gray-600 hover:bg-gray-200'
                                            }`}
                                            style={deliveryMethod.administrationRoute === route ? { backgroundColor: theme.primary } : {}}
                                        >
                                            {route.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Pen Type and Color for Pen */}
                        {deliveryMethod.deliveryMethod === 'pen' && (
                            <div className="mt-3">
                                <div className="grid grid-cols-2 gap-4">
                                    {/* Pen Type Selection */}
                                    <div className="relative" ref={penTypeDropdownRef}>
                                        <button
                                            type="button"
                                            onClick={() => setPenTypeDropdownOpen(!penTypeDropdownOpen)}
                                            className="w-full px-3 py-2 text-sm border rounded-md flex items-center justify-between transition-all hover:border-gray-400"
                                            style={{
                                                borderColor: penTypeDropdownOpen ? theme.primary : theme.border,
                                                backgroundColor: theme.cardBackground,
                                                color: deliveryMethod.penType ? theme.text : theme.textLight
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
                                        {penTypeDropdownOpen && (
                                            <div 
                                                className="absolute z-50 w-full mt-1 rounded-lg shadow-lg border overflow-hidden"
                                                style={{
                                                    backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                                                    borderColor: theme.border,
                                                    boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                                                }}
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
                                                            onClick={() => {
                                                                handleDeliveryMethodChange('penType', option.value);
                                                                setPenTypeDropdownOpen(false);
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm transition-all"
                                                            style={{
                                                                color: deliveryMethod.penType === option.value ? theme.primary : theme.text,
                                                                backgroundColor: 'transparent'
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
                                            </div>
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

    // Pending state - no vial linked yet
    if (action === 'select') {
        return (
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
        );
    }
    
    if (action === 'add') {
        const handleSaveNewAndClose = () => {
            handleSaveNew();
            setAction(null);
        };
        return (
            <div className="p-2 rounded-md" style={{ 
                backgroundColor: theme.isDark ? '#1f2937' : '#f9fafb',
                boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
            }}>
                <p className="font-semibold text-xs mb-2" style={{ color: theme.text }}>Add {peptide.name} to Stockpile</p>
                
                {/* Search from stockpile option */}
                <div className="mb-2">
                    <p className="text-xs font-medium mb-1" style={{ color: theme.text }}>Search from stockpile</p>
                    <SearchableDropdown
                        options={vialOptions}
                        onChange={handleSelectVial}
                        theme={theme}
                        placeholder="Type to search your stockpile..."
                        idleMessage="Start typing to search your stockpile."
                        emptyMessage="No stockpile entries found. Keep typing to refine your search."
                    />
                </div>
                
                {/* Divider */}
                <div className="flex items-center gap-2 my-2">
                    <div className="flex-1 border-t" style={{ borderColor: theme.border }}></div>
                    <span className="text-xs" style={{ color: theme.textLight }}>OR</span>
                    <div className="flex-1 border-t" style={{ borderColor: theme.border }}></div>
                </div>
                
                {/* Add new vial form */}
                <div className="space-y-1.5">
                    <p className="text-xs font-medium" style={{ color: theme.text }}>Add New Vial</p>
                    <div className="grid grid-cols-[1fr_2fr_1fr] gap-2">
                        <TextInput label="mg" value={quickAddForm.mg} onChange={v => setQuickAddForm(f => ({...f, mg: v}))} theme={theme} placeholder="10" outlined={true} customTextColor="#181A18" customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'} />
                        <VendorSuggestInput label="Vendor" value={quickAddForm.vendor} onChange={v => setQuickAddForm(f => ({...f, vendor: v}))} theme={theme} />
                        <TextInput label="Qty" value={quickAddForm.quantity} onChange={v => setQuickAddForm(f => ({...f, quantity: v}))} theme={theme} placeholder="1" outlined={true} customTextColor="#181A18" customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'} />
                    </div>
                </div>
                <div className="mt-2 flex items-center justify-end gap-2">
                    <button onClick={() => setAction(null)} className="px-2.5 py-1 text-xs rounded-lg font-medium transition-all" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, color: theme.isDark ? '#ffffff' : theme.text }}>Cancel</button>
                    <button onClick={handleSaveNewAndClose} className="px-2.5 py-1 text-xs rounded-lg font-medium transition-all" style={{ backgroundColor: theme.primary, color: '#ffffff' }}>Save & Link</button>
                </div>
            </div>
        );
    }
    
    // Default view with choices
    return (
        <div className="p-3 rounded-md flex items-center justify-between" style={{ 
            backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
            boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
        }}>
            <p className="font-semibold text-sm" style={{ color: theme.text }}>{peptide.name}</p>
            <div className="flex items-center gap-2">
                <button onClick={handleSkip} className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, color: theme.isDark ? '#ffffff' : theme.text }}>Skip</button>
                <button onClick={() => setAction('add')} className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, color: theme.isDark ? '#ffffff' : theme.text }}>Add New</button>
                <button onClick={() => setAction('select')} className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all" style={{ backgroundColor: theme.primary, color: '#ffffff' }}>Select Vial</button>
            </div>
        </div>
    );
};

export default function EditActiveProtocolVials({ protocol, stockpile, setStockpile, theme, onUpdate }) {
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
            <p className="text-sm mb-4 text-center italic" style={{ color: theme.textLight }}>
                Manage vials and delivery methods for each peptide in your active protocol.
            </p>
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
                    />
                );
            })}
        </div>
    );
}

