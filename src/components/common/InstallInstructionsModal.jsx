import React from 'react';
import Modal from './Modal';

const InstallInstructionsModal = ({ open, onClose, theme }) => {
  return (
    <Modal open={open} onClose={onClose} theme={theme} title="Install App">
      <div className="p-6">
        <p className="mb-4" style={{ color: theme.text }}>
          You can install this application on your device for quick and easy access.
        </p>
        <p className="font-semibold" style={{ color: theme.text }}>Installation Steps:</p>
        <ul className="list-disc list-inside mt-2" style={{ color: theme.text }}>
          <li className="mb-2">Open your browser's menu (usually three dots or lines in the corner).</li>
          <li className="mb-2">Look for an option like "Install App," "Add to Home Screen," or "Create Shortcut."</li>
          <li>Follow the on-screen prompts to complete the installation.</li>
        </ul>
        <p className="mt-4 text-sm" style={{ color: theme.textLight }}>
          If you don't see an install option, your browser may not support Progressive Web Apps, or you may need to update it.
        </p>
      </div>
    </Modal>
  );
};

export default InstallInstructionsModal;
