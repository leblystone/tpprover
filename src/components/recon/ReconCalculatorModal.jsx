import React, { useEffect, useMemo, useState } from 'react'
import Modal from '../common/Modal'
import TextInput from '../common/inputs/TextInput'
import VendorSuggestInput from '../vendors/VendorSuggestInput'
import { calculateRecon, getChromeGradient } from '../../utils/recon'
import { PlusCircle, Beaker, Droplet, Syringe, Info, Package, ChevronsRight, FilePlus, Trash2, Pen } from 'lucide-react'
import { useAppContext } from '../../context/AppContext'
import { generateId } from '../../utils/string'

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
  const [penColor, setPenColor] = useState(penColors.find(c => c.name === 'Silver').hex);
  const [cost, setCost] = useState('');

  useEffect(() => {
    if (open) {
        // Reset form when modal opens, but apply prefill if it exists
        const initialForm = { vendor: '', water: '', peptides: [{ id: 1, name: '', mg: '', dose: '', doseUnit: 'mcg' }] };
        setCost('');
        setDeliveryMethod('syringe');
        setPenColor(penColors.find(c => c.name === 'Silver').hex);

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
  const totalDoseInMcg = useMemo(() => {
    return form.peptides.reduce((sum, p) => {
        const dose = Number(p.dose) || 0;
        if (p.doseUnit === 'mg') {
            return sum + (dose * 1000);
        }
        return sum + dose;
    }, 0);
  }, [form.peptides]);

  const calc = useMemo(() => calculateRecon({ mg: totalMg, water: form.water, dose: totalDoseInMcg }), [totalMg, form.water, totalDoseInMcg]);
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

    const selectedPenColor = penColors.find(p => p.hex === penColor);

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
        penColor: deliveryMethod === 'pen' ? selectedPenColor?.name : undefined,
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
            <div className="flex gap-2">
                <button 
                    onClick={() => setDeliveryMethod('syringe')}
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-md border text-sm font-semibold`}
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
                    className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-md border text-sm font-semibold`}
                    style={{
                        backgroundColor: deliveryMethod === 'pen' ? theme.primary : theme.secondary,
                        color: deliveryMethod === 'pen' ? theme.textOnPrimary : theme.text,
                        borderColor: deliveryMethod === 'pen' ? theme.primary : theme.border
                    }}
                >
                    <Pen size={16} /> Pen
                </button>
            </div>
            {deliveryMethod === 'pen' && (
                <div className="mt-3">
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
            )}
        </div>


        {/* Step 2: Peptides & Doses */}
        <div>
          <h4 className="font-semibold mb-2" style={{ color: theme.text }}>3. Peptides & Doses</h4>
          <div className="space-y-3">
            {form.peptides.map((p, index) => (
              <div key={p.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
                <div className="sm:col-span-4"><TextInput label={`Peptide ${index + 1}`} value={p.name} onChange={v => updatePeptide(p.id, 'name', v)} placeholder="Name" theme={theme} disabled={prefill?.peptides?.length > 0} /></div>
                <div className="sm:col-span-3"><TextInput label="mg/vial" type="number" value={p.mg} onChange={v => updatePeptide(p.id, 'mg', v)} placeholder="10" theme={theme} disabled={prefill?.peptides?.length > 0} /></div>
                <div className="sm:col-span-3">
                  <div className="text-sm font-medium mb-1" style={{ color: theme?.text }}>Dose</div>
                  <div className="flex items-center p-0.5 rounded border h-[42px]" style={{ borderColor: theme?.border }}>
                    <input className="flex-1 w-full border-none outline-none text-lg text-right bg-transparent px-2 py-1.5" value={p.dose || ''} onChange={e => updatePeptide(p.id, 'dose', e.target.value)} placeholder="250" type="number" />
                    <div className="inline-flex rounded-full bg-gray-100 p-0.5 shadow-inner">
                      {['mcg','mg'].map(unit => (
                        <button key={unit} type="button" onClick={() => updatePeptide(p.id, 'doseUnit', unit)}
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${p.doseUnit === unit ? 'text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                          style={p.doseUnit === unit ? { backgroundColor: theme.primary } : {}}>
                          {unit}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  {form.peptides.length > 1 && prefill?.peptides?.length == null && <button onClick={(e) => { e.stopPropagation(); removePeptide(p.id); }} className="w-full p-2 rounded-md" style={{ color: theme.error }}><Trash2 size={16} className="mx-auto" /></button>}
                </div>
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


