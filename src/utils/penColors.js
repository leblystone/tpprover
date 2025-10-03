// Centralized pen color definitions for consistency across the app
export const penColors = [
    { name: 'Gold', hex: '#DAA520' },
    { name: 'Silver', hex: '#C0C0C0' },
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Hot Pink', hex: '#FF69B4' },
    { name: 'Light Pink', hex: '#FFB6C1' },
    { name: 'Dark Blue', hex: '#00008B' },
    { name: 'Light Blue', hex: '#ADD8E6' },
    { name: 'Teal', hex: '#008080' },
    { name: 'Lime Green', hex: '#32CD32' },
    { name: 'Brown', hex: '#8B4513' },
    { name: 'Red', hex: '#CC0000' },
    { name: 'Burgundy', hex: '#800000' },
    { name: 'Purple', hex: '#800080' },
    { name: 'Orange', hex: '#FF6600' },
    { name: 'Yellow', hex: '#FFFF00' },
    { name: 'Gray', hex: '#9CA3AF' },
];

// Convert to object format for backward compatibility
export const PEN_COLORS = penColors.reduce((acc, color) => {
    acc[color.name] = color.hex;
    return acc;
}, {});