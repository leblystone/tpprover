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
    
    // Core Palette - Visually sampled from the user's image, ignoring hex codes.
    primary: '#9A8C94', // Visually-sampled Primary Mauve/Taupe
    primaryDark: '#5A4D4C', // Visually-sampled Deep Espresso Brown
    primaryLight: '#B5AAB0', // Lightened version of primary mauve
    secondary: '#FBF8F0', // Visually-sampled Warm-White
    accent: '#EDEAE2', // Lighter version of warm-white

    // Text - Using Dark Charcoal and Deep Espresso Brown
    text: '#3D3530', // Visually-sampled Dark Charcoal
    textLight: '#5A4D4C', // Visually-sampled Deep Espresso Brown for secondary text
    textOnPrimary: '#FFFFFF',
    
    // Backgrounds - Using Warm-White
    background: '#FBF8F0', // Visually-sampled Warm-White
    cardBackground: '#FFFFFF', // Pure white for cards
    
    // UI Elements - Using Cloud Gray
    border: '#C7A4A5', // Visually-sampled Clusty Rose for high contrast
    buttonDisabled: '#C8C8C8', // Visually-sampled Cloud Gray
    
    // Semantic Colors - Using Visually-sampled ACCENT & POP COLORS
    success: '#9A8C94', // Using primary mauve for success
    warning: '#B89B65', // Visually-sampled Muted Gold
    error: '#C7A4A5', // Visually-sampled Clusty Rose
    info: '#8B6F77', // Visually-sampled Smoky Plum
    successBg: '#F5F3F4',
    warningBg: '#F8F5EF',
    infoBg: '#F3F0F1',
    
    // Pop Colors for high-visual elements
    popRose: '#C7A4A5', // Visually-sampled Clusty Rose
    popGold: '#B89B65', // Visually-sampled Muted Gold  
    popPlum: '#8B6F77', // Visually-sampled Smoky Plum
  },
};

export const defaultThemeName = 'sage';