import React, { useState, useEffect, useMemo } from 'react'
import Modal from '../common/Modal'
import { ReconCalculatorPanel } from './ReconCalculatorPanel'
import { useAppContext } from '../../context/AppContext'
import VendorSuggestInput from '../vendors/VendorSuggestInput'
import TextInput from '../common/inputs/TextInput'
import CombinedDosageInput from '../common/inputs/CombinedDosageInput'
import CustomDropdown from '../common/inputs/CustomDropdown'
import ColorSwatchDropdown from '../common/inputs/ColorSwatchDropdown'
import VialLabelPreview from './VialLabelPreview'
import { calculateRecon, getChromeGradient } from '../../utils/recon'
import { Droplet, Info, Plus, Trash2, FilePlus, Pen, Syringe, Droplets } from 'lucide-react'

export const penColors = [
    { name: 'Gold', hex: '#DAA520' },
    { name: 'Silver', hex: '#C0C0C0' },
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Hot Pink', hex: '#FF69B4' },
    { name: 'Light Pink', hex: '#FFB6C1' },
    { name: 'Dark Blue', hex: '#00008B' },
    { name: 'Light Blue', hex: '#ADD8E6' },
    { name: 'Teal', hex: '#008080' },
    { name: 'Lime Green', hex: '#32CD32' },
    { name: 'Brown', hex: '#8B4513' },
    { name: 'Red', hex: '#CC0000' },
    { name: 'Burgundy', hex: '#800000' },
    { name: 'Purple', hex: '#800080' },
];

export default function ReconCalculatorModal({ open, onClose, theme, prefill }) {
  const { setReconItems, vendors } = useAppContext();
  const [form, setForm] = useState({ vendor: '', water: '', peptides: [{ id: 1, name: '', mg: '', dose: '', doseUnit: 'mcg' }] });
  const [deliveryMethod, setDeliveryMethod] = useState('syringe');
  const [administrationRoute, setAdministrationRoute] = useState('subq'); // SubQ, IM, IV
  const [penType, setPenType] = useState('');
  const [penColor, setPenColor] = useState('Silver');
  const [cost, setCost] = useState('');

  useEffect(() => {
    if (open) {
        // Reset form when modal opens, but apply prefill if it exists
        const initialForm = { vendor: '', water: '', peptides: [{ id: 1, name: '', mg: '', dose: '', doseUnit: 'mcg' }] };
        setCost('');
        setDeliveryMethod('syringe');
        setPenType('');
        setPenColor('Silver');

        if (prefill) {
            if (prefill.peptides && prefill.peptides.length > 0) {
                const vendors = [...new Set(prefill.peptides.map(p => p.vendor).filter(Boolean))].join(', ');
                const totalCost = prefill.peptides.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
                
                initialForm.vendor = vendors;
                initialForm.peptides = prefill.peptides.map(pep => ({ ...pep, doseUnit: pep.doseUnit || 'mcg' }));
                setCost(String(totalCost));
            } else if (prefill.peptide) {
                const p = { id: 1, name: prefill.peptide || '', mg: prefill.mg || '', dose: '', doseUnit: 'mcg' };
                initialForm.vendor = prefill.vendor || '';
                initialForm.peptides = [p];
                setCost(prefill.cost || '');
            }
            try { localStorage.removeItem('tpprover_recon_prefill') } catch {}
        }
        setForm(initialForm);
    }
  }, [open, prefill]);

  const totalMg = useMemo(() => form.peptides.reduce((sum, p) => sum + (Number(p.mg) || 0), 0), [form.peptides]);
  const calc = useMemo(() => {
    // For multi-peptide calculations, we need to handle each dose unit properly
    // We'll calculate based on the first peptide's dose unit and value
    const firstPeptide = form.peptides[0];
    if (!firstPeptide || !firstPeptide.dose) {
      return { unitsPerDose: 0, dosesPerVial: 0, concentration: 0 };
    }
    
    return calculateRecon({ 
      mg: totalMg, 
      water: form.water, 
      dose: firstPeptide.dose,
      doseUnit: firstPeptide.doseUnit || 'mcg'
    });
  }, [totalMg, form.water, form.peptides]);
  const costPerDose = useMemo(() => {
    if (cost && calc.dosesPerVial > 0) return `$${(Number(cost) / calc.dosesPerVial).toFixed(2)}`;
    return '';
  }, [cost, calc.dosesPerVial]);

  const addPeptide = () => {
    const newId = Math.max(0, ...form.peptides.map(p => p.id)) + 1;
    setForm(prev => ({...prev, peptides: [...prev.peptides, { id: newId, name: '', mg: '', dose: '', doseUnit: 'mcg' }]}));
  }

  const updatePeptide = (id, key, value) => {
    setForm(prev => ({
        ...prev,
        peptides: prev.peptides.map(p => p.id === id ? { ...p, [key]: value } : p)
    }));
  }

  const removePeptide = (id) => {
    if (form.peptides.length > 1) {
        setForm(prev => ({...prev, peptides: prev.peptides.filter(p => p.id !== id)}));
    }
  }

  const handleSave = () => {
    const peptideNames = form.peptides.map(p => p.name || 'Unnamed').join(' + ');
    const totalMgValue = form.peptides.reduce((sum, p) => sum + (Number(p.mg) || 0), 0);
    const totalDoseValue = form.peptides.reduce((sum, p) => {
        const dose = Number(p.dose) || 0;
        return p.doseUnit === 'mg' ? sum + (dose * 1000) : sum + dose;
    }, 0);


    const newItem = {
        id: generateId(),
        peptide: peptideNames,
        name: peptideNames, // Add a 'name' field for consistency
        mg: totalMgValue,
        dose: totalDoseValue,
        vendor: form.vendor,
        vendorId: vendors.find(v => v.name === form.vendor)?.id || null,
        water: form.water,
        deliveryMethod: deliveryMethod,
        administrationRoute: deliveryMethod === 'syringe' ? administrationRoute : undefined,
        penType: deliveryMethod === 'pen' ? penType : undefined,
        penColor: deliveryMethod === 'pen' ? penColor : undefined,
        cost: cost,
        date: new Date().toISOString(),
        peptides: form.peptides,
        notes: ''
    };
    setReconItems(prev => [newItem, ...prev]);
    onClose();
    window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Reconstitution saved!', type: 'success' } }));
  };

  return (
    <Modal open={open} onClose={onClose} title="Peptide Calculator" theme={theme} wide>
      <div className="space-y-6">
        {/* Two Column Layout: Vial Details + Visual Preview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Left Column: Vial Details */}
          <div>
            <h4 className="font-semibold mb-2" style={{ color: theme.text }}>1. Vial Details</h4>
            <div className="space-y-3">
              <VendorSuggestInput label="Vendor (Optional)" value={form.vendor} onChange={v => setForm({ ...form, vendor: v })} placeholder="Vendor Name" theme={theme} />
              <div className="space-y-3">
                  <TextInput icon={<Droplet size={16} />} label="Water(mL)" type="number" value={form.water} onChange={v => setForm({ ...form, water: v })} placeholder="e.g., 2" theme={theme} />
                  <TextInput icon={<Info size={16} />} label="Vial Cost ($)" type="number" value={cost} onChange={v => setCost(v)} placeholder="e.g., 45.00" theme={theme} />
              </div>
            </div>
          </div>

          {/* Right Column: Vial Label Preview */}
          <div className="flex justify-center sm:justify-end">
            <VialLabelPreview 
              form={form}
              deliveryMethod={deliveryMethod}
              administrationRoute={administrationRoute}
              penType={penType}
              penColor={penColor}
              theme={theme}
            />
          </div>
        </div>

        {/* Delivery Method */}
        <div>
            <h4 className="font-semibold mb-2" style={{ color: theme.text }}>2. Delivery Method</h4>
            <div className="grid grid-cols-3 gap-2">
                <button 
                    onClick={() => {
                        setDeliveryMethod('syringe');
                        // Reset to mcg when syringe is selected (default unit)
                        setForm(prev => ({
                            ...prev,
                            peptides: prev.peptides.map(p => ({ ...p, doseUnit: 'mcg' }))
                        }));
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-md border text-sm font-semibold`}
                    style={{
                        backgroundColor: deliveryMethod === 'syringe' ? theme.primary : theme.secondary,
                        color: deliveryMethod === 'syringe' ? theme.textOnPrimary : theme.text,
                        borderColor: deliveryMethod === 'syringe' ? theme.primary : theme.border
                    }}
                >
                    <Syringe size={16} /> Syringe
                </button>
                <button 
                    onClick={() => {
                        setDeliveryMethod('pen');
                        // Reset to mcg when pen is selected (default unit)
                        setForm(prev => ({
                            ...prev,
                            peptides: prev.peptides.map(p => ({ ...p, doseUnit: 'mcg' }))
                        }));
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-md border text-sm font-semibold`}
                    style={{
                        backgroundColor: deliveryMethod === 'pen' ? theme.primary : theme.secondary,
                        color: deliveryMethod === 'pen' ? theme.textOnPrimary : theme.text,
                        borderColor: deliveryMethod === 'pen' ? theme.primary : theme.border
                    }}
                >
                    <Pen size={16} /> Pen
                </button>
                <button 
                    onClick={() => {
                        setDeliveryMethod('nasal');
                        // Auto-set all peptides to use sprays unit when nasal is selected
                        setForm(prev => ({
                            ...prev,
                            peptides: prev.peptides.map(p => ({ ...p, doseUnit: 'sprays' }))
                        }));
                    }}
                    className={`flex items-center justify-center gap-2 p-3 rounded-md border text-sm font-semibold`}
                    style={{
                        backgroundColor: deliveryMethod === 'nasal' ? theme.primary : theme.secondary,
                        color: deliveryMethod === 'nasal' ? theme.textOnPrimary : theme.text,
                        borderColor: deliveryMethod === 'nasal' ? theme.primary : theme.border
                    }}
                >
                    <Droplets size={16} /> Nasal
                </button>
            </div>
            
            {/* Administration Route for Syringe */}
            {deliveryMethod === 'syringe' && (
                <div className="mt-3">
                    <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Administration Route</label>
                    <div className="flex items-center gap-1 p-1 rounded-md bg-gray-100" style={{ backgroundColor: theme.cardBackground || '#f9fafb' }}>
                        {['subq', 'im', 'iv'].map(route => (
                            <button
                                key={route}
                                type="button"
                                onClick={() => setAdministrationRoute(route)}
                                className={`flex-1 px-3 py-2 text-xs font-semibold rounded transition-all ${
                                    administrationRoute === route 
                                        ? 'text-white shadow-sm' 
                                        : 'text-gray-600 hover:bg-gray-200'
                                }`}
                                style={administrationRoute === route ? { backgroundColor: theme.primary } : {}}
                            >
                                {route.toUpperCase()}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {deliveryMethod === 'pen' && (
                <div className="mt-3">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Pen Type Selection */}
                        <CustomDropdown
                            label="Pen Type"
                            value={penType}
                            onChange={setPenType}
                            options={[
                                { value: '', label: '(Optional)' },
                                { value: 'savvio', label: 'Savvio' },
                                { value: 'novo', label: 'Novo' },
                                { value: 'v1', label: 'V1' },
                                { value: 'v2', label: 'V2' },
                                { value: 'v3', label: 'V3' },
                                { value: 'bird-pen', label: 'Bird Pen' },
                                { value: 'luxura', label: 'Luxura' },
                                { value: 'gansulin', label: 'Gansulin' },
                                { value: 'other', label: 'Other' }
                            ]}
                            placeholder="(Optional)"
                            theme={theme}
                        />

                        {/* Pen Color Selection */}
                        <ColorSwatchDropdown
                            label="Pen Color"
                            value={penColor}
                            onChange={(hexValue) => {
                                // Find the color name from hex and save the name
                                const colorObj = penColors.find(c => c.hex === hexValue);
                                setPenColor(colorObj?.name || hexValue);
                            }}
                            colors={penColors}
                            theme={theme}
                        />
                    </div>
                </div>
            )}
        </div>

        {/* Step 2: Peptides & Doses */}
        <div>
          <h4 className="font-semibold mb-2" style={{ color: theme.text }}>3. Peptides & Doses</h4>
          <div className="space-y-3">
            {form.peptides.map((p, index) => (
              <div key={p.id} className="space-y-4 p-4 border rounded-lg" style={{ borderColor: theme?.border || '#e5e7eb', backgroundColor: theme?.cardBackground || 'white' }}>
                {/* Peptide Name - Full width on all screens */}
                <div>
                  <TextInput 
                    label={`Peptide/Amino ${index + 1}`} 
                    value={p.name} 
                    onChange={v => updatePeptide(p.id, 'name', v)} 
                    placeholder="Name" 
                    theme={theme} 
                    disabled={prefill?.peptides?.length > 0} 
                  />
                </div>
                
                {/* mg/vial and Dose - Side by side on larger screens, stacked on mobile */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <TextInput 
                      label="mg/vial" 
                      type="number" 
                      value={p.mg} 
                      onChange={v => updatePeptide(p.id, 'mg', v)} 
                      placeholder="10" 
                      theme={theme} 
                      disabled={prefill?.peptides?.length > 0} 
                    />
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium mb-2" style={{ color: theme?.text }}>Dose</div>
                    <CombinedDosageInput
                        value={{ amount: p.dose || '', unit: p.doseUnit || 'mcg' }}
                        onChange={(newValue) => {
                            updatePeptide(p.id, 'dose', newValue.amount);
                            updatePeptide(p.id, 'doseUnit', newValue.unit);
                        }}
                        theme={theme}
                        placeholder="250"
                        deliveryMethod={deliveryMethod}
                    />
                  </div>
                </div>
                
                {/* Delete Button */}
                {form.peptides.length > 1 && prefill?.peptides?.length == null && (
                  <div className="flex justify-center pt-2 border-t" style={{ borderColor: theme?.border || '#e5e7eb' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removePeptide(p.id); }} 
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg hover:bg-red-50 transition-colors" 
                      style={{ color: theme.error }}
                    >
                      <Trash2 size={16} />
                      Remove Peptide
                    </button>
                  </div>
                )}
              </div>
            ))}
            {prefill?.peptides?.length == null && <button onClick={addPeptide} className="px-3 py-2 text-sm font-semibold rounded-md border-dashed border" style={{ borderColor: theme.primary, color: theme.primary }}>+ Add Peptide</button>}
          </div>
        </div>

        {/* Step 3: Results */}
        <div>
          <h4 className="font-semibold mb-2" style={{ color: theme.text }}>4. Results</h4>
          <div className="rounded-lg border p-4" style={{ backgroundColor: theme.secondary, borderColor: theme.border }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs" style={{ color: theme.textLight }}>Units per Dose</div>
                <div className="text-2xl font-bold" style={{ color: theme.primary }}>{calc.unitsPerDose ? calc.unitsPerDose.toFixed(0) : '-'}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: theme.textLight }}>Doses per Vial</div>
                <div className="text-2xl font-bold" style={{ color: theme.primary }}>{calc.dosesPerVial || '-'}</div>
              </div>
              <div>
                <div className="text-xs" style={{ color: theme.textLight }}>Cost per Dose</div>
                <div className="text-2xl font-bold" style={{ color: theme.primary }}>{costPerDose || '-'}</div>
              </div>
            </div>
            <p className="text-xs text-center mt-3" style={{ color: theme.textLight }}>
                Based on {deliveryMethod === 'syringe' ? 'an insulin syringe (U-100, 1mL)' : 'a dosage pen'}
            </p>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t" style={{ borderColor: theme.border }}>
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-semibold hover:opacity-90 transition-all"
          style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
        >
          <FilePlus size={16} />
          Save Calculation
        </button>
        <div className="p-3 rounded-md bg-yellow-50 text-yellow-800 text-xs mt-4 border border-yellow-200 text-center">
          <Info size={14} className="inline mr-1" />
          For research purposes only. Always verify calculations with alternative methods.
        </div>
      </div>
    </Modal>
  )
}


