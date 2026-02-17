import React, { useState, useEffect, useMemo, useRef } from 'react';
import BottomSheet from '../common/BottomSheet';
import { ChevronRight, ChevronsRight, Info, CheckCircle, ChevronLeft, Ungroup, Blend, ClipboardList, ChevronDown, Pipette, Pen, Droplets, TestTubes, Beaker, Calendar, LayoutDashboard, Activity, Zap, Check, X, AlertTriangle } from 'lucide-react';
import SearchableDropdown from '../common/SearchableDropdown';
import { ReconCalculatorPanel } from '../recon/ReconCalculatorPanel';
import { penColors } from '../../utils/penColors';
import { formatMMDDYYYY, getLocalDateString, getLocalTimestamp } from '../../utils/date';
import { formatCurrency } from '../../utils/currencyUtils';
import TextInput from '../common/inputs/TextInput';
import VendorSuggestInput from '../vendors/VendorSuggestInput';
import AutoSaveIndicator from '../common/AutoSaveIndicator';
import { appendStockEvent } from '../../utils/stockHistory';
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker';
import ColorSwatchDropdown from '../common/inputs/ColorSwatchDropdown';
import { generateId } from '../../utils/string';
import SchedulingPreview from './SchedulingPreview';
import VisualSchedulePreview from './VisualSchedulePreview';


const PeptideLinkerRow = ({ peptide, peptideId, stockpile, linkedVialId, onSelectVial, onSaveNew, onSkip, onUnlink, onEditVial, theme, isSinglePeptide = false }) => {
    const [action, setAction] = useState(null); // 'select', 'add', 'edit'
    const [quickAddForm, setQuickAddForm] = useState({ mg: '', quantity: '', vendor: '' });

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

    // When a vial is already linked, show confirmation first (so we don't keep showing the search bar).
    // Only let add/edit take priority so those forms stay open.
    if (action !== 'add' && action !== 'edit' && linkedVialId && !isSkipped) {
        const selectedVial = stockpile.find(item => item.id === linkedVialId);
        const isNewlyAdded = selectedVial?.notes?.includes('Added during protocol start');
        return (
            <div className="p-3 rounded-md" style={{
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : (theme.primary + '10'),
                boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
            }}>
                <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm" style={{ color: theme.text }}>{peptide.name}</p>
                        <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                            {selectedVial ? `Linked: ${selectedVial.mg ?? ''} ${selectedVial.mgUnit || 'mg'} from ${selectedVial.vendor}` : 'Linked'}
                        </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <CheckCircle className="h-5 w-5 flex-shrink-0" style={{ color: theme.primary }} />
                        {isNewlyAdded && onEditVial && (
                            <button onClick={() => {
                                if (selectedVial) {
                                    setQuickAddForm({
                                        mg: selectedVial.mg || '',
                                        quantity: selectedVial.quantity || '',
                                        vendor: selectedVial.vendor || ''
                                    });
                                    setAction('edit');
                                }
                            }} className="text-xs hover:underline" style={{ color: theme.textLight }}>Edit</button>
                        )}
                        <button onClick={() => onUnlink(peptideId)} className="text-xs hover:underline" style={{ color: theme.textLight }}>Unlink</button>
                    </div>
                </div>
                <div className="mt-3 pt-2 border-t" style={{ borderColor: theme.border }}>
                    <span className="text-xs block mb-2" style={{ color: theme.textLight }}>Add another vial?</span>
                    <div className="flex flex-wrap items-center gap-2">
                        <button onClick={() => setAction('add')} className="px-2.5 py-1 text-xs rounded-lg font-medium transition-all" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : theme.secondary, color: theme.isDark ? '#ffffff' : theme.text }}>Add New</button>
                        <button onClick={() => setAction('select')} className="px-2.5 py-1 text-xs rounded-lg font-medium transition-all" style={{ backgroundColor: theme.primary, color: '#ffffff' }}>Select from Stockpile</button>
                    </div>
                </div>
            </div>
        );
    }

    if (action === 'add' || action === 'edit') {
        const isEdit = action === 'edit';
        const selectedVial = stockpile.find(item => item.id === linkedVialId);
        
        const handleSave = () => {
            if (isEdit && selectedVial && onEditVial) {
                onEditVial(peptideId, selectedVial.id, { ...quickAddForm, name: peptide.name });
            } else {
                onSaveNew(peptideId, { ...quickAddForm, name: peptide.name });
            }
            setAction(null);
        };
        
         return (
            <div className="p-3 rounded-md" style={{ 
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
                boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
            }}>
                <p className="font-semibold text-sm mb-2" style={{ color: theme.text }}>
                    {isEdit ? `Edit ${peptide.name} in Stockpile` : `Add ${peptide.name} to Stockpile`}
                </p>
                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                        <TextInput label="mg (per vial)" value={quickAddForm.mg} onChange={v => setQuickAddForm(f => ({...f, mg: v}))} theme={theme} placeholder="e.g., 10" outlined={true} customTextColor={theme.isDark ? null : "#181A18"} customShadow />
                        <TextInput label="Quantity (vials)" value={quickAddForm.quantity} onChange={v => setQuickAddForm(f => ({...f, quantity: v}))} theme={theme} placeholder="e.g., 1" outlined={true} customTextColor={theme.isDark ? null : "#181A18"} customShadow />
                    </div>
                    <VendorSuggestInput label="Vendor" value={quickAddForm.vendor} onChange={v => setQuickAddForm(f => ({...f, vendor: v}))} theme={theme} />
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                     <button onClick={() => setAction(null)} className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : theme.secondary, color: theme.isDark ? '#ffffff' : theme.text }}>Cancel</button>
                     <button onClick={handleSave} className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all" style={{ backgroundColor: theme.primary, color: '#ffffff' }}>{isEdit ? 'Save Changes' : 'Save & Link'}</button>
                </div>
            </div>
        );
    }

    if (action === 'select') {
        return (
            <div className="p-3 rounded-md" style={{ 
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.cardBackground,
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
                <button onClick={() => setAction(null)} className="text-xs mt-2 hover:underline" style={{ color: theme.textLight }}>Cancel</button>
            </div>
        );
    }

    if (isSkipped) {
        return (
            <div className="p-3 rounded-md" style={{ 
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.02)',
                boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
            }}>
                 <div className="flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-sm" style={{ color: theme.text }}>{peptide.name}</p>
                        <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                            Skipped - manual tracking
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => onUnlink(peptideId)} className="text-xs hover:underline" style={{ color: theme.textLight }}>Undo</button>
                    </div>
                </div>
            </div>
        );
    }
    
    // Default view with choices — stacked layout so long peptide names don't cramp buttons
    return (
        <div className="p-3 rounded-md" style={{ 
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : theme.cardBackground,
            boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none'
        }}>
            <p className="font-semibold text-sm mb-3 break-words" style={{ color: theme.text }}>{peptide.name}</p>
            <div className="flex flex-wrap items-center gap-2">
                    {!isSinglePeptide && (
                    <button onClick={() => onSkip(peptideId)} className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all shrink-0" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : theme.secondary, color: theme.isDark ? '#ffffff' : theme.text }}>Skip</button>
                )}
                <button onClick={() => setAction('add')} className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all shrink-0" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.1)' : theme.secondary, color: theme.isDark ? '#ffffff' : theme.text }}>Add New</button>
                <button onClick={() => setAction('select')} className="px-3 py-1.5 text-xs rounded-lg font-medium transition-all shrink-0 whitespace-nowrap" style={{ backgroundColor: theme.primary, color: '#ffffff' }} title="Select Vial from Stockpile">Select from Stockpile</button>
            </div>
        </div>
    );
};


export default function StartProtocolWizard({ open, onClose, protocol, stockpile, setStockpile, theme, onStart }) {
    // ACCORDION STATE - No more stages!
    const [expandedSections, setExpandedSections] = useState({
        preview: true, // Auto-expand preview to show schedule
        linking: false, // Collapse optional linking section
        recon: false,
        delivery: false
    });
    
    const [linkedData, setLinkedData] = useState({});
    const [startDate, setStartDate] = useState(() => getLocalDateString());
    const [reconStrategy, setReconStrategy] = useState(null); // 'separate' | 'blended'
    const [reconComplete, setReconComplete] = useState(false); // Track if recon was completed
    const [skippedPeptideDeliveryMethods, setSkippedPeptideDeliveryMethods] = useState({}); // Store delivery method info for skipped peptides
    const [penTypeDropdownOpen, setPenTypeDropdownOpen] = useState({}); // Track which peptide's dropdown is open
    const penTypeDropdownRefs = useRef({});

    // Close dropdowns when clicking outside (supports both mouse and touch)
    useEffect(() => {
        const handleClickOutside = (event) => {
            Object.keys(penTypeDropdownOpen).forEach(peptideId => {
                if (penTypeDropdownRefs.current[peptideId] && !penTypeDropdownRefs.current[peptideId].contains(event.target)) {
                    setPenTypeDropdownOpen(prev => ({
                        ...prev,
                        [peptideId]: false
                    }));
                }
            });
        };

        if (Object.keys(penTypeDropdownOpen).some(key => penTypeDropdownOpen[key])) {
            // Support both mouse and touch events for mobile compatibility
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('touchstart', handleClickOutside);
            };
        }
    }, [penTypeDropdownOpen]);

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
                        nextQty,
                        source: 'protocol'
                    });
                } catch (error) {
                    console.warn('Failed to append stock event after protocol recon:', error);
                }

                return { ...item, quantity: String(nextQty) };
            });

            return changed ? updated : prev;
        });
    }, [setStockpile]);

    // Auto-save wizard state
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
            expandedSections,
            linkedData,
            startDate,
            reconStrategy,
            reconComplete,
            skippedPeptideDeliveryMethods
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
                    timestamp: getLocalTimestamp()
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
    }, [expandedSections, linkedData, startDate, reconStrategy, reconComplete, skippedPeptideDeliveryMethods, open, protocol, storageKey]);

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
                        // Allow user to select any date (past, present, or future)
                        // Only default to today if no saved date exists
                        const dateToUse = savedState.startDate || getLocalDateString();
                        setStartDate(dateToUse);
                        if (savedState.expandedSections) setExpandedSections(savedState.expandedSections);
                        if (savedState.linkedData) setLinkedData(savedState.linkedData);
                        if (savedState.reconStrategy !== undefined) setReconStrategy(savedState.reconStrategy);
                        if (savedState.reconComplete !== undefined) setReconComplete(savedState.reconComplete);
                        if (savedState.skippedPeptideDeliveryMethods) setSkippedPeptideDeliveryMethods(savedState.skippedPeptideDeliveryMethods);
                        previousStateRef.current = { ...savedState, startDate: dateToUse };
                        setLastSaved(new Date(parsedData.timestamp));
                        return;
                    }
                }
            } catch (e) {
                console.warn('Failed to load saved draft:', e);
            }

            // Initialize fresh state if no saved draft
            isRestoringRef.current = true;
            const today = getLocalDateString(); // Default to today for fresh start
            const initialData = {};
            protocol.peptides.forEach((p, index) => {
                const peptideId = p.id || `peptide-${index}`;
                const uniqueKey = initialData[peptideId] ? `peptide-${index}` : peptideId;
                initialData[uniqueKey] = { status: 'pending' };
            });
            setLinkedData(initialData);
            setStartDate(today); // Default to today when opening fresh
            setReconStrategy(null);
            setReconComplete(false);
            setSkippedPeptideDeliveryMethods({});
            setExpandedSections({ preview: true, linking: false, recon: false, delivery: false });
            previousStateRef.current = { expandedSections: { preview: true, linking: false, recon: false, delivery: false }, linkedData: initialData, startDate: today, reconStrategy: null, reconComplete: false, skippedPeptideDeliveryMethods: {} };
        }
    }, [open, protocol, storageKey]);

    const handleSelectVial = React.useCallback((peptideId, vialId) => {
        setLinkedData(prev => {
            const updated = {};
            Object.keys(prev).forEach(key => {
                updated[key] = { ...prev[key] };
            });
            updated[peptideId] = { status: 'linked', vialId };
            return updated;
        });

        // Log linked_to_protocol event
        const vial = stockpile.find(item => item.id === vialId);
        if (vial) {
            appendStockEvent({
                type: 'linked_to_protocol',
                name: vial.name,
                mg: vial.mg,
                vendor: vial.vendor,
                stockpileId: vialId,
                source: 'protocol',
                protocolId: protocol?.id || null
            });
        }
    }, [stockpile, protocol]);

    const handleUnlinkPeptide = (peptideId) => {
        setLinkedData(prev => {
            const updated = {};
            Object.keys(prev).forEach(key => {
                updated[key] = { ...prev[key] };
            });
            updated[peptideId] = { status: 'pending' };
            return updated;
        });
        // Clear delivery method data if peptide is unlinked
        setSkippedPeptideDeliveryMethods(prev => {
            const updated = { ...prev };
            delete updated[peptideId];
            return updated;
        });
    };

    const handleSkipPeptide = (peptideId) => {
        setLinkedData(prev => {
            const updated = {};
            Object.keys(prev).forEach(key => {
                updated[key] = { ...prev[key] };
            });
            updated[peptideId] = { status: 'skipped' };
            return updated;
        });
        // Auto-expand delivery section when peptides are skipped
        setExpandedSections(prev => ({ ...prev, delivery: true, preview: false }));
    };

    const handleSaveNewAndLink = (peptideId, newItemData) => {
        const newItem = {
            id: `stock-${generateId()}`,
            ...newItemData,
            notes: "Added during protocol start. Review details."
        };
        
        const updatedStockpile = [newItem, ...stockpile];
        setStockpile(updatedStockpile);

        setLinkedData(prev => {
            const updated = {};
            Object.keys(prev).forEach(key => {
                updated[key] = { ...prev[key] };
            });
            updated[peptideId] = { status: 'linked', vialId: newItem.id };
            return updated;
        });
    };

    const handleEditVial = (peptideId, vialId, updatedData) => {
        const updatedStockpile = stockpile.map(item => {
            if (item.id === vialId) {
                return {
                    ...item,
                    ...updatedData,
                    notes: "Added during protocol start. Review details."
                };
            }
            return item;
        });
        setStockpile(updatedStockpile);
        
        // Update linkedData to ensure it still references the vial
        setLinkedData(prev => {
            const updated = { ...prev };
            if (updated[peptideId] && updated[peptideId].status === 'linked') {
                updated[peptideId] = { ...updated[peptideId], vialId: vialId };
            }
            return updated;
        });
    };

    const handleSkipAllVials = () => {
        // Skip all peptides
        const updated = {};
        protocol.peptides.forEach((p, index) => {
            const peptideId = p.id || `peptide-${index}`;
            updated[peptideId] = { status: 'skipped' };
        });
        setLinkedData(updated);
        // Collapse linking, expand delivery
        setExpandedSections({ preview: false, linking: false, recon: false, delivery: true });
    };

    const toggleSection = (section) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    const linkedPeptides = useMemo(() => {
        if (!protocol) return [];
        return protocol.peptides.filter((p, index) => {
            const peptideId = p.id || `peptide-${index}`;
            return linkedData[peptideId]?.status === 'linked';
        });
    }, [linkedData, protocol]);

    const skippedPeptides = useMemo(() => {
        if (!protocol) return [];
        return protocol.peptides
            .map((p, index) => {
                const peptideId = p.id || `peptide-${index}`;
                return { ...p, peptideId, originalIndex: index };
            })
            .filter(item => linkedData[item.peptideId]?.status === 'skipped');
    }, [linkedData, protocol]);

    const needsReconStrategy = useMemo(() => {
        // Check if multiple unique peptide names exist
        const uniquePeptideNames = new Set(
            linkedPeptides.map(p => (p.name || '').toLowerCase().trim()).filter(Boolean)
        );
        return uniquePeptideNames.size > 1;
    }, [linkedPeptides]);

    // Get completion status for sections
    const linkingComplete = useMemo(() => {
        if (!protocol) return false;
        return protocol.peptides.every((p, index) => {
            const peptideId = p.id || `peptide-${index}`;
            const status = linkedData[peptideId]?.status;
            return status === 'linked' || status === 'skipped';
        });
    }, [linkedData, protocol]);

    const deliveryComplete = useMemo(() => {
        if (skippedPeptides.length === 0) return true;
        return skippedPeptides.every(p => {
            const deliveryData = skippedPeptideDeliveryMethods[p.peptideId];
            // No selection = UI default (syringe/subq) which is valid; Start Protocol should be available without toggling
            if (!deliveryData) return true;
            // Pipette needs route, pen needs type+color, nasal is ok as-is
            if (deliveryData.deliveryMethod === 'pipette') return !!deliveryData.administrationRoute;
            if (deliveryData.deliveryMethod === 'pen') return !!deliveryData.penType && !!deliveryData.penColor;
            return true;
        });
    }, [skippedPeptides, skippedPeptideDeliveryMethods]);

    // Validate protocol has required fields
    const protocolValid = useMemo(() => {
        if (!protocol) return false;
        // Must have a name
        if (!protocol.protocolName && !protocol.name) return false;
        // Must have peptides
        if (!protocol.peptides || protocol.peptides.length === 0) return false;
        // All peptides must have names
        if (!protocol.peptides.every(p => p.name)) return false;
        return true;
    }, [protocol]);

    const canStart = linkingComplete && deliveryComplete && protocolValid;

    if (!protocol) return null;

    return (
        <BottomSheet
            open={open}
            onClose={onClose}
            title={`Start Protocol: ${protocol?.protocolName || 'Unnamed'}`}
            theme={theme}
            maxHeight="90vh"
            titleExtra={<AutoSaveIndicator isSaving={isSaving} lastSaved={lastSaved} compact />}
            footer={
                <div className="w-full space-y-2">
                    {/* Warning tip above buttons */}
                        {!canStart && (
                        <div className="text-xs text-center py-1 flex items-center justify-center gap-1" style={{ color: theme.textLight }}>
                            {!linkingComplete && <><AlertTriangle size={12} /> Complete vial linking or skip all peptides</>}
                            {linkingComplete && !deliveryComplete && <><AlertTriangle size={12} /> Set delivery method for skipped peptides</>}
                        </div>
                    )}
                    
                    {/* Two CTAs side by side */}
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose} 
                            className="py-2.5 text-sm font-medium transition-opacity hover:opacity-70" 
                            style={{ 
                                color: theme.textLight || theme.text, 
                                background: 'none',
                                border: 'none',
                                padding: 0
                            }}
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => {
                                // Final validation before starting
                                if (!protocol || !protocol.protocolName && !protocol.name) {
                                    window.dispatchEvent(new CustomEvent('tpp:toast', { 
                                        detail: { message: 'Protocol must have a name', type: 'error' } 
                                    }));
                                    return;
                                }
                                if (!protocol.peptides || protocol.peptides.length === 0) {
                                    window.dispatchEvent(new CustomEvent('tpp:toast', { 
                                        detail: { message: 'Protocol must have at least one peptide', type: 'error' } 
                                    }));
                                    return;
                                }
                                if (!startDate) {
                                    window.dispatchEvent(new CustomEvent('tpp:toast', { 
                                        detail: { message: 'Please select a start date', type: 'error' } 
                                    }));
                                    return;
                                }
                                
                                markAsSubmitted();
                                const enrichedLinkedData = { ...linkedData };
                                const defaultDelivery = { deliveryMethod: 'pipette', administrationRoute: 'subq', penType: '', penColor: '' };
                                skippedPeptides.forEach(p => {
                                    const peptideId = p.peptideId;
                                    if (enrichedLinkedData[peptideId]) {
                                        enrichedLinkedData[peptideId] = {
                                            ...enrichedLinkedData[peptideId],
                                            deliveryMethod: skippedPeptideDeliveryMethods[peptideId] || defaultDelivery
                                        };
                                    }
                                });
                                
                                // Ensure we preserve all protocol data
                                const protocolToStart = {
                                    ...protocol, // Preserve all original protocol data
                                    startDate,
                                    active: true,
                                    linkedItems: enrichedLinkedData
                                };
                                
                                onStart(protocolToStart);
                                onClose();
                            }}
                            disabled={!canStart}
                            className="flex-1 py-2.5 rounded-lg text-sm font-bold transition-all"
                            style={{ 
                                backgroundColor: canStart ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.1)' : theme.secondary), 
                                color: canStart ? '#ffffff' : theme.textLight,
                                opacity: canStart ? 1 : 0.5,
                                cursor: canStart ? 'pointer' : 'not-allowed'
                            }}
                        >
                            Start Protocol
                        </button>
                    </div>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Start Date - Compact Inline */}
                <div className="flex items-center gap-3 py-2">
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Calendar size={16} style={{ color: theme.primary }} />
                        <span className="text-sm font-semibold" style={{ color: theme.text }}>Start</span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <GlassmorphismDatePicker
                            value={startDate}
                            onChange={(dateString) => setStartDate(dateString)}
                            theme={theme}
                            placeholder="Start Date"
                        />
                    </div>
                </div>

                {/* Schedule Preview - Collapsible */}
                <div className="rounded-lg border" style={{ 
                    borderColor: theme.border,
                    backgroundColor: theme.cardBackground 
                }}>
                    <button
                        type="button"
                        onClick={() => toggleSection('preview')}
                        className="w-full p-3 flex items-center justify-between hover:opacity-80 transition-opacity"
                    >
                        <div className="flex items-center gap-2">
                            <Calendar size={18} style={{ color: theme.primary }} />
                            <h4 className="text-sm font-medium" style={{ color: theme.text }}>
                                Schedule Preview
                            </h4>
                        </div>
                        {expandedSections.preview ? (
                            <ChevronDown size={18} style={{ color: theme.textLight }} />
                        ) : (
                            <ChevronRight size={18} style={{ color: theme.textLight }} />
                        )}
                    </button>
                    <div 
                        className="overflow-hidden transition-all duration-300 ease-in-out"
                        style={{
                            maxHeight: expandedSections.preview ? '500px' : '0',
                            opacity: expandedSections.preview ? 1 : 0
                        }}
                    >
                        <div className="px-3 pb-3 pt-2 border-t" style={{ borderColor: theme.border }}>
                            <VisualSchedulePreview 
                                protocol={protocol} 
                                startDate={startDate}
                                theme={theme} 
                                daysToShow={7}
                            />
                        </div>
                    </div>
                </div>

                {/* SECTION 1: Link Vials (Accordion) */}
                <div className="rounded-lg border" style={{ 
                    borderColor: linkingComplete ? `${theme.primary}60` : theme.border,
                    backgroundColor: theme.cardBackground 
                }}>
                    <button
                        type="button"
                        onClick={() => toggleSection('linking')}
                        className="w-full p-4 flex items-center justify-between hover:opacity-80 transition-opacity"
                    >
                        <div className="flex items-center gap-3 flex-1">
                            {linkingComplete ? (
                                <Check size={24} style={{ color: theme.primary }} className="flex-shrink-0" />
                            ) : (
                                <TestTubes size={24} style={{ color: theme.primary }} className="flex-shrink-0" />
                            )}
                            <div className="flex flex-col gap-0.5 flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-base font-semibold" style={{ color: theme.text }}>
                                        Link Vials to Protocol
                                    </h4>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider" style={{ 
                                        backgroundColor: linkingComplete ? `${theme.primary}20` : theme.secondary, 
                                        color: linkingComplete ? theme.primary : theme.textLight 
                                    }}>
                                        {linkingComplete ? 'Complete' : 'Optional'}
                                    </span>
                                </div>
                                {!expandedSections.linking && (
                                    <span className="text-[10px] font-medium" style={{ color: theme.textLight }}>
                                        {linkingComplete 
                                            ? `${Object.values(linkedData).filter(d => d.status === 'linked').length} vials linked, ${skippedPeptides.length} skipped`
                                            : 'Click to link vials from stockpile or skip for manual tracking'
                                        }
                                    </span>
                                )}
                            </div>
                        </div>
                        {expandedSections.linking ? (
                            <ChevronDown size={20} style={{ color: theme.textLight }} />
                        ) : (
                            <ChevronRight size={20} style={{ color: theme.textLight }} />
                        )}
                    </button>

                    {/* Linking Content */}
                    <div 
                        className="overflow-hidden transition-all duration-300 ease-in-out"
                        style={{
                            maxHeight: expandedSections.linking ? '2000px' : '0',
                            opacity: expandedSections.linking ? 1 : 0
                        }}
                    >
                        <div className="px-4 pb-4 pt-2 border-t space-y-3" style={{ borderColor: theme.border }}>
                            <div 
                                className="text-xs text-center py-2 px-3 rounded-lg"
                                style={{ 
                                    backgroundColor: `${theme.info || theme.primary}10`,
                                    color: theme.textLight
                                }}
                            >
                                Select a vial from your stockpile, add new, or skip this section.
                            </div>
                            
                            {/* Quick Skip All Button */}
                            {!linkingComplete && (
                                <button
                                    onClick={handleSkipAllVials}
                                    className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 mb-3"
                                    style={{ 
                                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.secondary, 
                                        color: theme.text,
                                        border: `1px dashed ${theme.isDark ? 'rgba(255,255,255,0.12)' : theme.border}`
                                    }}
                                >
                                    <X size={14} className="inline mr-1" />
                                    {protocol.peptides.length === 1 ? 'Skip Linking' : 'Skip All - Track Manually'}
                                </button>
                            )}
                            
                            <div className="space-y-3">
                                {protocol.peptides.map((p, index) => {
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
                                            onEditVial={handleEditVial}
                                            onSkip={handleSkipPeptide}
                                            onUnlink={handleUnlinkPeptide}
                                            theme={theme}
                                            isSinglePeptide={protocol.peptides.length === 1}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* SECTION 2: Reconstitute (Accordion - Only if vials linked) */}
                {linkedPeptides.length > 0 && (
                    <div className="rounded-lg border" style={{ 
                        borderColor: reconComplete ? `${theme.primary}60` : theme.border,
                        backgroundColor: theme.cardBackground 
                    }}>
                        <button
                            type="button"
                            onClick={() => toggleSection('recon')}
                            className="w-full p-4 flex items-center justify-between hover:opacity-80 transition-opacity"
                        >
                            <div className="flex items-center gap-3 flex-1">
                                {reconComplete ? (
                                    <Check size={24} style={{ color: theme.primary }} className="flex-shrink-0" />
                                ) : (
                                    <Beaker size={24} style={{ color: theme.primary }} className="flex-shrink-0" />
                                )}
                            <div className="flex flex-col gap-0.5 flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-base font-semibold" style={{ color: theme.text }}>
                                        Reconstitute Vials
                                    </h4>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider" style={{ 
                                            backgroundColor: reconComplete ? `${theme.primary}20` : theme.secondary, 
                                            color: reconComplete ? theme.primary : theme.textLight 
                                        }}>
                                            {reconComplete ? 'Complete' : 'Optional'}
                                        </span>
                                    </div>
                                    {!expandedSections.recon && (
                                        <span className="text-[10px] font-medium" style={{ color: theme.textLight }}>
                                            {reconComplete 
                                                ? `Reconstitution calculated for ${linkedPeptides.length} vial(s)`
                                                : 'Click to use recon calculator or skip'
                                            }
                                        </span>
                                    )}
                                </div>
                            </div>
                            {expandedSections.recon ? (
                                <ChevronDown size={20} style={{ color: theme.textLight }} />
                            ) : (
                                <ChevronRight size={20} style={{ color: theme.textLight }} />
                            )}
                        </button>

                        {/* Recon Content */}
                        <div 
                            className="overflow-hidden transition-all duration-300 ease-in-out"
                            style={{
                                maxHeight: expandedSections.recon ? '3000px' : '0',
                                opacity: expandedSections.recon ? 1 : 0
                            }}
                        >
                            <div className="px-4 pb-4 pt-2 border-t space-y-3" style={{ borderColor: theme.border }}>
                                {/* Skip Button at Top */}
                                <button
                                    onClick={() => {
                                        setReconComplete(false);
                                        setExpandedSections(prev => ({ ...prev, recon: false }));
                                    }}
                                    className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
                                    style={{ 
                                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.secondary, 
                                        color: theme.text,
                                        border: `1px dashed ${theme.isDark ? 'rgba(255,255,255,0.12)' : theme.border}`
                                    }}
                                >
                                    <X size={14} className="inline mr-1" />
                                    Skip - I'll do this later
                                </button>
                                
                                {/* Recon Strategy Selection (if needed) */}
                                {needsReconStrategy && !reconStrategy && (
                                    <div className="space-y-2">
                                        <p className="text-sm text-center italic" style={{ color: theme.textLight }}>
                                            You have multiple peptides. Mix them or keep separate?
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { key: 'separate', name: 'Separately', icon: Ungroup, description: 'Individual vials' },
                                                { key: 'blended', name: 'Blended', icon: Blend, description: 'Mixed together' }
                                            ].map(option => {
                                                const Icon = option.icon;
                                                return (
                                                    <button
                                                        key={option.key}
                                                        type="button"
                                                        onClick={() => setReconStrategy(option.key)}
                                                        className="flex flex-col items-center justify-center p-3 rounded-lg transition-all"
                                                        style={{
                                                            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                                                            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`,
                                                            color: theme.text
                                                        }}
                                                    >
                                                        <Icon size={18} />
                                                        <span className="text-xs font-medium mt-1">{option.name}</span>
                                                        <span className="text-xs opacity-60">{option.description}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Recon Calculator (if strategy selected or only one peptide) */}
                                {(reconStrategy || linkedPeptides.length === 1) && (
                                    <div className="mt-3">
                                        <ReconCalculatorPanel
                                            theme={theme}
                                            prefill={{
                                                peptides: linkedPeptides.map((p, index) => {
                                                    const peptideId = p.id || `peptide-${index}`;
                                                    const vialId = linkedData[peptideId]?.vialId;
                                                    const vial = stockpile.find(item => item.id === vialId);
                                                    if (!vial) return { id: peptideId, name: p.name, mg: '', dose: '', doseUnit: 'mcg', stockpileId: null, quantityUsed: 1 };
                                                    // Cost per vial: stockpile stores cost per priceUnit; when priceUnit is 'vial', use as-is
                                                    const vialPriceUnit = (vial.priceUnit || 'vial').toLowerCase();
                                                    const rawCost = Number(vial.cost) || 0;
                                                    const quantity = Number(vial.quantity) || 1;
                                                    const singleVialCost = (vialPriceUnit === 'vial') ? rawCost : (quantity > 0 ? rawCost / quantity : 0);
                                                    // Dose: use phase 1 (first titration) or fixed dosage; match unit (mcg, mg, IU, etc.)
                                                    const firstPhase = p.titration?.[0];
                                                    const doseAmount = firstPhase?.dose ?? p.dosage?.amount;
                                                    const doseUnit = (firstPhase?.doseUnit || p.dosage?.unit || 'mcg').trim() || 'mcg';
                                                    const doseStr = (doseAmount != null && doseAmount !== '') ? String(doseAmount) : '';
                                                    return {
                                                        id: peptideId, 
                                                        name: p.name, 
                                                        mg: vial.mg,
                                                        mgUnit: vial.mgUnit || 'mg',
                                                        dose: doseStr, 
                                                        doseUnit,
                                                        cost: singleVialCost, 
                                                        costPerMg: vial.costPerMg || '',
                                                        vendor: vial.vendor,
                                                        stockpileId: vial.id,
                                                        quantityUsed: 1,
                                                        unit: vial.unit,
                                                        orderId: vial.orderId || null,
                                                        documentation: vial.documentation || []
                                                    };
                                                }),
                                                protocolName: protocol.protocolName,
                                                reconStrategy: reconStrategy || 'separate'
                                            }}
                                            noCard={true}
                                            reconStrategy={reconStrategy || 'separate'}
                                            allowRemovePeptide={false}
                                            allowAddPeptide={false}
                                            hideHeader={true}
                                            inlineVendorDate={true}
                                            onSave={(reconData) => {
                                                const newReconId = `recon-${generateId()}`;
                                                const peptidesWithDetails = reconData.peptides.map(p => {
                                                    const originalPrefill = linkedPeptides.find(lp => {
                                                        const lpId = lp.id || `peptide-${linkedPeptides.indexOf(lp)}`;
                                                        return lpId === p.id;
                                                    });
                                                    const peptideId = originalPrefill?.id || p.id;
                                                    const vial = stockpile.find(item => item.id === linkedData[peptideId]?.vialId);
                                                    const vialPriceUnit = vial ? (vial.priceUnit || 'vial').toLowerCase() : 'vial';
                                                    const rawCost = vial ? Number(vial.cost) || 0 : 0;
                                                    const quantity = vial ? Number(vial.quantity) || 1 : 1;
                                                    const cost = (vialPriceUnit === 'vial') ? rawCost : (quantity > 0 ? rawCost / quantity : 0);
                                                    return { 
                                                        ...p, 
                                                        cost, 
                                                        vendor: vial?.vendor || '', 
                                                        stockpileId: p.stockpileId || vial?.id || null,
                                                        quantityUsed: p.quantityUsed || 1
                                                    };
                                                });

                                                const newReconItem = { 
                                                    ...reconData, 
                                                    id: newReconId, 
                                                    name: `${protocol.protocolName} (${reconStrategy || 'separate'})`,
                                                    reconStrategy: reconStrategy || 'separate',
                                                    peptides: peptidesWithDetails,
                                                    date: new Date().toISOString()
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
                                                setReconComplete(true);
                                                setExpandedSections(prev => ({ ...prev, recon: false }));
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* SECTION 3: Delivery Method for Skipped Peptides (Accordion) - Always visible */}
                <div className="rounded-lg border" style={{ 
                    borderColor: deliveryComplete ? `${theme.primary}60` : theme.border,
                    backgroundColor: theme.cardBackground,
                    opacity: linkingComplete ? 1 : 0.5
                }}>
                    <button
                        type="button"
                        onClick={() => {
                            if (linkingComplete) {
                                toggleSection('delivery');
                            }
                        }}
                        disabled={!linkingComplete}
                        className="w-full p-4 flex items-center justify-between transition-opacity"
                        style={{
                            cursor: linkingComplete ? 'pointer' : 'not-allowed',
                            opacity: linkingComplete ? 1 : 0.5
                        }}
                    >
                            <div className="flex items-center gap-3 flex-1">
                                {deliveryComplete ? (
                                    <Check size={24} style={{ color: theme.primary }} className="flex-shrink-0" />
                                ) : (
                                    <Droplets size={24} style={{ color: theme.primary }} className="flex-shrink-0" />
                                )}
                            <div className="flex flex-col gap-0.5 flex-1 text-left">
                                <div className="flex items-center gap-2">
                                    <h4 className="text-base font-semibold" style={{ color: theme.text }}>
                                        Delivery Method
                                    </h4>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wider" style={{ 
                                            backgroundColor: deliveryComplete ? `${theme.primary}20` : `${theme.primary}40`, 
                                            color: deliveryComplete ? theme.primary : theme.text 
                                        }}>
                                            {deliveryComplete ? 'Complete' : 'Required'}
                                        </span>
                                    </div>
                                    {!expandedSections.delivery && (
                                        <span className="text-[10px] font-medium" style={{ color: theme.textLight }}>
                                            {!linkingComplete 
                                                ? 'Complete vial linking first'
                                                : skippedPeptides.length === 0
                                                    ? 'All peptides linked - no delivery method needed'
                                                    : deliveryComplete 
                                                        ? `${skippedPeptides.length} peptide(s) configured`
                                                        : `${skippedPeptides.length} skipped peptide(s) need delivery method`
                                            }
                                        </span>
                                    )}
                                </div>
                            </div>
                            {expandedSections.delivery ? (
                                <ChevronDown size={20} style={{ color: theme.textLight }} />
                            ) : (
                                <ChevronRight size={20} style={{ color: theme.textLight }} />
                            )}
                        </button>

                        {/* Delivery Content */}
                        <div 
                            className="overflow-hidden transition-all duration-300 ease-in-out"
                            style={{
                                maxHeight: expandedSections.delivery && linkingComplete ? '3000px' : '0',
                                opacity: expandedSections.delivery && linkingComplete ? 1 : 0
                            }}
                        >
                            <div className="px-4 pb-4 pt-2 border-t space-y-4" style={{ borderColor: theme.border }}>
                                {!linkingComplete ? (
                                    <p className="text-sm text-center italic mb-2" style={{ color: theme.textLight }}>
                                        Complete vial linking or skip all peptides to configure delivery methods
                                    </p>
                                ) : skippedPeptides.length === 0 ? (
                                    <div 
                                        className="text-xs text-center py-2 px-3 rounded-lg"
                                        style={{ 
                                            backgroundColor: `${theme.info || theme.primary}10`,
                                            color: theme.textLight
                                        }}
                                    >
                                        All peptides are linked to vials. No delivery method configuration needed.
                                    </div>
                                ) : (
                                    skippedPeptides.map((p) => {
                                    const peptideId = p.peptideId;
                                    const deliveryData = skippedPeptideDeliveryMethods[peptideId] || {
                                        deliveryMethod: 'pipette',
                                        administrationRoute: 'subq',
                                        penType: '',
                                        penColor: ''
                                    };
                                    
                                    return (
                                        <div key={peptideId} className="p-3 rounded-lg space-y-3" style={{ 
                                            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
                                            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
                                        }}>
                                            <h5 className="font-semibold text-sm pb-2 border-b" style={{ color: theme.text, borderColor: theme.border }}>
                                                {p.name}
                                            </h5>
                                            
                                            {/* Delivery Method Selection */}
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-[0.15em] opacity-40 mb-2" style={{ color: theme.text }}>
                                                    Delivery Method
                                                </label>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {[
                                                        { key: 'pipette', icon: Pipette, label: 'Syringe' },
                                                        { key: 'pen', icon: Pen, label: 'Pen' },
                                                        { key: 'nasal', icon: Droplets, label: 'Nasal' }
                                                    ].map(method => {
                                                        const Icon = method.icon;
                                                        const isSelected = deliveryData.deliveryMethod === method.key;
                                                        return (
                                                            <button
                                                                key={method.key}
                                                                onClick={() => {
                                                                    setSkippedPeptideDeliveryMethods(prev => ({
                                                                        ...prev,
                                                                        [peptideId]: {
                                                                            ...deliveryData,
                                                                            deliveryMethod: method.key
                                                                        }
                                                                    }));
                                                                }}
                                                                className="flex flex-col items-center justify-center gap-1 p-3 rounded-lg border transition-all"
                                                                style={{
                                                                    backgroundColor: isSelected ? theme.primary : (theme.isDark ? 'rgba(255,255,255,0.06)' : theme.secondary),
                                                                    color: isSelected ? '#ffffff' : theme.text,
                                                                    borderColor: isSelected ? theme.primary : theme.border
                                                                }}
                                                            >
                                                                <Icon size={16} />
                                                                <span className="text-xs font-semibold">{method.label}</span>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                            
                                            {/* Administration Route for Syringe */}
                                            {deliveryData.deliveryMethod === 'pipette' && (
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-[0.15em] opacity-40 mb-2" style={{ color: theme.text }}>
                                                        Route
                                                    </label>
                                                    <div className="flex gap-1 p-1 rounded-lg" style={{ 
                                                        backgroundColor: theme.isDark ? 'rgba(0,0,0,0.2)' : '#ffffff',
                                                        boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'
                                                    }}>
                                                        {['subq', 'im', 'iv'].map(route => {
                                                            const isSelected = deliveryData.administrationRoute === route;
                                                            return (
                                                                <button
                                                                    key={route}
                                                                    onClick={() => {
                                                                        setSkippedPeptideDeliveryMethods(prev => ({
                                                                            ...prev,
                                                                            [peptideId]: {
                                                                                ...deliveryData,
                                                                                administrationRoute: route
                                                                            }
                                                                        }));
                                                                    }}
                                                                    className="flex-1 py-2 rounded text-xs font-bold uppercase transition-all"
                                                                    style={{
                                                                        backgroundColor: isSelected ? theme.primary : 'transparent',
                                                                        color: isSelected ? '#ffffff' : theme.text
                                                                    }}
                                                                >
                                                                    {route.toUpperCase()}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                            
                                            {/* Pen Details */}
                                            {deliveryData.deliveryMethod === 'pen' && (
                                                <div className="grid grid-cols-2 gap-3">
                                                    {/* Pen Type */}
                                                    <div className="relative" ref={el => penTypeDropdownRefs.current[peptideId] = el}>
                                                        <label className="block text-[10px] font-black uppercase tracking-[0.15em] opacity-40 mb-2" style={{ color: theme.text }}>
                                                            Pen Type
                                                        </label>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setPenTypeDropdownOpen(prev => ({
                                                    ...prev,
                                                    [peptideId]: !prev[peptideId]
                                                }));
                                            }}
                                            className="w-full px-3 py-2 text-sm border rounded-lg flex items-center justify-between transition-all relative z-20"
                                            style={{
                                                borderColor: penTypeDropdownOpen[peptideId] ? theme.primary : theme.border,
                                                backgroundColor: theme.cardBackground,
                                                color: deliveryData.penType ? theme.text : theme.textLight
                                            }}
                                                        >
                                                            <span>
                                                                {deliveryData.penType ? (
                                                                    deliveryData.penType === 'bird-pen' ? 'Bird Pen' : 
                                                                    deliveryData.penType === 'v1' ? 'V1' : 
                                                                    deliveryData.penType === 'v2' ? 'V2' : 
                                                                    deliveryData.penType === 'v3' ? 'V3' : 
                                                                    deliveryData.penType.charAt(0).toUpperCase() + deliveryData.penType.slice(1)
                                                                ) : 'Select pen type'}
                                                            </span>
                                                            <ChevronDown 
                                                                size={16} 
                                                                className={`transition-transform duration-200 ${penTypeDropdownOpen[peptideId] ? 'rotate-180' : ''}`}
                                                                style={{ color: theme.textLight }}
                                                            />
                                                        </button>
                                                        {penTypeDropdownOpen[peptideId] && (
                                                            <div 
                                                                className="absolute z-[9999] w-full mt-1 rounded-lg shadow-lg border overflow-hidden"
                                                                style={{
                                                                    backgroundColor: theme.isDark ? 'rgba(30,30,40,0.95)' : '#ffffff',
                                                                    borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : theme.border,
                                                                    boxShadow: '0 10px 25px rgba(0,0,0,0.3)'
                                                                }}
                                                            >
                                                                {[
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
                                                                            onClick={(e) => {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                setSkippedPeptideDeliveryMethods(prev => ({
                                                                                    ...prev,
                                                                                    [peptideId]: {
                                                                                        ...deliveryData,
                                                                                        penType: option.value
                                                                                    }
                                                                                }));
                                                                                setPenTypeDropdownOpen(prev => ({
                                                                                    ...prev,
                                                                                    [peptideId]: false
                                                                                }));
                                                                            }}
                                                                            className="w-full text-left px-3 py-2 text-sm transition-all"
                                                                            style={{
                                                                                color: deliveryData.penType === option.value ? theme.primary : theme.text,
                                                                                backgroundColor: 'transparent'
                                                                            }}
                                                                            onMouseEnter={(e) => {
                                                                                e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                                                                e.currentTarget.style.color = theme.primary;
                                                                            }}
                                                                            onMouseLeave={(e) => {
                                                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                                                e.currentTarget.style.color = deliveryData.penType === option.value ? theme.primary : theme.text;
                                                                            }}
                                                                        >
                                                                            {option.label}
                                                                        </button>
                                                                    </React.Fragment>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Pen Color */}
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-[0.15em] opacity-40 mb-2" style={{ color: theme.text }}>
                                                            Pen Color
                                                        </label>
                                                        <ColorSwatchDropdown
                                                            value={penColors.find(p => p.name === deliveryData.penColor)?.hex || '#9ca3af'}
                                                            onChange={(hex) => {
                                                                const selectedColor = penColors.find(p => p.hex === hex);
                                                                if (selectedColor) {
                                                                    setSkippedPeptideDeliveryMethods(prev => ({
                                                                        ...prev,
                                                                        [peptideId]: {
                                                                            ...deliveryData,
                                                                            penColor: selectedColor.name
                                                                        }
                                                                    }));
                                                                }
                                                            }}
                                                            colors={penColors}
                                                            theme={theme}
                                                            placeholder="Select color"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
            </div>
        </BottomSheet>
    );
}
