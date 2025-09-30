import React from 'react';

export default function VialLabelPreview({ 
  form, 
  deliveryMethod, 
  administrationRoute, 
  penType, 
  penColor, 
  theme 
}) {
  return (
    <div className="flex justify-center mb-6">
      <div className="relative">
        {/* Flat 2D Vial */}
        <svg 
          width="120" 
          height="180" 
          viewBox="0 0 120 180" 
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Vial Body - Simple rectangle */}
          <rect 
            x="35" 
            y="55" 
            width="50" 
            height="110" 
            rx="6"
            fill="white"
            stroke="#374151"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Shoulder - flat trapezoid */}
          <path 
            d="M 35 55 L 30 45 L 30 42 L 90 42 L 90 45 L 85 55"
            fill="white"
            stroke="#374151"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Neck - thin rectangle */}
          <rect 
            x="50" 
            y="30" 
            width="20" 
            height="12" 
            fill="white"
            stroke="#374151"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Aluminum Crimp - Grey rectangle */}
          <rect 
            x="45" 
            y="22" 
            width="30" 
            height="10" 
            fill="#c0c0c0"
            stroke="#374151"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Crimp top line */}
          <line 
            x1="45" 
            y1="22" 
            x2="75" 
            y2="22" 
            stroke="#374151"
            strokeWidth="2.5"
          />
          
          {/* Crimp bottom line */}
          <line 
            x1="45" 
            y1="32" 
            x2="75" 
            y2="32" 
            stroke="#374151"
            strokeWidth="2.5"
          />
          
          {/* Cap - Flat rectangle (Theme colored) */}
          <rect 
            x="38" 
            y="12" 
            width="44" 
            height="12" 
            rx="2"
            fill={theme.primary || '#6b7280'}
            stroke="#374151"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Cap top line */}
          <line 
            x1="38" 
            y1="14" 
            x2="82" 
            y2="14" 
            stroke="#374151"
            strokeWidth="2"
          />
          
          {/* White Label Rectangle */}
          <rect 
            x="40" 
            y="85" 
            width="40" 
            height="45" 
            rx="2"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </div>
  );
}
