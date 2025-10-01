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

  // Get element symbol (first letter cap, second lowercase)
  const getElementSymbol = () => {
    if (!currentPeptide?.name) return '';
    const firstTwo = currentPeptide.name.substring(0, 2);
    if (firstTwo.length === 1) return firstTwo.toUpperCase();
    return firstTwo[0].toUpperCase() + firstTwo[1].toLowerCase();
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
        {/* Vial Image with subtle shadow */}
        <img 
          src={vialImage} 
          alt="Vial" 
          className="w-full h-auto"
          style={{ 
            maxWidth: '400px',
            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.08))'
          }}
        />
        
        {/* Text Overlay on White Label Area - Centered layout with hierarchy */}
        <div 
          className="absolute flex flex-col items-center text-center px-4"
          style={{
            top: '46%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '80%',
            height: '30%',
          }}
        >
          {/* Periodic Table Element Logo - Centered as "Brand Logo" */}
          {elementSymbol && (
            <div 
              className="relative border-2 rounded p-2.5 w-16 mb-2"
              style={{ 
                borderColor: theme.primary || '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.08)',
                fontFamily: 'Helvetica, Arial, sans-serif'
              }}
            >
              {/* Atomic Number with mg */}
              <div 
                className="text-[0.6rem] font-bold absolute top-1 left-1.5" 
                style={{ color: theme.primary }}
              >
                {currentMg}mg
              </div>
              
              {/* Element Symbol - First cap, second lowercase */}
              <div 
                className="text-xl font-black text-center pt-1" 
                style={{ 
                  color: theme.primary,
                  fontFamily: 'Helvetica, Arial, sans-serif'
                }}
              >
                {elementSymbol}
              </div>
            </div>
          )}
          
          {/* Vendor Name - Larger but subtle */}
          <div 
            className="text-sm font-semibold mb-1.5 truncate w-full" 
            style={{ color: '#9ca3af' }}
          >
            {form.vendor ? form.vendor.toUpperCase() : 'VENDOR'}
          </div>
          
          {/* Peptide Name - LARGEST/MOST PROMINENT */}
          <div 
            className="text-base font-bold mb-1.5 leading-tight truncate w-full" 
            style={{ color: '#374151' }}
          >
            {peptideName || 'Add peptide name'}
          </div>
          
          {/* MG - Under peptide name */}
          {currentMg && (
            <div 
              className="text-xs font-semibold mb-1" 
              style={{ color: '#6b7280' }}
            >
              {currentMg}mg
            </div>
          )}
          
          {/* Water Amount */}
          {form.water && (
            <div className="text-[0.65rem]" style={{ color: '#9ca3af' }}>
              💧 {form.water}mL
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
