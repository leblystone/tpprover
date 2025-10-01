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
    if (!form.peptides || form.peptides.length === 0) return '';
    
    return form.peptides
      .filter(p => p.name)
      .map(p => p.name)
      .join(' + ') || '';
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
              className="text-[0.65rem] font-bold mb-0.5 truncate w-full" 
              style={{ color: theme.primary }}
            >
              {form.vendor.toUpperCase()}
            </div>
          )}
          
          {/* Peptide Names */}
          {peptideInfo && (
            <div 
              className="text-[0.6rem] font-semibold mb-0.5 leading-tight truncate w-full" 
              style={{ color: '#374151' }}
            >
              {peptideInfo}
            </div>
          )}
          
          {/* Water Amount */}
          {form.water && (
            <div className="text-[0.55rem] mb-0.5" style={{ color: '#6b7280' }}>
              💧 {form.water}mL
            </div>
          )}
          
          {/* Delivery Method */}
          {deliveryText && (
            <div className="text-[0.55rem]" style={{ color: '#6b7280' }}>
              {deliveryText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
