import React, { useEffect, useMemo, useState } from 'react'
import TextInput from '../common/inputs/TextInput'
import VendorSuggestInput from '../vendors/VendorSuggestInput'
import { calculateRecon, getChromeGradient } from '../../utils/recon'
import { PlusCircle, Beaker, Droplet, Syringe, Info, Package, ChevronsRight, FilePlus, Trash2, Pen, Droplets } from 'lucide-react'

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

      <div className="space-y-6">
        {/* Step 1: Vial Details */}
        <div>
          <h4 className="font-semibold mb-2" style={{ color: theme.text }}>1. Vial Details</h4>
          <div className="space-y-3">
            <VendorSuggestInput label="Vendor (Optional)" value={form.vendor} onChange={v => setForm({ ...form, vendor: v })} placeholder="Vendor Name" theme={theme} />
            <div className="grid grid-cols-2 gap-3">
                <TextInput icon={<Droplet size={16} />} label="Amount of Water (mL)" type="number" value={form.water} onChange={v => setForm({ ...form, water: v })} placeholder="e.g., 2" theme={theme} />
                <TextInput icon={<Info size={16} />} label="Vial Cost ($)" type="number" value={cost} onChange={v => setCost(v)} placeholder="e.g., 45.00" theme={theme} />
            </div>
          </div>
        </div>

        {/* Delivery Method */}
        <div>
            <h4 className="font-semibold mb-2" style={{ color: theme.text }}>2. Delivery Method</h4>
            <div className="grid grid-cols-3 gap-2">
                <button 
                    onClick={() => setDeliveryMethod('syringe')}
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
                    onClick={() => setDeliveryMethod('pen')}
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
                    onClick={() => setDeliveryMethod('nasal')}
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
            {deliveryMethod === 'pen' && (
                <div className="mt-3 space-y-3">
                    {/* Pen Type Selection */}
                    <div>
                        <label className="text-sm font-medium mb-1 block" style={{ color: theme.text }}>Pen Type</label>
                        <select
                            value={form.penType || ''}
                            onChange={e => setForm(prev => ({ ...prev, penType: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-opacity-50 transition-all"
                            style={{
                                borderColor: theme.border,
                                backgroundColor: theme.cardBackground,
                                color: theme.text,
                                focusRingColor: theme.primary
                            }}
                        >
                           <option value="">Select pen type (optional)</option>
                           <option value="savvio">Savvio</option>
                           <option value="novo">Novo</option>
                           <option value="v1">V1</option>
                           <option value="v2">V2</option>
                           <option value="v3">V3</option>
                           <option value="bird-pen">Bird Pen</option>
                           <option value="luxura">Luxura</option>
                           <option value="gansulin">Gansulin</option>
                           <option value="other">Other</option>
                        </select>
                    </div>

                    {/* Pen Color Selection */}
                    <div>
                        <label className="text-sm font-medium mb-1 block" style={{ color: theme.text }}>Pen Color</label>
                        <div className="flex gap-2 flex-wrap">
                            {penColors.map(({ name, hex }) => {
                                const style = {
                                    background: getChromeGradient(hex),
                                    borderColor: hex,
                                    ringColor: theme.primary,
                                };
                                if (hex === '#FFFFFF') {
                                    style.boxShadow = 'inset 0 0 0 1px #ddd';
                                }
                                return (
                                    <button 
                                        key={name}
                                        type="button"
                                        title={name}
                                        onClick={() => setPenColor(hex)}
                                        className={`w-8 h-8 rounded-full border-2 transition-transform duration-150 transform hover:scale-110 ${penColor === hex ? 'ring-2 ring-offset-2' : ''}`}
                                        style={style}
                                    />
                                );
                            })}
                        </div>
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
                    <div className="text-sm font-medium mb-2" style={{ color: theme?.text }}>Dose Amount</div>
                    {p.doseUnit === 'sprays' && (
                      <div className="text-xs text-blue-600 mb-2 p-2 bg-blue-50 rounded border border-blue-200">
                        💡 Assumes 100 mcg per spray (typical nasal spray)
                      </div>
                    )}
                    <input 
                      className="w-full border rounded-lg px-4 py-3 text-base font-medium text-center" 
                      style={{ 
                        borderColor: theme?.border || '#d1d5db',
                        backgroundColor: theme?.cardBackground || 'white',
                        color: theme?.text || 'black'
                      }}
                      value={p.dose || ''} 
                      onChange={e => updatePeptide(p.id, 'dose', e.target.value)} 
                      placeholder="250" 
                      type="number" 
                    />
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium mb-2" style={{ color: theme?.text }}>Unit</div>
                    <div className="flex flex-wrap gap-2">
                      {['mcg','mg','mL','sprays'].map(unit => (
                        <button 
                          key={unit} 
                          type="button" 
                          onClick={() => updatePeptide(p.id, 'doseUnit', unit)}
                          className={`flex-1 min-w-0 px-4 py-2 text-sm font-semibold rounded-lg border-2 transition-all ${
                            p.doseUnit === unit 
                              ? 'text-white border-transparent shadow-md' 
                              : 'text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                          style={p.doseUnit === unit ? { backgroundColor: theme.primary, borderColor: theme.primary } : {}}>
                          {unit}
                        </button>
                      ))}
                    </div>
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
      </div>
      
      <div className="mt-6 pt-6 border-t" style={{ borderColor: theme.border }}>
        <button
          onClick={() => {
            // Convert hex color to name before saving
            const selectedPenColor = penColors.find(p => p.hex === penColor);
            const penColorName = deliveryMethod === 'pen' ? selectedPenColor?.name : undefined;
            onSave?.({ ...form, deliveryMethod, penType: deliveryMethod === 'pen' ? form.penType : undefined, penColor: penColorName, cost });
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
  )
}


