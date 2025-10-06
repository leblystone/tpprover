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
    
    // Core Palette - Using the NEW TPP PALETTE (NO GREENS)
    primary: '#A89B9B', // Primary Mauve/Taupe - dusty mauve
    primaryDark: '#3D3530', // Dark Charcoal
    primaryLight: '#C4B8B8', // Lightened version of primary mauve
    secondary: '#F7F6F4', // Warm-White based background
    accent: '#EBE8E4', // Lighter warm-white accent

    // Text - Using Dark Charcoal and Cloud Gray
    text: '#3D3530', // Dark Charcoal for primary text
    textLight: '#8B8B8B', // Cloud Gray for secondary text
    textOnPrimary: '#FFFFFF',
    
    // Backgrounds - Using Warm-White and Cloud Gray
    background: '#F7F6F4', // Warm-White base
    cardBackground: '#FFFFFF', // Pure white for cards
    
    // UI Elements
    border: '#EBE8E4', // Light warm-white for borders
    buttonDisabled: '#C4C4C4', // Muted gray for disabled
    
    // Semantic Colors - Using ACCENT & POP COLORS
    success: '#A89B9B', // Using primary mauve for success
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
  },
};

export const defaultThemeName = 'sage';