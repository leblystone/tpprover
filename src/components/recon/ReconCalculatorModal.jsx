import React, { useState, useEffect } from 'react'
import Modal from '../common/Modal'
import { ReconCalculatorPanel } from './ReconCalculatorPanel'
import { useAppContext } from '../../context/AppContext'
import { useSubscriptionAccess } from '../../utils/useSubscriptionAccess'
import useAutoSave from '../../utils/useAutoSave'
import AutoSaveIndicator from '../common/AutoSaveIndicator'

export default function ReconCalculatorModal({ open, onClose, theme, prefill }) {
  const { setReconItems } = useAppContext();
  const { isReadOnly } = useSubscriptionAccess();
  const [form, setForm] = useState({});
  
  // Auto-save functionality with recon persistence
  const { isSaving, lastSaved, clearSavedData, markAsSubmitted } = useAutoSave(
    `recon_form_new`,
    form,
    setForm,
    2000, // 2 second delay
    async (formData) => {
      // Auto-save to recon items list if there's meaningful data
      if (formData && formData.peptides?.some(p => p.name)) {
        try {
          console.log('🔄 Auto-saving recon data');
          await handleSave(formData);
        } catch (error) {
          console.warn('Auto-save to recon items failed:', error);
        }
      }
    }
  );
  
  // State for save operations
  const [isSavingToRecon, setIsSavingToRecon] = useState(false);
  const [saveError, setSaveError] = useState(null);
  
  useEffect(() => {
    if (open) {
      const initialData = prefill || {
        peptides: [{ name: '', mg: '', dose: '', doseUnit: 'mcg' }],
        vendor: '',
        water: 2,
        deliveryMethod: 'syringe',
        administrationRoute: 'subcutaneous',
        penType: '',
        penColor: '',
        cost: ''
      };
      setForm(initialData);
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
        notes: ''
      };
      
      setReconItems(prev => [newItem, ...prev]);
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

  // Prevent modal from closing if there's unsaved data
  const handleClose = () => {
    // Check if there's meaningful data that hasn't been saved
    const hasData = form && (
      form.peptides?.some(p => p.name) ||
      form.vendor ||
      form.water > 0
    );
    
    if (hasData && !isSavingToRecon) {
      const shouldClose = window.confirm(
        'You have unsaved changes. Are you sure you want to close without saving?'
      );
      if (!shouldClose) return;
    }
    
    onClose();
  };

  return (
    <Modal 
      open={open} 
      onClose={handleClose} 
      title="Peptide Calculator"
      titleExtra={
        <div className="flex items-center gap-2">
          <AutoSaveIndicator 
            isSaving={isSaving || isSavingToRecon} 
            lastSaved={lastSaved} 
            onClearForm={clearSavedData} 
            theme={theme}
            compact={true}
            iconOnly={true}
          />
          {(isSaving || isSavingToRecon) && (
            <span className="text-xs opacity-75" style={{ color: theme.textOnPrimary }}>
              {isSavingToRecon ? 'Saving...' : 'Auto-saving...'}
            </span>
          )}
        </div>
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
      />
    </Modal>
  )
}
