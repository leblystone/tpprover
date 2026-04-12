import React from 'react';

export default function ShareVialCard({ theme, form, calc, costPerDose, currentPeptideIndex = 0, deliveryMethod, administrationRoute, penType, penColor }) {
  const peptideName = form?.peptides?.[currentPeptideIndex]?.name || form?.peptideName || 'Peptide';
  const mgAmount = calc?.mgAmount || form?.mgAmount || '';
  const volume = calc?.reconVolume || form?.reconVolume || '';
  const concentration = calc?.concentration || '';
  const dose = form?.doseAmount || '';

  return (
    <div
      className="rounded-2xl p-5 shadow-lg max-w-sm mx-auto"
      style={{ backgroundColor: theme?.cardBackground || '#fff', color: theme?.text || '#111', border: `1.5px solid ${theme?.border || '#e5e7eb'}` }}
    >
      <div className="text-center mb-4">
        <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: theme?.textLight }}>Vial Label</p>
        <p className="text-lg font-bold">{peptideName}</p>
      </div>
      <div className="space-y-1.5 text-sm">
        {mgAmount && <div className="flex justify-between"><span style={{ color: theme?.textLight }}>Amount</span><span className="font-medium">{mgAmount} mg</span></div>}
        {volume && <div className="flex justify-between"><span style={{ color: theme?.textLight }}>BAC Water</span><span className="font-medium">{volume} mL</span></div>}
        {concentration && <div className="flex justify-between"><span style={{ color: theme?.textLight }}>Concentration</span><span className="font-medium">{concentration}</span></div>}
        {dose && <div className="flex justify-between"><span style={{ color: theme?.textLight }}>Dose</span><span className="font-medium">{dose}</span></div>}
        {costPerDose && <div className="flex justify-between"><span style={{ color: theme?.textLight }}>Cost/dose</span><span className="font-medium">{costPerDose}</span></div>}
        {administrationRoute && <div className="flex justify-between"><span style={{ color: theme?.textLight }}>Route</span><span className="font-medium">{administrationRoute}</span></div>}
      </div>
    </div>
  );
}
