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
        {/* Clean Line Art Vial - Simple Style */}
        <svg 
          width="140" 
          height="200" 
          viewBox="0 0 140 200" 
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Vial Body - Simple with flat color */}
          <rect 
            x="42" 
            y="65" 
            width="56" 
            height="110" 
            rx="6"
            ry="6"
            fill="#f8fafc"
            stroke="#374151"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Bottom curve indicator */}
          <ellipse 
            cx="70" 
            cy="165" 
            rx="24" 
            ry="6" 
            fill="none"
            stroke="#374151"
            strokeWidth="2.5"
            opacity="0.4"
          />
          
          {/* Shoulder - rounded top */}
          <path 
            d="M 42 65 L 42 55 Q 42 50, 46 48 L 54 48 L 54 50 L 86 50 L 86 48 L 94 48 Q 98 50, 98 55 L 98 65"
            fill="#f8fafc"
            stroke="#374151"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Neck - short straight section */}
          <rect 
            x="58" 
            y="38" 
            width="24" 
            height="12" 
            fill="#f8fafc"
            stroke="#374151"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Aluminum Crimp Band - Grey */}
          <rect 
            x="52" 
            y="30" 
            width="36" 
            height="14" 
            fill="#c0c0c0"
            stroke="#374151"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          
          {/* Crimp top ellipse */}
          <ellipse 
            cx="70" 
            cy="30" 
            rx="18" 
            ry="5" 
            fill="#d4d4d4"
            stroke="#374151"
            strokeWidth="3"
          />
          
          {/* Crimp inner ring detail */}
          <ellipse 
            cx="70" 
            cy="30" 
            rx="12" 
            ry="3" 
            fill="none"
            stroke="#374151"
            strokeWidth="1.5"
          />
          
          {/* Crimp bottom ellipse */}
          <ellipse 
            cx="70" 
            cy="44" 
            rx="18" 
            ry="5" 
            fill="#a8a8a8"
            stroke="#374151"
            strokeWidth="3"
          />
          
          {/* Cap - Large flat disc (Theme colored) */}
          <ellipse 
            cx="70" 
            cy="22" 
            rx="26" 
            ry="12" 
            fill={theme.primary || '#6b7280'}
            stroke="#374151"
            strokeWidth="3"
          />
          
          {/* Cap top surface ring */}
          <ellipse 
            cx="70" 
            cy="18" 
            rx="26" 
            ry="6" 
            fill="none"
            stroke="#374151"
            strokeWidth="3"
          />
          
          {/* Cap inner detail ring */}
          <ellipse 
            cx="70" 
            cy="18" 
            rx="18" 
            ry="4" 
            fill="none"
            stroke="#374151"
            strokeWidth="1.5"
          />
          
          {/* White Label on Vial Body */}
          <rect 
            x="46" 
            y="95" 
            width="48" 
            height="45" 
            rx="3"
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </div>
  );
}
