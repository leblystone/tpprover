import React from 'react';
import Modal from './Modal';

const PwaUnsupportedModal = ({ open, onClose, theme }) => {
  return (
    <Modal open={open} onClose={onClose} theme={theme} title="Installation Not Supported">
      <div className="p-6">
        <p className="mb-4" style={{ color: theme.text }}>
          It looks like your browser does not support Progressive Web App (PWA) installation.
        </p>
        <p style={{ color: theme.text }}>
          To install this app, please try using a modern browser like Chrome, Edge, or Firefox on your desktop or mobile device.
        </p>
      </div>
    </Modal>
  );
};

export default PwaUnsupportedModal;
