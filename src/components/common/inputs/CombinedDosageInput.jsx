import React from 'react';

/**
 * Combined Dosage Input - integrates amount and unit into a single component
 * Shows number input on left with unit selector pills on the right side
 */
export default function CombinedDosageInput({ 
    value = { amount: '', unit: 'mcg' }, 
    onChange, 
    theme,
    deliveryMethod = 'pipette',
    placeholder = "250, 0.5, or 2",
    units = null // Optional: override default units
}) {
    // Determine units to display based on delivery method
    const displayUnits = units || (
        deliveryMethod === 'nasal' 
            ? ['sprays'] // Only sprays for nasal
            : ['mcg', 'mg', 'mL'] // Default units for pipette/pen
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
                className="flex items-stretch rounded-lg overflow-hidden"
                style={{ 
                    boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.4)' : '0 1px 2px rgba(0,0,0,0.05)'
                }}
            >
                {/* Amount Input */}
                <input
                    type="text"
                    value={value?.amount || ''}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder={placeholder}
                    className="flex-1 px-3 py-2 outline-none min-w-0 border-0 focus:ring-0"
                    style={{ 
                        backgroundColor: theme.isDark ? '#1f2937' : (theme.inputBackground || '#fff'),
                        color: theme.text 
                    }}
                    autoComplete="off"
                />
                
                {/* Unit Selector Pills - Integrated */}
                <div 
                    className="flex items-center gap-0.5 px-1 py-1 flex-shrink-0"
                    style={{ 
                        backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb')
                    }}
                >
                    {displayUnits.map(unit => (
                        <button
                            key={unit}
                            type="button"
                            onClick={() => handleUnitChange(unit)}
                            className={`px-1.5 py-0.5 text-xs font-semibold rounded transition-all flex-shrink-0 ${
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
                <div className="text-xs text-blue-600 mt-2 p-2 bg-blue-50 rounded border border-blue-200 whitespace-nowrap text-center">
                    💡 Assumes 100 mcg per spray (typical nasal spray)
                </div>
            )}
        </div>
    );
}

