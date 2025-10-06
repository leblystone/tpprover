import React, { useState } from 'react';
import { X, Syringe } from 'lucide-react';
import Modal from './Modal';

export default function InjectionSiteModal({ open, onClose, onConfirm, taskName, theme }) {
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedSide, setSelectedSide] = useState('');
  const [customSite, setCustomSite] = useState('');

  const handleConfirm = () => {
    let injectionSite = '';
    
    if (selectedSite === 'other') {
      injectionSite = customSite.trim();
    } else if (selectedSite && selectedSide) {
      injectionSite = `${selectedSide} ${selectedSite}`;
    } else if (selectedSite) {
      injectionSite = selectedSite;
    }
    
    onConfirm(injectionSite);
    handleClose();
  };

  const handleClose = () => {
    setSelectedSite('');
    setSelectedSide('');
    setCustomSite('');
    onClose();
  };

  const isFormValid = () => {
    if (selectedSite === 'other') {
      return customSite.trim().length > 0;
    } else if (selectedSite === 'abdomen' || selectedSite === 'arm' || selectedSite === 'thigh') {
      return selectedSide.length > 0;
    }
    return false;
  };

  const showSideSelection = selectedSite === 'abdomen' || selectedSite === 'arm' || selectedSite === 'thigh';
  const showCustomInput = selectedSite === 'other';

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Injection Site"
      theme={theme}
      maxWidth="max-w-md"
      variant="modern"
      footer={
        <>
          <button
            onClick={handleClose}
            className="px-4 py-2 rounded-lg text-sm font-medium border transition-all hover:opacity-90"
            style={{ borderColor: theme.border, color: theme.text }}
          >
            Skip
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isFormValid()}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          >
            Confirm
          </button>
        </>
      }
    >
      <div className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" 
               style={{ backgroundColor: `${theme.primary}10` }}>
            <Syringe size={32} style={{ color: theme.primary }} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
            What was your injection site?
          </h3>
          <p className="text-sm" style={{ color: theme.textLight }}>
            For: <span className="font-medium">{taskName}</span>
          </p>
        </div>

        <div className="space-y-4">
          {/* Primary Site Selection */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: theme.text }}>
              Select injection site:
            </label>
            <div className="grid grid-cols-1 gap-2">
              {[
                { value: 'abdomen', label: 'Abdomen' },
                { value: 'arm', label: 'Arm' },
                { value: 'thigh', label: 'Thigh' },
                { value: 'other', label: 'Other' }
              ].map((option) => (
                <label
                  key={option.value}
                  className="flex items-center p-3 rounded-lg border cursor-pointer transition-all hover:bg-opacity-50"
                  style={{ 
                    borderColor: selectedSite === option.value ? theme.primary : theme.border,
                    backgroundColor: selectedSite === option.value ? `${theme.primary}10` : theme.secondary + '20'
                  }}
                >
                  <input
                    type="radio"
                    name="injectionSite"
                    value={option.value}
                    checked={selectedSite === option.value}
                    onChange={(e) => setSelectedSite(e.target.value)}
                    className="sr-only"
                  />
                  <div 
                    className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center`}
                    style={{
                      borderColor: selectedSite === option.value ? theme.primary : theme.border,
                      backgroundColor: selectedSite === option.value ? theme.primary : 'transparent'
                    }}
                  >
                    {selectedSite === option.value && (
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    )}
                  </div>
                  <span className="text-sm font-medium" style={{ color: theme.text }}>
                    {option.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Side Selection */}
          {showSideSelection && (
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: theme.text }}>
                Which side?
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['left', 'right'].map((side) => (
                  <label
                    key={side}
                    className="flex items-center p-3 rounded-lg border cursor-pointer transition-all hover:bg-opacity-50"
                    style={{ 
                      borderColor: selectedSide === side ? theme.primary : theme.border,
                      backgroundColor: selectedSide === side ? `${theme.primary}10` : theme.secondary + '20'
                    }}
                  >
                    <input
                      type="radio"
                      name="side"
                      value={side}
                      checked={selectedSide === side}
                      onChange={(e) => setSelectedSide(e.target.value)}
                      className="sr-only"
                    />
                    <div 
                      className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center`}
                      style={{
                        borderColor: selectedSide === side ? theme.primary : theme.border,
                        backgroundColor: selectedSide === side ? theme.primary : 'transparent'
                      }}
                    >
                      {selectedSide === side && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <span className="text-sm font-medium capitalize" style={{ color: theme.text }}>
                      {side}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Custom Input */}
          {showCustomInput && (
            <div>
              <label className="block text-sm font-medium mb-3" style={{ color: theme.text }}>
                Please specify:
              </label>
              <input
                type="text"
                value={customSite}
                onChange={(e) => setCustomSite(e.target.value)}
                placeholder="Enter injection site..."
                className="w-full p-3 rounded-lg border text-sm"
                style={{ 
                  borderColor: theme.border, 
                  backgroundColor: theme.background,
                  color: theme.text 
                }}
                autoFocus
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
