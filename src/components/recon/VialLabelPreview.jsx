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
  // Get total mg in vial for "atomic number"
  const getTotalMg = () => {
    if (!form.peptides || form.peptides.length === 0) return '';
    return form.peptides.reduce((sum, p) => sum + (Number(p.mg) || 0), 0);
  };

  // Get element symbol (first 2 letters of first peptide)
  const getElementSymbol = () => {
    if (!form.peptides || form.peptides.length === 0) return '';
    const firstPeptide = form.peptides.find(p => p.name);
    if (!firstPeptide) return '';
    return firstPeptide.name.substring(0, 2).toUpperCase();
  };

  // Get full peptide list for below the element
  const getPeptideNames = () => {
    if (!form.peptides || form.peptides.length === 0) return '';
    return form.peptides
      .filter(p => p.name)
      .map(p => p.name)
      .join(' + ');
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

  const totalMg = getTotalMg();
  const elementSymbol = getElementSymbol();
  const peptideNames = getPeptideNames();
  const deliveryText = getDeliveryText();

  return (
    <div className="flex justify-center items-center h-full min-h-[300px] sm:min-h-0">
      <div className="relative inline-block">
        {/* Vial Image */}
        <img 
          src={vialImage} 
          alt="Vial" 
          className="w-48 sm:w-56 h-auto"
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
                  {totalMg}
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
              {totalMg && (
                <div 
                  className="text-[0.45rem] font-semibold" 
                  style={{ color: '#6b7280' }}
                >
                  {totalMg}mg/vial
                </div>
              )}
            </div>
          </div>
          
          {/* Full Peptide Names - One line below */}
          {peptideNames && (
            <div 
              className="text-[0.5rem] font-medium mb-1 leading-tight truncate w-full" 
              style={{ color: '#374151' }}
            >
              {peptideNames}
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
