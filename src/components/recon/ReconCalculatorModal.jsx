import React, { useState, useEffect, useCallback, useRef } from 'react'
import BottomSheet from '../common/BottomSheet'
import { ReconCalculatorPanel } from './ReconCalculatorPanel'
import { useAppContext } from '../../context/AppContext'
import { useSubscriptionAccess } from '../../utils/useSubscriptionAccess'
import useAutoSave from '../../utils/useAutoSave'
import AutoSaveIndicator from '../common/AutoSaveIndicator'
import { FilePlus } from 'lucide-react'
import { penColors } from '../../utils/penColors'

export default function ReconCalculatorModal({ open, onClose, theme, prefill }) {
  const { setReconItems } = useAppContext();
  const { isReadOnly } = useSubscriptionAccess();
  const hasLoadedRef = useRef(false);
  const [form, setForm] = useState({
    peptides: [{ id: 1, name: '', mg: '', mgUnit: 'mg', dose: '', doseUnit: 'mcg' }],
    vendor: '',
    vendorId: null,
    water: '',
    deliveryMethod: 'pipette',
    administrationRoute: 'subq',
    penType: '',
    penColor: '',
    cost: ''
  });
  
  // Auto-save functionality - only saves to localStorage, not to recon items
  // Drafts are saved to recon items only when modal closes
  const { isSaving, lastSaved, clearSavedData, markAsSubmitted } = useAutoSave(
    `recon_form_new`,
    form,
    setForm,
    2000, // 2 second delay
    null // No callback - we'll save drafts manually when closing
  );
  
  // State for save operations
  const [isSavingToRecon, setIsSavingToRecon] = useState(false);
  const [saveError, setSaveError] = useState(null);
  
  // Only initialize form data when modal opens if no autosaved data was loaded
  useEffect(() => {
    if (open && prefill && !hasLoadedRef.current) {
      const initialData = {
        peptides: prefill.peptides || [{ id: 1, name: '', mg: '', mgUnit: 'mg', dose: '', doseUnit: 'mcg' }],
        vendor: prefill.vendor || '',
        vendorId: prefill.vendorId || null,
        water: prefill.water || '',
        deliveryMethod: prefill.deliveryMethod || 'pipette',
        administrationRoute: prefill.administrationRoute || 'subq',
        penType: prefill.penType || '',
        penColor: prefill.penColor || '',
        cost: prefill.cost || ''
      };
      // Ensure peptides is always an array and has mgUnit
      if (!initialData.peptides || !Array.isArray(initialData.peptides)) {
        initialData.peptides = [{ id: 1, name: '', mg: '', mgUnit: 'mg', dose: '', doseUnit: 'mcg' }];
      } else {
        // Ensure all peptides have mgUnit
        initialData.peptides = initialData.peptides.map(p => ({
          ...p,
          mgUnit: p.mgUnit || 'mg'
        }));
      }
      setForm(initialData);
      hasLoadedRef.current = true;
    } else if (!open) {
      // Reset the flag when modal closes
      hasLoadedRef.current = false;
    }
  }, [open, prefill]);

  const handleSave = async (data) => {
    try {
      setIsSavingToRecon(true);
      setSaveError(null);
      
      const peptideNames = data.peptides.map(p => p.name || 'Unnamed').join(' + ');
      const totalMg = data.peptides.reduce((sum, p) => sum + (Number(p.mg) || 0), 0);
      const totalDose = data.peptides.reduce((sum, p) => {
        const dose = Number(p.dose) || 0;
        return p.doseUnit === 'mg' ? sum + (dose * 1000) : sum + dose;
      }, 0);

      const newItem = {
        id: Date.now(),
        peptide: peptideNames,
        mg: totalMg,
        dose: totalDose, // This is now total mcg for calculation purposes
        vendor: data.vendor,
        water: data.water,
        deliveryMethod: data.deliveryMethod,
        administrationRoute: data.administrationRoute,
        penType: data.penType,
        penColor: data.penColor,
        cost: data.cost,
        date: new Date().toISOString(),
        peptides: data.peptides, // Save the full peptide list
        notes: '',
        isDraft: false
      };
      
      // Remove any draft versions of this item when saving as complete
      setReconItems(prev => {
        const filtered = prev.filter(item => !item.isDraft || item.peptide !== newItem.peptide);
        return [newItem, ...filtered];
      });
      markAsSubmitted();
      onClose();
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Reconstitution saved!', type: 'success' } }));
    } catch (error) {
      console.error('❌ Failed to save reconstitution:', error);
      setSaveError('Failed to save reconstitution. Please try again.');
    } finally {
      setIsSavingToRecon(false);
    }
  };

  // Save draft to recon items list
  const saveDraft = useCallback(() => {
    if (!form || !form.peptides) return;
    
    const hasData = form.peptides?.some(p => p.name) || form.vendor || form.water > 0;
    if (!hasData) return;
    
    const isComplete = form.peptides?.every(p => p.name && p.mg && p.dose) && form.water > 0;
    if (isComplete) return; // Don't save complete forms as drafts
    
    try {
      const peptideNames = form.peptides?.map(p => p.name || 'Unnamed').filter(Boolean).join(' + ') || 'Draft';
      const totalMg = form.peptides?.reduce((sum, p) => sum + (Number(p.mg) || 0), 0) || 0;
      const totalDose = form.peptides?.reduce((sum, p) => {
        const dose = Number(p.dose) || 0;
        return p.doseUnit === 'mg' ? sum + (dose * 1000) : sum + dose;
      }, 0) || 0;

      const draftItem = {
        id: `draft_${Date.now()}`,
        peptide: peptideNames,
        mg: totalMg,
        dose: totalDose,
        vendor: form.vendor || '',
        water: form.water || 0,
        deliveryMethod: form.deliveryMethod || 'pipette',
        administrationRoute: form.administrationRoute,
        penType: form.penType,
        penColor: form.penColor,
        cost: form.cost || '',
        date: new Date().toISOString(),
        peptides: form.peptides || [],
        notes: '',
        isDraft: true
      };
      
      setReconItems(prev => {
        // Remove any existing drafts matching this form
        const existingDraftIndex = prev.findIndex(item => item.isDraft && item.peptide === draftItem.peptide);
        const filtered = existingDraftIndex >= 0 
          ? prev.filter((_, idx) => idx !== existingDraftIndex)
          : prev.filter(item => !item.isDraft || item.id !== draftItem.id);
        return [draftItem, ...filtered];
      });
    } catch (error) {
      console.warn('Failed to save draft:', error);
    }
  }, [form, setReconItems]);

  // Auto-save draft before closing if there's meaningful data
  const handleClose = async () => {
    // Save as draft if there's incomplete data
    if (!isSavingToRecon) {
      saveDraft();
    }
    
    markAsSubmitted();
    clearSavedData();
    onClose();
  };

  // Get primary action gradient for save button
  const getPrimaryActionGradient = (saving) => {
    const secondaryColor = theme?.secondary || '#d1d5db';
    if (saving) {
      return `linear-gradient(135deg, ${secondaryColor} 0%, ${secondaryColor} 100%)`;
    }
    return `linear-gradient(135deg, ${theme?.primary} 0%, ${theme?.primaryDark || theme?.primary} 100%)`;
  };
  const primaryActionDefaultShadow = theme?.isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)';
  const primaryActionHoverShadow = theme?.isDark ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.15)';

  // Get current delivery method and pen color from form
  const [deliveryMethod, setDeliveryMethod] = useState('pipette');
  const [penColor, setPenColor] = useState('#9ca3af');
  
  // Sync delivery method and pen color from form when it changes
  useEffect(() => {
    if (form?.deliveryMethod) {
      setDeliveryMethod(form.deliveryMethod);
    }
    if (form?.penColor) {
      setPenColor(form.penColor);
    }
  }, [form?.deliveryMethod, form?.penColor]);

  // Prepare save button data
  const handleSaveClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!form || !form.peptides) {
      console.error('Form data is missing!');
      return;
    }
    
    // Convert hex color to name before saving
    const selectedPenColor = penColors.find(p => p.hex === penColor);
    const penColorName = deliveryMethod === 'pen' ? selectedPenColor?.name : undefined;
    
    // Convert form data to save format
    const dataToSave = {
      ...form,
      peptides: (form.peptides || []).map(pep => ({
        ...pep,
        stockpileId: pep.stockpileId || null,
        quantityUsed: pep.quantityUsed || 1
      })),
      vendorId: form.vendorId || null,
      deliveryMethod: form.deliveryMethod || deliveryMethod,
      administrationRoute: (form.deliveryMethod || deliveryMethod) === 'pipette' ? (form.administrationRoute || 'subq') : undefined,
      penType: (form.deliveryMethod || deliveryMethod) === 'pen' ? (form.penType || '') : undefined,
      penColor: penColorName || form.penColor || '',
      cost: form.cost || '',
      dateAcquired: form.dateAcquired || ''
    };
    
    await handleSave(dataToSave);
  };

  return (
    <BottomSheet 
      open={open} 
      onClose={handleClose} 
      title="Peptide Calculator"
      seamlessContent={true}
      titleExtra={
        <AutoSaveIndicator 
          isSaving={isSaving || isSavingToRecon} 
          lastSaved={lastSaved} 
          onClearForm={clearSavedData} 
          theme={theme}
          compact={true}
          iconOnly={true}
        />
      }
      theme={theme}
      maxHeight="90vh"
      footer={
        <div className="w-full">
          {/* Error Display */}
          {saveError && (
            <div className="mb-3 p-3 rounded-lg border" style={{ 
              backgroundColor: theme.isDark ? 'rgba(220, 38, 38, 0.1)' : '#fef2f2',
              borderColor: theme.error || '#ef4444'
            }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.error || '#ef4444' }}></div>
                <span className="text-sm font-medium" style={{ color: theme.error || '#ef4444' }}>{saveError}</span>
              </div>
            </div>
          )}
          
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={isSavingToRecon || isReadOnly}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:shadow-none disabled:opacity-75 whitespace-nowrap"
            style={{
              background: getPrimaryActionGradient(isSavingToRecon || isReadOnly),
              color: (isSavingToRecon || isReadOnly) ? (theme?.text || '#111827') : (theme?.textOnPrimary || '#ffffff'),
              border: 'none',
              boxShadow: (isSavingToRecon || isReadOnly) ? 'none' : primaryActionDefaultShadow
            }}
            onMouseEnter={(e) => {
              if (isSavingToRecon || isReadOnly) return;
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = primaryActionHoverShadow;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = (isSavingToRecon || isReadOnly) ? 'none' : primaryActionDefaultShadow;
              e.currentTarget.style.background = getPrimaryActionGradient(isSavingToRecon || isReadOnly);
            }}
            title={isReadOnly ? "Upgrade to save calculations" : "Save calculation"}
          >
            <FilePlus size={18} />
            {isSavingToRecon ? 'Saving…' : (isReadOnly ? 'Save Calculation (Upgrade Required)' : 'Save Calculation')}
          </button>
        </div>
      }
    >
      {/* Use the calculator panel without its card wrapper and without save button */}
      <ReconCalculatorPanel 
        theme={theme} 
        prefill={prefill}
        isReadOnly={isReadOnly}
        onSave={null} // Don't show save button in panel - it's in footer
        noCard={true}
        compact={true}
        formData={form}
        setFormData={(newForm) => {
          setForm(newForm);
          // Sync delivery method and pen color for save button
          if (newForm?.deliveryMethod) setDeliveryMethod(newForm.deliveryMethod);
          if (newForm?.penColor) setPenColor(newForm.penColor);
        }}
        reconStrategy={null}
        hideSaveButton={true}
      />
    </BottomSheet>
  )
}
