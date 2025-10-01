import React from 'react';
import vialImage from '../../assets/vial.png';

export default function VialLabelPreview({ 
  form, 
  deliveryMethod, 
  administrationRoute, 
  penType, 
  penColor, 
  theme 
}) {
  // Get peptide info for display
  const getPeptideInfo = () => {
    if (!form.peptides || form.peptides.length === 0) return null;
    
    return form.peptides
      .filter(p => p.name)
      .map((p, idx) => {
        // Extract abbreviation (e.g., "BPC" from "BPC-157" or first 3 letters)
        const name = p.name || '';
        const parts = name.split('-');
        const abbreviation = parts[0].substring(0, 3).toUpperCase();
        const number = parts[1] || (idx + 1).toString();
        const dosage = p.dosage ? `${p.dosage.amount}${p.dosage.unit}` : '';
        
        return { abbreviation, number, dosage, fullName: name };
      });
  };

  // Get delivery method text
  const getDeliveryText = () => {
    switch (deliveryMethod) {
      case 'syringe':
        return administrationRoute ? administrationRoute.toUpperCase() : 'Syringe';
      case 'pen':
        return penType ? `Pen (${penType})` : 'Pen';
      case 'nasal':
        return 'Nasal';
      default:
        return '';
    }
  };

  const peptideInfo = getPeptideInfo();
  const deliveryText = getDeliveryText();

  return (
    <div className="flex justify-center items-center h-full">
      <div className="relative inline-block">
        {/* Vial Image */}
        <img 
          src={vialImage} 
          alt="Vial" 
          className="w-56 h-auto"
        />
        
        {/* Text Overlay on White Label Area - Positioned to match the label */}
        <div 
          className="absolute flex flex-col justify-center items-center text-center px-2"
          style={{
            top: '48%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '70%',
            height: '25%',
          }}
        >
          {/* Vendor Name */}
          {form.vendor && (
            <div 
              className="text-[0.5rem] font-semibold mb-1 truncate w-full" 
              style={{ color: '#6b7280' }}
            >
              {form.vendor.toUpperCase()}
            </div>
          )}
          
          {/* Periodic Table Style Peptide Elements */}
          {peptideInfo && peptideInfo.length > 0 && (
            <div className="flex flex-wrap gap-1 justify-center mb-1">
              {peptideInfo.map((peptide, idx) => (
                <div 
                  key={idx}
                  className="relative border-2 rounded p-1 min-w-[2.5rem]"
                  style={{ 
                    borderColor: theme.primary || '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.05)'
                  }}
                >
                  {/* Number (like atomic number) */}
                  <div 
                    className="text-[0.4rem] font-bold absolute top-0.5 left-0.5" 
                    style={{ color: theme.primary }}
                  >
                    {peptide.number}
                  </div>
                  
                  {/* Abbreviation (like element symbol) */}
                  <div 
                    className="text-[0.65rem] font-black text-center" 
                    style={{ color: theme.primary }}
                  >
                    {peptide.abbreviation}
                  </div>
                  
                  {/* Dosage (like atomic mass) */}
                  {peptide.dosage && (
                    <div 
                      className="text-[0.35rem] text-center font-medium" 
                      style={{ color: '#6b7280' }}
                    >
                      {peptide.dosage}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {/* Water Amount */}
          {form.water && (
            <div className="text-[0.5rem] mb-0.5" style={{ color: '#6b7280' }}>
              💧 {form.water}mL
            </div>
          )}
          
          {/* Delivery Method */}
          {deliveryText && (
            <div className="text-[0.45rem]" style={{ color: '#6b7280' }}>
              {deliveryText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
