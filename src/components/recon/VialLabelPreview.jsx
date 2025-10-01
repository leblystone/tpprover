import React from 'react';
import vialImage from '../../assets/vial.png';

export default function VialLabelPreview({ 
  form, 
  deliveryMethod, 
  administrationRoute, 
  penType, 
  penColor, 
  theme,
  currentPeptideIndex = 0
}) {
  // Get current peptide
  const currentPeptide = form.peptides?.[currentPeptideIndex];

  // Get mg for current peptide
  const getCurrentMg = () => {
    if (!currentPeptide) return '';
    return currentPeptide.mg || '';
  };

  // Get element symbol (first 2 letters of current peptide)
  const getElementSymbol = () => {
    if (!currentPeptide?.name) return '';
    return currentPeptide.name.substring(0, 2).toUpperCase();
  };

  // Get current peptide name
  const getPeptideName = () => {
    if (!currentPeptide?.name) return '';
    return currentPeptide.name;
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

  const currentMg = getCurrentMg();
  const elementSymbol = getElementSymbol();
  const peptideName = getPeptideName();
  const deliveryText = getDeliveryText();

  return (
    <div className="flex justify-center items-start h-full">
      <div className="relative inline-block">
        {/* Vial Image */}
        <img 
          src={vialImage} 
          alt="Vial" 
          className="w-full h-auto"
          style={{ maxWidth: '280px' }}
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
          {/* Two Column Layout: Element Logo + Vendor/MG */}
          <div className="flex gap-2 mb-1 w-full">
            {/* Left: Periodic Table Element Logo */}
            {elementSymbol && (
              <div 
                className="relative border-2 rounded p-1 w-10 flex-shrink-0"
                style={{ 
                  borderColor: theme.primary || '#3b82f6',
                  backgroundColor: 'rgba(59, 130, 246, 0.08)'
                }}
              >
                  {/* Atomic Number (mg in vial) */}
                  <div 
                    className="text-[0.4rem] font-bold absolute top-0.5 left-0.5" 
                    style={{ color: theme.primary }}
                  >
                    {currentMg}
                  </div>
                
                {/* Element Symbol (first 2 letters) */}
                <div 
                  className="text-[0.75rem] font-black text-center pt-0.5" 
                  style={{ color: theme.primary }}
                >
                  {elementSymbol}
                </div>
              </div>
            )}
            
            {/* Right: Vendor and MG info */}
            <div className="flex-1 text-left">
              {/* Vendor Name */}
              {form.vendor && (
                <div 
                  className="text-[0.5rem] font-bold truncate" 
                  style={{ color: '#374151' }}
                >
                  {form.vendor.toUpperCase()}
                </div>
              )}
              
              {/* MG per vial */}
              {currentMg && (
                <div 
                  className="text-[0.45rem] font-semibold" 
                  style={{ color: '#6b7280' }}
                >
                  {currentMg}mg/vial
                </div>
              )}
            </div>
          </div>
          
          {/* Current Peptide Name - One line below */}
          {peptideName && (
            <div 
              className="text-[0.5rem] font-medium mb-1 leading-tight truncate w-full" 
              style={{ color: '#374151' }}
            >
              {peptideName}
            </div>
          )}
          
          {/* Water Amount */}
          {form.water && (
            <div className="text-[0.45rem] mb-0.5" style={{ color: '#6b7280' }}>
              💧 {form.water}mL
            </div>
          )}
          
          {/* Delivery Method */}
          {deliveryText && (
            <div className="text-[0.4rem]" style={{ color: '#6b7280' }}>
              {deliveryText}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
