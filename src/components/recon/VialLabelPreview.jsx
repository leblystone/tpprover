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
      <div className="relative inline-block" style={{ marginLeft: '-5%' }}>
        {/* Vial Image with subtle shadow - Maximum size */}
        <img 
          src={vialImage} 
          alt="Vial" 
          className="w-full h-auto"
          style={{ 
            maxWidth: '100%',
            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.08))'
          }}
        />
        
        {/* Text Overlay on White Label Area - Centered layout with hierarchy */}
        <div 
          className="absolute flex flex-col items-center text-center px-4"
          style={{
            top: '44%',
            left: '54%',
            transform: 'translateX(-50%)',
            width: '80%',
            height: '32%',
          }}
        >
          {/* Periodic Table Element Logo - Smaller, more compact */}
          {elementSymbol && (
            <div 
              className="relative border rounded p-1 w-8 mb-0.5"
              style={{ 
                borderColor: theme.primary || '#3b82f6',
                backgroundColor: '#f3f4f6',
                fontFamily: 'Helvetica, Arial, sans-serif'
              }}
            >
              {/* Atomic Number with mg */}
              <div 
                className="text-[0.4rem] font-bold absolute top-0 left-0.5" 
                style={{ color: theme.primary }}
              >
                {currentMg}mg
              </div>
              
              {/* Element Symbol - First cap, second lowercase */}
              <div 
                className="text-xs font-black text-center leading-none" 
                style={{ 
                  color: theme.primary,
                  fontFamily: 'Helvetica, Arial, sans-serif'
                }}
              >
                {elementSymbol}
              </div>
            </div>
          )}
          
          {/* Vendor Name - Subtle */}
          <div 
            className="text-xs font-semibold mb-0.5 truncate w-full leading-tight" 
            style={{ color: '#9ca3af' }}
          >
            {form.vendor ? form.vendor.toUpperCase() : 'VENDOR'}
          </div>
          
          {/* Peptide Name - LARGEST/MOST PROMINENT */}
          <div 
            className="text-sm font-bold mb-0.5 leading-tight truncate w-full" 
            style={{ color: '#374151' }}
          >
            {peptideName || 'Add peptide name'}
          </div>
          
          {/* MG - Under peptide name */}
          <div 
            className="text-[0.7rem] font-semibold mb-0.5 leading-tight" 
            style={{ color: '#6b7280' }}
          >
            {currentMg ? `${currentMg}mg` : ''}
          </div>
          
          {/* Water Amount */}
          {form.water && (
            <div className="text-[0.6rem] leading-tight" style={{ color: '#9ca3af' }}>
              💧 {form.water}mL
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
