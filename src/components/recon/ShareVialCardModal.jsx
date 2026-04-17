import React from 'react';
import BottomSheet from '../common/BottomSheet';
import ShareVialCard from './ShareVialCard';

export default function ShareVialCardModal({ open, onClose, theme, form, calc, costPerDose, currentPeptideIndex, deliveryMethod, administrationRoute, penType, penColor }) {
  return (
    <BottomSheet open={open} onClose={onClose} theme={theme} title="Vial Label">
      <div className="p-4">
        <ShareVialCard
          theme={theme}
          form={form}
          calc={calc}
          costPerDose={costPerDose}
          currentPeptideIndex={currentPeptideIndex}
          deliveryMethod={deliveryMethod}
          administrationRoute={administrationRoute}
          penType={penType}
          penColor={penColor}
        />
      </div>
    </BottomSheet>
  );
}
