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
        {/* Vial SVG - Exact replica of reference image */}
        <svg 
          width="140" 
          height="180" 
          viewBox="0 0 140 180" 
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Vial Cap - Top flat circle with grey fill */}
          <ellipse 
            cx="70" 
            cy="15" 
            rx="22" 
            ry="6" 
            fill="#9ca3af"
            stroke="#4b5563"
            strokeWidth="3.5"
          />
          
          {/* Cap ring detail - inner circle */}
          <ellipse 
            cx="70" 
            cy="15" 
            rx="16" 
            ry="4" 
            fill="none"
            stroke="#6b7280"
            strokeWidth="1.5"
          />
          
          {/* Cap side - cylindrical appearance */}
          <ellipse 
            cx="70" 
            cy="21" 
            rx="22" 
            ry="6" 
            fill="#b0b7c3"
            stroke="#4b5563"
            strokeWidth="3.5"
          />
          
          {/* Neck - cylindrical */}
          <rect 
            x="55" 
            y="18" 
            width="30" 
            height="18" 
            fill="white"
            stroke={theme.border || '#2d3748'}
            strokeWidth="3"
          />
          
          {/* Neck bottom rim */}
          <line 
            x1="48" 
            y1="36" 
            x2="92" 
            y2="36" 
            stroke={theme.border || '#2d3748'}
            strokeWidth="3"
          />
          
          {/* Shoulder curve - left side */}
          <path 
            d="M 48 36 Q 45 40, 45 48"
            fill="none"
            stroke={theme.border || '#2d3748'}
            strokeWidth="3"
          />
          
          {/* Shoulder curve - right side */}
          <path 
            d="M 92 36 Q 95 40, 95 48"
            fill="none"
            stroke={theme.border || '#2d3748'}
            strokeWidth="3"
          />
          
          {/* Vial Body - left side */}
          <line 
            x1="45" 
            y1="48" 
            x2="45" 
            y2="150" 
            stroke={theme.border || '#2d3748'}
            strokeWidth="3"
          />
          
          {/* Vial Body - right side */}
          <line 
            x1="95" 
            y1="48" 
            x2="95" 
            y2="150" 
            stroke={theme.border || '#2d3748'}
            strokeWidth="3"
          />
          
          {/* Bottom curve - left */}
          <path 
            d="M 45 150 Q 45 160, 55 165"
            fill="none"
            stroke={theme.border || '#2d3748'}
            strokeWidth="3"
          />
          
          {/* Bottom curve - right */}
          <path 
            d="M 95 150 Q 95 160, 85 165"
            fill="none"
            stroke={theme.border || '#2d3748'}
            strokeWidth="3"
          />
          
          {/* Bottom - curved base */}
          <path 
            d="M 55 165 Q 70 168, 85 165"
            fill="none"
            stroke={theme.border || '#2d3748'}
            strokeWidth="3"
          />
          
          {/* Bottom ellipse - grey depth indicator */}
          <ellipse 
            cx="70" 
            cy="155" 
            rx="24" 
            ry="7" 
            fill="#d1d5db"
            stroke="#9ca3af"
            strokeWidth="2"
          />
          
          {/* Glass reflection line - left side */}
          <line 
            x1="50" 
            y1="50" 
            x2="50" 
            y2="140" 
            stroke="#e2e8f0"
            strokeWidth="2"
            opacity="0.6"
          />
        </svg>
      </div>
    </div>
  );
}
