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
        {/* Photorealistic Vial SVG */}
        <svg 
          width="200" 
          height="280" 
          viewBox="0 0 200 280" 
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Glass gradient for realistic transparency */}
            <linearGradient id="glassBody" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f8fafc" stopOpacity="0.3"/>
              <stop offset="15%" stopColor="#ffffff" stopOpacity="0.8"/>
              <stop offset="50%" stopColor="#f1f5f9" stopOpacity="0.2"/>
              <stop offset="85%" stopColor="#cbd5e1" stopOpacity="0.6"/>
              <stop offset="100%" stopColor="#e2e8f0" stopOpacity="0.4"/>
            </linearGradient>
            
            {/* Highlight gradient */}
            <linearGradient id="highlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9"/>
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2"/>
            </linearGradient>
            
            {/* Shadow gradient */}
            <radialGradient id="shadow">
              <stop offset="0%" stopColor="#000000" stopOpacity="0.2"/>
              <stop offset="100%" stopColor="#000000" stopOpacity="0"/>
            </radialGradient>
            
            {/* Blue cap gradient using theme colors */}
            <linearGradient id="capGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={theme.primary || '#3b82f6'} stopOpacity="1"/>
              <stop offset="50%" stopColor={theme.primaryDark || '#2563eb'} stopOpacity="1"/>
              <stop offset="100%" stopColor={theme.primaryDark || '#1d4ed8'} stopOpacity="1"/>
            </linearGradient>
          </defs>
          
          {/* Drop shadow at bottom */}
          <ellipse 
            cx="100" 
            cy="268" 
            rx="45" 
            ry="8" 
            fill="url(#shadow)"
          />
          
          {/* Vial Body - Main glass container */}
          <rect 
            x="55" 
            y="70" 
            width="90" 
            height="170" 
            rx="6"
            fill="url(#glassBody)"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
          
          {/* Left highlight - bright reflection */}
          <rect 
            x="60" 
            y="75" 
            width="15" 
            height="160" 
            rx="4"
            fill="url(#highlight)"
          />
          
          {/* Right subtle reflection */}
          <rect 
            x="125" 
            y="80" 
            width="8" 
            height="150" 
            rx="2"
            fill="#ffffff"
            opacity="0.3"
          />
          
          {/* Bottom curve of vial */}
          <ellipse 
            cx="100" 
            cy="235" 
            rx="42" 
            ry="10" 
            fill="#e2e8f0"
            opacity="0.5"
          />
          
          {/* Shoulder - transition from neck to body */}
          <path 
            d="M 65 70 Q 60 62, 60 55 L 60 50 L 140 50 L 140 55 Q 140 62, 135 70"
            fill="url(#glassBody)"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
          
          {/* Neck */}
          <rect 
            x="70" 
            y="30" 
            width="60" 
            height="20" 
            fill="url(#glassBody)"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
          
          {/* Neck highlight */}
          <rect 
            x="73" 
            y="32" 
            width="10" 
            height="16" 
            fill="url(#highlight)"
          />
          
          {/* Cap - Bottom part (aluminum crimp) */}
          <ellipse 
            cx="100" 
            cy="32" 
            rx="36" 
            ry="8" 
            fill="#c0c0c0"
            stroke="#a8a8a8"
            strokeWidth="1.5"
          />
          
          {/* Cap - Main body (theme colored) */}
          <ellipse 
            cx="100" 
            cy="20" 
            rx="38" 
            ry="12" 
            fill="url(#capGradient)"
            stroke={theme.primaryDark || '#1e40af'}
            strokeWidth="2.5"
          />
          
          {/* Cap top surface - lighter for 3D effect */}
          <ellipse 
            cx="100" 
            cy="16" 
            rx="38" 
            ry="10" 
            fill={theme.primary || '#3b82f6'}
            opacity="0.8"
          />
          
          {/* Cap highlight - glossy effect */}
          <ellipse 
            cx="82" 
            cy="14" 
            rx="22" 
            ry="5" 
            fill="#ffffff"
            opacity="0.5"
          />
          
          {/* Cap center detail - rubber stopper appearance */}
          <ellipse 
            cx="100" 
            cy="16" 
            rx="8" 
            ry="3" 
            fill="#374151"
            stroke="#1f2937"
            strokeWidth="1"
          />
          
          {/* White Label in the middle of vial */}
          <rect 
            x="58" 
            y="130" 
            width="84" 
            height="60" 
            rx="3"
            fill="#ffffff"
            stroke="#e5e7eb"
            strokeWidth="1.5"
            opacity="0.95"
          />
          
          {/* Label shadow for depth */}
          <rect 
            x="59" 
            y="131" 
            width="84" 
            height="60" 
            rx="3"
            fill="#000000"
            opacity="0.03"
          />
        </svg>
      </div>
    </div>
  );
}
