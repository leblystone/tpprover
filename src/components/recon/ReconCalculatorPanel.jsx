import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import TextInput from '../common/inputs/TextInput'
import ColorSwatchDropdown from '../common/inputs/ColorSwatchDropdown'
import VendorSuggestInput from '../vendors/VendorSuggestInput'
import GlassmorphismDatePicker from '../common/GlassmorphismDatePicker'
import { calculateRecon, getChromeGradient } from '../../utils/recon'
import { penColors } from '../../utils/penColors'
import { formatCurrency } from '../../utils/currencyUtils'
import { PlusCircle, Beaker, Package, ChevronsRight, FilePlus, Trash2, Pen, Droplets, Plus, X, Pipette, TestTube, ChevronDown, ChevronLeft, ChevronRight, Wind, Bookmark, Hand } from 'lucide-react'
import VialLabelPreview from './VialLabelPreview'

export function ReconCalculatorPanel({ theme, prefill, onSave, onSaveDraft, noCard = false, compact = false, isReadOnly = false, onUpgrade, reconStrategy = null, allowRemovePeptide = true, allowAddPeptide = true, formData, setFormData, hideHeader = false, inlineVendorDate = false, hideSaveButton = false, onCalcUpdate }) {
  // Use controlled form if provided, otherwise use internal state
  const [internalForm, setInternalForm] = useState({ 
    vendor: '', 
    vendorId: null, 
    water: '', 
    cost: '',
    dateAcquired: '',
    peptides: [{ id: 1, name: '', mg: '', dose: '', doseUnit: 'mcg', iuConversionFactor: 0.001 }] 
  });
  // Default form structure for fallbacks
  const defaultFormStructure = {
    vendor: '', 
    vendorId: null, 
    water: '', 
    cost: '',
    dateAcquired: '',
    peptides: [{ id: 1, name: '', mg: '', mgUnit: 'mg', dose: '', doseUnit: 'mcg', iuConversionFactor: 0.001 }]
  };

  // Ensure form is never null - always fall back to internalForm if formData is null/undefined
  const form = (formData !== undefined && formData !== null && typeof formData === 'object') ? formData : internalForm;
  // Wrap setFormData to prevent null values from being set
  const setForm = setFormData !== undefined ? (newForm) => {
    // Prevent setting form to null - fall back to default structure
    if (newForm === null || newForm === undefined) {
      setFormData(defaultFormStructure);
    } else if (typeof newForm === 'function') {
      // Handle function updaters - ensure they never receive null
      setFormData(prev => {
        const safePrev = prev || defaultFormStructure;
        return newForm(safePrev);
      });
    } else {
      setFormData(newForm);
    }
  } : setInternalForm;
  
  // Store setForm in ref to prevent dependency issues
  const setFormRef = useRef(setForm);
  useEffect(() => {
    setFormRef.current = setForm;
  }, [setForm]);
  
  // Track if we've already processed the prefill
  const prefillProcessedRef = useRef(false);
  const lastPrefillRef = useRef(null);
  const [prefillJustLoaded, setPrefillJustLoaded] = useState(false);
  
  // Ensure peptides array always exists - memoize to prevent unnecessary recalculations
  const safeForm = useMemo(() => {
    // Double-check that form is valid
    const validForm = (form && typeof form === 'object') ? form : internalForm;
    return {
      ...validForm,
      peptides: (validForm && validForm.peptides && Array.isArray(validForm.peptides)) ? validForm.peptides.map(p => ({
        ...p,
        mgUnit: p.mgUnit || 'mg', // Ensure mgUnit is always set
        iuConversionFactor: p.iuConversionFactor !== undefined ? p.iuConversionFactor : 0.001 // Ensure iuConversionFactor is always set
      })) : [{ id: 1, name: '', mg: '', mgUnit: 'mg', dose: '', doseUnit: 'mcg', iuConversionFactor: 0.001 }]
    };
  }, [form, internalForm]);
  
  const [deliveryMethod, setDeliveryMethod] = useState('pipette');
  const [administrationRoute, setAdministrationRoute] = useState('subq'); // SubQ, IM, IV
  const [penColor, setPenColor] = useState('#9ca3af');
  const [priceUnit, setPriceUnit] = useState('vial');
  const [isPriceFocused, setIsPriceFocused] = useState(false);
  const [isPriceUnitDropdownOpen, setIsPriceUnitDropdownOpen] = useState(false);
  const [currentPeptideIndex, setCurrentPeptideIndex] = useState(0); // For pagination
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isPenTypeDropdownOpen, setIsPenTypeDropdownOpen] = useState(false);
  const penTypeDropdownRef = useRef(null);
  const [peptideMgUnitDropdowns, setPeptideMgUnitDropdowns] = useState({}); // { [peptideId]: boolean }
  const [peptideDoseUnitDropdowns, setPeptideDoseUnitDropdowns] = useState({}); // { [peptideId]: boolean }
  const [isAmountFocused, setIsAmountFocused] = useState(false);
  const [isDoseFocused, setIsDoseFocused] = useState(false);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    if (Object.values(peptideMgUnitDropdowns).every(v => !v) && Object.values(peptideDoseUnitDropdowns).every(v => !v)) return;

    const handleClickOutside = (event) => {
      const isClickInside = event.target.closest('[data-dropdown-container]');
      if (!isClickInside) {
        setPeptideMgUnitDropdowns({});
        setPeptideDoseUnitDropdowns({});
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [peptideMgUnitDropdowns, peptideDoseUnitDropdowns]);
  
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
        // Use first peptide's vendorId if available
        const firstVendorId = prefill.peptides[0]?.vendorId || null;
        
        // Collect documentation from all peptides' stockpile items
        const allDocs = prefill.peptides.flatMap(p => p.documentation || []);
        const firstOrderId = prefill.peptides.find(p => p.orderId)?.orderId || null;

        setForm(prev => ({
          ...(prev || {}),
          vendor: vendors,
          vendorId: firstVendorId,
          cost: prefill.cost || (totalCost > 0 ? totalCost.toString() : ''),
          dateAcquired: prefill.dateAcquired || (prev?.dateAcquired) || '',
          orderId: firstOrderId,
          documentation: allDocs,
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
      } 
      // Simple prefill (single peptide from stockpile page, etc.)
      else if (prefill.peptide) {
        const p = { 
          id: 1, 
          name: prefill.peptide || '', 
          mg: prefill.mg || '', 
          mgUnit: prefill.mgUnit || 'mg', // Include mgUnit to preserve unit context
          // Don't prefill dose - let user enter it
          dose: '', 
          doseUnit: 'mcg',
          vendor: prefill.vendor || '', // Include vendor on peptide
          vendorId: prefill.vendorId || null, // Include vendorId on peptide
          stockpileId: prefill.stockpileId || null,
          quantityUsed: prefill.quantityUsed || 1,
          costPerMg: prefill.costPerMg || '' // Include costPerMg if available (may be cost per mg/g/ml/iu)
        };
        const costValue = (prefill.cost && prefill.cost !== '0' && prefill.cost !== 0) ? String(prefill.cost) : '';
        setForm(prev => ({ 
          ...(prev || {}), 
          vendor: prefill.vendor || '', 
          vendorId: prefill.vendorId || null, // Include vendorId from prefill
          cost: costValue,
          dateAcquired: prefill.dateAcquired || (prev?.dateAcquired) || '',
          orderId: prefill.orderId || null,
          documentation: prefill.documentation || [],
          peptides: [p] 
        }));
      }
      // Handle formData prefill (from modal or draft)
      else if (prefill.vendor !== undefined || prefill.water !== undefined || prefill.peptides) {
        setForm(prev => ({
          ...(prev || {}),
          vendor: prefill.vendor !== undefined ? prefill.vendor : (prev?.vendor || ''),
          water: prefill.water !== undefined ? prefill.water : (prev?.water || ''),
          peptides: prefill.peptides || (prev?.peptides || [{ id: 1, name: '', mg: '', dose: '', doseUnit: 'mcg', iuConversionFactor: 0.001 }]),
          deliveryMethod: prefill.deliveryMethod || (prev?.deliveryMethod || 'pipette'),
          administrationRoute: prefill.administrationRoute || (prev?.administrationRoute || 'subq'),
          penType: prefill.penType || (prev?.penType || ''),
          penColor: prefill.penColor || (prev?.penColor || '#9ca3af'),
          cost: (prefill.cost && prefill.cost !== '0' && prefill.cost !== 0) ? String(prefill.cost) : (prev?.cost || ''),
          dateAcquired: prefill.dateAcquired !== undefined ? prefill.dateAcquired : (prev?.dateAcquired || '')
        }));
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
    if (formData !== undefined && formData !== null) {
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
  }, [formData?.deliveryMethod, formData?.administrationRoute, formData?.penColor, deliveryMethod, administrationRoute, penColor])

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
      doseUnit: firstPeptide.doseUnit || 'mcg',
      iuConversionFactor: firstPeptide.iuConversionFactor || 0.001 // Default: 0.001 mg per IU (common for HCG)
    });
  }, [totalMg, safeForm.water, safeForm.peptides, safeForm.peptides[0]?.dose, safeForm.peptides[0]?.doseUnit, safeForm.peptides[0]?.iuConversionFactor])
  const costPerDose = useMemo(() => {
    // Check if costPerMg is available from prefill or peptides
    const firstPeptide = safeForm.peptides?.[0];
    const costPerUnit = firstPeptide?.costPerMg || prefill?.costPerMg;
    const mgUnit = firstPeptide?.mgUnit || prefill?.mgUnit || 'mg';
    const amount = Number(firstPeptide?.mg || prefill?.mg || 0);
    
    // If costPerUnit is provided, use it to calculate cost per dose
    if (costPerUnit && firstPeptide?.dose) {
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
      } else if (doseUnit === 'iu' || doseUnit === 'IU') {
        // IU to mg conversion: use conversion factor (mg per IU)
        const conversionFactor = Number(firstPeptide.iuConversionFactor) || 0.001; // Default: 0.001 mg per IU
        doseInMg = doseValue * conversionFactor;
      }
      
      if (doseInMg > 0) {
        const costPerUnitNum = Number(costPerUnit);
        if (!isNaN(costPerUnitNum) && costPerUnitNum > 0) {
          // Convert cost per unit to cost per mg based on the unit type
          let costPerMg = costPerUnitNum;
          const unit = (mgUnit || 'mg').toLowerCase();
          
          if (unit === 'g') {
            // Cost per gram -> cost per mg: divide by 1000
            costPerMg = costPerUnitNum / 1000;
          } else if (unit === 'ml') {
            // Cost per ml -> cost per mg: need concentration (mg per ml) to convert properly
            // Without concentration data, we can't accurately convert
            // Skip this calculation and fall back to default method
            costPerMg = 0;
          } else if (unit === 'iu' || unit === 'IU') {
            // Cost per IU -> cost per mg: use conversion factor
            const conversionFactor = Number(firstPeptide?.iuConversionFactor) || 0.001; // Default: 0.001 mg per IU
            if (conversionFactor > 0) {
              costPerMg = costPerUnitNum * conversionFactor;
            } else {
              costPerMg = 0;
            }
          }
          // else: unit is 'mg' or default, costPerUnit is already cost per mg
          
          if (costPerMg > 0) {
            return formatCurrency(costPerMg * doseInMg);
          }
        }
      }
    }
    
    // Fall back to dividing cost by doses per vial (default behavior)
    if (form?.cost && calc.dosesPerVial > 0) {
      return formatCurrency(Number(form.cost) / calc.dosesPerVial);
    }
    
    return '';
  }, [form.cost, calc.dosesPerVial, calc.concentration, safeForm.peptides, prefill?.costPerMg, prefill?.mgUnit])

  // Notify parent (e.g. modal) when calc or costPerDose changes so footer can show fixed results
  useEffect(() => {
    if (typeof onCalcUpdate === 'function') {
      onCalcUpdate(calc, costPerDose);
    }
  }, [calc, costPerDose, onCalcUpdate]);

  const addPeptide = () => {
    const peptides = safeForm.peptides || [];
    const newId = Math.max(0, ...peptides.map(p => p.id || 0)) + 1;
    setForm(prev => {
      const safePrev = prev || defaultFormStructure;
      const currentPeptides = safePrev.peptides && Array.isArray(safePrev.peptides) ? safePrev.peptides : [{ id: 1, name: '', mg: '', mgUnit: 'mg', dose: '', doseUnit: 'mcg', iuConversionFactor: 0.001 }];
      return {...safePrev, peptides: [...currentPeptides, { id: newId, name: '', mg: '', mgUnit: 'mg', dose: '', doseUnit: 'mcg', iuConversionFactor: 0.001 }]};
    });
    // Automatically switch to the new peptide
    setCurrentPeptideIndex(peptides.length);
  }

  const updatePeptide = (id, key, value) => {
    setForm(prev => {
      const safePrev = prev || defaultFormStructure;
      const currentPeptides = safePrev.peptides && Array.isArray(safePrev.peptides) ? safePrev.peptides : [{ id: 1, name: '', mg: '', dose: '', doseUnit: 'mcg', iuConversionFactor: 0.001 }];
      return {
        ...safePrev,
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
      setForm(prev => {
        const safePrev = prev || defaultFormStructure;
        return { ...safePrev, deliveryMethod: 'nasal' };
      });
    }
  }

  const removePeptide = (id) => {
    const peptides = safeForm.peptides || [];
    if (peptides.length > 1) {
        setForm(prev => {
          const safePrev = prev || defaultFormStructure;
          const currentPeptides = safePrev.peptides && Array.isArray(safePrev.peptides) ? safePrev.peptides : [];
          return {...safePrev, peptides: currentPeptides.filter(p => p.id !== id)};
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

  // Handle click outside for price unit dropdown
  useEffect(() => {
    if (!isPriceUnitDropdownOpen) return;

    const handleClickOutside = (event) => {
      const isClickInside = event.target.closest('[data-price-dropdown]');
      if (!isClickInside) {
        setIsPriceUnitDropdownOpen(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isPriceUnitDropdownOpen]);

  const content = (
    <div className={`relative ${compact ? 'px-4 sm:px-5' : ''} ${isReadOnly ? 'max-h-[70vh] md:max-h-none overflow-hidden' : ''}`}>
      {/* Section: Vial Details (matches supplement / New Order modal style) */}
      {!hideHeader && (
        <div className="flex items-center gap-4 mb-4">
          <TestTube size={32} style={{ color: theme.primary }} />
          <div className="flex flex-col gap-0.5 flex-1">
            <h4 className="text-lg font-black tracking-wide" style={{ color: theme.text }}>Vial Details</h4>
            <div className="flex items-center gap-2 ml-1">
              <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                Dosage Setup
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout: Left Content + Visual Preview */}
      <div className="grid grid-cols-1 gap-4 mb-2">
        {/* Left Column: Equal Split for Vial Details and Visual Preview (single column when compact/sidebar) */}
        <div className={`grid grid-cols-1 ${compact ? '' : 'md:grid-cols-2'} gap-4 ${compact ? '' : 'md:gap-6'} items-end`} style={{ minWidth: 0 }}>
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
                    {/* MG with Unit Dropdown */}
                    <div className="relative">
                      <div 
                        className="flex items-stretch rounded-lg"
                        style={{ 
                          border: `1px solid ${isAmountFocused ? theme.primary : (theme.isDark ? '#4b5563' : '#f0eee7')}`,
                          boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                          backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')
                        }}
                      >
                        <input
                          type="text"
                          id="amount-input"
                          value={safeForm.peptides[currentPeptideIndex]?.mg || ''} 
                          onChange={e => updatePeptide(safeForm.peptides[currentPeptideIndex]?.id, 'mg', e.target.value)} 
                          onFocus={() => setIsAmountFocused(true)}
                          onBlur={(e) => {
                            setTimeout(() => {
                              const relatedTarget = e.relatedTarget || document.activeElement
                              const isClickingDropdown = relatedTarget?.closest('[data-dropdown-container]')
                              const peptideId = safeForm.peptides[currentPeptideIndex]?.id
                              if (!isClickingDropdown && !peptideMgUnitDropdowns[peptideId]) {
                                setIsAmountFocused(false)
                              }
                            }, 150)
                          }}
                          placeholder=" "
                          className="flex-1 py-3 outline-none min-w-0 rounded-l-lg"
                          style={{
                            backgroundColor: 'transparent',
                            color: theme.isDark ? theme.text : '#181A18',
                            border: 'none',
                            paddingLeft: '12px',
                            paddingRight: '8px'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const peptideId = safeForm.peptides[currentPeptideIndex]?.id
                            setPeptideMgUnitDropdowns(prev => ({
                              ...prev,
                              [peptideId]: !prev[peptideId]
                            }))
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                          onTouchStart={(e) => e.preventDefault()}
                          className="flex items-center justify-between gap-2 px-3 py-3 flex-shrink-0 rounded-r-lg relative cursor-pointer transition-all border-none outline-none"
                          data-dropdown-container
                          style={{ 
                            borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
                            backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                            color: theme.isDark ? theme.text : '#181A18',
                            minWidth: '80px'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb');
                          }}
                        >
                          <span className="text-sm font-semibold">
                            {(safeForm.peptides[currentPeptideIndex]?.mgUnit || 'mg')}
                          </span>
                          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        {peptideMgUnitDropdowns[safeForm.peptides[currentPeptideIndex]?.id] && (
                          <div className="relative" data-dropdown-container>
                            <div 
                              className="absolute top-full right-0 mt-1 z-50 rounded-lg shadow-lg border overflow-hidden"
                              style={{
                                backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                                borderColor: theme.border,
                                minWidth: '100px',
                                boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                              }}
                            >
                              {[
                                { value: 'mg', label: 'mg' },
                                { value: 'mL', label: 'mL' },
                                { value: 'g', label: 'g' },
                                { value: 'IU', label: 'IU' }
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
                                    onMouseDown={(e) => e.preventDefault()}
                                    onTouchStart={(e) => e.preventDefault()}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      const peptideId = safeForm.peptides[currentPeptideIndex]?.id
                                      updatePeptide(peptideId, 'mgUnit', option.value);
                                      setPeptideMgUnitDropdowns(prev => ({
                                        ...prev,
                                        [peptideId]: false
                                      }));
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                                    style={{
                                      color: (safeForm.peptides[currentPeptideIndex]?.mgUnit || 'mg') === option.value ? theme.primary : theme.text,
                                      backgroundColor: 'transparent',
                                      WebkitTapHighlightColor: 'transparent'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                      e.currentTarget.style.color = theme.primary;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                      e.currentTarget.style.color = (safeForm.peptides[currentPeptideIndex]?.mgUnit || 'mg') === option.value ? theme.primary : theme.text;
                                    }}
                                  >
                                    {option.label}
                                  </button>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <label 
                        htmlFor="amount-input"
                        className="absolute pointer-events-none transition-all"
                        style={{
                          fontSize: (isAmountFocused || (safeForm.peptides[currentPeptideIndex]?.mg && String(safeForm.peptides[currentPeptideIndex]?.mg).trim())) ? '0.75rem' : '0.9375rem',
                          top: (isAmountFocused || (safeForm.peptides[currentPeptideIndex]?.mg && String(safeForm.peptides[currentPeptideIndex]?.mg).trim())) ? '-8px' : '14px',
                          left: (isAmountFocused || (safeForm.peptides[currentPeptideIndex]?.mg && String(safeForm.peptides[currentPeptideIndex]?.mg).trim())) ? '12px' : '16px',
                          right: (isAmountFocused || (safeForm.peptides[currentPeptideIndex]?.mg && String(safeForm.peptides[currentPeptideIndex]?.mg).trim())) ? '90px' : 'auto',
                          padding: (isAmountFocused || (safeForm.peptides[currentPeptideIndex]?.mg && String(safeForm.peptides[currentPeptideIndex]?.mg).trim())) ? '0 4px' : '0',
                          background: (isAmountFocused || (safeForm.peptides[currentPeptideIndex]?.mg && String(safeForm.peptides[currentPeptideIndex]?.mg).trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                          color: (isAmountFocused || (safeForm.peptides[currentPeptideIndex]?.mg && String(safeForm.peptides[currentPeptideIndex]?.mg).trim())) ? theme.primary : (theme.textLight || theme.text),
                          fontWeight: 500
                        }}
                      >
                        Amount
                      </label>
                    </div>
                    <TextInput 
                      label="Water(mL)" 
                      type="number"
                    value={form.water || ''} 
                    onChange={v => {
                      setForm(prev => {
                        const safePrev = prev || defaultFormStructure;
                        return {...safePrev, water: v};
                      });
                    }}
                      placeholder="e.g., 2" 
                      theme={theme}
                      outlined={true}
                      customTextColor={theme.isDark ? null : "#181A18"}
                      customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                    />
                  </div>
                  
                  {/* Dose with Unit Dropdown */}
                  <div className="relative">
                    <div 
                      className="flex items-stretch rounded-lg"
                      style={{ 
                        border: `1px solid ${isDoseFocused ? theme.primary : (theme.isDark ? '#4b5563' : '#f0eee7')}`,
                        boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                        backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')
                      }}
                    >
                      <input
                        type="text"
                        id="dose-input"
                        value={safeForm.peptides[currentPeptideIndex]?.dose || ''} 
                        onChange={e => updatePeptide(safeForm.peptides[currentPeptideIndex]?.id, 'dose', e.target.value)} 
                        onFocus={() => setIsDoseFocused(true)}
                        onBlur={(e) => {
                          setTimeout(() => {
                            const relatedTarget = e.relatedTarget || document.activeElement
                            const isClickingDropdown = relatedTarget?.closest('[data-dropdown-container]')
                            const peptideId = safeForm.peptides[currentPeptideIndex]?.id
                            if (!isClickingDropdown && !peptideDoseUnitDropdowns[peptideId]) {
                              setIsDoseFocused(false)
                            }
                          }, 150)
                        }}
                        placeholder=" "
                        className="flex-1 py-3 outline-none min-w-0 rounded-l-lg"
                        style={{
                          backgroundColor: 'transparent',
                          color: theme.isDark ? theme.text : '#181A18',
                          border: 'none',
                          paddingLeft: '12px',
                          paddingRight: '8px'
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const peptideId = safeForm.peptides[currentPeptideIndex]?.id
                          setPeptideDoseUnitDropdowns(prev => ({
                            ...prev,
                            [peptideId]: !prev[peptideId]
                          }))
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        onTouchStart={(e) => e.preventDefault()}
                        className="flex items-center justify-between gap-2 px-3 py-3 flex-shrink-0 rounded-r-lg relative cursor-pointer transition-all border-none outline-none"
                        data-dropdown-container
                        style={{ 
                          borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
                          backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                          color: theme.isDark ? theme.text : '#181A18',
                          minWidth: '80px'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb');
                        }}
                      >
                        <span className="text-sm font-semibold">
                          {(safeForm.peptides[currentPeptideIndex]?.doseUnit || 'mcg')}
                        </span>
                        <svg width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {peptideDoseUnitDropdowns[safeForm.peptides[currentPeptideIndex]?.id] && (
                        <div className="relative" data-dropdown-container>
                          <div 
                            className="absolute top-full right-0 mt-1 z-[100] rounded-lg shadow-lg border overflow-hidden"
                            style={{
                              backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                              borderColor: theme.border,
                              minWidth: '100px',
                              boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                            }}
                          >
                            {[
                              { value: 'mcg', label: 'mcg' },
                              { value: 'mg', label: 'mg' },
                              { value: 'mL', label: 'mL' },
                              { value: 'iu', label: 'IU' },
                              ...(deliveryMethod === 'nasal' ? [{ value: 'sprays', label: 'sprays' }] : [])
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
                                  onMouseDown={(e) => e.preventDefault()}
                                  onTouchStart={(e) => e.preventDefault()}
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    const peptideId = safeForm.peptides[currentPeptideIndex]?.id
                                    updatePeptide(peptideId, 'doseUnit', option.value);
                                    setPeptideDoseUnitDropdowns(prev => ({
                                      ...prev,
                                      [peptideId]: false
                                    }));
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                                  style={{
                                    color: (safeForm.peptides[currentPeptideIndex]?.doseUnit || 'mcg') === option.value ? theme.primary : theme.text,
                                    backgroundColor: 'transparent',
                                    WebkitTapHighlightColor: 'transparent'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                    e.currentTarget.style.color = theme.primary;
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = (safeForm.peptides[currentPeptideIndex]?.doseUnit || 'mcg') === option.value ? theme.primary : theme.text;
                                  }}
                                >
                                  {option.label}
                                </button>
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <label 
                      htmlFor="dose-input"
                      className="absolute pointer-events-none transition-all"
                      style={{
                        fontSize: (isDoseFocused || (safeForm.peptides[currentPeptideIndex]?.dose && String(safeForm.peptides[currentPeptideIndex]?.dose).trim())) ? '0.75rem' : '0.9375rem',
                        top: (isDoseFocused || (safeForm.peptides[currentPeptideIndex]?.dose && String(safeForm.peptides[currentPeptideIndex]?.dose).trim())) ? '-8px' : '14px',
                        left: (isDoseFocused || (safeForm.peptides[currentPeptideIndex]?.dose && String(safeForm.peptides[currentPeptideIndex]?.dose).trim())) ? '12px' : '16px',
                        padding: (isDoseFocused || (safeForm.peptides[currentPeptideIndex]?.dose && String(safeForm.peptides[currentPeptideIndex]?.dose).trim())) ? '0 4px' : '0',
                        background: (isDoseFocused || (safeForm.peptides[currentPeptideIndex]?.dose && String(safeForm.peptides[currentPeptideIndex]?.dose).trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                        color: (isDoseFocused || (safeForm.peptides[currentPeptideIndex]?.dose && String(safeForm.peptides[currentPeptideIndex]?.dose).trim())) ? theme.primary : (theme.textLight || theme.text),
                        fontWeight: 500
                      }}
                    >
                      Dose
                    </label>
                  </div>
                  
                  {/* IU Conversion Factor - Only show when IU is selected as dose unit */}
                  {(safeForm.peptides[currentPeptideIndex]?.doseUnit === 'iu' || safeForm.peptides[currentPeptideIndex]?.doseUnit === 'IU') && (
                    <div className="relative">
                      <TextInput 
                        label="IU Conversion Factor (mg per IU)" 
                        type="number"
                        step="0.0001"
                        value={safeForm.peptides[currentPeptideIndex]?.iuConversionFactor || '0.001'} 
                        onChange={v => {
                          const peptideId = safeForm.peptides[currentPeptideIndex]?.id;
                          updatePeptide(peptideId, 'iuConversionFactor', v);
                        }}
                        placeholder="0.001" 
                        theme={theme}
                        outlined={true}
                        customTextColor={theme.isDark ? null : "#181A18"}
                        customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                      />
                      <div className="mt-1 text-xs opacity-70" style={{ color: theme.textLight || theme.text }}>
                        Default: 0.001 mg/IU (common for HCG). Adjust based on your peptide's specification.
                      </div>
                    </div>
                  )}
                </>
              )}
              
              {/* Vendor and Date - Can be inline or stacked */}
              {inlineVendorDate ? (
                <div className="grid grid-cols-2 gap-3">
                  <VendorSuggestInput 
                    label="Vendor" 
                    value={safeForm.peptides[currentPeptideIndex]?.vendor || ''} 
                    onChange={v => {
                      // Get vendors list to find vendorId
                      let vendors = [];
                      try { vendors = JSON.parse(localStorage.getItem('tpprover_vendors') || '[]') } catch {}
                      const selectedVendor = vendors.find(vendor => vendor.name === v);
                      const vendorId = selectedVendor ? selectedVendor.id : null;
                      
                      updatePeptide(safeForm.peptides[currentPeptideIndex]?.id, 'vendor', v);
                      updatePeptide(safeForm.peptides[currentPeptideIndex]?.id, 'vendorId', vendorId);
                      // Also update form vendor and vendorId if it's the first peptide
                      if (currentPeptideIndex === 0) {
                        setForm(prev => {
                          const safePrev = prev || defaultFormStructure;
                          return { ...safePrev, vendor: v, vendorId: vendorId };
                        });
                      }
                    }} 
                    placeholder="e.g., Pharm......" 
                    theme={theme}
                    outlined={true}
                    customTextColor={theme.isDark ? null : "#181A18"}
                    customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                  />
                  <GlassmorphismDatePicker
                    value={form.dateAcquired || ''}
                    onChange={(dateString) => setForm(prev => {
                      const safePrev = prev || defaultFormStructure;
                      return { ...safePrev, dateAcquired: dateString };
                    })}
                    theme={theme}
                    placeholder="Date Acquired"
                  />
                </div>
              ) : (
                <>
                  {/* Vendor - Per peptide */}
                  <VendorSuggestInput 
                    label="Vendor" 
                    value={safeForm.peptides[currentPeptideIndex]?.vendor || ''} 
                    onChange={v => {
                      // Get vendors list to find vendorId
                      let vendors = [];
                      try { vendors = JSON.parse(localStorage.getItem('tpprover_vendors') || '[]') } catch {}
                      const selectedVendor = vendors.find(vendor => vendor.name === v);
                      const vendorId = selectedVendor ? selectedVendor.id : null;
                      
                      updatePeptide(safeForm.peptides[currentPeptideIndex]?.id, 'vendor', v);
                      updatePeptide(safeForm.peptides[currentPeptideIndex]?.id, 'vendorId', vendorId);
                      // Also update form vendor and vendorId if it's the first peptide
                      if (currentPeptideIndex === 0) {
                        setForm(prev => {
                          const safePrev = prev || defaultFormStructure;
                          return { ...safePrev, vendor: v, vendorId: vendorId };
                        });
                      }
                    }} 
                    placeholder="e.g., Pharm......" 
                    theme={theme}
                    outlined={true}
                    customTextColor={theme.isDark ? null : "#181A18"}
                    customShadow={theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'}
                  />
                  
                  {/* Date Acquired */}
                  <GlassmorphismDatePicker
                    value={form.dateAcquired || ''}
                    onChange={(dateString) => setForm(prev => {
                      const safePrev = prev || defaultFormStructure;
                      return { ...safePrev, dateAcquired: dateString };
                    })}
                    theme={theme}
                    placeholder="Date Acquired"
                  />
                </>
              )}
              
              {/* Cost */}
              <div className="relative">
                <div 
                  className="flex items-stretch rounded-lg overflow-visible"
                  style={{ 
                    border: `1px solid #f0eee7`,
                    boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                    backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')
                  }}
                >
                  <input 
                    type="text"
                    inputMode="decimal"
                    id="recon-cost-input"
                    value={form.cost === 0 ? '' : (form.cost || '')} 
                    onChange={e => {
                      // Allow only numbers and a single decimal point
                      const value = e.target.value;
                      if (value === '' || /^\d*\.?\d*$/.test(value)) {
                        setForm(prev => {
                          const safePrev = prev || defaultFormStructure;
                          return { ...safePrev, cost: value };
                        });
                      }
                    }} 
                    onFocus={() => setIsPriceFocused(true)}
                    onBlur={(e) => {
                      setTimeout(() => {
                        const relatedTarget = e.relatedTarget || document.activeElement
                        const isClickingDropdown = relatedTarget?.closest('[data-price-dropdown]')
                        if (!isClickingDropdown && !isPriceUnitDropdownOpen) {
                          setIsPriceFocused(false)
                        }
                      }, 150)
                    }}
                    placeholder=" "
                    className="flex-1 py-3 outline-none min-w-0"
                    style={{
                      backgroundColor: 'transparent',
                      color: theme.isDark ? theme.text : '#181A18',
                      border: 'none',
                      paddingLeft: '12px',
                      paddingRight: '4px',
                      textAlign: 'left'
                    }}
                  />
                  <div className="flex items-center pr-2 pointer-events-none">
                    <span 
                      className="text-[10px] font-black uppercase tracking-widest" 
                      style={{ color: '#7F9E95' }}
                    >
                      per
                    </span>
                  </div>
                  <div className="relative flex-shrink-0" data-price-dropdown>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsPriceUnitDropdownOpen(prev => !prev);
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                      onTouchStart={(e) => e.preventDefault()}
                      className="flex items-center justify-between gap-3 px-4 py-3 rounded-r-lg cursor-pointer transition-all border-none outline-none h-full"
                      style={{ 
                        borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
                        backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                        color: theme.isDark ? theme.text : '#181A18',
                        minWidth: '100px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb');
                      }}
                    >
                      <span className="text-sm font-semibold">
                        {(() => {
                          const unit = (priceUnit || 'vial').toLowerCase();
                          if (unit === 'vial') return 'Vial';
                          if (unit === 'mg') return 'mg';
                          if (unit === 'g') return 'g';
                          if (unit === 'iu' || unit === 'IU') return 'IU';
                          if (unit === 'tablet') return 'Tablet';
                          return unit.charAt(0).toUpperCase() + unit.slice(1);
                        })()}
                      </span>
                      <svg 
                        width="14" 
                        height="14" 
                        viewBox="0 0 12 12" 
                        fill="none" 
                        xmlns="http://www.w3.org/2000/svg"
                        style={{ 
                          transform: isPriceUnitDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.2s ease'
                        }}
                      >
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    {isPriceUnitDropdownOpen && (
                      <div 
                        className="absolute top-full right-0 mt-1 z-[100] rounded-lg shadow-lg border overflow-hidden"
                        data-price-dropdown
                        style={{
                          backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                          borderColor: theme.border,
                          minWidth: '120px',
                          boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                        }}
                      >
                        {[
                          { value: 'vial', label: 'Vial' },
                          { value: 'bottle', label: 'Bottle' },
                          { value: 'mg', label: 'mg' },
                          { value: 'g', label: 'g' },
                          { value: 'iu', label: 'IU' },
                          { value: 'tablet', label: 'Tablet' }
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
                              onMouseDown={(e) => e.preventDefault()}
                              onTouchStart={(e) => e.preventDefault()}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                setPriceUnit(option.value);
                                setIsPriceUnitDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                              style={{
                                color: (priceUnit || 'vial') === option.value ? theme.primary : theme.text,
                                backgroundColor: 'transparent',
                                WebkitTapHighlightColor: 'transparent'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                e.currentTarget.style.color = theme.primary;
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                                e.currentTarget.style.color = (priceUnit || 'vial') === option.value ? theme.primary : theme.text;
                              }}
                            >
                              {option.label}
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                  <label 
                    htmlFor="recon-cost-input"
                    className="absolute pointer-events-none transition-all text-left"
                    style={{
                      fontSize: (isPriceFocused || (form.cost && String(form.cost).trim())) ? '0.75rem' : '0.9375rem',
                      top: (isPriceFocused || (form.cost && String(form.cost).trim())) ? '-8px' : '14px',
                      left: (isPriceFocused || (form.cost && String(form.cost).trim())) ? '12px' : '16px',
                      padding: (isPriceFocused || (form.cost && String(form.cost).trim())) ? '0 4px' : '0',
                      background: (isPriceFocused || (form.cost && String(form.cost).trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                      color: (isPriceFocused || (form.cost && String(form.cost).trim())) ? theme.primary : (theme.textLight || theme.text),
                      fontWeight: 500,
                      textAlign: 'left'
                    }}
                  >
                  Cost ($)
                </label>
              </div>
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
            <div className="flex flex-col items-center justify-center" style={{ minWidth: 0, maxWidth: '280px', width: '100%' }}>
              {/* Vial row: left chevron | vial image | right chevron (when multiple peptides) */}
              <div className={`flex items-center justify-center w-full ${safeForm.peptides && safeForm.peptides.length > 1 ? 'gap-2' : ''}`}>
                {safeForm.peptides && safeForm.peptides.length > 1 && (
                  <button
                    onClick={() => {
                      const peptides = safeForm.peptides || [];
                      if (peptides.length > 1) {
                        setCurrentPeptideIndex((prev) => (prev - 1 + peptides.length) % peptides.length);
                      }
                    }}
                    className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all hover:scale-110 touch-manipulation"
                    style={{
                      backgroundColor: theme.isDark ? '#374151' : theme.secondary,
                      color: theme.primary,
                      border: `1px solid ${theme.border}`
                    }}
                    aria-label="Previous peptide"
                    title="Previous peptide"
                  >
                    <ChevronLeft size={18} />
                  </button>
                )}
                <div className="relative flex flex-col items-center justify-center" style={{ minWidth: 0, flex: '1 1 0' }}>
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
                </div>
                {safeForm.peptides && safeForm.peptides.length > 1 && (
                  <button
                    onClick={() => {
                      const peptides = safeForm.peptides || [];
                      if (peptides.length > 1) {
                        setCurrentPeptideIndex((prev) => (prev + 1) % peptides.length);
                      }
                    }}
                    className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full transition-all hover:scale-110 touch-manipulation"
                    style={{
                      backgroundColor: theme.isDark ? '#374151' : theme.secondary,
                      color: theme.primary,
                      border: `1px solid ${theme.border}`
                    }}
                    aria-label="Next peptide"
                    title="Next peptide"
                  >
                    <ChevronRight size={18} />
                  </button>
                )}
              </div>
              {/* Pagination dots only - below vial */}
              {safeForm.peptides && safeForm.peptides.length > 1 && (
                <div className="flex justify-center gap-2.5 h-3 items-center mt-0.5 mb-3">
                  {safeForm.peptides.map((peptide, idx) => (
                    <button
                      key={peptide.id}
                      onClick={() => setCurrentPeptideIndex(idx)}
                      className="w-3 h-3 rounded-full transition-all hover:scale-125 cursor-pointer touch-manipulation"
                      style={{
                        backgroundColor: idx === currentPeptideIndex ? theme.primary : theme.border,
                        opacity: idx === currentPeptideIndex ? 1 : 0.4
                      }}
                      aria-label={`Peptide ${idx + 1}`}
                    />
                  ))}
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
                  border: `1.5px solid ${theme.primary}20`,
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)'
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

        {/* Right Column: Delivery Method (matches supplement / New Order modal style) */}
        <div className="pt-0">
          <div className="flex items-center gap-4 mb-4">
            <Droplets size={32} style={{ color: theme.primary }} />
            <div className="flex flex-col gap-0.5">
              <h4 className="text-lg font-black tracking-wide" style={{ color: theme.text }}>Delivery Method</h4>
              <div className="flex items-center gap-2 ml-1">
                <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }} />
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                  Administration
                </span>
              </div>
            </div>
          </div>
          {/* 2x2 grid on mobile/compact so all 4 fit; single row on sm+ (non-compact) */}
          <div className={`grid grid-cols-2 ${compact ? '' : 'sm:flex sm:flex-row'} gap-1.5 ${compact ? '' : 'sm:gap-1'}`}>
                <button 
                    onClick={() => {
                        setDeliveryMethod('pipette');
                        setForm(prev => {
                            const safePrev = prev || defaultFormStructure;
                            return {
                                ...safePrev,
                                deliveryMethod: 'pipette',
                                peptides: (safePrev.peptides || []).map(p => ({ 
                                    ...p, 
                                    doseUnit: p.doseUnit === 'sprays' ? 'mcg' : (p.doseUnit || 'mcg')
                                }))
                            };
                        });
                    }}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 py-2 sm:flex-1 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all active:scale-95"
                    style={{
                        backgroundColor: deliveryMethod === 'pipette' ? '#445952' : (theme.isDark ? '#1f2937' : '#f5f4f0'),
                        color: deliveryMethod === 'pipette' ? '#fff' : theme.text,
                        border: deliveryMethod === 'pipette' ? '1px solid #3B4240' : `1px solid ${theme.border}`,
                        boxShadow: deliveryMethod === 'pipette' ? 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.06)'
                    }}
                >
                    <Pipette size={14} className="flex-shrink-0" /> <span className="truncate">Syringe</span>
                </button>
                <button 
                    onClick={() => {
                        setDeliveryMethod('pen');
                        setForm(prev => {
                            const safePrev = prev || defaultFormStructure;
                            return {
                                ...safePrev,
                                deliveryMethod: 'pen',
                                peptides: (safePrev.peptides || []).map(p => ({ 
                                    ...p, 
                                    doseUnit: p.doseUnit === 'sprays' ? 'mcg' : (p.doseUnit || 'mcg')
                                }))
                            };
                        });
                    }}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 py-2 sm:flex-1 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all active:scale-95"
                    style={{
                        backgroundColor: deliveryMethod === 'pen' ? '#445952' : (theme.isDark ? '#1f2937' : '#f5f4f0'),
                        color: deliveryMethod === 'pen' ? '#fff' : theme.text,
                        border: deliveryMethod === 'pen' ? '1px solid #3B4240' : `1px solid ${theme.border}`,
                        boxShadow: deliveryMethod === 'pen' ? 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.06)'
                    }}
                >
                    <Pen size={14} className="flex-shrink-0" /> <span className="truncate">Pen</span>
                </button>
                <button 
                    onClick={() => {
                        setDeliveryMethod('nasal');
                        setForm(prev => {
                            const safePrev = prev || defaultFormStructure;
                            return {
                                ...safePrev,
                                deliveryMethod: 'nasal',
                                peptides: (safePrev.peptides || []).map(p => ({ ...p, doseUnit: 'sprays' }))
                            };
                        });
                    }}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 py-2 sm:flex-1 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all active:scale-95"
                    style={{
                        backgroundColor: deliveryMethod === 'nasal' ? '#445952' : (theme.isDark ? '#1f2937' : '#f5f4f0'),
                        color: deliveryMethod === 'nasal' ? '#fff' : theme.text,
                        border: deliveryMethod === 'nasal' ? '1px solid #3B4240' : `1px solid ${theme.border}`,
                        boxShadow: deliveryMethod === 'nasal' ? 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.06)'
                    }}
                >
                    <Wind size={14} className="flex-shrink-0" /> <span className="truncate">Nasal</span>
                </button>
                <button 
                    onClick={() => {
                        setDeliveryMethod('topical');
                        setForm(prev => {
                            const safePrev = prev || defaultFormStructure;
                            return {
                                ...safePrev,
                                deliveryMethod: 'topical',
                                peptides: (safePrev.peptides || []).map(p => ({ 
                                    ...p, 
                                    doseUnit: p.doseUnit === 'sprays' ? 'mcg' : (p.doseUnit || 'mcg')
                                }))
                            };
                        });
                    }}
                    className="flex items-center justify-center gap-1.5 sm:gap-2 px-2 py-2 sm:flex-1 sm:px-4 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-all active:scale-95"
                    style={{
                        backgroundColor: deliveryMethod === 'topical' ? '#445952' : (theme.isDark ? '#1f2937' : '#f5f4f0'),
                        color: deliveryMethod === 'topical' ? '#fff' : theme.text,
                        border: deliveryMethod === 'topical' ? '1px solid #3B4240' : `1px solid ${theme.border}`,
                        boxShadow: deliveryMethod === 'topical' ? 'inset 0 2px 4px rgba(0,0,0,0.25), 0 1px 2px rgba(0,0,0,0.1)' : 'inset 0 1px 3px rgba(0,0,0,0.06)'
                    }}
                >
                    <Hand size={14} className="flex-shrink-0" /> <span className="truncate">Topical</span>
                </button>
            </div>
            
            {/* Administration Route for Droplet */}
            {deliveryMethod === 'pipette' && (
                <div className="mt-3">
                    <div 
                        className="flex items-center gap-1 p-1 rounded-lg" 
                        style={{ 
                            backgroundColor: theme.isDark ? '#1a2028' : '#f0efe9',
                            boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)'
                        }}
                    >
                        {['subq', 'im', 'iv'].map(route => (
                            <button
                                key={route}
                                type="button"
                                onClick={() => {
                                  setAdministrationRoute(route);
                                  setForm(prev => {
                                    const safePrev = prev || defaultFormStructure;
                                    return { ...safePrev, administrationRoute: route };
                                  });
                                }}
                                className="flex-1 px-2 sm:px-4 py-2.5 text-xs font-bold uppercase tracking-widest rounded-md transition-all active:scale-95"
                                style={{
                                    backgroundColor: administrationRoute === route ? '#6B7F77' : 'transparent',
                                    color: administrationRoute === route ? '#fff' : theme.textLight,
                                    boxShadow: administrationRoute === route ? 'inset 0 2px 4px rgba(0,0,0,0.2), 0 1px 2px rgba(0,0,0,0.08)' : 'none'
                                }}
                            >
                                {route}
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
                                      setForm(prev => {
                                        const safePrev = prev || defaultFormStructure;
                                        return { ...safePrev, penType: option.value };
                                      });
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
                                setForm(prev => {
                                  const safePrev = prev || defaultFormStructure;
                                  return { ...safePrev, penColor: selectedColor.name };
                                });
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
                    {/* MG with Unit Dropdown */}
                    <div className="relative">
                      <div 
                        className="flex items-stretch rounded-lg"
                        style={{ 
                          border: `1px solid ${(peptideMgUnitDropdowns[p.id] || (p.mg && String(p.mg).trim())) ? theme.primary : (theme.isDark ? '#4b5563' : '#f0eee7')}`,
                          boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                          backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
                          opacity: prefill?.peptides?.length > 0 ? 0.6 : 1,
                          pointerEvents: prefill?.peptides?.length > 0 ? 'none' : 'auto'
                        }}
                      >
                        <input
                          type="text"
                          id={`amount-input-${p.id}`}
                          value={p.mg || ''} 
                          onChange={e => updatePeptide(p.id, 'mg', e.target.value)} 
                          onFocus={() => {
                            setPeptideMgUnitDropdowns(prev => ({ ...prev, [p.id]: false }));
                          }}
                          onBlur={(e) => {
                            setTimeout(() => {
                              const relatedTarget = e.relatedTarget || document.activeElement
                              const isClickingDropdown = relatedTarget?.closest('[data-dropdown-container]')
                              if (!isClickingDropdown && !peptideMgUnitDropdowns[p.id]) {
                                // Focus lost, dropdown will be handled by click outside
                              }
                            }, 150)
                          }}
                          placeholder=" "
                          disabled={prefill?.peptides?.length > 0}
                          className="flex-1 py-3 outline-none min-w-0 rounded-l-lg disabled:opacity-50"
                          style={{
                            backgroundColor: 'transparent',
                            color: theme.isDark ? theme.text : '#181A18',
                            border: 'none',
                            paddingLeft: '12px',
                            paddingRight: '8px'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPeptideMgUnitDropdowns(prev => ({
                              ...prev,
                              [p.id]: !prev[p.id]
                            }))
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                          onTouchStart={(e) => e.preventDefault()}
                          disabled={prefill?.peptides?.length > 0}
                          className="flex items-center justify-between gap-2 px-3 py-3 flex-shrink-0 rounded-r-lg relative cursor-pointer transition-all border-none outline-none disabled:opacity-50"
                          data-dropdown-container
                          style={{ 
                            borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
                            backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                            color: theme.isDark ? theme.text : '#181A18',
                            minWidth: '80px'
                          }}
                          onMouseEnter={(e) => {
                            if (!prefill?.peptides?.length) {
                              e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb');
                          }}
                        >
                          <span className="text-sm font-semibold">
                            {(p.mgUnit || 'mg')}
                          </span>
                          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        {peptideMgUnitDropdowns[p.id] && (
                          <div className="relative" data-dropdown-container>
                            <div 
                              className="absolute top-full right-0 mt-1 z-50 rounded-lg shadow-lg border overflow-hidden"
                              style={{
                                backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                                borderColor: theme.border,
                                minWidth: '100px',
                                boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                              }}
                            >
                              {[
                                { value: 'mg', label: 'mg' },
                                { value: 'mL', label: 'mL' },
                                { value: 'g', label: 'g' },
                                { value: 'IU', label: 'IU' }
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
                                    onMouseDown={(e) => e.preventDefault()}
                                    onTouchStart={(e) => e.preventDefault()}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      updatePeptide(p.id, 'mgUnit', option.value);
                                      setPeptideMgUnitDropdowns(prev => ({
                                        ...prev,
                                        [p.id]: false
                                      }));
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                                    style={{
                                      color: (p.mgUnit || 'mg') === option.value ? theme.primary : theme.text,
                                      backgroundColor: 'transparent',
                                      WebkitTapHighlightColor: 'transparent'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                      e.currentTarget.style.color = theme.primary;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                      e.currentTarget.style.color = (p.mgUnit || 'mg') === option.value ? theme.primary : theme.text;
                                    }}
                                  >
                                    {option.label}
                                  </button>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <label 
                        htmlFor={`amount-input-${p.id}`}
                        className="absolute pointer-events-none transition-all"
                        style={{
                          fontSize: (peptideMgUnitDropdowns[p.id] || (p.mg && String(p.mg).trim())) ? '0.75rem' : '0.9375rem',
                          top: (peptideMgUnitDropdowns[p.id] || (p.mg && String(p.mg).trim())) ? '-8px' : '14px',
                          left: (peptideMgUnitDropdowns[p.id] || (p.mg && String(p.mg).trim())) ? '12px' : '16px',
                          right: (peptideMgUnitDropdowns[p.id] || (p.mg && String(p.mg).trim())) ? '90px' : 'auto',
                          padding: (peptideMgUnitDropdowns[p.id] || (p.mg && String(p.mg).trim())) ? '0 4px' : '0',
                          background: (peptideMgUnitDropdowns[p.id] || (p.mg && String(p.mg).trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                          color: (peptideMgUnitDropdowns[p.id] || (p.mg && String(p.mg).trim())) ? theme.primary : (theme.textLight || theme.text),
                          fontWeight: 500
                        }}
                      >
                        mg/vial
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    {/* Dose with Unit Dropdown */}
                    <div className="relative">
                      <div 
                        className="flex items-stretch rounded-lg"
                        style={{ 
                          border: `1px solid ${(peptideDoseUnitDropdowns[p.id] || (p.dose && String(p.dose).trim())) ? theme.primary : (theme.isDark ? '#4b5563' : '#f0eee7')}`,
                          boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                          backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
                          opacity: prefill?.peptides?.length > 0 ? 0.6 : 1,
                          pointerEvents: prefill?.peptides?.length > 0 ? 'none' : 'auto'
                        }}
                      >
                        <input
                          type="text"
                          id={`dose-input-${p.id}`}
                          value={p.dose || ''} 
                          onChange={e => updatePeptide(p.id, 'dose', e.target.value)} 
                          onFocus={() => {
                            setPeptideDoseUnitDropdowns(prev => ({ ...prev, [p.id]: false }));
                          }}
                          onBlur={(e) => {
                            setTimeout(() => {
                              const relatedTarget = e.relatedTarget || document.activeElement
                              const isClickingDropdown = relatedTarget?.closest('[data-dropdown-container]')
                              if (!isClickingDropdown && !peptideDoseUnitDropdowns[p.id]) {
                                // Focus lost, dropdown will be handled by click outside
                              }
                            }, 150)
                          }}
                          placeholder=" "
                          disabled={prefill?.peptides?.length > 0}
                          className="flex-1 py-3 outline-none min-w-0 rounded-l-lg disabled:opacity-50"
                          style={{
                            backgroundColor: 'transparent',
                            color: theme.isDark ? theme.text : '#181A18',
                            border: 'none',
                            paddingLeft: '12px',
                            paddingRight: '8px'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setPeptideDoseUnitDropdowns(prev => ({
                              ...prev,
                              [p.id]: !prev[p.id]
                            }))
                          }}
                          onMouseDown={(e) => e.preventDefault()}
                          onTouchStart={(e) => e.preventDefault()}
                          disabled={prefill?.peptides?.length > 0}
                          className="flex items-center justify-between gap-2 px-3 py-3 flex-shrink-0 rounded-r-lg relative cursor-pointer transition-all border-none outline-none disabled:opacity-50"
                          data-dropdown-container
                          style={{ 
                            borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
                            backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                            color: theme.isDark ? theme.text : '#181A18',
                            minWidth: '80px'
                          }}
                          onMouseEnter={(e) => {
                            if (!prefill?.peptides?.length) {
                              e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb');
                          }}
                        >
                          <span className="text-sm font-semibold">
                            {(p.doseUnit || 'mcg')}
                          </span>
                          <svg width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        {peptideDoseUnitDropdowns[p.id] && (
                          <div className="relative" data-dropdown-container>
                            <div 
                              className="absolute top-full right-0 mt-1 z-[100] rounded-lg shadow-lg border overflow-hidden"
                              style={{
                                backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                                borderColor: theme.border,
                                minWidth: '100px',
                                boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                              }}
                            >
                              {[
                                { value: 'mcg', label: 'mcg' },
                                { value: 'mg', label: 'mg' },
                                { value: 'mL', label: 'mL' },
                                { value: 'iu', label: 'IU' },
                                ...(deliveryMethod === 'nasal' ? [{ value: 'sprays', label: 'sprays' }] : [])
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
                                    onMouseDown={(e) => e.preventDefault()}
                                    onTouchStart={(e) => e.preventDefault()}
                                    onClick={(e) => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      updatePeptide(p.id, 'doseUnit', option.value);
                                      setPeptideDoseUnitDropdowns(prev => ({
                                        ...prev,
                                        [p.id]: false
                                      }));
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                                    style={{
                                      color: (p.doseUnit || 'mcg') === option.value ? theme.primary : theme.text,
                                      backgroundColor: 'transparent',
                                      WebkitTapHighlightColor: 'transparent'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                      e.currentTarget.style.color = theme.primary;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'transparent';
                                      e.currentTarget.style.color = (p.doseUnit || 'mcg') === option.value ? theme.primary : theme.text;
                                    }}
                                  >
                                    {option.label}
                                  </button>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <label 
                        htmlFor={`dose-input-${p.id}`}
                        className="absolute pointer-events-none transition-all"
                        style={{
                          fontSize: (peptideDoseUnitDropdowns[p.id] || (p.dose && String(p.dose).trim())) ? '0.75rem' : '0.9375rem',
                          top: (peptideDoseUnitDropdowns[p.id] || (p.dose && String(p.dose).trim())) ? '-8px' : '14px',
                          left: (peptideDoseUnitDropdowns[p.id] || (p.dose && String(p.dose).trim())) ? '12px' : '16px',
                          right: (peptideDoseUnitDropdowns[p.id] || (p.dose && String(p.dose).trim())) ? '90px' : 'auto',
                          padding: (peptideDoseUnitDropdowns[p.id] || (p.dose && String(p.dose).trim())) ? '0 4px' : '0',
                          background: (peptideDoseUnitDropdowns[p.id] || (p.dose && String(p.dose).trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                          color: (peptideDoseUnitDropdowns[p.id] || (p.dose && String(p.dose).trim())) ? theme.primary : (theme.textLight || theme.text),
                          fontWeight: 500
                        }}
                      >
                        Dose
                      </label>
                    </div>
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
                className="px-4 py-3 text-[11px] font-bold uppercase tracking-[0.15em] rounded-xl transition-all border" 
                style={{ 
                  backgroundColor: theme.isDark ? theme.background : theme.secondary + '30',
                  borderColor: theme.border,
                  color: theme.primary,
                  boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.primary + '15';
                  e.currentTarget.style.borderColor = theme.primary + '30';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? theme.background : theme.secondary + '30';
                  e.currentTarget.style.borderColor = theme.border;
                }}
              >
                + Add Peptide
              </button>
            )}
          </div>
        </div>

        {/* Step 3: Results - show inline only when NOT in modal (modal has fixed footer with same summary) */}
        {!onCalcUpdate && (
        <div>
          <div className="my-2 border-t opacity-50" style={{ borderColor: theme.border }} />
          <div 
            className={`rounded-2xl p-4 pb-3 relative overflow-hidden group transition-all duration-300 ${compact ? '' : 'hover:shadow-xl'}`}
            style={{ 
              backgroundColor: theme.isDark ? 'rgba(127, 158, 149, 0.35)' : 'rgba(127, 158, 149, 0.38)',
              ...(compact ? { border: 'none', boxShadow: 'none' } : { border: `1px solid ${theme.primary}40`, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)' })
            }}
          >
            {/* Subtle background decoration */}
            <div 
              className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full opacity-5 pointer-events-none"
              style={{ backgroundColor: theme.primary }}
            ></div>

            <div className="grid grid-cols-3 gap-4 text-center relative z-10">
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-60" style={{ color: theme.text }}>Units/Dose</div>
                <div className="text-2xl font-black tracking-normal" style={{ color: theme.primary }}>
                  {calc.unitsPerDose ? calc.unitsPerDose.toFixed(0) : '-'}
                </div>
              </div>
              <div className="space-y-1 border-x" style={{ borderColor: theme.primary + '15' }}>
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-60" style={{ color: theme.text }}>Doses/Vial</div>
                <div className="text-2xl font-black tracking-normal" style={{ color: theme.primary }}>
                  {calc.dosesPerVial || '-'}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] opacity-60" style={{ color: theme.text }}>Cost/Dose</div>
                <div className="text-2xl font-black tracking-normal" style={{ color: theme.primary }}>
                  {costPerDose || '-'}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-2 mt-1.5 opacity-50">
              <div className="h-px w-8 bg-current"></div>
              <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.textLight }}>
                  {deliveryMethod === 'pipette' ? 'Insulin syringe (U-100)' : deliveryMethod === 'pen' ? 'Dosage pen' : deliveryMethod === 'nasal' ? 'Nasal spray' : 'Topical application'}
              </p>
              <div className="h-px w-8 bg-current"></div>
            </div>
          </div>
        </div>
        )}
        
        {!hideSaveButton && onSave && (
        <div className="mt-1 flex justify-center">
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
            if (!form) {
              console.error('Form data is null or undefined');
              return;
            }
            
            const peptidesWithStockpile = (safeForm.peptides || []).map(pep => ({
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
              cost: form.cost || '',
              dateAcquired: form.dateAcquired || ''
            };
            
            console.log('💾 Saving recon calculation with peptides:', peptidesWithStockpile.map(p => ({
              name: p.name,
              stockpileId: p.stockpileId,
              quantityUsed: p.quantityUsed
            })));
            
            onSave(dataToSave);
          }}
          type="button"
          className="w-fit min-w-[160px] max-w-[220px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-[14px] font-bold uppercase tracking-[0.15em] transition-all duration-300 shadow-xl active:scale-95 sticky bottom-0 z-10 whitespace-nowrap"
          style={{ 
            background: getPrimaryActionGradient(false),
            color: theme?.textOnPrimary || '#ffffff',
            border: 'none',
            boxShadow: `0 10px 20px -5px ${theme.primary}60`
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = `0 15px 30px -5px ${theme.primary}80`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = `0 10px 20px -5px ${theme.primary}60`;
            e.currentTarget.style.background = getPrimaryActionGradient(false);
          }}
        >
          Save Calculation
        </button>
        </div>
        )}
        {onSaveDraft && !hideSaveButton && (
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              
              // Convert hex color to name before saving
              const selectedPenColor = penColors.find(p => p.hex === penColor);
              const penColorName = deliveryMethod === 'pen' ? selectedPenColor?.name : undefined;
              
              // Ensure all form fields are included, and preserve stockpileId/quantityUsed in peptides
              if (!form) {
                console.error('Form data is null or undefined');
                return;
              }
              
              const peptidesWithStockpile = (safeForm.peptides || []).map(pep => ({
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
                cost: form.cost || '',
                dateAcquired: form.dateAcquired || ''
              };
              
              onSaveDraft(dataToSave);
            }}
            type="button"
            className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl text-[11px] font-bold uppercase tracking-[0.15em] transition-all duration-300 border mt-3"
            style={{ 
              backgroundColor: theme.isDark ? theme.background : 'transparent',
              borderColor: theme.border,
              color: theme.textLight
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme.isDark ? theme.cardBackground : theme.primary + '05';
              e.currentTarget.style.borderColor = theme.primary + '30';
              e.currentTarget.style.color = theme.primary;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme.isDark ? theme.background : 'transparent';
              e.currentTarget.style.borderColor = theme.border;
              e.currentTarget.style.color = theme.textLight;
            }}
          >
            <Bookmark size={16} />
            Save as Draft
          </button>
        )}
        {/* Research disclaimer - only show inline when NOT in modal (modal shows it in fixed footer) */}
        {!hideSaveButton && (
        <div 
          className="p-2.5 rounded-2xl text-[10px] font-medium uppercase tracking-wider mt-0.5 text-center border transition-all duration-300 opacity-90" 
          style={{ 
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)', 
            borderColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', 
            color: theme.isDark ? 'rgba(255,255,255,0.5)' : theme.textLight 
          }}
        >
          For research purposes only.<br /><span className="text-[8px]">Always verify calculations with alternative methods.</span>
        </div>
        )}
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
      className={`rounded-xl ${compact ? 'p-4' : 'p-6'} content-card glass-panel-minimal ${compact ? '' : 'shadow-md hover:shadow-lg'} transition-shadow ${prefillJustLoaded ? 'ring-2 ring-offset-2' : ''}`}
      style={{
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
