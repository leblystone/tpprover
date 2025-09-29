import React from 'react';
import Modal from '../common/Modal';

// Placeholder component - replace with actual implementation from other chat
export default function MergeConfirmationModal({ 
  open, 
  onClose, 
  theme, 
  duplicates = [], 
  onConfirmMerge = () => {} 
}) {
  if (!open) return null;

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      theme={theme}
      title="Merge Confirmation"
    >
      <div className="p-4">
        <p className="mb-4" style={{ color: theme.text }}>
          This is a placeholder component. The actual merge functionality 
          is being developed in another chat session.
        </p>
        
        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
            style={{ borderColor: theme.border, color: theme.text }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirmMerge();
              onClose();
            }}
            className="px-4 py-2 rounded-lg hover:opacity-90"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          >
            Confirm
          </button>
        </div>
      </div>
    </Modal>
  );
}
