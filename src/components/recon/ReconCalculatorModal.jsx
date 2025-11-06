import React, { useState, useEffect, useCallback, useRef } from 'react'
import Modal from '../common/Modal'
import { ReconCalculatorPanel } from './ReconCalculatorPanel'
import { useAppContext } from '../../context/AppContext'
import { useSubscriptionAccess } from '../../utils/useSubscriptionAccess'
import useAutoSave from '../../utils/useAutoSave'
import AutoSaveIndicator from '../common/AutoSaveIndicator'

export default function ReconCalculatorModal({ open, onClose, theme, prefill }) {
  const { setReconItems } = useAppContext();
  const { isReadOnly } = useSubscriptionAccess();
  const hasLoadedRef = useRef(false);
  const [form, setForm] = useState({
    peptides: [{ id: 1, name: '', mg: '', dose: '', doseUnit: 'mcg' }],
    vendor: '',
    water: 2,
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
        peptides: prefill.peptides || [{ id: 1, name: '', mg: '', dose: '', doseUnit: 'mcg' }],
        vendor: prefill.vendor || '',
        water: prefill.water || 2,
        deliveryMethod: prefill.deliveryMethod || 'pipette',
        administrationRoute: prefill.administrationRoute || 'subq',
        penType: prefill.penType || '',
        penColor: prefill.penColor || '',
        cost: prefill.cost || ''
      };
      // Ensure peptides is always an array
      if (!initialData.peptides || !Array.isArray(initialData.peptides)) {
        initialData.peptides = [{ id: 1, name: '', mg: '', dose: '', doseUnit: 'mcg' }];
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

  return (
    <Modal 
      open={open} 
      onClose={handleClose} 
      title="Peptide Calculator"
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
      maxWidth="max-w-6xl"
      variant="modern"
    >
      {/* Error Display */}
      {saveError && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm font-medium text-red-800">{saveError}</span>
          </div>
        </div>
      )}
      
      {/* Use the calculator panel without its card wrapper for modal */}
      <ReconCalculatorPanel 
        theme={theme} 
        prefill={form}
        isReadOnly={isReadOnly}
        onSave={handleSave}
        noCard={true}
        compact={true}
        formData={form}
        setFormData={setForm}
        reconStrategy={null}
      />
    </Modal>
  )
}
