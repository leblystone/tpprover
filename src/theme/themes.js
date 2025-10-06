export const themes = {
  sage: {
    name: 'Sage',
    isDark: false,
    
    // Core Palette
    primary: '#7F9E95',
    primaryDark: '#5F7F76',
    primaryLight: '#A0B9B3',
    secondary: '#EFF2EE',
    accent: '#DDE6DE',

    // Text
    text: '#2F3B3A',
    textLight: '#6B7D7A',
    textOnPrimary: '#FFFFFF',
    
    // Backgrounds
    background: '#EFF2EE',
    cardBackground: '#FFFFFF',
    
    // UI Elements
    border: '#DDE6DE',
    buttonDisabled: '#B0C4BF',
    
    // Semantic Colors
    success: '#5FAF8B',
    warning: '#F2C879',
    error: '#E58A7A',
    info: '#7CB8B2',
    successBg: '#DFF0E9',
    warningBg: '#FDF6E4',
    infoBg: '#E4F2F1',
  },

  mauve: {
    name: 'Mauve',
    isDark: false,
    
    // Core Palette - Using the EXACT NEW TPP PALETTE (NO GREENS)
    primary: '#9ABC94', // Primary Mauve/Taupe - EXACT hex from palette
    primaryDark: '#3D3530', // Dark Charcoal - EXACT hex from palette
    primaryLight: '#B8D1B3', // Lightened version of primary mauve
    secondary: '#FB88EC', // Warm-White - EXACT hex from palette
    accent: '#F7C7F0', // Lightened warm-white accent

    // Text - Using Dark Charcoal and Cloud Gray
    text: '#3D3530', // Dark Charcoal - EXACT hex from palette
    textLight: '#270996', // Cloud Gray - EXACT hex from palette
    textOnPrimary: '#FFFFFF',
    
    // Backgrounds - Using Warm-White and Cloud Gray
    background: '#FB88EC', // Warm-White - EXACT hex from palette
    cardBackground: '#FFFFFF', // Pure white for cards
    
    // UI Elements
    border: '#F7C7F0', // Light warm-white for borders
    buttonDisabled: '#270996', // Cloud Gray for disabled
    
    // Semantic Colors - Using ACCENT & POP COLORS
    success: '#9ABC94', // Using primary mauve for success
    warning: '#D4AF37', // Muted Gold for warnings
    error: '#C17B7B', // Clusty Rose for errors
    info: '#8B7D9E', // Smoky Plum for info
    successBg: '#F4F2F2', // Light success background
    warningBg: '#FDF8E8', // Light warning background
    infoBg: '#F4F2F7', // Light info background
    
    // Pop Colors for high-visual elements
    popRose: '#C17B7B', // Clusty Rose
    popGold: '#D4AF37', // Muted Gold  
    popPlum: '#8B7D9E', // Smoky Plum
    
    // Additional palette colors
    espressoBrown: '#5A42EC', // Deep Espresso Brown - EXACT hex from palette
    cloudGray: '#270996', // Cloud Gray - EXACT hex from palette
  },
};

export const defaultThemeName = 'sage';