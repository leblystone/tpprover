import React, { useEffect, useMemo, useState } from 'react'
import TextInput from '../common/inputs/TextInput'
import CombinedDosageInput from '../common/inputs/CombinedDosageInput'
import CustomDropdown from '../common/inputs/CustomDropdown'
import ColorSwatchDropdown from '../common/inputs/ColorSwatchDropdown'
import VendorSuggestInput from '../vendors/VendorSuggestInput'
import { calculateRecon, getChromeGradient } from '../../utils/recon'
import { PlusCircle, Beaker, Droplet, Syringe, Info, Package, ChevronsRight, FilePlus, Trash2, Pen, Droplets } from 'lucide-react'
import VialLabelPreview from './VialLabelPreview'

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

export function ReconCalculatorPanel({ theme, prefill, onSave }) {
  const [form, setForm] = useState({ vendor: '', water: '', peptides: [{ id: 1, name: '', mg: '', dose: '', doseUnit: 'mcg' }] })
  const [deliveryMethod, setDeliveryMethod] = useState('syringe');
  const [administrationRoute, setAdministrationRoute] = useState('subq'); // SubQ, IM, IV
  const [penColor, setPenColor] = useState('#9ca3af');
  const [cost, setCost] = useState('')

  useEffect(() => {
    if (prefill) {
      // Wizard prefill (multi-peptide)
      if (prefill.peptides && prefill.peptides.length > 0) {
        const vendors = [...new Set(prefill.peptides.map(p => p.vendor).filter(Boolean))].join(', ');
        const totalCost = prefill.peptides.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
        
        setForm(prev => ({
          ...prev,
          vendor: vendors,
          peptides: prefill.peptides.map(pep => ({ ...pep, doseUnit: pep.doseUnit || 'mcg' }))
        }));
        setCost(String(totalCost));
      } 
      // Simple prefill (single peptide from stockpile page, etc.)
      else if (prefill.peptide) {
        const p = { id: 1, name: prefill.peptide || '', mg: prefill.mg || '', dose: '', doseUnit: 'mcg' };
        setForm(prev => ({ ...prev, vendor: prefill.vendor || '', peptides: [p] }));
        setCost(prefill.cost || '');
      }

      try { localStorage.removeItem('tpprover_recon_prefill') } catch {}
    }
  }, [prefill])

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
  }, [totalMg, form.water, form.peptides])
  const costPerDose = useMemo(() => {
    if (cost && calc.dosesPerVial > 0) return `$${(Number(cost) / calc.dosesPerVial).toFixed(2)}`
    return ''
  }, [cost, calc.dosesPerVial])

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

  return (
    <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
      <h3 className="text-xl font-semibold mb-1" style={{ color: theme.primaryDark }}>Peptide Calculator</h3>
      <p className="text-sm text-gray-500 mb-4">Calculate dosages for one or more peptides.</p>

      {/* Two Column Layout: Left Content + Visual Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
        {/* Left Column: 2:1 Split for Vial Details and Visual Preview */}
        <div className="grid grid-cols-3 gap-4">
          {/* Vial Details - Takes 2/3 width */}
          <div className="col-span-2">
            <h4 className="font-semibold mb-2" style={{ color: theme.text }}>1. Vial Details</h4>
            <div className="space-y-3">
              <VendorSuggestInput label="Vendor (Optional)" value={form.vendor} onChange={v => setForm({ ...form, vendor: v })} placeholder="Vendor Name" theme={theme} />
              <div className="space-y-3">
                  <TextInput icon={<Droplet size={16} />} label="Water(mL)" type="number" value={form.water} onChange={v => setForm({ ...form, water: v })} placeholder="e.g., 2" theme={theme} />
                  <TextInput icon={<Info size={16} />} label="Vial Cost ($)" type="number" value={cost} onChange={v => setCost(v)} placeholder="e.g., 45.00" theme={theme} />
              </div>
            </div>
          </div>

          {/* Visual Vial Preview - Takes 1/3 width */}
          <div className="col-span-1">
            <h4 className="font-semibold mb-2" style={{ color: theme.text }}>Your Vial</h4>
            <VialLabelPreview 
              form={form}
              deliveryMethod={deliveryMethod}
              administrationRoute={administrationRoute}
              penType={form.penType}
              penColor={penColor}
              theme={theme}
            />
          </div>
        </div>

        {/* Right Column: Delivery Method (moved from left) */}
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
                    className={`w-full flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold`}
                    style={{
                        backgroundColor: deliveryMethod === 'syringe' ? theme.primary : theme.secondary,
                        color: deliveryMethod === 'syringe' ? theme.textOnPrimary : theme.text,
                        borderColor: deliveryMethod === 'syringe' ? theme.primary : theme.border
                    }}
                >
                    <Syringe size={14} /> Syringe
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
                    className={`w-full flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold`}
                    style={{
                        backgroundColor: deliveryMethod === 'pen' ? theme.primary : theme.secondary,
                        color: deliveryMethod === 'pen' ? theme.textOnPrimary : theme.text,
                        borderColor: deliveryMethod === 'pen' ? theme.primary : theme.border
                    }}
                >
                    <Pen size={14} /> Pen
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
                    className={`w-full flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold`}
                    style={{
                        backgroundColor: deliveryMethod === 'nasal' ? theme.primary : theme.secondary,
                        color: deliveryMethod === 'nasal' ? theme.textOnPrimary : theme.text,
                        borderColor: deliveryMethod === 'nasal' ? theme.primary : theme.border
                    }}
                >
                    <Droplets size={14} /> Nasal
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
                                className={`flex-1 px-2 sm:px-3 py-2 text-xs font-semibold rounded transition-all ${
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
                            value={form.penType || ''}
                            onChange={(value) => setForm(prev => ({ ...prev, penType: value }))}
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
                            onChange={(hex) => setPenColor(hex)}
                            colors={penColors}
                            theme={theme}
                        />
                    </div>
                </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* Step 4: Peptides & Doses */}
          <div>
          <h4 className="font-semibold mb-2" style={{ color: theme.text }}>4. Peptides & Doses</h4>
          <div className="space-y-3">
            {form.peptides.map((p, index) => (
              <div key={p.id} className="space-y-4 p-4 border rounded-lg" style={{ borderColor: theme?.border || '#e5e7eb', backgroundColor: theme?.cardBackground || 'white' }}>
                {/* Peptide Name - Full width on all screens */}
                <div>
                  <TextInput 
                    label={`Peptide ${index + 1}`} 
                    value={p.name} 
                    onChange={v => updatePeptide(p.id, 'name', v)} 
                    placeholder="Name" 
                    theme={theme} 
                    disabled={prefill?.peptides?.length > 0} 
                  />
                </div>
                
                {/* Single column layout for better mobile experience */}
                <div className="space-y-4">
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
                Based on {deliveryMethod === 'syringe' ? 'an insulin syringe (U-100, 1mL)' : deliveryMethod === 'pen' ? 'a dosage pen' : 'nasal spray delivery'}
            </p>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t" style={{ borderColor: theme.border }}>
        <button
          onClick={() => {
            // Convert hex color to name before saving
            const selectedPenColor = penColors.find(p => p.hex === penColor);
            const penColorName = deliveryMethod === 'pen' ? selectedPenColor?.name : undefined;
            onSave?.({ 
              ...form, 
              deliveryMethod, 
              administrationRoute: deliveryMethod === 'syringe' ? administrationRoute : undefined,
              penType: deliveryMethod === 'pen' ? form.penType : undefined, 
              penColor: penColorName, 
              cost 
            });
          }}
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
      </div>
    </div>
  );
}


