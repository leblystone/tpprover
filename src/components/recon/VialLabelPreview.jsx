import React from 'react';
import vialImage from '../../assets/vial.png';
import mauveVialImage from '../../assets/mauve-vial.png';
import taupeVialImage from '../../assets/taupe-vial.png';

export default function VialLabelPreview({ 
  form, 
  deliveryMethod, 
  administrationRoute, 
  penType, 
  penColor, 
  theme,
  currentPeptideIndex = 0,
  compact = false
}) {
  // Select vial image based on theme
  const getVialImage = () => {
    if (theme.name === 'Mauve') {
      return mauveVialImage;
    } else if (theme.name === 'Taupe') {
      return taupeVialImage;
    }
    return vialImage; // Default vial for all other themes
  };

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
        {/* Vial Image with subtle shadow - Size based on compact prop */}
        <img 
          src={getVialImage()} 
          alt="Vial" 
          className={compact ? "w-32 h-auto" : "w-full h-auto"}
          style={{ 
            maxWidth: compact ? '128px' : '100%',
            filter: 'drop-shadow(0 4px 6px rgba(0, 0, 0, 0.08))'
          }}
        />
        
        {/* Text Overlay on White Label Area - Centered layout with hierarchy */}
        <div 
          className="absolute flex flex-col items-center text-center px-4"
          style={{
            top: '44%',
            left: '53%',
            transform: 'translateX(-50%)',
            width: '80%',
            height: '32%',
          }}
        >
          {/* Periodic Table Element Logo - Smaller, more compact */}
          {elementSymbol && (
            <div 
              className="relative border rounded p-1.5 w-9 mb-0.5"
              style={{ 
                borderColor: theme.primary || '#3b82f6',
                backgroundColor: '#f3f4f6',
                fontFamily: 'Helvetica, Arial, sans-serif'
              }}
            >
              {/* Atomic Number with mg */}
              <div 
                className="text-[0.45rem] font-bold absolute top-0.5 left-0.5" 
                style={{ color: theme.primary }}
              >
                {currentMg}mg
              </div>
              
              {/* Element Symbol - First cap, second lowercase */}
              <div 
                className="text-sm font-black text-center leading-none pt-0.5" 
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
          {currentPeptide?.vendor && (
            <div 
              className="text-xs font-semibold mb-0.5 w-full leading-tight overflow-hidden" 
              style={{ 
                color: '#9ca3af',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {currentPeptide.vendor.toUpperCase()}
            </div>
          )}
          
          {/* Peptide Name - LARGEST/MOST PROMINENT */}
          {peptideName && (
            <div 
              className="text-sm font-bold mb-1.5 w-full overflow-hidden" 
              style={{ 
                color: '#374151',
                lineHeight: '1.1',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {peptideName}
            </div>
          )}
          
          {/* MG - Under peptide name - Larger with sage green */}
          {currentMg && (
            <div 
              className="text-sm font-bold mb-0.5" 
              style={{ color: '#84a98c', lineHeight: '1' }}
            >
              {currentMg}mg
            </div>
          )}
          
          {/* Water Amount */}
          {form.water && (
            <div className="text-[0.6rem]" style={{ color: '#9ca3af', lineHeight: '1' }}>
              💧 {form.water}mL
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
