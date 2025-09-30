import React from 'react';

/**
 * Combined Dosage Input - integrates amount and unit into a single component
 * Shows number input on left with unit selector pills on the right side
 */
export default function CombinedDosageInput({ 
    value = { amount: '', unit: 'mcg' }, 
    onChange, 
    theme,
    deliveryMethod = 'syringe',
    placeholder = "250, 0.5, or 2",
    units = null // Optional: override default units
}) {
    // Determine units to display based on delivery method
    const displayUnits = units || (
        deliveryMethod === 'nasal' 
            ? ['sprays'] // Only sprays for nasal
            : ['mcg', 'mg', 'mL'] // Default units for syringe/pen
    );

    const handleAmountChange = (newAmount) => {
        onChange({ ...value, amount: newAmount });
    };

    const handleUnitChange = (newUnit) => {
        onChange({ ...value, unit: newUnit });
    };

    const currentUnit = value?.unit || 'mcg';

    return (
        <div>
            <div 
                className="flex items-stretch border rounded-lg overflow-hidden"
                style={{ borderColor: theme.border }}
            >
                {/* Amount Input */}
                <input
                    type="text"
                    value={value?.amount || ''}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-2 outline-none min-w-0"
                    style={{ 
                        backgroundColor: theme.inputBackground || '#fff',
                        color: theme.text 
                    }}
                />
                
                {/* Unit Selector Pills - Integrated */}
                <div 
                    className="flex items-center gap-0.5 px-1.5 py-1.5 border-l"
                    style={{ 
                        borderColor: theme.border,
                        backgroundColor: theme.cardBackground || '#f9fafb'
                    }}
                >
                    {displayUnits.map(unit => (
                        <button
                            key={unit}
                            type="button"
                            onClick={() => handleUnitChange(unit)}
                            className={`px-2 py-1 text-xs font-semibold rounded transition-all ${
                                currentUnit === unit 
                                    ? 'text-white shadow-sm' 
                                    : 'text-gray-600 hover:bg-gray-200'
                            }`}
                            style={currentUnit === unit ? { backgroundColor: theme.primary } : {}}
                        >
                            {unit}
                        </button>
                    ))}
                </div>
            </div>

            {/* Nasal spray disclaimer */}
            {deliveryMethod === 'nasal' && currentUnit === 'sprays' && (
                <div className="text-xs text-blue-600 mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                    💡 Assumes 100 mcg per spray (typical nasal spray)
                </div>
            )}
        </div>
    );
}

