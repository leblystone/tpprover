import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { ChevronRight, ChevronsRight, Info, CheckCircle } from 'lucide-react';
import SearchableDropdown from '../common/SearchableDropdown';
import { ReconCalculatorPanel, penColors } from '../recon/ReconCalculatorPanel';
import { formatMMDDYYYY } from '../../utils/date';
import TextInput from '../common/inputs/TextInput';
import VendorSuggestInput from '../vendors/VendorSuggestInput';


const PeptideLinkerRow = ({ peptide, stockpile, linkedVialId, onSelectVial, onSaveNew, onSkip, onUnlink, theme }) => {
    const [action, setAction] = useState(null); // 'select', 'add'
    const [quickAddForm, setQuickAddForm] = useState({ mg: '', quantity: '1', vendor: '' });

    const vialOptions = useMemo(() => {
        return stockpile
            .filter(item => (item.name || '').toLowerCase() === (peptide.name || '').toLowerCase())
            .map(item => {
                const cost = Number(item.cost) || 0;
                const quantity = Number(item.quantity) || 1;
                const costPerVial = quantity > 0 ? (cost / quantity).toFixed(2) : '0.00';
                return { value: item.id, label: `${item.mg}mg from ${item.vendor} - $${costPerVial} per vial` };
            });
    }, [stockpile, peptide]);

    const handleSaveNew = () => {
        onSaveNew(peptide.id, { ...quickAddForm, name: peptide.name });
        setAction(null);
    };

    const isSkipped = linkedVialId === 'skipped';

    if (linkedVialId && !isSkipped) {
        const selectedVial = stockpile.find(item => item.id === linkedVialId);
        return (
            <div className="p-3 rounded-md border-2" style={{ borderColor: theme.primary }}>
                 <div className="flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-sm" style={{ color: theme.text }}>{peptide.name}</p>
                        <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                            {selectedVial ? `Linked: ${selectedVial.mg}mg from ${selectedVial.vendor}` : 'Linked'}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" style={{ color: theme.primary }} />
                        <button onClick={() => onUnlink(peptide.id)} className="text-xs text-gray-400 hover:text-gray-600 hover:underline">Unlink</button>
                    </div>
                </div>
            </div>
        );
    }

    if (isSkipped) {
        return (
            <div className="p-3 rounded-md border-2 bg-gray-50" style={{ borderColor: theme.border }}>
                 <div className="flex items-center justify-between">
                    <div>
                        <p className="font-semibold text-sm" style={{ color: theme.text }}>{peptide.name}</p>
                        <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                            Skipped. This peptide will not be reconstituted.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => onUnlink(peptide.id)} className="text-xs text-gray-400 hover:text-gray-600 hover:underline">Undo</button>
                    </div>
                </div>
            </div>
        );
    }

    if (action === 'select') {
        return (
            <div className="p-3 rounded-md border" style={{ borderColor: theme.border }}>
                <p className="font-semibold text-sm mb-2" style={{ color: theme.text }}>{peptide.name}</p>
                <SearchableDropdown
                    options={vialOptions}
                    onChange={(vialId) => onSelectVial(peptide.id, vialId)}
                    theme={theme}
                    placeholder="Select a vial..."
                />
                <button onClick={() => setAction(null)} className="text-xs text-gray-500 mt-2 hover:underline">Cancel</button>
            </div>
        );
    }
    
    if (action === 'add') {
         return (
            <div className="p-3 rounded-md border bg-gray-50/50" style={{ borderColor: theme.border }}>
                <p className="font-semibold text-sm mb-2" style={{ color: theme.text }}>Add {peptide.name} to Stockpile</p>
                <div className="space-y-2">
                    <TextInput label="mg (per vial)" value={quickAddForm.mg} onChange={v => setQuickAddForm(f => ({...f, mg: v}))} theme={theme} placeholder="e.g., 10" />
                    <TextInput label="Quantity (vials)" value={quickAddForm.quantity} onChange={v => setQuickAddForm(f => ({...f, quantity: v}))} theme={theme} placeholder="e.g., 1" />
                    <VendorSuggestInput label="Vendor" value={quickAddForm.vendor} onChange={v => setQuickAddForm(f => ({...f, vendor: v}))} theme={theme} />
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                     <button onClick={() => setAction(null)} className="px-3 py-1.5 text-xs rounded-md border" style={{ borderColor: theme.border }}>Cancel</button>
                     <button onClick={handleSaveNew} className="px-3 py-1.5 text-xs rounded-md" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>Save & Link</button>
                </div>
            </div>
        );
    }
    
    // Default view with choices
    return (
        <div className="p-3 rounded-md border flex items-center justify-between" style={{ borderColor: theme.border }}>
            <p className="font-semibold text-sm" style={{ color: theme.text }}>{peptide.name}</p>
            <div className="flex items-center gap-2">
                <button onClick={() => onSkip(peptide.id)} className="px-3 py-1.5 text-xs rounded-md border" style={{ borderColor: theme.border }}>Skip</button>
                <button onClick={() => setAction('add')} className="px-3 py-1.5 text-xs rounded-md border" style={{ borderColor: theme.border }}>Add New</button>
                <button onClick={() => setAction('select')} className="px-3 py-1.5 text-xs rounded-md" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>Select Vial</button>
            </div>
        </div>
    );
};


export default function StartProtocolWizard({ open, onClose, protocol, stockpile, setStockpile, theme, onStart }) {
    const [stage, setStage] = useState('linking'); // linking, recon_strategy, reconstituting, confirm
    const [linkedData, setLinkedData] = useState({});
    const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0,10));
    const [reconStrategy, setReconStrategy] = useState(null); // 'separate' | 'blended'

    useEffect(() => {
        if (open && protocol) {
            setStage('linking');
            const initialData = protocol.peptides.reduce((acc, p) => {
                acc[p.id] = { status: 'pending' };
                return acc;
            }, {});
            setLinkedData(initialData);
            setReconStrategy(null);
        }
    }, [open, protocol]);

    const handleSelectVial = (peptideId, vialId) => {
        setLinkedData(prev => ({ ...prev, [peptideId]: { status: 'linked', vialId } }));
    };

    const handleUnlinkPeptide = (peptideId) => {
        setLinkedData(prev => ({ ...prev, [peptideId]: { status: 'pending' } }));
    };

    const handleSkipPeptide = (peptideId) => {
        setLinkedData(prev => ({ ...prev, [peptideId]: { status: 'skipped' } }));
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

        // Now link it
        setLinkedData(prev => ({ ...prev, [peptideId]: { status: 'linked', vialId: newItem.id } }));
    };

    const handleContinue = () => {
        const linkedPeptides = protocol.peptides.filter(p => linkedData[p.id]?.status === 'linked');
        
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
                <h3 className="font-semibold text-lg" style={{ color: theme.text }}>Link Peptides to Your Stockpile</h3>
                <p className="text-sm mt-1 mb-4" style={{ color: theme.textLight }}>For each peptide in your protocol, select a vial from your stockpile, add a new one, or skip.</p>
                <div className="space-y-3">
                    {protocol.peptides.map(p => (
                        <PeptideLinkerRow
                            key={p.id}
                            peptide={p}
                            stockpile={stockpile}
                            linkedVialId={linkedData[p.id]?.status === 'linked' ? linkedData[p.id].vialId : (linkedData[p.id]?.status === 'skipped' ? 'skipped' : null)}
                            onSelectVial={handleSelectVial}
                            onSaveNew={handleSaveNewAndLink}
                            onSkip={handleSkipPeptide}
                            onUnlink={handleUnlinkPeptide}
                            theme={theme}
                        />
                    ))}
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
        return protocol.peptides.filter(p => linkedData[p.id]?.status === 'linked');
    }, [linkedData, protocol]);

    const renderReconStrategyStep = () => {
        return (
            <div>
                <h3 className="font-semibold text-lg" style={{ color: theme.text }}>Reconstitution Strategy</h3>
                <p className="text-sm mt-4" style={{ color: theme.textLight }}>
                    You've linked {linkedPeptides.length} peptide(s). How would you like to reconstitute them?
                </p>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button 
                        onClick={() => { setReconStrategy('separate'); setStage('reconstituting'); }}
                        className="p-4 border rounded-lg text-left hover:bg-gray-50"
                        style={{ borderColor: theme.border }}
                    >
                        <h4 className="font-semibold" style={{ color: theme.text }}>Separately</h4>
                        <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                            Reconstitute each peptide in its own vial. You'll use the calculator for each one.
                        </p>
                    </button>
                    <button 
                        onClick={() => { setReconStrategy('blended'); setStage('reconstituting'); }}
                        className="p-4 border rounded-lg text-left hover:bg-gray-50"
                        style={{ borderColor: theme.border }}
                    >
                        <h4 className="font-semibold" style={{ color: theme.text }}>Blended</h4>
                        <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                            Combine all selected peptides into a single vial. You'll use the calculator once.
                        </p>
                    </button>
                </div>
                 <div className="mt-4 text-center">
                     <button onClick={() => setStage('confirm')} className="text-sm text-gray-500 hover:underline">
                        Skip reconstitution
                    </button>
                </div>
            </div>
        );
    };
    
    const renderReconstitutingStep = () => {
         const prefill = {
            peptides: linkedPeptides.map(p => {
                const vialId = linkedData[p.id].vialId;
                const vial = stockpile.find(item => item.id === vialId);
                if (!vial) return { id: p.id, name: p.name, mg: '', dose: '' };
                const cost = Number(vial.cost) || 0;
                const quantity = Number(vial.quantity) || 1;
                const costPerVial = quantity > 0 ? cost / quantity : 0;
                return {
                    id: p.id, name: p.name, mg: vial.mg,
                    dose: p.dosage?.amount || '', doseUnit: p.dosage?.unit || 'mcg',
                    cost: costPerVial, vendor: vial.vendor,
                };
            }),
            protocolName: protocol.protocolName,
            reconStrategy: reconStrategy
        };
        return (
             <div>
                <h3 className="font-semibold text-lg" style={{ color: theme.text }}>Reconstitute for {protocol.protocolName}</h3>
                <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                    You've chosen a <span className="font-semibold">{reconStrategy}</span> strategy. Please confirm the details below.
                </p>
                <div className="mt-4">
                    <ReconCalculatorPanel
                        theme={theme}
                        prefill={prefill}
                        onSave={(reconData) => {
                            const newReconId = `recon-${Date.now()}`;

                            // We need to enrich the peptides with their original vial cost for accurate history
                            const peptidesWithDetails = reconData.peptides.map(p => {
                                const originalPrefill = prefill.peptides.find(pref => pref.id === p.id);
                                return { ...p, cost: originalPrefill?.cost || 0, vendor: originalPrefill?.vendor || '' };
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
                            let updatedLinkedData = { ...linkedData };
                            linkedPeptides.forEach(p => {
                                updatedLinkedData[p.id] = { ...updatedLinkedData[p.id], reconId: newReconId };
                            });
                            setLinkedData(updatedLinkedData);
                            setStage('confirm');
                        }}
                    />
                </div>
            </div>
        );
    };

     const renderConfirmStep = () => {
        return (
             <div>
                <h3 className="font-semibold text-lg" style={{ color: theme.text }}>Confirm Protocol Start</h3>
                <p className="text-sm mt-2 mb-4" style={{ color: theme.textLight }}>Review the details below and confirm to start your protocol.</p>
                <div className="space-y-3">
                    <label className="block text-sm font-medium" style={{ color: theme.text }}>
                        Start Date
                        <input type="date" className="mt-1 p-2 rounded border w-full bg-gray-50" value={startDate} onChange={e => setStartDate(e.target.value)} style={{ borderColor: theme.border }} />
                    </label>
                    <div className="text-xs text-gray-500">
                        This will schedule <span className="font-semibold">{protocol.protocolName}</span> on your calendar.
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={onClose} className="px-4 py-2 rounded-md border text-sm" style={{ borderColor: theme.border }}>Cancel</button>
                    <button 
                        onClick={() => onStart({ ...protocol, startDate, active: true, linkedItems: linkedData })}
                        className="px-4 py-2 rounded-md text-sm" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                    >
                        Confirm & Start Protocol
                    </button>
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
            maxWidth="max-w-2xl"
        >
            {renderContent()}
        </Modal>
    );
}
