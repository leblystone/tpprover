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
        {/* Vial SVG - Larger and wider */}
        <svg 
          width="200" 
          height="260" 
          viewBox="0 0 200 260" 
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Neck - cylindrical (drawn first so cap overlays it) */}
          <rect 
            x="75" 
            y="25" 
            width="50" 
            height="25" 
            fill="white"
            stroke={theme.border || '#2d3748'}
            strokeWidth="4"
          />
          
          {/* Vial Cap - Top flat circle with grey fill (drawn last to be on top) */}
          <ellipse 
            cx="100" 
            cy="20" 
            rx="35" 
            ry="10" 
            fill="#9ca3af"
            stroke="#4b5563"
            strokeWidth="4.5"
          />
          
          {/* Cap ring detail - inner circle */}
          <ellipse 
            cx="100" 
            cy="20" 
            rx="26" 
            ry="6" 
            fill="none"
            stroke="#6b7280"
            strokeWidth="2"
          />
          
          {/* Cap side - cylindrical appearance */}
          <ellipse 
            cx="100" 
            cy="30" 
            rx="35" 
            ry="10" 
            fill="#b0b7c3"
            stroke="#4b5563"
            strokeWidth="4.5"
          />
          
          {/* Neck bottom rim */}
          <line 
            x1="65" 
            y1="50" 
            x2="135" 
            y2="50" 
            stroke={theme.border || '#2d3748'}
            strokeWidth="4"
          />
          
          {/* Shoulder curve - left side */}
          <path 
            d="M 65 50 Q 60 56, 60 66"
            fill="none"
            stroke={theme.border || '#2d3748'}
            strokeWidth="4"
          />
          
          {/* Shoulder curve - right side */}
          <path 
            d="M 135 50 Q 140 56, 140 66"
            fill="none"
            stroke={theme.border || '#2d3748'}
            strokeWidth="4"
          />
          
          {/* Vial Body - left side */}
          <line 
            x1="60" 
            y1="66" 
            x2="60" 
            y2="210" 
            stroke={theme.border || '#2d3748'}
            strokeWidth="4"
          />
          
          {/* Vial Body - right side */}
          <line 
            x1="140" 
            y1="66" 
            x2="140" 
            y2="210" 
            stroke={theme.border || '#2d3748'}
            strokeWidth="4"
          />
          
          {/* Bottom curve - left */}
          <path 
            d="M 60 210 Q 60 225, 75 232"
            fill="none"
            stroke={theme.border || '#2d3748'}
            strokeWidth="4"
          />
          
          {/* Bottom curve - right */}
          <path 
            d="M 140 210 Q 140 225, 125 232"
            fill="none"
            stroke={theme.border || '#2d3748'}
            strokeWidth="4"
          />
          
          {/* Bottom - curved base */}
          <path 
            d="M 75 232 Q 100 236, 125 232"
            fill="none"
            stroke={theme.border || '#2d3748'}
            strokeWidth="4"
          />
          
          {/* Bottom ellipse - grey depth indicator */}
          <ellipse 
            cx="100" 
            cy="216" 
            rx="36" 
            ry="10" 
            fill="#d1d5db"
            stroke="#9ca3af"
            strokeWidth="2.5"
          />
          
          {/* Glass reflection line - left side */}
          <line 
            x1="68" 
            y1="70" 
            x2="68" 
            y2="200" 
            stroke="#e2e8f0"
            strokeWidth="2.5"
            opacity="0.6"
          />
        </svg>
      </div>
    </div>
  );
}
