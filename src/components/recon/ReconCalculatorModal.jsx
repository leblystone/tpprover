import React from 'react'
import Modal from '../common/Modal'
import { ReconCalculatorPanel } from './ReconCalculatorPanel'
import { useAppContext } from '../../context/AppContext'
import { useSubscriptionAccess } from '../../utils/useSubscriptionAccess'

export default function ReconCalculatorModal({ open, onClose, theme, prefill }) {
  const { setReconItems } = useAppContext();
  const { isReadOnly } = useSubscriptionAccess();

  const handleSave = (data) => {
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
    onClose();
    window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Reconstitution saved!', type: 'success' } }));
  };

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      title="Peptide Calculator" 
      theme={theme} 
      maxWidth="max-w-6xl"
      variant="modern"
    >
      {/* Use the calculator panel without its card wrapper for modal */}
      <ReconCalculatorPanel 
        theme={theme} 
        prefill={prefill}
        isReadOnly={isReadOnly}
        onSave={handleSave}
        noCard={true}
        compact={true}
      />
    </Modal>
  )
}
