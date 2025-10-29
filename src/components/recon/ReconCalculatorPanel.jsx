import React, { useEffect, useMemo, useState } from 'react'
import TextInput from '../common/inputs/TextInput'
import CombinedDosageInput from '../common/inputs/CombinedDosageInput'
import CustomDropdown from '../common/inputs/CustomDropdown'
import ColorSwatchDropdown from '../common/inputs/ColorSwatchDropdown'
import VendorSuggestInput from '../vendors/VendorSuggestInput'
import { calculateRecon, getChromeGradient } from '../../utils/recon'
import { penColors } from '../../utils/penColors'
import { formatCurrency } from '../../utils/currencyUtils'
import { PlusCircle, Beaker, Info, Package, ChevronsRight, FilePlus, Trash2, Pen, Droplets, Plus, X, Pipette } from 'lucide-react'
import VialLabelPreview from './VialLabelPreview'

export function ReconCalculatorPanel({ theme, prefill, onSave, noCard = false, compact = false, isReadOnly = false, onUpgrade }) {
  const [form, setForm] = useState({ vendor: '', water: '', peptides: [{ id: 1, name: '', mg: '', dose: '', doseUnit: 'mcg' }] })
  const [deliveryMethod, setDeliveryMethod] = useState('pipette');
  const [administrationRoute, setAdministrationRoute] = useState('subq'); // SubQ, IM, IV
  const [penColor, setPenColor] = useState('#9ca3af');
  const [cost, setCost] = useState('');
  const [currentPeptideIndex, setCurrentPeptideIndex] = useState(0); // For pagination

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
  }, [totalMg, form.water, form.peptides, form.peptides[0]?.dose, form.peptides[0]?.doseUnit])
  const costPerDose = useMemo(() => {
    if (cost && calc.dosesPerVial > 0) return formatCurrency(Number(cost) / calc.dosesPerVial)
    return ''
  }, [cost, calc.dosesPerVial])

  const addPeptide = () => {
    const newId = Math.max(0, ...form.peptides.map(p => p.id)) + 1;
    setForm(prev => ({...prev, peptides: [...prev.peptides, { id: newId, name: '', mg: '', dose: '', doseUnit: 'mcg' }]}));
    // Automatically switch to the new peptide
    setCurrentPeptideIndex(form.peptides.length);
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

  const content = (
    <div className={`relative ${isReadOnly ? 'max-h-[70vh] md:max-h-none overflow-hidden' : ''}`}>
      {/* Section Banner - Vial Details */}
      <div className="mb-4 px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
        <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.isDark ? '#a8b5a0' : theme.primary }}>Vial Details</h4>
      </div>

      {/* Two Column Layout: Left Content + Visual Preview */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        {/* Left Column: Equal Split for Vial Details and Visual Preview */}
        <div className="grid grid-cols-2 gap-4 items-end">
          {/* Vial Details - Takes 1/2 width */}
          <div className="col-span-1">
            <div className="space-y-2">
              {/* Current Peptide from pagination */}
              {form.peptides[currentPeptideIndex] && (
                <>
                  {/* Peptide Name */}
                  <TextInput 
                    label="Peptide Name" 
                    value={form.peptides[currentPeptideIndex]?.name || ''} 
                    onChange={v => updatePeptide(form.peptides[currentPeptideIndex]?.id, 'name', v)} 
                    placeholder="e.g., BPC-157" 
                    theme={theme} 
                  />
                  
                  {/* MG and Water in 2 columns */}
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput 
                      label="mg" 
                      type="number"
                      value={form.peptides[currentPeptideIndex]?.mg || ''} 
                      onChange={v => updatePeptide(form.peptides[currentPeptideIndex]?.id, 'mg', v)} 
                      placeholder="e.g., 10" 
                      theme={theme} 
                    />
                    <TextInput 
                      label="Water(mL)" 
                      type="number"
                      value={form.water || ''} 
                      onChange={v => setForm(prev => ({...prev, water: v}))} 
                      placeholder="e.g., 2" 
                      theme={theme} 
                    />
                  </div>
                  
                  {/* Dose with integrated unit selector */}
                  <div>
                    <div className="text-sm font-medium mb-2" style={{ color: theme.text }}>Dose</div>
                    <CombinedDosageInput
                      value={{ amount: form.peptides[currentPeptideIndex]?.dose || '', unit: form.peptides[currentPeptideIndex]?.doseUnit || 'mcg' }}
                      onChange={(newValue) => {
                        updatePeptide(form.peptides[currentPeptideIndex]?.id, 'dose', newValue.amount);
                        updatePeptide(form.peptides[currentPeptideIndex]?.id, 'doseUnit', newValue.unit);
                      }}
                      theme={theme}
                      placeholder="250"
                      units={['mcg', 'mg', 'mL']}
                    />
                  </div>
                </>
              )}
              
              {/* Vendor - Per peptide */}
              <VendorSuggestInput 
                label="Vendor" 
                value={form.peptides[currentPeptideIndex]?.vendor || ''} 
                onChange={v => updatePeptide(form.peptides[currentPeptideIndex]?.id, 'vendor', v)} 
                placeholder="(Optional)" 
                theme={theme} 
              />
              
              {/* Cost */}
              <TextInput 
                icon={<Info size={16} />} 
                label="Vial Cost ($)" 
                type="number" 
                value={cost} 
                onChange={v => setCost(v)} 
                placeholder="e.g., 45.00" 
                theme={theme} 
              />
            </div>
          </div>

          {/* Visual Vial Preview - Takes 1/2 width */}
          <div className="col-span-1 flex flex-col justify-between items-center">
            <div className="relative w-full flex justify-center">
              <VialLabelPreview 
                form={form}
                deliveryMethod={deliveryMethod}
                administrationRoute={administrationRoute}
                penType={form.penType}
                penColor={penColor}
                theme={theme}
                currentPeptideIndex={currentPeptideIndex}
                compact={compact}
              />
              
              {/* Delete Peptide Button - Top right corner (only show if more than 1 peptide) */}
              {form.peptides.length > 1 && (
                <button
                  onClick={() => {
                    const peptideId = form.peptides[currentPeptideIndex]?.id;
                    removePeptide(peptideId);
                    // Move to previous peptide if we deleted the last one
                    if (currentPeptideIndex >= form.peptides.length - 1) {
                      setCurrentPeptideIndex(Math.max(0, currentPeptideIndex - 1));
                    }
                  }}
                  className="absolute top-0 right-0 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
                    color: theme.error || '#ef4444',
                    border: `1.5px solid ${theme.error || '#ef4444'}30`
                  }}
                  title="Remove this peptide"
                >
                  <X size={14} />
                </button>
              )}
              
            </div>
            
            {/* Bottom section - dots and add button */}
            <div className="w-full space-y-3">
            
            {/* Pagination Dots - Always reserve space */}
            <div className="flex justify-center gap-2.5 h-3">
              {form.peptides.length > 1 && form.peptides.map((peptide, idx) => (
                <button
                  key={peptide.id}
                  onClick={() => setCurrentPeptideIndex(idx)}
                  className="w-3 h-3 rounded-full transition-all hover:scale-125"
                  style={{
                    backgroundColor: idx === currentPeptideIndex ? theme.primary : theme.border,
                    opacity: idx === currentPeptideIndex ? 1 : 0.4
                  }}
                  aria-label={`Peptide ${idx + 1}`}
                />
              ))}
            </div>
            
            {/* Add Peptide Button - In second column */}
            <button
              onClick={addPeptide}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:shadow-md hover:scale-[1.02]"
              style={{
                backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
                color: theme.primary,
                border: `1.5px solid ${theme.primary}20`
              }}
            >
              <div 
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ backgroundColor: theme.primary }}
              >
                <Plus size={14} style={{ color: theme.textOnPrimary }} />
              </div>
              Add Peptide
            </button>
            </div>
          </div>
        </div>

        {/* Right Column: Delivery Method (moved from left) */}
        <div>
          {/* Section Banner - Delivery Method */}
          <div className="mb-3 px-4 py-2.5 rounded-lg" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
            <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.isDark ? '#a8b5a0' : theme.primary }}>Delivery Method</h4>
          </div>
          <div className="grid grid-cols-3 gap-2">
                <button 
                    onClick={() => {
                        setDeliveryMethod('pipette');
                        // Reset to mcg when syringe is selected (default unit)
                        setForm(prev => ({
                            ...prev,
                            peptides: prev.peptides.map(p => ({ ...p, doseUnit: 'mcg' }))
                        }));
                    }}
                    className={`w-full flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold`}
                    style={{
                        backgroundColor: deliveryMethod === 'pipette' ? theme.primary : (theme.isDark ? '#1f2937' : theme.secondary),
                        color: deliveryMethod === 'pipette' ? theme.textOnPrimary : theme.text,
                        borderColor: deliveryMethod === 'pipette' ? theme.primary : theme.border
                    }}
                >
                    <Pipette size={14} /> Syringe
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
                        backgroundColor: deliveryMethod === 'pen' ? theme.primary : (theme.isDark ? '#1f2937' : theme.secondary),
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
                        backgroundColor: deliveryMethod === 'nasal' ? theme.primary : (theme.isDark ? '#1f2937' : theme.secondary),
                        color: deliveryMethod === 'nasal' ? theme.textOnPrimary : theme.text,
                        borderColor: deliveryMethod === 'nasal' ? theme.primary : theme.border
                    }}
                >
                    <Droplets size={14} /> Nasal
                </button>
            </div>
            
            {/* Administration Route for Droplet */}
            {deliveryMethod === 'pipette' && (
                <div className="mt-3">
                    <label className="text-sm font-medium mb-2 block" style={{ color: theme.text }}>Administration Route</label>
                    <div className="flex items-center gap-1 p-1 rounded-md" style={{ backgroundColor: theme.isDark ? '#1f2937' : (theme.cardBackground || '#f9fafb') }}>
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

        {/* Results and old peptide section wrapper */}
        <div className="space-y-6">
          {/* Old Peptides & Doses section - Hidden, using pagination now */}
          <div className="hidden">
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
          <div className="my-2 border-t" style={{ borderColor: theme.border }} />
          <div className="rounded-lg border p-3" style={{ backgroundColor: theme.isDark ? '#1f2937' : theme.secondary, borderColor: theme.border }}>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs mb-1" style={{ color: theme.textLight }}>Units/Dose</div>
                <div className="text-lg font-bold" style={{ color: theme.primary }}>{calc.unitsPerDose ? calc.unitsPerDose.toFixed(0) : '-'}</div>
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: theme.textLight }}>Doses/Vial</div>
                <div className="text-lg font-bold" style={{ color: theme.primary }}>{calc.dosesPerVial || '-'}</div>
              </div>
              <div>
                <div className="text-xs mb-1" style={{ color: theme.textLight }}>Cost/Dose</div>
                <div className="text-lg font-bold" style={{ color: theme.primary }}>{costPerDose || '-'}</div>
              </div>
            </div>
            <p className="text-xs text-center mt-2 opacity-75" style={{ color: theme.textLight }}>
                {deliveryMethod === 'pipette' ? 'Insulin syringe (U-100)' : deliveryMethod === 'pen' ? 'Dosage pen' : 'Nasal spray'}
            </p>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t" style={{ borderColor: theme.border }}>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (!onSave) {
              console.error('onSave function is not provided!');
              return;
            }
            
            // Convert hex color to name before saving
            const selectedPenColor = penColors.find(p => p.hex === penColor);
            const penColorName = deliveryMethod === 'pen' ? selectedPenColor?.name : undefined;
            
            const dataToSave = { 
              ...form, 
              deliveryMethod, 
              administrationRoute: deliveryMethod === 'pipette' ? administrationRoute : undefined,
              penType: deliveryMethod === 'pen' ? form.penType : undefined, 
              penColor: penColorName, 
              cost 
            };
            
            onSave(dataToSave);
          }}
          type="button"
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
      
      {/* Lockout Overlay - Blur calculator when in read-only mode */}
      {isReadOnly && (
        <div className="absolute inset-0 backdrop-blur-md bg-white/60 flex items-center justify-center z-50 rounded-lg">
          <div className="text-center p-6 max-w-md">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${theme.primary}20` }}>
              <FilePlus size={32} style={{ color: theme.primary }} />
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ color: theme.primaryDark }}>
              Trial has ended
            </h3>
            <p className="text-sm mb-4" style={{ color: theme.text }}>
              Upgrade to continue using the calculator and save your reconstitutions
            </p>
            <button
              onClick={() => {
                if (onUpgrade) {
                  onUpgrade();
                } else {
                  // Fallback: Navigate to account page
                  window.location.href = '/app/account';
                }
              }}
              className="px-6 py-2.5 rounded-lg font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              Choose a Plan
            </button>
          </div>
        </div>
      )}
    </div>
  );

  // Return with or without card wrapper based on noCard prop
  if (noCard) {
    return content;
  }

  return (
    <div className="rounded-lg p-6 content-card shadow-md hover:shadow-lg transition-shadow" style={{ backgroundColor: theme.cardBackground }}>
      {content}
    </div>
  );
}


