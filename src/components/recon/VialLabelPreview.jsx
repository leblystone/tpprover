import React from 'react';
import vialImage from '../../assets/vial.png';

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
        <img 
          src={vialImage} 
          alt="Vial" 
          className="w-32 h-auto"
        />
      </div>
    </div>
  );
}
