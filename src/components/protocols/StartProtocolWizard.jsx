import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { ChevronRight, ChevronsRight, Info, CheckCircle, ChevronLeft, Ungroup, Blend, ClipboardList } from 'lucide-react';
import SearchableDropdown from '../common/SearchableDropdown';
import { ReconCalculatorPanel } from '../recon/ReconCalculatorPanel';
import { penColors } from '../../utils/penColors';
import { formatMMDDYYYY } from '../../utils/date';
import { formatCurrency } from '../../utils/currencyUtils';
import TextInput from '../common/inputs/TextInput';
import VendorSuggestInput from '../vendors/VendorSuggestInput';
import AutoSaveIndicator from '../common/AutoSaveIndicator';
import { appendStockEvent } from '../../utils/stockHistory';
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker';


const PeptideLinkerRow = ({ peptide, peptideId, stockpile, linkedVialId, onSelectVial, onSaveNew, onSkip, onUnlink, theme }) => {
    const [action, setAction] = useState(null); // 'select', 'add'
    const [quickAddForm, setQuickAddForm] = useState({ mg: '', quantity: '1', vendor: '' });

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

    const isSkipped = linkedVialId === 'skipped';

    if (linkedVialId && !isSkipped) {
        const selectedVial = stockpile.find(item => item.id === linkedVialId);
        return (
            <div className="p-3 rounded-md" style={{ 
                backgroundColor: theme.isDark ? '#1f2937' : (theme.primary + '10'),
                boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
            }}>
                 <div className="flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-sm" style={{ color: theme.text }}>{peptide.name}</p>
                        <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                            {selectedVial ? `Linked: ${selectedVial.mg}mg from ${selectedVial.vendor}` : 'Linked'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" style={{ color: theme.primary }} />
                        <button onClick={() => onUnlink(peptideId)} className="text-xs text-gray-400 hover:text-gray-600 hover:underline">Unlink</button>
                    </div>
                </div>
            </div>
        );
    }

    if (isSkipped) {
        return (
            <div className="p-3 rounded-md" style={{ 
                backgroundColor: theme.isDark ? '#374151' : '#f9fafb',
                boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
            }}>
                 <div className="flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-sm" style={{ color: theme.text }}>{peptide.name}</p>
                        <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                            Skipped. This peptide will not be reconstituted.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => onUnlink(peptideId)} className="text-xs text-gray-400 hover:text-gray-600 hover:underline">Undo</button>
                    </div>
                </div>
            </div>
        );
    }

    if (action === 'select') {
        return (
            <div className="p-3 rounded-md" style={{ 
                backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
            }}>
                <p className="font-semibold text-sm mb-2" style={{ color: theme.text }}>{peptide.name}</p>
                <SearchableDropdown
                    options={vialOptions}
                    onChange={(vialId) => onSelectVial(peptideId, vialId)}
                    theme={theme}
                    placeholder="Type to search your stockpile..."
                    idleMessage="Start typing to search your stockpile."
                    emptyMessage="No stockpile entries found. Keep typing to refine your search."
                />
                <button onClick={() => setAction(null)} className="text-xs text-gray-500 mt-2 hover:underline">Cancel</button>
            </div>
        );
    }
    
    if (action === 'add') {
        const handleSaveNew = () => {
            onSaveNew(peptideId, { ...quickAddForm, name: peptide.name });
            setAction(null);
        };
         return (
            <div className="p-3 rounded-md" style={{ 
                backgroundColor: theme.isDark ? '#1f2937' : '#f9fafb',
                boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
            }}>
                <p className="font-semibold text-sm mb-2" style={{ color: theme.text }}>Add {peptide.name} to Stockpile</p>
                <div className="space-y-2">
                    <TextInput label="mg (per vial)" value={quickAddForm.mg} onChange={v => setQuickAddForm(f => ({...f, mg: v}))} theme={theme} placeholder="e.g., 10" />
                    <TextInput label="Quantity (vials)" value={quickAddForm.quantity} onChange={v => setQuickAddForm(f => ({...f, quantity: v}))} theme={theme} placeholder="e.g., 1" />
                    <VendorSuggestInput label="Vendor" value={quickAddForm.vendor} onChange={v => setQuickAddForm(f => ({...f, vendor: v}))} theme={theme} />
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                     <button onClick={() => setAction(null)} className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, color: theme.isDark ? '#ffffff' : theme.text }}>Cancel</button>
                     <button onClick={handleSaveNew} className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all" style={{ backgroundColor: theme.primary, color: '#ffffff' }}>Save & Link</button>
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
                <button onClick={() => onSkip(peptideId)} className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, color: theme.isDark ? '#ffffff' : theme.text }}>Skip</button>
                <button onClick={() => setAction('add')} className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, color: theme.isDark ? '#ffffff' : theme.text }}>Add New</button>
                <button onClick={() => setAction('select')} className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all" style={{ backgroundColor: theme.primary, color: '#ffffff' }}>Select Vial</button>
            </div>
        </div>
    );
};


export default function StartProtocolWizard({ open, onClose, protocol, stockpile, setStockpile, theme, onStart }) {
    const [stage, setStage] = useState('linking'); // linking, recon_strategy, reconstituting, confirm
    const [linkedData, setLinkedData] = useState({});
    const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0,10));
    const [reconStrategy, setReconStrategy] = useState(null); // 'separate' | 'blended'

    const adjustStockpileAfterRecon = React.useCallback((usageList) => {
        if (!Array.isArray(usageList) || usageList.length === 0) return;

        const usageMap = usageList.reduce((acc, usage) => {
            if (!usage || !usage.stockpileId) return acc;
            const qty = Number(usage.quantityUsed) || 1;
            acc[usage.stockpileId] = (acc[usage.stockpileId] || 0) + qty;
            return acc;
        }, {});

        if (Object.keys(usageMap).length === 0) return;

        setStockpile(prev => {
            let changed = false;
            const updated = prev.map(item => {
                const usedQty = usageMap[item.id];
                if (!usedQty) return item;

                const currentQty = Number(item.quantity) || 0;
                const nextQty = Math.max(0, currentQty - usedQty);

                if (nextQty === currentQty) {
                    return item;
                }

                changed = true;

                try {
                    appendStockEvent({
                        type: 'used',
                        name: item.name,
                        mg: item.mg,
                        vendor: item.vendor,
                        prevQty: currentQty,
                        nextQty
                    });
                } catch (error) {
                    console.warn('Failed to append stock event after protocol recon:', error);
                }

                return { ...item, quantity: String(nextQty) };
            });

            return changed ? updated : prev;
        });
    }, [setStockpile]);

    // Auto-save wizard state - manual implementation to avoid infinite loops
    const storageKey = `tpprover_start_protocol_draft_${protocol?.id || 'new'}`;
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState(null);
    const autoSaveTimeoutRef = React.useRef(null);
    const previousStateRef = React.useRef(null);
    const isRestoringRef = React.useRef(false);

    // Auto-save effect
    useEffect(() => {
        if (!open || !protocol) return;
        if (isRestoringRef.current) {
            isRestoringRef.current = false;
            return;
        }

        const currentState = {
            stage,
            linkedData,
            startDate,
            reconStrategy
        };

        // Skip if data hasn't changed
        if (JSON.stringify(currentState) === JSON.stringify(previousStateRef.current)) {
            return;
        }

        // Skip if form is empty
        if (!currentState.linkedData || Object.keys(currentState.linkedData).length === 0) {
            return;
        }

        // Clear existing timeout
        if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
        }

        setIsSaving(true);

        // Auto-save after delay
        autoSaveTimeoutRef.current = setTimeout(() => {
            try {
                const saveData = {
                    data: currentState,
                    timestamp: new Date().toISOString()
                };
                localStorage.setItem(storageKey, JSON.stringify(saveData));
                setLastSaved(new Date());
                previousStateRef.current = currentState;
            } catch (error) {
                console.warn('Failed to auto-save wizard state:', error);
            } finally {
                setIsSaving(false);
            }
        }, 2000);

        return () => {
            if (autoSaveTimeoutRef.current) {
                clearTimeout(autoSaveTimeoutRef.current);
            }
        };
    }, [stage, linkedData, startDate, reconStrategy, open, protocol, storageKey]);

    const clearSavedData = React.useCallback(() => {
        try {
            localStorage.removeItem(storageKey);
            setLastSaved(null);
            previousStateRef.current = null;
        } catch (error) {
            console.warn('Failed to clear saved data:', error);
        }
    }, [storageKey]);

    const markAsSubmitted = React.useCallback(() => {
        clearSavedData();
    }, [clearSavedData]);

    // Load saved draft or initialize fresh state when modal opens
    useEffect(() => {
        if (open && protocol) {
            try {
                const saved = localStorage.getItem(storageKey);
                if (saved) {
                    const parsedData = JSON.parse(saved);
                    if (parsedData.data && Object.keys(parsedData.data).length > 0) {
                        const savedState = parsedData.data;
                        isRestoringRef.current = true; // Prevent auto-save from triggering
                        if (savedState.stage) setStage(savedState.stage);
                        if (savedState.linkedData) setLinkedData(savedState.linkedData);
                        if (savedState.startDate) setStartDate(savedState.startDate);
                        if (savedState.reconStrategy !== undefined) setReconStrategy(savedState.reconStrategy);
                        previousStateRef.current = savedState;
                        setLastSaved(new Date(parsedData.timestamp));
                        return;
                    }
                }
            } catch (e) {
                console.warn('Failed to load saved draft:', e);
            }

            // Initialize fresh state if no saved draft
            isRestoringRef.current = true;
            setStage('linking');
            const initialData = {};
            protocol.peptides.forEach((p, index) => {
                const peptideId = p.id || `peptide-${index}`;
                const uniqueKey = initialData[peptideId] ? `peptide-${index}` : peptideId;
                initialData[uniqueKey] = { status: 'pending' };
            });
            setLinkedData(initialData);
            setReconStrategy(null);
            previousStateRef.current = { stage: 'linking', linkedData: initialData, startDate, reconStrategy: null };
        }
    }, [open, protocol, storageKey]);

    const handleSelectVial = React.useCallback((peptideId, vialId) => {
        setLinkedData(prev => {
            // Ensure we only update the specific peptide and preserve all others
            // Create a completely new object to avoid any reference issues
            const updated = {};
            // First, copy all existing entries
            Object.keys(prev).forEach(key => {
                updated[key] = { ...prev[key] };
            });
            // Then update only the specific peptide
            updated[peptideId] = { status: 'linked', vialId };
            return updated;
        });
    }, []);

    const handleUnlinkPeptide = (peptideId) => {
        setLinkedData(prev => {
            // Ensure we only update the specific peptide and preserve all others
            // Create a completely new object to avoid any reference issues
            const updated = {};
            // First, copy all existing entries
            Object.keys(prev).forEach(key => {
                updated[key] = { ...prev[key] };
            });
            // Then update only the specific peptide
            updated[peptideId] = { status: 'pending' };
            return updated;
        });
    };

    const handleSkipPeptide = (peptideId) => {
        setLinkedData(prev => {
            // Ensure we only update the specific peptide and preserve all others
            // Create a completely new object to avoid any reference issues
            const updated = {};
            // First, copy all existing entries
            Object.keys(prev).forEach(key => {
                updated[key] = { ...prev[key] };
            });
            // Then update only the specific peptide
            updated[peptideId] = { status: 'skipped' };
            return updated;
        });
    };

    const handleSaveNewAndLink = (peptideId, newItemData) => {
        const newItem = {
            id: `stock-${Date.now()}`,
            ...newItemData,
            notes: "Added during protocol start. Review details."
        };
        
        // Update the main stockpile state via the callback
        const updatedStockpile = [newItem, ...stockpile];
        setStockpile(updatedStockpile);

        // Now link it - ensure we only update the specific peptide
        setLinkedData(prev => {
            // Create a completely new object to avoid any reference issues
            const updated = {};
            // First, copy all existing entries
            Object.keys(prev).forEach(key => {
                updated[key] = { ...prev[key] };
            });
            // Then update only the specific peptide
            updated[peptideId] = { status: 'linked', vialId: newItem.id };
            return updated;
        });
    };

    const handleContinue = () => {
        const linkedPeptides = protocol.peptides.filter((p, index) => {
            const peptideId = p.id || `peptide-${index}`;
            return linkedData[peptideId]?.status === 'linked';
        });
        
        if (linkedPeptides.length > 1) {
            setStage('recon_strategy');
        } else if (linkedPeptides.length === 1) {
            setReconStrategy('separate'); // Implicit strategy for one peptide
            setStage('reconstituting');
        } else {
            setStage('confirm');
        }
    };

    const renderLinkingStep = () => {
        if (!protocol) return null;
        return (
            <div>
                <p className="text-sm mb-4 text-center italic" style={{ color: theme.textLight }}>For each peptide in your protocol, select a vial from your stockpile, add a new one, or skip.</p>
                <div className="space-y-3">
                    {protocol.peptides.map((p, index) => {
                        // Ensure we have a unique identifier - use index as fallback if ID is missing
                        const peptideId = p.id || `peptide-${index}`;
                        return (
                            <PeptideLinkerRow
                                key={peptideId}
                                peptide={p}
                                peptideId={peptideId}
                                stockpile={stockpile}
                                linkedVialId={linkedData[peptideId]?.status === 'linked' ? linkedData[peptideId].vialId : (linkedData[peptideId]?.status === 'skipped' ? 'skipped' : null)}
                                onSelectVial={handleSelectVial}
                                onSaveNew={handleSaveNewAndLink}
                                onSkip={handleSkipPeptide}
                                onUnlink={handleUnlinkPeptide}
                                theme={theme}
                            />
                        );
                    })}
                </div>
                 <div className="mt-6 flex justify-end">
                    <button 
                        onClick={handleContinue} 
                        className="px-4 py-2 rounded-md text-sm" 
                        style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                    >
                        Continue
                    </button>
                </div>
            </div>
        );
    };
    
    // Bringing back the other render functions
    const linkedPeptides = useMemo(() => {
        if (!protocol) return [];
        return protocol.peptides.filter((p, index) => {
            const peptideId = p.id || `peptide-${index}`;
            return linkedData[peptideId]?.status === 'linked';
        });
    }, [linkedData, protocol]);

    const renderReconStrategyStep = () => {
        return (
            <div>
                <p className="text-sm text-center italic mb-4" style={{ color: theme.textLight, wordBreak: 'keep-all', whiteSpace: 'normal' }}>
                    You've linked {linkedPeptides.length} peptide(s). How would you like to <span style={{ whiteSpace: 'nowrap' }}>reconstitute</span> them?
                </p>
                <div className="mt-6 grid grid-cols-2 lg:grid-cols-1 gap-2">
                    {[
                        { key: 'separate', name: 'Separately', icon: Ungroup, description: 'Individual vials' },
                        { key: 'blended', name: 'Blended', icon: Blend, description: 'Mixed together' }
                    ].map(option => {
                        const Icon = option.icon
                        const isSelected = reconStrategy === option.key
                        return (
                            <button
                                key={option.key}
                                type="button"
                                onClick={() => { setReconStrategy(option.key); setStage('reconstituting'); }}
                                className="flex flex-col items-center justify-center p-1 rounded-lg transition-all"
                                style={{
                                    backgroundColor: isSelected ? theme.primary : (theme.isDark ? '#1f2937' : '#ffffff'),
                                    border: `1px solid ${isSelected ? theme.primary : theme.border}`,
                                    color: isSelected ? '#ffffff' : (theme.isDark ? '#9ca3af' : '#6b7280'),
                                    minHeight: '50px',
                                    boxShadow: isSelected ? `0 1px 3px ${theme.primary}30` : 'none',
                                    position: 'relative'
                                }}
                                onMouseEnter={(e) => {
                                    if (!isSelected) {
                                        e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f9fafb'
                                        e.currentTarget.style.color = theme.text
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!isSelected) {
                                        e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : '#ffffff'
                                        e.currentTarget.style.color = theme.isDark ? '#9ca3af' : '#6b7280'
                                    }
                                }}
                            >
                                <Icon size={18} style={{ marginBottom: '2px', position: 'relative', zIndex: 1 }} />
                                <span className="text-xs font-medium text-center leading-tight" style={{ position: 'relative', zIndex: 1 }}>{option.name}</span>
                                <span className="text-xs text-center leading-tight opacity-75 mt-0.5" style={{ position: 'relative', zIndex: 1 }}>{option.description}</span>
                            </button>
                        )
                    })}
                </div>
                 <div className="mt-4 text-center">
                    <div className="flex justify-between items-center">
                        <button 
                            onClick={handleBack}
                            className="px-4 py-2 rounded-md text-sm flex items-center gap-2"
                            style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, color: theme.text }}
                        >
                            <ChevronLeft size={16} />
                            Back
                        </button>
                        <button onClick={() => setStage('confirm')} className="text-sm text-gray-500 hover:underline">
                            Skip reconstitution
                        </button>
                    </div>
                </div>
            </div>
        );
    };
    
    const renderReconstitutingStep = () => {
         const prefill = {
            peptides: linkedPeptides.map((p, index) => {
                const peptideId = p.id || `peptide-${index}`;
                const vialId = linkedData[peptideId]?.vialId;
                const vial = stockpile.find(item => item.id === vialId);
                if (!vial) return { id: peptideId, name: p.name, mg: '', dose: '', stockpileId: null, quantityUsed: 1 };
                const totalCost = Number(vial.cost) || 0;
                const quantity = Number(vial.quantity) || 1;
                // For recon calculations, we need the cost of ONE vial being reconstituted
                // If user entered total cost for multiple vials, divide by quantity to get per-vial cost
                const singleVialCost = quantity > 0 ? totalCost / quantity : 0;
                return {
                    id: peptideId, name: p.name, mg: vial.mg,
                    dose: p.dosage?.amount || '', doseUnit: p.dosage?.unit || 'mcg',
                    cost: singleVialCost, vendor: vial.vendor,
                    stockpileId: vial.id,
                    quantityUsed: 1,
                    unit: vial.unit
                };
            }),
            protocolName: protocol.protocolName,
            reconStrategy: reconStrategy
        };
        return (
             <div>
                <p className="text-sm italic text-center mb-4" style={{ color: theme.textLight }}>
                    Confirm your vial(s) for the {reconStrategy === 'separate' ? 'separate' : 'blended'} protocol.
                </p>
                <div className="mt-4">
                    <ReconCalculatorPanel
                        theme={theme}
                        prefill={prefill}
                        noCard={true}
                        reconStrategy={reconStrategy}
                        allowRemovePeptide={false}
                        allowAddPeptide={false}
                        onSave={(reconData) => {
                            const newReconId = `recon-${Date.now()}`;

                            // We need to enrich the peptides with their original vial cost for accurate history
                            const peptidesWithDetails = reconData.peptides.map(p => {
                                const originalPrefill = prefill.peptides.find(pref => pref.id === p.id);
                                return { 
                                    ...p, 
                                    cost: originalPrefill?.cost || 0, 
                                    vendor: originalPrefill?.vendor || '', 
                                    stockpileId: p.stockpileId || originalPrefill?.stockpileId || null,
                                    quantityUsed: p.quantityUsed || originalPrefill?.quantityUsed || 1
                                };
                            });

                            const newReconItem = { 
                                ...reconData, 
                                id: newReconId, 
                                name: `${protocol.protocolName} (${reconStrategy})`,
                                reconStrategy: reconStrategy,
                                peptides: peptidesWithDetails,
                                date: new Date().toISOString() // Add the current date
                            };

                            try {
                                const raw = localStorage.getItem('tpprover_recon_items');
                                const items = raw ? JSON.parse(raw) : [];
                                localStorage.setItem('tpprover_recon_items', JSON.stringify([newReconItem, ...items]));
                            } catch (e) { console.error("Failed to save new recon item", e); }

                            adjustStockpileAfterRecon(peptidesWithDetails);

                            let updatedLinkedData = { ...linkedData };
                            linkedPeptides.forEach((p, index) => {
                                const peptideId = p.id || `peptide-${index}`;
                                updatedLinkedData[peptideId] = { ...updatedLinkedData[peptideId], reconId: newReconId };
                            });
                            setLinkedData(updatedLinkedData);
                            setStage('confirm');
                        }}
                    />
                </div>
                {canGoBack() && (
                    <div className="mt-4 flex justify-start">
                        <button 
                            onClick={handleBack}
                            className="px-4 py-2 rounded-md text-sm flex items-center gap-2"
                            style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, color: theme.text }}
                        >
                            <ChevronLeft size={16} />
                            Back
                        </button>
                    </div>
                )}
            </div>
        );
    };

     const renderConfirmStep = () => {
        return (
             <div className="space-y-6">
                {/* Header */}
                <p className="text-sm mb-4 text-center italic" style={{ color: theme.textLight }}>Choose your start date to begin tracking</p>

                {/* Start Date Input with Glassmorphism Date Picker */}
                <div className="relative">
                    <GlassmorphismDatePicker
                        value={startDate}
                        onChange={(dateString) => setStartDate(dateString)}
                        theme={theme}
                        placeholder="Start Date"
                    />
                </div>

                {/* Protocol Summary Card */}
                <div>
                    {/* Section Header */}
                    <div className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: '4px solid #e0ded7' }}>
                        <h4 className="font-bold text-sm tracking-wider uppercase" style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', letterSpacing: '0.1em' }}>PROTOCOL SUMMARY</h4>
                        <ClipboardList size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
                    </div>
                    <div className="p-4 rounded-lg" style={{ 
                        border: `1px solid #f0eee7`,
                        boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                        backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground
                    }}>
                        <div className="space-y-3 text-xs" style={{ color: theme.textLight }}>
                        <div className="flex justify-between">
                            <span>Protocol Name:</span>
                            <span className="font-semibold" style={{ color: theme.text }}>{protocol.protocolName}</span>
                        </div>
                        {protocol.duration && !protocol.duration.noEnd && (
                            <div className="flex justify-between">
                                <span>Duration:</span>
                                <span className="font-semibold" style={{ color: theme.text }}>
                                    {protocol.duration.count} {protocol.duration.unit}
                                </span>
                            </div>
                        )}
                        <div>
                            <div className="mb-2 font-medium" style={{ color: theme.text }}>Compounds ({protocol.peptides?.length || 0}):</div>
                            <div className="space-y-2 ml-2">
                                {protocol.peptides?.map((peptide, index) => {
                                    const peptideId = peptide.id || `confirm-peptide-${index}`;
                                    return (
                                    <div key={peptideId} className="flex items-start gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: theme.primary }}></div>
                                        <div className="flex-1">
                                            <div className="font-medium" style={{ color: theme.text }}>{peptide.name}</div>
                                            <div className="flex gap-3 mt-1">
                                                {peptide.dosage && (
                                                    <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: theme.secondary, color: theme.text }}>
                                                        {peptide.dosage.amount} {peptide.dosage.unit}
                                                    </span>
                                                )}
                                                {peptide.frequency && (
                                                    <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: theme.secondary, color: theme.text }}>
                                                        {peptide.frequency.type === 'daily' ? 
                                                         (peptide.frequency.time && Array.isArray(peptide.frequency.time) && peptide.frequency.time.length > 0 ? 
                                                          `Daily (${peptide.frequency.time.join(', ')})` : 'Daily') :
                                                         peptide.frequency.type === 'weekly' ? `Weekly (${peptide.frequency.days?.join(', ') || ''})` :
                                                         peptide.frequency.type === 'cycle' ? `Cycle: ${peptide.frequency.onDays} on / ${peptide.frequency.offDays} off` :
                                                         peptide.frequency.type === 'custom' ? (peptide.frequency.customDays ? `Every ${peptide.frequency.customDays} days` : 'Every X days') :
                                                         'Custom'}
                                                    </span>
                                                )}
                                                {peptide.timing && (
                                                    <span className="px-2 py-1 rounded text-xs" style={{ backgroundColor: theme.secondary, color: theme.text }}>
                                                        {peptide.timing}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}) || <div className="text-xs italic">No compounds configured</div>}
                            </div>
                        </div>
                        </div>
                    </div>
                </div>

                {/* What Happens Next */}
                <div className="p-4 rounded-lg" style={{ 
                    backgroundColor: theme.isDark ? '#1f2937' : theme.cardBackground,
                    boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
                }}>
                    <div className="text-sm font-medium mb-4" style={{ color: theme.text }}>What Happens Next</div>
                    <div className="grid grid-cols-1 gap-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.primary }}>
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-sm font-medium" style={{ color: theme.text }}>Dashboard Integration</div>
                                <div className="text-xs" style={{ color: theme.textLight }}>Daily research will appear on your Dashboard</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.primary }}>
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-sm font-medium" style={{ color: theme.text }}>Calendar Schedule</div>
                                <div className="text-xs" style={{ color: theme.textLight }}>Research schedule will be visible in your Calendar</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: theme.primary }}>
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </div>
                            <div>
                                <div className="text-sm font-medium" style={{ color: theme.text }}>Progress Tracking</div>
                                <div className="text-xs" style={{ color: theme.textLight }}>Track progress by marking research complete</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-between gap-2 pt-2">
                    <div>
                        {canGoBack() && (
                            <button 
                                onClick={handleBack}
                                className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2"
                                style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, color: theme.text }}
                            >
                                <ChevronLeft size={16} />
                                Back
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={onClose} className="px-4 py-2 rounded-lg font-medium transition-all" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, color: theme.text }}>
                            Cancel
                        </button>
                        <button 
                            onClick={() => {
                                markAsSubmitted(); // Clear draft on successful start
                                onStart({ ...protocol, startDate, active: true, linkedItems: linkedData });
                            }}
                            className="px-4 py-2 rounded-lg font-medium transition-all"
                            style={{ backgroundColor: theme.primary, color: '#ffffff' }}
                        >
                            Start Protocol
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Progress indicator component
    const stages = [
        { id: 'linking', label: 'Link Peptides' },
        { id: 'recon_strategy', label: 'Strategy' },
        { id: 'reconstituting', label: 'Reconstitute' },
        { id: 'confirm', label: 'Confirm' }
    ];

    const getCurrentStageIndex = () => {
        return stages.findIndex(s => s.id === stage);
    };

    const canGoBack = () => {
        return getCurrentStageIndex() > 0;
    };

    const handleBack = () => {
        const currentIndex = getCurrentStageIndex();
        if (currentIndex > 0) {
            setStage(stages[currentIndex - 1].id);
        }
    };

    const renderProgressIndicator = () => {
        const currentIndex = getCurrentStageIndex();
        return (
            <div className="mb-2 overflow-x-hidden">
                <div className="flex items-center justify-between" style={{ minWidth: 0 }}>
                    {stages.map((s, index) => {
                        const isActive = index === currentIndex;
                        const isCompleted = index < currentIndex;
                        const isClickable = index < currentIndex; // Can click to go back to completed stages
                        
                        return (
                            <React.Fragment key={s.id}>
                                <div className="flex flex-col items-center flex-1">
                                    <button
                                        onClick={() => isClickable && setStage(s.id)}
                                        disabled={!isClickable}
                                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                                            isClickable ? 'cursor-pointer hover:scale-110' : 'cursor-default'
                                        }`}
                                        style={{
                                            backgroundColor: isActive 
                                                ? theme.primary 
                                                : isCompleted 
                                                    ? theme.secondary 
                                                    : theme.isDark ? '#374151' : '#e5e7eb',
                                            color: isActive 
                                                ? '#ffffff' 
                                                : isCompleted 
                                                    ? theme.primary 
                                                    : theme.textLight,
                                            border: isActive ? `2px solid ${theme.primary}` : 'none'
                                        }}
                                    >
                                        {isCompleted ? '✓' : index + 1}
                                    </button>
                                    <span 
                                        className="text-xs mt-1.5 text-center"
                                        style={{ 
                                            color: isActive ? theme.primary : theme.textLight,
                                            fontWeight: isActive ? '600' : '400'
                                        }}
                                    >
                                        {s.label}
                                    </span>
                                </div>
                                {index < stages.length - 1 && (
                                    <div 
                                        className="flex-1 h-0.5 mx-2 mt-[-16px]"
                                        style={{ 
                                            backgroundColor: isCompleted ? theme.primary : (theme.isDark ? '#374151' : '#e5e7eb')
                                        }}
                                    />
                                )}
                            </React.Fragment>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderContent = () => {
        if (stage === 'linking') return renderLinkingStep();
        if (stage === 'recon_strategy') return renderReconStrategyStep();
        if (stage === 'reconstituting') return renderReconstitutingStep();
        if (stage === 'confirm') return renderConfirmStep();
        return <div>Unknown stage</div>;
    };
    
    // Safeguard from original code
    if (!protocol) return null;

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Start Protocol"
            theme={theme}
            variant="modern"
            maxWidth="max-w-4xl"
            titleExtra={<AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} compact />}
        >
            {renderProgressIndicator()}
            {renderContent()}
        </Modal>
    );
}
