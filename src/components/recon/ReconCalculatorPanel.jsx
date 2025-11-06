import React, { useEffect, useMemo, useState, useRef } from 'react'
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

export function ReconCalculatorPanel({ theme, prefill, onSave, noCard = false, compact = false, isReadOnly = false, onUpgrade, reconStrategy = null, allowRemovePeptide = true, allowAddPeptide = true, formData, setFormData }) {
  // Use controlled form if provided, otherwise use internal state
  const [internalForm, setInternalForm] = useState({ vendor: '', water: '', peptides: [{ id: 1, name: '', mg: '', dose: '', doseUnit: 'mcg' }] });
  const form = formData !== undefined ? formData : internalForm;
  const setForm = setFormData !== undefined ? setFormData : setInternalForm;
  
  // Store setForm in ref to prevent dependency issues
  const setFormRef = useRef(setForm);
  useEffect(() => {
    setFormRef.current = setForm;
  }, [setForm]);
  
  // Track if we've already processed the prefill
  const prefillProcessedRef = useRef(false);
  const lastPrefillRef = useRef(null);
  
  // Ensure peptides array always exists
  const safeForm = {
    ...form,
    peptides: form.peptides && Array.isArray(form.peptides) ? form.peptides : [{ id: 1, name: '', mg: '', dose: '', doseUnit: 'mcg' }]
  };
  
  const [deliveryMethod, setDeliveryMethod] = useState('pipette');
  const [administrationRoute, setAdministrationRoute] = useState('subq'); // SubQ, IM, IV
  const [penColor, setPenColor] = useState('#9ca3af');
  const [cost, setCost] = useState('');
  const [currentPeptideIndex, setCurrentPeptideIndex] = useState(0); // For pagination
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);

  useEffect(() => {
    // Only process prefill if it's new and different from the last one
    if (prefill && prefill !== lastPrefillRef.current) {
      lastPrefillRef.current = prefill;
      
      // Wizard prefill (multi-peptide)
      if (prefill.peptides && prefill.peptides.length > 0) {
        const vendors = [...new Set(prefill.peptides.map(p => p.vendor).filter(Boolean))].join(', ');
        const totalCost = prefill.peptides.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
        
        setFormRef.current(prev => ({
          ...prev,
          vendor: vendors,
          peptides: prefill.peptides.map((pep, index) => ({ ...pep, id: pep.id || index + 1, doseUnit: pep.doseUnit || 'mcg' }))
        }));
        setCost(String(totalCost));
      } 
      // Simple prefill (single peptide from stockpile page, etc.)
      else if (prefill.peptide) {
        const p = { id: 1, name: prefill.peptide || '', mg: prefill.mg || '', dose: '', doseUnit: 'mcg' };
        setFormRef.current(prev => ({ ...prev, vendor: prefill.vendor || '', peptides: [p] }));
        setCost(prefill.cost || '');
      }
      // Handle formData prefill (from modal)
      else if (prefill.vendor !== undefined || prefill.water !== undefined || prefill.peptides) {
        setFormRef.current(prev => ({
          ...prev,
          vendor: prefill.vendor !== undefined ? prefill.vendor : prev.vendor,
          water: prefill.water !== undefined ? prefill.water : prev.water,
          peptides: prefill.peptides || prev.peptides,
          deliveryMethod: prefill.deliveryMethod || prev.deliveryMethod,
          administrationRoute: prefill.administrationRoute || prev.administrationRoute,
          penType: prefill.penType || prev.penType,
          penColor: prefill.penColor || prev.penColor
        }));
        if (prefill.deliveryMethod) setDeliveryMethod(prefill.deliveryMethod);
        if (prefill.administrationRoute) setAdministrationRoute(prefill.administrationRoute);
        if (prefill.penColor) setPenColor(prefill.penColor);
        if (prefill.cost) setCost(prefill.cost);
      }

      try { localStorage.removeItem('tpprover_recon_prefill') } catch {}
    }
  }, [prefill])
  
  // Sync form state FROM parent formData to local state (one-way sync)
  useEffect(() => {
    if (formData !== undefined) {
      // Update local state to match parent formData
      if (formData.deliveryMethod && formData.deliveryMethod !== deliveryMethod) {
        setDeliveryMethod(formData.deliveryMethod);
      }
      if (formData.administrationRoute && formData.administrationRoute !== administrationRoute) {
        setAdministrationRoute(formData.administrationRoute);
      }
      if (formData.penColor && formData.penColor !== penColor) {
        setPenColor(formData.penColor);
      }
    }
  }, [formData?.deliveryMethod, formData?.administrationRoute, formData?.penColor])

  const totalMg = useMemo(() => {
    if (!safeForm.peptides || !Array.isArray(safeForm.peptides)) return 0;
    return safeForm.peptides.reduce((sum, p) => sum + (Number(p.mg) || 0), 0);
  }, [safeForm.peptides]);
  const calc = useMemo(() => {
    // For multi-peptide calculations, we need to handle each dose unit properly
    // We'll calculate based on the first peptide's dose unit and value
    if (!safeForm.peptides || !Array.isArray(safeForm.peptides) || safeForm.peptides.length === 0) {
      return { unitsPerDose: 0, dosesPerVial: 0, concentration: 0 };
    }
    const firstPeptide = safeForm.peptides[0];
    if (!firstPeptide || !firstPeptide.dose) {
      return { unitsPerDose: 0, dosesPerVial: 0, concentration: 0 };
    }
    
    return calculateRecon({ 
      mg: totalMg, 
      water: safeForm.water, 
      dose: firstPeptide.dose,
      doseUnit: firstPeptide.doseUnit || 'mcg'
    });
  }, [totalMg, safeForm.water, safeForm.peptides, safeForm.peptides[0]?.dose, safeForm.peptides[0]?.doseUnit])
  const costPerDose = useMemo(() => {
    if (cost && calc.dosesPerVial > 0) return formatCurrency(Number(cost) / calc.dosesPerVial)
    return ''
  }, [cost, calc.dosesPerVial])

  const addPeptide = () => {
    const peptides = safeForm.peptides || [];
    const newId = Math.max(0, ...peptides.map(p => p.id || 0)) + 1;
    setForm(prev => {
      const currentPeptides = prev.peptides && Array.isArray(prev.peptides) ? prev.peptides : [{ id: 1, name: '', mg: '', dose: '', doseUnit: 'mcg' }];
      return {...prev, peptides: [...currentPeptides, { id: newId, name: '', mg: '', dose: '', doseUnit: 'mcg' }]};
    });
    // Automatically switch to the new peptide
    setCurrentPeptideIndex(peptides.length);
  }

  const updatePeptide = (id, key, value) => {
    setForm(prev => {
      const currentPeptides = prev.peptides && Array.isArray(prev.peptides) ? prev.peptides : [{ id: 1, name: '', mg: '', dose: '', doseUnit: 'mcg' }];
      return {
        ...prev,
        peptides: currentPeptides.map(p => p.id === id ? { ...p, [key]: value } : p)
      };
    });
    // Also update delivery method and other state in the form
    if (key === 'doseUnit' && value === 'sprays') {
      setDeliveryMethod('nasal');
      setForm(prev => ({ ...prev, deliveryMethod: 'nasal' }));
    }
  }

  const removePeptide = (id) => {
    const peptides = safeForm.peptides || [];
    if (peptides.length > 1) {
        setForm(prev => {
          const currentPeptides = prev.peptides && Array.isArray(prev.peptides) ? prev.peptides : [];
          return {...prev, peptides: currentPeptides.filter(p => p.id !== id)};
        });
    }
  }

  // Swipe handlers for mobile
  const minSwipeDistance = 50; // Minimum distance in pixels to register a swipe

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    const peptides = safeForm.peptides || [];
    if (isLeftSwipe && peptides.length > 1) {
      // Swipe left - go to next peptide
      setCurrentPeptideIndex((prev) => (prev + 1) % peptides.length);
    }
    if (isRightSwipe && peptides.length > 1) {
      // Swipe right - go to previous peptide
      setCurrentPeptideIndex((prev) => (prev - 1 + peptides.length) % peptides.length);
    }
  };

  const content = (
    <div className={`relative ${isReadOnly ? 'max-h-[70vh] md:max-h-none overflow-hidden' : ''}`}>
      {/* Section Banner - Vial Details */}
      <div className="mb-4 px-6 py-2.5 rounded-lg" style={{ backgroundColor: theme.isDark ? '#374151' : theme.secondary, borderLeft: `4px solid ${theme.primary}` }}>
        <h4 className="font-black text-sm tracking-wide uppercase" style={{ color: theme.isDark ? '#a8b5a0' : theme.primary }}>Vial Details</h4>
      </div>

      {/* Two Column Layout: Left Content + Visual Preview */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        {/* Left Column: Equal Split for Vial Details and Visual Preview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-end" style={{ minWidth: 0 }}>
          {/* Vial Details - Takes 1/2 width */}
          <div 
            className="col-span-1"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            <div className="space-y-1">
              {/* Current Peptide from pagination */}
              {safeForm.peptides && safeForm.peptides[currentPeptideIndex] && (
                <>
                  {/* Peptide Name */}
                  <TextInput 
                    label="Peptide Name" 
                    value={safeForm.peptides[currentPeptideIndex]?.name || ''} 
                    onChange={v => updatePeptide(safeForm.peptides[currentPeptideIndex]?.id, 'name', v)} 
                    placeholder="e.g., BPC-157" 
                    theme={theme} 
                  />
                  
                  {/* MG and Water in 2 columns */}
                  <div className="grid grid-cols-2 gap-3">
                    <TextInput 
                      label="mg" 
                      type="number"
                      value={safeForm.peptides[currentPeptideIndex]?.mg || ''} 
                      onChange={v => updatePeptide(safeForm.peptides[currentPeptideIndex]?.id, 'mg', v)} 
                      placeholder="e.g., 10" 
                      theme={theme} 
                    />
                    <TextInput 
                      label="Water(mL)" 
                      type="number"
                    value={form.water || ''} 
                    onChange={v => {
                      setForm(prev => ({...prev, water: v}));
                    }}
                      placeholder="e.g., 2" 
                      theme={theme} 
                    />
                  </div>
                  
                  {/* Dose with integrated unit selector */}
                  <div>
                    <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>Dose</div>
                    <CombinedDosageInput
                      value={{ amount: safeForm.peptides[currentPeptideIndex]?.dose || '', unit: safeForm.peptides[currentPeptideIndex]?.doseUnit || 'mcg' }}
                      onChange={(newValue) => {
                        updatePeptide(safeForm.peptides[currentPeptideIndex]?.id, 'dose', newValue.amount);
                        updatePeptide(safeForm.peptides[currentPeptideIndex]?.id, 'doseUnit', newValue.unit);
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
                value={safeForm.peptides[currentPeptideIndex]?.vendor || ''} 
                onChange={v => {
                  updatePeptide(safeForm.peptides[currentPeptideIndex]?.id, 'vendor', v);
                  // Also update form vendor if it's the first peptide
                  if (currentPeptideIndex === 0) {
                    setForm(prev => ({ ...prev, vendor: v }));
                  }
                }} 
                placeholder="(Optional)" 
                theme={theme} 
              />
              
              {/* Cost */}
              <TextInput 
                icon={<Info size={16} />} 
                label="Vial Cost ($)" 
                type="number" 
                value={cost} 
                onChange={v => {
                  setCost(v);
                  setForm(prev => ({ ...prev, cost: v }));
                }} 
                placeholder="e.g., 45.00" 
                theme={theme} 
              />
            </div>
          </div>

          {/* Visual Vial Preview - Takes 1/2 width */}
          <div 
            className="col-span-1 flex flex-col justify-between items-center"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* Pulsing Strategy Chip - Only show if reconStrategy is provided */}
            {reconStrategy && (
              <div className="mb-0 flex justify-center" style={{ marginBottom: '-24px', zIndex: 10, position: 'relative' }}>
                <div 
                  className="px-3 py-2 rounded-lg flex items-center gap-2"
                  style={{ 
                    backgroundColor: theme.primary + '20',
                    border: `2px solid ${theme.primary}`
                  }}
                >
                  <div className="relative flex-shrink-0">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ 
                        backgroundColor: theme.primary
                      }}
                    >
                      <div 
                        className="absolute inset-0 rounded-full animate-ping"
                        style={{ 
                          backgroundColor: theme.primary,
                          opacity: 0.75
                        }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: theme.primary }}>
                    {reconStrategy === 'separate' ? 'Separate Peptides' : reconStrategy === 'blended' ? 'Blended Peptides' : reconStrategy}
                  </span>
                </div>
              </div>
            )}
            <div className="relative flex justify-center" style={{ minWidth: 0, maxWidth: '280px', width: '100%' }}>
              <VialLabelPreview 
                form={safeForm}
                deliveryMethod={deliveryMethod}
                administrationRoute={administrationRoute}
                penType={form.penType}
                penColor={penColor}
                theme={theme}
                currentPeptideIndex={currentPeptideIndex}
                compact={true}
              />
              
              {/* Delete Peptide Button - Top right corner (only show if more than 1 peptide and allowed) */}
              {allowRemovePeptide && safeForm.peptides && safeForm.peptides.length > 1 && (
                <button
                  onClick={() => {
                    const peptideId = safeForm.peptides[currentPeptideIndex]?.id;
                    removePeptide(peptideId);
                    // Move to previous peptide if we deleted the last one
                    if (currentPeptideIndex >= safeForm.peptides.length - 1) {
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
              
              {/* Pagination Dots - Overlay on bottom of vial */}
              {safeForm.peptides && safeForm.peptides.length > 1 && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1" style={{ marginBottom: '-20px', zIndex: 10 }}>
                  <p className="text-xs italic" style={{ color: theme.textLight, opacity: 0.6 }}>
                    Swipe to change peptides
                  </p>
                  <div className="flex justify-center gap-2.5 h-3">
                    {safeForm.peptides.map((peptide, idx) => (
                      <button
                        key={peptide.id}
                        onClick={() => setCurrentPeptideIndex(idx)}
                        className="w-3 h-3 rounded-full transition-all hover:scale-125 cursor-pointer"
                        style={{
                          backgroundColor: idx === currentPeptideIndex ? theme.primary : theme.border,
                          opacity: idx === currentPeptideIndex ? 1 : 0.4
                        }}
                        aria-label={`Peptide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Bottom section - add button */}
            <div className="w-full space-y-3">
            
            {/* Add Peptide Button - In second column */}
            {allowAddPeptide && (
              <button
                onClick={addPeptide}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
                style={{
                  backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
                  color: theme.primary,
                  border: `1.5px solid ${theme.primary}20`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.primary + '15';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : theme.secondary;
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
            )}
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
                            deliveryMethod: 'pipette',
                            peptides: prev.peptides.map(p => ({ ...p, doseUnit: 'mcg' }))
                        }));
                    }}
                    className={`w-full flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold transition-all`}
                    style={{
                        backgroundColor: deliveryMethod === 'pipette' ? theme.primary : (theme.isDark ? '#1f2937' : theme.secondary),
                        color: deliveryMethod === 'pipette' ? theme.textOnPrimary : theme.text,
                        borderColor: deliveryMethod === 'pipette' ? theme.primary : theme.border
                    }}
                    onMouseEnter={(e) => {
                        if (deliveryMethod !== 'pipette') {
                            e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.primary + '15';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (deliveryMethod !== 'pipette') {
                            e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : theme.secondary;
                        }
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
                            deliveryMethod: 'pen',
                            peptides: prev.peptides.map(p => ({ ...p, doseUnit: 'mcg' }))
                        }));
                    }}
                    className={`w-full flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold transition-all`}
                    style={{
                        backgroundColor: deliveryMethod === 'pen' ? theme.primary : (theme.isDark ? '#1f2937' : theme.secondary),
                        color: deliveryMethod === 'pen' ? theme.textOnPrimary : theme.text,
                        borderColor: deliveryMethod === 'pen' ? theme.primary : theme.border
                    }}
                    onMouseEnter={(e) => {
                        if (deliveryMethod !== 'pen') {
                            e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.primary + '15';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (deliveryMethod !== 'pen') {
                            e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : theme.secondary;
                        }
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
                            deliveryMethod: 'nasal',
                            peptides: prev.peptides.map(p => ({ ...p, doseUnit: 'sprays' }))
                        }));
                    }}
                    className={`w-full flex items-center justify-center gap-2 p-2 rounded-md border text-xs font-semibold transition-all`}
                    style={{
                        backgroundColor: deliveryMethod === 'nasal' ? theme.primary : (theme.isDark ? '#1f2937' : theme.secondary),
                        color: deliveryMethod === 'nasal' ? theme.textOnPrimary : theme.text,
                        borderColor: deliveryMethod === 'nasal' ? theme.primary : theme.border
                    }}
                    onMouseEnter={(e) => {
                        if (deliveryMethod !== 'nasal') {
                            e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.primary + '15';
                        }
                    }}
                    onMouseLeave={(e) => {
                        if (deliveryMethod !== 'nasal') {
                            e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : theme.secondary;
                        }
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
                                onClick={() => {
                                  setAdministrationRoute(route);
                                  setForm(prev => ({ ...prev, administrationRoute: route }));
                                }}
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
                            onChange={(value) => {
                              setForm(prev => ({ ...prev, penType: value }));
                            }}
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
                            onChange={(hex) => {
                              setPenColor(hex);
                              // Find color name from hex
                              const selectedColor = penColors.find(p => p.hex === hex);
                              if (selectedColor) {
                                setForm(prev => ({ ...prev, penColor: selectedColor.name }));
                              }
                            }}
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
            {(safeForm.peptides || []).map((p, index) => (
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
                {safeForm.peptides && safeForm.peptides.length > 1 && prefill?.peptides?.length == null && (
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
            {prefill?.peptides?.length == null && (
              <button 
                onClick={addPeptide} 
                className="px-3 py-2 text-sm font-semibold rounded-md transition-all" 
                style={{ 
                  backgroundColor: theme.isDark ? '#1f2937' : theme.secondary,
                  color: theme.primary 
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.primary + '15';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? '#1f2937' : theme.secondary;
                }}
              >
                + Add Peptide
              </button>
            )}
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
        
        <div className="mt-3">
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
            
            // Ensure all form fields are included
            const dataToSave = { 
              ...form, 
              deliveryMethod: form.deliveryMethod || deliveryMethod, 
              administrationRoute: (form.deliveryMethod || deliveryMethod) === 'pipette' ? (form.administrationRoute || administrationRoute) : undefined,
              penType: (form.deliveryMethod || deliveryMethod) === 'pen' ? (form.penType || '') : undefined, 
              penColor: penColorName || form.penColor, 
              cost: form.cost || cost
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


