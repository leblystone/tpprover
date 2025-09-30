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
  return (
    <div className="flex justify-center mb-6">
      <div className="relative">
        {/* Vial SVG - Clean Minimalist Style */}
        <svg 
          width="120" 
          height="160" 
          viewBox="0 0 120 160" 
          className="drop-shadow-sm"
        >
          {/* Vial Body - Simple and clean */}
          <rect 
            x="20" 
            y="40" 
            width="80" 
            height="100" 
            rx="8" 
            ry="8"
            fill="white"
            stroke={theme.border || '#374151'}
            strokeWidth="2"
          />
          
          {/* Vial Neck */}
          <rect 
            x="45" 
            y="20" 
            width="30" 
            height="20" 
            fill="white"
            stroke={theme.border || '#374151'}
            strokeWidth="2"
          />
          
          {/* Vial Cap - Theme colored */}
          <rect 
            x="40" 
            y="10" 
            width="40" 
            height="10" 
            rx="2" 
            ry="2"
            fill={theme.primary || '#3b82f6'}
            stroke={theme.primaryDark || '#1e40af'}
            strokeWidth="2"
          />
        </svg>
      </div>
    </div>
  );
}