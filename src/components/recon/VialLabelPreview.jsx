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
        {/* Vial SVG - Realistic Glass Style */}
        <svg 
          width="180" 
          height="240" 
          viewBox="0 0 180 240" 
          className="drop-shadow-lg"
        >
          {/* Vial Body - Glass with gradient */}
          <defs>
            <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.9"/>
              <stop offset="30%" stopColor="#e2e8f0" stopOpacity="0.7"/>
              <stop offset="70%" stopColor="#cbd5e1" stopOpacity="0.8"/>
              <stop offset="100%" stopColor="#f1f5f9" stopOpacity="0.9"/>
            </linearGradient>
            <linearGradient id="capGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={theme.primary || '#3b82f6'}/>
              <stop offset="50%" stopColor={theme.primaryDark || '#1d4ed8'}/>
              <stop offset="100%" stopColor={theme.primaryDark || '#1e40af'}/>
            </linearGradient>
            <linearGradient id="highlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6"/>
              <stop offset="50%" stopColor="#ffffff" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1"/>
            </linearGradient>
          </defs>
          
          {/* Vial Body Shadow */}
          <rect 
            x="42" 
            y="52" 
            width="100" 
            height="160" 
            rx="10" 
            ry="10"
            fill="#000000"
            opacity="0.1"
          />
          
          {/* Vial Body - Main glass */}
          <rect 
            x="40" 
            y="50" 
            width="100" 
            height="160" 
            rx="10" 
            ry="10"
            fill="url(#glassGradient)"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          
          {/* Glass highlight */}
          <rect 
            x="42" 
            y="52" 
            width="20" 
            height="156" 
            rx="8" 
            ry="8"
            fill="url(#highlight)"
          />
          
          {/* Vial Neck Shadow */}
          <rect 
            x="72" 
            y="27" 
            width="40" 
            height="25" 
            fill="#000000"
            opacity="0.1"
          />
          
          {/* Vial Neck */}
          <rect 
            x="70" 
            y="25" 
            width="40" 
            height="25" 
            fill="url(#glassGradient)"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          
          {/* Neck highlight */}
          <rect 
            x="72" 
            y="27" 
            width="8" 
            height="21" 
            fill="url(#highlight)"
          />
          
          {/* Vial Cap Shadow */}
          <rect 
            x="67" 
            y="12" 
            width="50" 
            height="15" 
            rx="4" 
            ry="4"
            fill="#000000"
            opacity="0.2"
          />
          
          {/* Silver Band - Aluminum crimp seal */}
          <rect 
            x="68" 
            y="22" 
            width="44" 
            height="6" 
            rx="3" 
            ry="3"
            fill="#c0c0c0"
            stroke="#a8a8a8"
            strokeWidth="1"
          />
          
          {/* Vial Cap - Theme colored with gradient */}
          <rect 
            x="65" 
            y="10" 
            width="50" 
            height="15" 
            rx="4" 
            ry="4"
            fill="url(#capGradient)"
            stroke={theme.primaryDark || '#1e40af'}
            strokeWidth="2"
          />
          
          {/* Cap highlight */}
          <rect 
            x="67" 
            y="12" 
            width="46" 
            height="6" 
            rx="2" 
            ry="2"
            fill="#ffffff"
            opacity="0.3"
          />
          
          {/* Cap Detail - Rubber stopper */}
          <circle 
            cx="90" 
            cy="17" 
            r="4" 
            fill="#374151"
            stroke="#1f2937"
            strokeWidth="1"
          />
          
          {/* Label Area Background - Semi-transparent */}
          <rect 
            x="45" 
            y="65" 
            width="90" 
            height="130" 
            rx="5" 
            ry="5"
            fill="#ffffff"
            fillOpacity="0.95"
            stroke="#e5e7eb"
            strokeWidth="1"
          />
          
          {/* Label area shadow */}
          <rect 
            x="46" 
            y="66" 
            width="90" 
            height="130" 
            rx="5" 
            ry="5"
            fill="#000000"
            opacity="0.05"
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
