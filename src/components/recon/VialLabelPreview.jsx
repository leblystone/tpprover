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
        {/* Clean Vial SVG - Matching Reference Exactly */}
        <svg 
          width="180" 
          height="260" 
          viewBox="0 0 180 260" 
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Glass body gradient - grey/blue tint */}
            <linearGradient id="glassBody" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b8c5d6" stopOpacity="0.7"/>
              <stop offset="50%" stopColor="#d1dae6" stopOpacity="0.5"/>
              <stop offset="100%" stopColor="#9fb3c8" stopOpacity="0.8"/>
            </linearGradient>
            
            {/* White highlight gradient */}
            <linearGradient id="whiteHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9"/>
              <stop offset="100%" stopColor="#e8f1f8" stopOpacity="0.6"/>
            </linearGradient>
            
            {/* Theme cap gradient */}
            <linearGradient id="capGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={theme.primary || '#9fb3c8'}/>
              <stop offset="100%" stopColor={theme.primaryDark || '#7a92aa'}/>
            </linearGradient>
            
            {/* Crimp gradient */}
            <linearGradient id="crimpGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#9fb3c8"/>
              <stop offset="50%" stopColor="#b8c5d6"/>
              <stop offset="100%" stopColor="#8a9fb5"/>
            </linearGradient>
          </defs>
          
          {/* Main Vial Body */}
          <rect 
            x="50" 
            y="80" 
            width="80" 
            height="160" 
            rx="12"
            ry="12"
            fill="url(#glassBody)"
            stroke="#2d3748"
            strokeWidth="3"
          />
          
          {/* White highlight panel on left */}
          <rect 
            x="58" 
            y="100" 
            width="32" 
            height="130" 
            rx="8"
            fill="url(#whiteHighlight)"
          />
          
          {/* Liquid/content inside vial - light grey */}
          <rect 
            x="58" 
            y="120" 
            width="64" 
            height="100" 
            rx="8"
            fill="#e5e7eb"
            fillOpacity="0.6"
          />
          
          {/* Bottom rounded base */}
          <ellipse 
            cx="90" 
            cy="232" 
            rx="38" 
            ry="10" 
            fill="#9fb3c8"
            opacity="0.5"
          />
          
          {/* Shoulder - Rounded top transition */}
          <ellipse 
            cx="90" 
            cy="80" 
            rx="40" 
            ry="20" 
            fill="url(#glassBody)"
            stroke="#2d3748"
            strokeWidth="3"
          />
          
          {/* Shoulder highlight */}
          <ellipse 
            cx="70" 
            cy="78" 
            rx="20" 
            ry="10" 
            fill="#ffffff"
            opacity="0.5"
          />
          
          {/* Neck - Short cylinder */}
          <rect 
            x="70" 
            y="52" 
            width="40" 
            height="16" 
            fill="url(#glassBody)"
            stroke="#2d3748"
            strokeWidth="3"
          />
          
          {/* Aluminum Crimp Band - Cylindrical */}
          <rect 
            x="62" 
            y="42" 
            width="56" 
            height="16" 
            fill="url(#crimpGradient)"
            stroke="#2d3748"
            strokeWidth="2.5"
          />
          
          {/* Crimp top ellipse */}
          <ellipse 
            cx="90" 
            cy="42" 
            rx="28" 
            ry="6" 
            fill="#b8c5d6"
            stroke="#2d3748"
            strokeWidth="2.5"
          />
          
          {/* Crimp bottom ellipse */}
          <ellipse 
            cx="90" 
            cy="58" 
            rx="28" 
            ry="6" 
            fill="#8a9fb5"
            stroke="#2d3748"
            strokeWidth="2.5"
          />
          
          {/* Cap - Large flat disc on top (Theme colored) */}
          <ellipse 
            cx="90" 
            cy="32" 
            rx="40" 
            ry="18" 
            fill="url(#capGradient)"
            stroke="#2d3748"
            strokeWidth="3"
          />
          
          {/* Cap top surface */}
          <ellipse 
            cx="90" 
            cy="28" 
            rx="40" 
            ry="16" 
            fill={theme.primary || '#9fb3c8'}
            opacity="0.7"
          />
          
          {/* Cap top edge - darker line */}
          <ellipse 
            cx="90" 
            cy="20" 
            rx="40" 
            ry="6" 
            fill="none"
            stroke="#2d3748"
            strokeWidth="2.5"
          />
          
          {/* White Label on Vial */}
          <rect 
            x="56" 
            y="130" 
            width="68" 
            height="50" 
            rx="4"
            fill="#ffffff"
            fillOpacity="0.85"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
        </svg>
      </div>
    </div>
  );
}
