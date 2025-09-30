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
        {/* Vial SVG - Clean Line Art Style */}
        <svg 
          width="180" 
          height="240" 
          viewBox="0 0 180 240" 
          className="drop-shadow-sm"
        >
          {/* Vial Body */}
          <rect 
            x="40" 
            y="50" 
            width="100" 
            height="160" 
            rx="10" 
            ry="10"
            fill="white"
            stroke={theme.border || '#374151'}
            strokeWidth="4"
          />
          
          {/* Vial Neck */}
          <rect 
            x="70" 
            y="25" 
            width="40" 
            height="25" 
            fill="white"
            stroke={theme.border || '#374151'}
            strokeWidth="4"
          />
          
          {/* Vial Cap - Flat and realistic */}
          <rect 
            x="65" 
            y="10" 
            width="50" 
            height="15" 
            rx="4" 
            ry="4"
            fill="#9ca3af"
            stroke={theme.border || '#374151'}
            strokeWidth="4"
          />
          
          {/* Cap Detail - Inner circle */}
          <circle 
            cx="90" 
            cy="17" 
            r="5" 
            fill="#6b7280"
            stroke="none"
          />
          
          {/* Label Area Background */}
          <rect 
            x="45" 
            y="65" 
            width="90" 
            height="130" 
            rx="5" 
            ry="5"
            fill="white"
            stroke={theme.border || '#e5e7eb'}
            strokeWidth="1"
          />
        </svg>
        
        {/* Label Content Overlay */}
        <div 
          className="absolute inset-0 flex flex-col justify-center items-center p-3 text-sm"
          style={{ 
            top: '65px',
            left: '45px',
            right: '45px',
            bottom: '45px'
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
            <Droplet size={8} style={{ color: theme.primary }} />
            <span className="text-xs font-medium" style={{ color: theme.text }}>
              {form.water ? `${form.water}mL` : 'Water'}
            </span>
          </div>
          
          {/* Delivery Method */}
          <div className="flex items-center justify-center gap-1 mb-2">
            {deliveryInfo.icon && React.cloneElement(deliveryInfo.icon, { size: 8 })}
            <span className="text-xs" style={{ color: theme.text }}>
              {deliveryInfo.text}
            </span>
          </div>
          
          {/* Pen Color Swatch (if pen delivery) */}
          {deliveryMethod === 'pen' && penColor && (
            <div className="flex items-center justify-center gap-1">
              <div 
                className="w-2 h-2 rounded-full border"
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
    </div>
  );
}
