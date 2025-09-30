import React from 'react';
import { Droplet, Syringe, Pen, Droplets } from 'lucide-react';

export default function VialLabelPreview({ 
  form, 
  deliveryMethod, 
  administrationRoute, 
  penType, 
  penColor, 
  theme 
}) {
  // Get pen color hex for display
  const getPenColorHex = () => {
    const colorMap = {
      'red': '#ef4444',
      'blue': '#3b82f6', 
      'green': '#22c55e',
      'yellow': '#eab308',
      'purple': '#a855f7',
      'orange': '#f97316',
      'pink': '#ec4899',
      'gray': '#6b7280',
      'black': '#000000',
      'white': '#ffffff'
    };
    return colorMap[penColor] || '#6b7280';
  };

  // Format peptide info for display
  const getPeptideInfo = () => {
    if (!form.peptides || form.peptides.length === 0) return 'No peptides added';
    
    return form.peptides
      .filter(p => p.name && p.dosage?.amount)
      .map(p => `${p.name} ${p.dosage.amount}${p.dosage.unit || 'mcg'}`)
      .join(' + ') || 'Add peptide details';
  };

  // Get delivery method icon and text
  const getDeliveryInfo = () => {
    switch (deliveryMethod) {
      case 'syringe':
        return { 
          icon: <Syringe size={12} />, 
          text: `Syringe${administrationRoute ? ` (${administrationRoute.toUpperCase()})` : ''}` 
        };
      case 'pen':
        return { 
          icon: <Pen size={12} />, 
          text: `Pen${penType ? ` (${penType})` : ''}` 
        };
      case 'nasal':
        return { 
          icon: <Droplets size={12} />, 
          text: 'Nasal Spray' 
        };
      default:
        return { icon: null, text: 'Select delivery method' };
    }
  };

  const deliveryInfo = getDeliveryInfo();

  return (
    <div className="flex justify-center mb-6">
      <div className="relative">
        {/* Vial Container */}
        <div 
          className="w-32 h-48 rounded-t-full rounded-b-lg border-4 shadow-lg"
          style={{ 
            backgroundColor: '#f8fafc',
            borderColor: theme.border || '#e2e8f0'
          }}
        >
          {/* Vial Label Area */}
          <div 
            className="absolute inset-2 rounded-lg p-2 text-xs"
            style={{ 
              backgroundColor: 'white',
              border: `1px solid ${theme.border || '#e2e8f0'}`,
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)'
            }}
          >
            {/* Vendor Name */}
            <div className="text-center font-bold mb-1" style={{ color: theme.primary }}>
              {form.vendor || 'VENDOR'}
            </div>
            
            {/* Peptide Info */}
            <div className="text-center text-xs mb-2 leading-tight" style={{ color: theme.text }}>
              {getPeptideInfo()}
            </div>
            
            {/* Water Amount */}
            <div className="flex items-center justify-center gap-1 mb-2">
              <Droplet size={10} style={{ color: theme.primary }} />
              <span className="text-xs font-medium" style={{ color: theme.text }}>
                {form.water ? `${form.water}mL` : 'Water'}
              </span>
            </div>
            
            {/* Delivery Method */}
            <div className="flex items-center justify-center gap-1 mb-2">
              {deliveryInfo.icon}
              <span className="text-xs" style={{ color: theme.text }}>
                {deliveryInfo.text}
              </span>
            </div>
            
            {/* Pen Color Swatch (if pen delivery) */}
            {deliveryMethod === 'pen' && penColor && (
              <div className="flex items-center justify-center gap-1">
                <div 
                  className="w-3 h-3 rounded-full border"
                  style={{ 
                    backgroundColor: getPenColorHex(),
                    borderColor: theme.border || '#e2e8f0'
                  }}
                />
                <span className="text-xs" style={{ color: theme.text }}>
                  {penColor}
                </span>
              </div>
            )}
          </div>
        </div>
        
        {/* Vial Cap */}
        <div 
          className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-8 h-4 rounded-t-full"
          style={{ backgroundColor: theme.border || '#e2e8f0' }}
        />
      </div>
    </div>
  );
}
