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
        {/* Simple Clean Vial SVG - Matching Reference */}
        <svg 
          width="160" 
          height="220" 
          viewBox="0 0 160 220" 
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Glass gradient - light blue tint */}
            <linearGradient id="glassBody" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.6"/>
              <stop offset="50%" stopColor="#f0f9ff" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#bfdbfe" stopOpacity="0.5"/>
            </linearGradient>
            
            {/* White highlight */}
            <linearGradient id="whiteHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9"/>
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.4"/>
            </linearGradient>
            
            {/* Theme cap gradient */}
            <linearGradient id="capGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={theme.primary || '#93c5fd'} stopOpacity="0.7"/>
              <stop offset="50%" stopColor={theme.primary || '#60a5fa'} stopOpacity="0.8"/>
              <stop offset="100%" stopColor={theme.primaryDark || '#3b82f6'} stopOpacity="0.6"/>
            </linearGradient>
          </defs>
          
          {/* Vial Body - Rounded rectangle */}
          <rect 
            x="40" 
            y="60" 
            width="80" 
            height="140" 
            rx="10"
            ry="10"
            fill="url(#glassBody)"
            stroke="#bfdbfe"
            strokeWidth="2"
          />
          
          {/* Left white highlight panel */}
          <rect 
            x="50" 
            y="70" 
            width="25" 
            height="120" 
            rx="6"
            fill="url(#whiteHighlight)"
          />
          
          {/* Right subtle highlight */}
          <rect 
            x="100" 
            y="75" 
            width="12" 
            height="110" 
            rx="4"
            fill="#ffffff"
            opacity="0.4"
          />
          
          {/* Bottom curve - glass depth */}
          <ellipse 
            cx="80" 
            cy="190" 
            rx="35" 
            ry="8" 
            fill="#bfdbfe"
            opacity="0.5"
          />
          
          {/* Shoulder/Neck transition - rounded top */}
          <ellipse 
            cx="80" 
            cy="60" 
            rx="40" 
            ry="18" 
            fill="url(#glassBody)"
            stroke="#bfdbfe"
            strokeWidth="2"
          />
          
          {/* Shoulder highlight */}
          <ellipse 
            cx="65" 
            cy="58" 
            rx="18" 
            ry="8" 
            fill="url(#whiteHighlight)"
          />
          
          {/* Neck - Short straight section */}
          <rect 
            x="65" 
            y="42" 
            width="30" 
            height="12" 
            fill="url(#glassBody)"
            stroke="#bfdbfe"
            strokeWidth="2"
          />
          
          {/* Neck highlight */}
          <rect 
            x="67" 
            y="44" 
            width="8" 
            height="8" 
            fill="url(#whiteHighlight)"
          />
          
          {/* Aluminum Crimp - Below cap */}
          <rect 
            x="58" 
            y="35" 
            width="44" 
            height="12" 
            fill="#b8bcc4"
            stroke="#9ca3af"
            strokeWidth="1.5"
          />
          
          {/* Crimp top */}
          <ellipse 
            cx="80" 
            cy="35" 
            rx="22" 
            ry="4" 
            fill="#d1d5db"
            stroke="#9ca3af"
            strokeWidth="1.5"
          />
          
          {/* Crimp bottom */}
          <ellipse 
            cx="80" 
            cy="47" 
            rx="22" 
            ry="4" 
            fill="#a8a8a8"
            stroke="#9ca3af"
            strokeWidth="1.5"
          />
          
          {/* Cap - Large flat top (Theme colored) */}
          <ellipse 
            cx="80" 
            cy="25" 
            rx="35" 
            ry="14" 
            fill="url(#capGradient)"
            stroke={theme.primaryDark || '#3b82f6'}
            strokeWidth="2"
          />
          
          {/* Cap top surface - lighter */}
          <ellipse 
            cx="80" 
            cy="23" 
            rx="35" 
            ry="12" 
            fill={theme.primary || '#93c5fd'}
            opacity="0.6"
          />
          
          {/* Cap highlight */}
          <ellipse 
            cx="65" 
            cy="20" 
            rx="18" 
            ry="6" 
            fill="#ffffff"
            opacity="0.6"
          />
          
          {/* White Label Rectangle */}
          <rect 
            x="52" 
            y="110" 
            width="56" 
            height="50" 
            rx="3"
            fill="#ffffff"
            fillOpacity="0.9"
            stroke="#d1d5db"
            strokeWidth="1"
          />
        </svg>
      </div>
    </div>
  );
}
