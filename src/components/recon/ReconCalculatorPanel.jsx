import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import TextInput from '../common/inputs/TextInput'
import CombinedDosageInput from '../common/inputs/CombinedDosageInput'
import ColorSwatchDropdown from '../common/inputs/ColorSwatchDropdown'
import VendorSuggestInput from '../vendors/VendorSuggestInput'
import { calculateRecon, getChromeGradient } from '../../utils/recon'
import { penColors } from '../../utils/penColors'
import { formatCurrency } from '../../utils/currencyUtils'
import { PlusCircle, Beaker, Info, Package, ChevronsRight, FilePlus, Trash2, Pen, Droplets, Plus, X, Pipette, TestTube, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import VialLabelPreview from './VialLabelPreview'

export function ReconCalculatorPanel({ theme, prefill, onSave, onSaveDraft, noCard = false, compact = false, isReadOnly = false, onUpgrade, reconStrategy = null, allowRemovePeptide = true, allowAddPeptide = true, formData, setFormData }) {
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
  const [prefillJustLoaded, setPrefillJustLoaded] = useState(false);
  
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
  const [isPenTypeDropdownOpen, setIsPenTypeDropdownOpen] = useState(false);
  const penTypeDropdownRef = useRef(null);
  const getPrimaryActionGradient = useCallback((saving = false) => {
    const secondaryColor = theme?.secondary || '#d1d5db';
    if (saving) {
      return `linear-gradient(135deg, ${secondaryColor} 0%, ${secondaryColor} 100%)`;
    }
    return `linear-gradient(135deg, ${theme?.primary || '#2563eb'} 0%, ${theme?.primaryDark || theme?.primary || '#1d4ed8'} 100%)`;
  }, [theme]);
  const primaryActionDefaultShadow = useMemo(() => (
    theme?.isDark ? '0 4px 8px rgba(0, 0, 0, 0.35)' : '0 4px 12px rgba(15, 23, 42, 0.18)'
  ), [theme]);
  const primaryActionHoverShadow = useMemo(() => (
    theme?.isDark ? '0 12px 28px rgba(0, 0, 0, 0.55)' : '0 12px 28px rgba(15, 23, 42, 0.24)'
  ), [theme]);

  useEffect(() => {
    // Only process prefill if it's new and different from the last one
    const prefillStr = prefill ? JSON.stringify(prefill) : '';
    if (prefill && prefillStr !== lastPrefillRef.current) {
      lastPrefillRef.current = prefillStr;
      
      // Validate prefill has valid data before using it
      const hasValidPeptide = (prefill.peptide && prefill.peptide.trim() !== '') || 
                             (Array.isArray(prefill.peptides) && prefill.peptides.length > 0 && 
                              prefill.peptides.some(p => p.name && p.name.trim() !== ''));
      
      // Only process prefill if it has a valid peptide name
      // This prevents stale test data from prefilling the calculator
      if (!hasValidPeptide) {
        try { localStorage.removeItem('tpprover_recon_prefill') } catch {}
        return;
      }
      
      // Wizard prefill (multi-peptide)
      if (prefill.peptides && prefill.peptides.length > 0) {
        const vendors = [...new Set(prefill.peptides.map(p => p.vendor).filter(Boolean))].join(', ');
        const totalCost = prefill.peptides.reduce((sum, p) => sum + (Number(p.cost) || 0), 0);
        
        setForm(prev => ({
          ...prev,
          vendor: vendors,
          peptides: prefill.peptides.map((pep, index) => ({ 
            ...pep, 
            id: pep.id || index + 1, 
            doseUnit: pep.doseUnit || 'mcg',
            stockpileId: pep.stockpileId || null,
            quantityUsed: pep.quantityUsed || 1,
            // Only use dose if it's provided and valid, otherwise leave empty
            dose: (pep.dose && pep.dose !== '251' && pep.dose !== 251) ? pep.dose : ''
          }))
        }));
        // Only set cost if it's valid (not 0 or empty)
        const costValue = totalCost > 0 ? String(totalCost) : '';
        setCost(costValue);
      } 
      // Simple prefill (single peptide from stockpile page, etc.)
      else if (prefill.peptide) {
        const p = { 
          id: 1, 
          name: prefill.peptide || '', 
          mg: prefill.mg || '', 
          // Don't prefill dose - let user enter it
          dose: '', 
          doseUnit: 'mcg',
          stockpileId: prefill.stockpileId || null,
          quantityUsed: prefill.quantityUsed || 1,
          costPerMg: prefill.costPerMg || '' // Include costPerMg if available
        };
        setForm(prev => ({ 
          ...prev, 
          vendor: prefill.vendor || '', 
          vendorId: prefill.vendorId || null, // Include vendorId from prefill
          peptides: [p] 
        }));
        // Only set cost if it's valid (not 0 or empty)
        const costValue = (prefill.cost && prefill.cost !== '0' && prefill.cost !== 0) ? String(prefill.cost) : '';
        setCost(costValue);
      }
      // Handle formData prefill (from modal or draft)
      else if (prefill.vendor !== undefined || prefill.water !== undefined || prefill.peptides) {
        setForm(prev => ({
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
        // Only set cost if it's valid (not 0 or empty)
        if (prefill.cost && prefill.cost !== '0' && prefill.cost !== 0) {
          setCost(String(prefill.cost));
        }
      }

      // Trigger pulse animation to alert user that data was loaded
      setPrefillJustLoaded(true);
      setTimeout(() => setPrefillJustLoaded(false), 2000); // Pulse for 2 seconds

      try { localStorage.removeItem('tpprover_recon_prefill') } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      if (formData.cost !== undefined && formData.cost !== cost) {
        setCost(formData.cost);
      }
    }
  }, [formData?.deliveryMethod, formData?.administrationRoute, formData?.penColor, formData?.cost])

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
    // Check if costPerMg is available from prefill or peptides
    const firstPeptide = safeForm.peptides?.[0];
    const costPerMg = firstPeptide?.costPerMg || prefill?.costPerMg;
    
    // If costPerMg is provided, use it to calculate cost per dose
    if (costPerMg && firstPeptide?.dose) {
      const doseValue = Number(firstPeptide.dose) || 0;
      const doseUnit = firstPeptide.doseUnit || 'mcg';
      
      // Convert dose to mg
      let doseInMg = 0;
      if (doseUnit === 'mg') {
        doseInMg = doseValue;
      } else if (doseUnit === 'mcg') {
        doseInMg = doseValue / 1000;
      } else if (doseUnit === 'sprays') {
        // Nasal sprays: typically 100 mcg per spray
        doseInMg = (doseValue * 100) / 1000;
      } else if (doseUnit === 'mL') {
        // For mL dosing, calculate based on concentration
        const concentration = calc.concentration || 0; // mcg per mL
        const doseMcg = doseValue * concentration;
        doseInMg = doseMcg / 1000;
      }
      
      if (doseInMg > 0) {
        const costPerMgNum = Number(costPerMg);
        if (!isNaN(costPerMgNum) && costPerMgNum > 0) {
          return formatCurrency(costPerMgNum * doseInMg);
        }
      }
    }
    
    // Fall back to dividing cost by doses per vial (default behavior)
    if (cost && calc.dosesPerVial > 0) {
      return formatCurrency(Number(cost) / calc.dosesPerVial);
    }
    
    return '';
  }, [cost, calc.dosesPerVial, calc.concentration, safeForm.peptides, prefill?.costPerMg])

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
        peptides: currentPeptides.map(p => {
          if (p.id === id) {
            // Preserve stockpileId and quantityUsed when updating
            return { ...p, [key]: value };
          }
          return p;
        })
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
    // Only enable swipe on mobile
    if (window.innerWidth >= 1024) return;
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    // Only enable swipe on mobile
    if (window.innerWidth >= 1024) return;
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    // Only enable swipe on mobile
    if (window.innerWidth >= 1024) return;
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

  // Handle click outside for pen type dropdown (supports both mouse and touch)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (penTypeDropdownRef.current && !penTypeDropdownRef.current.contains(event.target)) {
        setIsPenTypeDropdownOpen(false);
      }
    };

    if (isPenTypeDropdownOpen) {
      // Support both mouse and touch events for mobile compatibility
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isPenTypeDropdownOpen]);

  const content = (
    <div className={`relative ${isReadOnly ? 'max-h-[70vh] md:max-h-none overflow-hidden' : ''}`}>
      {/* Section Banner - Vial Details */}
      <div 
        className="px-4 py-2.5 rounded-lg flex items-center justify-between relative z-10" 
        style={{ 
          backgroundColor: theme.isDark ? '#374151' : theme.secondary, 
          borderLeft: '4px solid #e0ded7' 
        }}
      >
        <h4 
          className="font-bold text-sm tracking-wider uppercase" 
          style={{ 
            color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', 
            letterSpacing: '0.1em' 
          }}
        >
          VIAL DETAILS
        </h4>
        <TestTube size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
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
            <div className="space-y-3">
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
                    outlined={true}
                    customTextColor={theme.isDark ? null : "#181A18"}
                    customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
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
                      outlined={true}
                      customTextColor={theme.isDark ? null : "#181A18"}
                      customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
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
                      outlined={true}
                      customTextColor={theme.isDark ? null : "#181A18"}
                      customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                    />
                  </div>
                  
                  {/* Dose with integrated unit selector */}
                  <div>
                    <CombinedDosageInput
                      value={{ amount: safeForm.peptides[currentPeptideIndex]?.dose || '', unit: safeForm.peptides[currentPeptideIndex]?.doseUnit || 'mcg' }}
                      onChange={(newValue) => {
                        updatePeptide(safeForm.peptides[currentPeptideIndex]?.id, 'dose', newValue.amount);
                        updatePeptide(safeForm.peptides[currentPeptideIndex]?.id, 'doseUnit', newValue.unit);
                      }}
                      theme={theme}
                      placeholder="e.g., 250"
                      units={['mcg', 'mg', 'mL']}
                      outlined={true}
                      customTextColor={theme.isDark ? null : "#181A18"}
                      customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
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
                placeholder="e.g., Pharm......" 
                theme={theme}
                outlined={true}
                customTextColor={theme.isDark ? null : "#181A18"}
                customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
              />
              
              {/* Cost */}
              <TextInput 
                icon={<Info size={16} />} 
                label="Vial Cost ($)" 
                type="number" 
                value={cost === 0 ? '' : (cost || '')} 
                onChange={v => {
                  // Preserve user input exactly as typed - allow empty strings, don't convert to 0
                  // Only convert to number when needed for calculations (handled in costPerDose)
                  const newValue = v === '' || v === null || v === undefined ? '' : String(v);
                  setCost(newValue);
                  setForm(prev => ({ ...prev, cost: newValue }));
                }} 
                placeholder="e.g., 60" 
                theme={theme}
                outlined={true}
                customTextColor={theme.isDark ? null : "#181A18"}
                customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
              />
            </div>
          </div>

          {/* Visual Vial Preview - Takes 1/2 width */}
          <div 
            className="col-span-1 flex flex-col justify-between items-center relative"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{ marginTop: '0px', zIndex: 1 }}
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
            <div className="relative flex flex-col items-center justify-center" style={{ minWidth: 0, maxWidth: '280px', width: '100%' }}>
              {/* Multiple Peptides Alert Chip - Above vial visual */}
              {safeForm.peptides && safeForm.peptides.length >= 2 && (
                <div 
                  className="absolute px-2.5 py-1 rounded-full flex items-center gap-1.5"
                  style={{ 
                    backgroundColor: theme.primary + '20',
                    border: `1px solid ${theme.primary}40`,
                    top: '10px',
                    zIndex: 5
                  }}
                  title={`${safeForm.peptides.length} peptides configured`}
                >
                  <div className="relative flex items-center justify-center">
                    <div 
                      className="absolute w-1.5 h-1.5 rounded-full animate-ping"
                      style={{ backgroundColor: theme.primary, opacity: 0.75 }}
                    />
                    <div 
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: theme.primary }}
                    />
                  </div>
                  <span className="text-xs font-semibold" style={{ color: theme.primary }}>
                    Multiple Peptides
                  </span>
                </div>
              )}
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
                  className="absolute right-0 w-5 h-5 rounded-full flex items-center justify-center transition-all hover:scale-110"
                  style={{
                    top: '10px',
                    zIndex: 5,
                    background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)',
                    color: '#ffffff',
                    border: 'none',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.15)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
                  }}
                  title="Remove this peptide"
                >
                  <X size={12} />
                </button>
              )}
              
              {/* Pagination Dots - Overlay on bottom of vial */}
              {safeForm.peptides && safeForm.peptides.length > 1 && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1" style={{ marginBottom: '8px', zIndex: 10 }}>
                  <p className="text-xs italic lg:hidden" style={{ color: theme.textLight, opacity: 0.6 }}>
                    Swipe to change peptides
                  </p>
                  <div className="flex items-center justify-center gap-2">
                    {/* Left Arrow - Desktop only */}
                    <button
                      onClick={() => {
                        const peptides = safeForm.peptides || [];
                        if (peptides.length > 1) {
                          setCurrentPeptideIndex((prev) => (prev - 1 + peptides.length) % peptides.length);
                        }
                      }}
                      className="hidden lg:flex items-center justify-center w-6 h-6 rounded-full transition-all hover:scale-110"
                      style={{
                        backgroundColor: theme.isDark ? '#374151' : theme.secondary,
                        color: theme.primary,
                        border: `1px solid ${theme.border}`
                      }}
                      aria-label="Previous peptide"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    
                    {/* Pagination Dots */}
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
                    
                    {/* Right Arrow - Desktop only */}
                    <button
                      onClick={() => {
                        const peptides = safeForm.peptides || [];
                        if (peptides.length > 1) {
                          setCurrentPeptideIndex((prev) => (prev + 1) % peptides.length);
                        }
                      }}
                      className="hidden lg:flex items-center justify-center w-6 h-6 rounded-full transition-all hover:scale-110"
                      style={{
                        backgroundColor: theme.isDark ? '#374151' : theme.secondary,
                        color: theme.primary,
                        border: `1px solid ${theme.border}`
                      }}
                      aria-label="Next peptide"
                    >
                      <ChevronRight size={14} />
                    </button>
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
          <div 
            className="px-4 py-2.5 rounded-lg flex items-center justify-between mb-2" 
            style={{ 
              backgroundColor: theme.isDark ? '#374151' : theme.secondary, 
              borderLeft: '4px solid #e0ded7' 
            }}
          >
            <h4 
              className="font-bold text-sm tracking-wider uppercase" 
              style={{ 
                color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76', 
                letterSpacing: '0.1em' 
              }}
            >
              DELIVERY METHOD
            </h4>
            <Droplets size={20} style={{ color: theme.isDark ? '#7a8770' : theme.primaryDark || '#5F7F76' }} />
          </div>
          <div className="grid grid-cols-3 gap-2">
                <button 
                    onClick={() => {
                        setDeliveryMethod('pipette');
                        // Preserve dose unit when switching to syringe (don't reset to mcg)
                        setForm(prev => ({
                            ...prev,
                            deliveryMethod: 'pipette'
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
                        // Preserve dose unit when switching to pen (don't reset to mcg)
                        setForm(prev => ({
                            ...prev,
                            deliveryMethod: 'pen'
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
                        <div className="relative" ref={penTypeDropdownRef}>
                          <button
                            type="button"
                            onClick={() => setIsPenTypeDropdownOpen(prev => !prev)}
                            onMouseDown={(e) => {
                              // Prevent any parent blur events on mobile
                              e.preventDefault();
                            }}
                            onTouchStart={(e) => {
                              // Prevent any parent blur events on touch devices
                              e.preventDefault();
                            }}
                            className="w-full px-3 py-2 text-sm border rounded-md flex items-center justify-between transition-all hover:border-gray-400 touch-manipulation"
                            style={{
                              borderColor: isPenTypeDropdownOpen ? theme.primary : theme.border,
                              backgroundColor: theme.cardBackground,
                              color: form.penType ? theme.text : theme.textLight,
                              WebkitTapHighlightColor: 'transparent'
                            }}
                          >
                            <span>
                              {form.penType ? (
                                form.penType === 'bird-pen' ? 'Bird Pen' : 
                                form.penType === 'v1' ? 'V1' : 
                                form.penType === 'v2' ? 'V2' : 
                                form.penType === 'v3' ? 'V3' : 
                                form.penType.charAt(0).toUpperCase() + form.penType.slice(1)
                              ) : 'Pen Type'}
                            </span>
                            <ChevronDown 
                              size={16} 
                              className={`transition-transform duration-200 ${isPenTypeDropdownOpen ? 'rotate-180' : ''}`}
                              style={{ color: theme.textLight }}
                            />
                          </button>
                          {isPenTypeDropdownOpen && (
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
                                    onMouseDown={(e) => {
                                      // Prevent blur events on mobile
                                      e.preventDefault();
                                    }}
                                    onTouchStart={(e) => {
                                      // Prevent blur events on touch devices
                                      e.preventDefault();
                                    }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      setForm(prev => ({ ...prev, penType: option.value }));
                                      setIsPenTypeDropdownOpen(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                                    style={{
                                      color: form.penType === option.value ? theme.primary : theme.text,
                                      backgroundColor: 'transparent',
                                      WebkitTapHighlightColor: 'transparent'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                      e.currentTarget.style.color = theme.primary;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                      e.currentTarget.style.color = form.penType === option.value ? theme.primary : theme.text;
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
                            placeholder="Pen Color"
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
            
            // Ensure all form fields are included, and preserve stockpileId/quantityUsed in peptides
            const peptidesWithStockpile = (form.peptides || []).map(pep => ({
              ...pep,
              // Ensure stockpileId and quantityUsed are preserved
              stockpileId: pep.stockpileId || null,
              quantityUsed: pep.quantityUsed || 1
            }));
            
            const dataToSave = { 
              ...form,
              peptides: peptidesWithStockpile,
              vendorId: form.vendorId || null, // Include vendorId if available
              deliveryMethod: form.deliveryMethod || deliveryMethod, 
              administrationRoute: (form.deliveryMethod || deliveryMethod) === 'pipette' ? (form.administrationRoute || administrationRoute) : undefined,
              penType: (form.deliveryMethod || deliveryMethod) === 'pen' ? (form.penType || '') : undefined, 
              penColor: penColorName || form.penColor, 
              cost: form.cost || cost
            };
            
            console.log('💾 Saving recon calculation with peptides:', peptidesWithStockpile.map(p => ({
              name: p.name,
              stockpileId: p.stockpileId,
              quantityUsed: p.quantityUsed
            })));
            
            onSave(dataToSave);
          }}
          type="button"
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95"
          style={{ 
            background: getPrimaryActionGradient(false),
            color: theme?.textOnPrimary || '#ffffff',
            border: 'none',
            boxShadow: primaryActionDefaultShadow
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = primaryActionHoverShadow;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = primaryActionDefaultShadow;
            e.currentTarget.style.background = getPrimaryActionGradient(false);
          }}
        >
          <FilePlus size={16} />
          Save Calculation
        </button>
        {onSaveDraft && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              
              // Convert hex color to name before saving
              const selectedPenColor = penColors.find(p => p.hex === penColor);
              const penColorName = deliveryMethod === 'pen' ? selectedPenColor?.name : undefined;
              
              // Ensure all form fields are included, and preserve stockpileId/quantityUsed in peptides
              const peptidesWithStockpile = (form.peptides || []).map(pep => ({
                ...pep,
                // Ensure stockpileId and quantityUsed are preserved
                stockpileId: pep.stockpileId || null,
                quantityUsed: pep.quantityUsed || 1
              }));
              
              const dataToSave = { 
                ...form,
                peptides: peptidesWithStockpile,
                vendorId: form.vendorId || null, // Include vendorId if available
                deliveryMethod: form.deliveryMethod || deliveryMethod, 
                administrationRoute: (form.deliveryMethod || deliveryMethod) === 'pipette' ? (form.administrationRoute || administrationRoute) : undefined,
                penType: (form.deliveryMethod || deliveryMethod) === 'pen' ? (form.penType || '') : undefined, 
                penColor: penColorName || form.penColor, 
                cost: form.cost || cost
              };
              
              onSaveDraft(dataToSave);
            }}
            type="button"
            className="w-full mt-2 text-sm font-medium transition-all hover:opacity-80 underline"
            style={{ 
              color: theme?.primary || theme?.text || '#2563eb',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Save as Draft
          </button>
        )}
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
    <div 
      className={`rounded-lg p-6 content-card shadow-md hover:shadow-lg transition-shadow ${prefillJustLoaded ? 'ring-2 ring-offset-2' : ''}`}
      style={{ 
        backgroundColor: theme.cardBackground,
        ...(prefillJustLoaded ? {
          ringColor: theme.primary,
          ringOffsetColor: theme.isDark ? '#1f2937' : '#ffffff',
          animation: 'pulse-subtle 2s ease-in-out'
        } : {})
      }}
    >
      {content}
      {/* Add pulse animation keyframes */}
      {prefillJustLoaded && (
        <style>{`
          @keyframes pulse-subtle {
            0%, 100% { 
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              transform: scale(1);
            }
            50% { 
              box-shadow: 0 10px 15px -3px ${theme.primary}40, 0 4px 6px -2px ${theme.primary}30;
              transform: scale(1.01);
            }
          }
        `}</style>
      )}
    </div>
  );
}


