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
            
            {/* Aluminum crimp gradient for realistic metallic look */}
            <linearGradient id="aluminumGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#a8a8a8"/>
              <stop offset="20%" stopColor="#d3d3d3"/>
              <stop offset="50%" stopColor="#e8e8e8"/>
              <stop offset="80%" stopColor="#c0c0c0"/>
              <stop offset="100%" stopColor="#a8a8a8"/>
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
          
          {/* Bottom curve of vial - inside the body */}
          <ellipse 
            cx="100" 
            cy="225" 
            rx="38" 
            ry="8" 
            fill="#e2e8f0"
            opacity="0.5"
          />
          
          {/* Shoulder - transition from neck to body */}
          <path 
            d="M 70 70 Q 67 65, 67 60 L 67 56 L 133 56 L 133 60 Q 133 65, 130 70"
            fill="url(#glassBody)"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
          
          {/* Neck - thinner straight cylinder */}
          <rect 
            x="75" 
            y="48" 
            width="50" 
            height="8" 
            fill="url(#glassBody)"
            stroke="#cbd5e1"
            strokeWidth="1.5"
          />
          
          {/* Neck highlight */}
          <rect 
            x="78" 
            y="49" 
            width="6" 
            height="6" 
            fill="url(#highlight)"
          />
          
          {/* Aluminum crimp band - DRAWN FIRST (behind cap) - covering most of neck */}
          <rect 
            x="64" 
            y="44" 
            width="72" 
            height="14" 
            fill="url(#aluminumGradient)"
            stroke="#a8a8a8"
            strokeWidth="1.5"
          />
          
          {/* Crimp band top ellipse - lighter aluminum, more upward tilt */}
          <ellipse 
            cx="100" 
            cy="44" 
            rx="36" 
            ry="10" 
            fill="#d3d3d3"
            stroke="#a8a8a8"
            strokeWidth="1.5"
          />
          
          {/* Crimp band bottom ellipse - slightly darker for depth */}
          <ellipse 
            cx="100" 
            cy="58" 
            rx="36" 
            ry="10" 
            fill="#b8b8b8"
            stroke="#a8a8a8"
            strokeWidth="1.5"
          />
          
          {/* Crimp detail lines for aluminum texture - solid lines */}
          <line x1="64" y1="48" x2="136" y2="48" stroke="#e8e8e8" strokeWidth="0.5"/>
          <line x1="64" y1="51" x2="136" y2="51" stroke="#e8e8e8" strokeWidth="0.5"/>
          <line x1="64" y1="54" x2="136" y2="54" stroke="#e8e8e8" strokeWidth="0.5"/>
          
          {/* Cap - Main body (theme colored) - DRAWN AFTER (in front) - more upward tilt */}
          <ellipse 
            cx="100" 
            cy="38" 
            rx="38" 
            ry="10" 
            fill="url(#capGradient)"
            stroke={theme.primaryDark || '#1e40af'}
            strokeWidth="2.5"
          />
          
          {/* Cap top surface - more upward perspective */}
          <ellipse 
            cx="100" 
            cy="35" 
            rx="38" 
            ry="9" 
            fill={theme.primary || '#3b82f6'}
            opacity="0.9"
          />
          
          {/* Cap highlight - glossy effect */}
          <ellipse 
            cx="82" 
            cy="33" 
            rx="22" 
            ry="5" 
            fill="#ffffff"
            opacity="0.5"
          />
          
          {/* Cap center detail - darker silver stopper */}
          <ellipse 
            cx="100" 
            cy="35" 
            rx="8" 
            ry="3" 
            fill="#909090"
            stroke="#6b7280"
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
