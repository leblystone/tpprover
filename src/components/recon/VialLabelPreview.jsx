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
          <path 
            d="M 42 52 L 42 202 Q 42 212 52 212 L 132 212 Q 142 212 142 202 L 142 52 Q 142 42 132 42 L 52 42 Q 42 42 42 52 Z"
            fill="#000000"
            opacity="0.1"
          />
          
          {/* Vial Body - Main glass with rounded shoulders */}
          <path 
            d="M 40 50 L 40 200 Q 40 210 50 210 L 130 210 Q 140 210 140 200 L 140 50 Q 140 40 130 40 L 50 40 Q 40 40 40 50 Z"
            fill="url(#glassGradient)"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          
          {/* Glass highlight with rounded shoulders */}
          <path 
            d="M 42 52 L 42 198 Q 42 206 50 206 L 60 206 Q 68 206 68 198 L 68 52 Q 68 44 60 44 L 50 44 Q 42 44 42 52 Z"
            fill="url(#highlight)"
          />
          
          {/* Vial Neck Shadow */}
          <ellipse 
            cx="90" 
            cy="32" 
            rx="22" 
            ry="8" 
            fill="#000000"
            opacity="0.1"
          />
          
          {/* Vial Neck - More rounded */}
          <ellipse 
            cx="90" 
            cy="30" 
            rx="20" 
            ry="6" 
            fill="url(#glassGradient)"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          
          {/* Neck highlight */}
          <ellipse 
            cx="85" 
            cy="30" 
            rx="8" 
            ry="4" 
            fill="url(#highlight)"
          />
          
          {/* Vial Cap Shadow */}
          <ellipse 
            cx="92" 
            cy="17" 
            rx="25" 
            ry="8" 
            fill="#000000"
            opacity="0.2"
          />
          
          {/* Silver Band - Aluminum crimp seal */}
          <ellipse 
            cx="90" 
            cy="25" 
            rx="22" 
            ry="4" 
            fill="#c0c0c0"
            stroke="#a8a8a8"
            strokeWidth="1"
          />
          
          {/* Vial Cap - Theme colored with gradient */}
          <ellipse 
            cx="90" 
            cy="15" 
            rx="25" 
            ry="8" 
            fill="url(#capGradient)"
            stroke={theme.primaryDark || '#1e40af'}
            strokeWidth="2"
          />
          
          {/* Cap highlight */}
          <ellipse 
            cx="85" 
            cy="12" 
            rx="20" 
            ry="4" 
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
          
        </svg>
        
      </div>
    </div>
  );
}
