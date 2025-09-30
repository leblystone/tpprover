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
        {/* Photorealistic Vial SVG - Matching Reference */}
        <svg 
          width="180" 
          height="280" 
          viewBox="0 0 180 280" 
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Glass gradient for realistic transparency */}
            <linearGradient id="glassBody" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f1f5f9" stopOpacity="0.4"/>
              <stop offset="15%" stopColor="#ffffff" stopOpacity="0.85"/>
              <stop offset="50%" stopColor="#f8fafc" stopOpacity="0.3"/>
              <stop offset="85%" stopColor="#cbd5e1" stopOpacity="0.6"/>
              <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.5"/>
            </linearGradient>
            
            {/* Highlight gradient */}
            <linearGradient id="highlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95"/>
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.3"/>
            </linearGradient>
            
            {/* Cap gradient using theme colors */}
            <linearGradient id="capGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={theme.primary || '#3b82f6'}/>
              <stop offset="100%" stopColor={theme.primaryDark || '#1d4ed8'}/>
            </linearGradient>
            
            {/* Aluminum gradient */}
            <linearGradient id="aluminumGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a8a8a8"/>
              <stop offset="30%" stopColor="#d3d3d3"/>
              <stop offset="50%" stopColor="#e8e8e8"/>
              <stop offset="70%" stopColor="#c8c8c8"/>
              <stop offset="100%" stopColor="#a8a8a8"/>
            </linearGradient>
          </defs>
          
          {/* Drop shadow */}
          <ellipse cx="90" cy="270" rx="50" ry="6" fill="#000000" opacity="0.15"/>
          
          {/* Vial Body - Main Container */}
          <rect 
            x="50" 
            y="90" 
            width="80" 
            height="160" 
            rx="8"
            fill="url(#glassBody)"
            stroke="#cbd5e1"
            strokeWidth="2"
          />
          
          {/* Left bright highlight */}
          <rect 
            x="54" 
            y="95" 
            width="18" 
            height="150" 
            rx="6"
            fill="url(#highlight)"
          />
          
          {/* Right subtle highlight */}
          <rect 
            x="110" 
            y="100" 
            width="10" 
            height="140" 
            rx="4"
            fill="#ffffff"
            opacity="0.4"
          />
          
          {/* Bottom curve indicator */}
          <ellipse 
            cx="90" 
            cy="240" 
            rx="36" 
            ry="8" 
            fill="#e2e8f0"
            opacity="0.6"
          />
          
          {/* Shoulder - Rounded transition */}
          <ellipse 
            cx="90" 
            cy="90" 
            rx="40" 
            ry="20" 
            fill="url(#glassBody)"
            stroke="#cbd5e1"
            strokeWidth="2"
          />
          
          {/* Shoulder highlight */}
          <ellipse 
            cx="70" 
            cy="88" 
            rx="15" 
            ry="8" 
            fill="url(#highlight)"
          />
          
          {/* Neck - Short and straight */}
          <rect 
            x="70" 
            y="50" 
            width="40" 
            height="15" 
            fill="url(#glassBody)"
            stroke="#cbd5e1"
            strokeWidth="2"
          />
          
          {/* Neck highlight */}
          <rect 
            x="72" 
            y="52" 
            width="8" 
            height="11" 
            fill="url(#highlight)"
          />
          
          {/* Aluminum Crimp Band - Behind cap */}
          <rect 
            x="60" 
            y="45" 
            width="60" 
            height="18" 
            fill="url(#aluminumGradient)"
            stroke="#a0a0a0"
            strokeWidth="1.5"
          />
          
          {/* Crimp top */}
          <ellipse 
            cx="90" 
            cy="45" 
            rx="30" 
            ry="6" 
            fill="#d8d8d8"
            stroke="#a0a0a0"
            strokeWidth="1.5"
          />
          
          {/* Crimp bottom */}
          <ellipse 
            cx="90" 
            cy="63" 
            rx="30" 
            ry="6" 
            fill="#b8b8b8"
            stroke="#a0a0a0"
            strokeWidth="1.5"
          />
          
          {/* Crimp texture lines */}
          <line x1="60" y1="50" x2="120" y2="50" stroke="#e8e8e8" strokeWidth="0.5"/>
          <line x1="60" y1="54" x2="120" y2="54" stroke="#e8e8e8" strokeWidth="0.5"/>
          <line x1="60" y1="58" x2="120" y2="58" stroke="#e8e8e8" strokeWidth="0.5"/>
          
          {/* Cap - Large Flat Top (Theme colored) */}
          <ellipse 
            cx="90" 
            cy="38" 
            rx="40" 
            ry="16" 
            fill="url(#capGradient)"
            stroke={theme.primaryDark || '#1d4ed8'}
            strokeWidth="2.5"
          />
          
          {/* Cap top surface */}
          <ellipse 
            cx="90" 
            cy="35" 
            rx="40" 
            ry="14" 
            fill={theme.primary || '#3b82f6'}
          />
          
          {/* Cap glossy highlight */}
          <ellipse 
            cx="75" 
            cy="32" 
            rx="20" 
            ry="7" 
            fill="#ffffff"
            opacity="0.5"
          />
          
          {/* Center stopper - dark silver */}
          <ellipse 
            cx="90" 
            cy="35" 
            rx="6" 
            ry="3" 
            fill="#808080"
            stroke="#606060"
            strokeWidth="1"
          />
          
          {/* White Label in middle of vial */}
          <rect 
            x="54" 
            y="140" 
            width="72" 
            height="60" 
            rx="4"
            fill="#ffffff"
            fillOpacity="0.95"
            stroke="#d1d5db"
            strokeWidth="1"
          />
        </svg>
      </div>
    </div>
  );
}
