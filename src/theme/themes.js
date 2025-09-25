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

    // Core Palette
    primary: '#8C7A86',
    primaryDark: '#73636D',
    primaryLight: '#A597A1',
    secondary: '#F4F2F3',
    accent: '#F4F2F3',

    // Text
    text: '#4B4247',
    textLight: '#8C7A86',
    textOnPrimary: '#FFFFFF',

    // Backgrounds
    background: '#EAE6E8',
    cardBackground: '#FFFFFF',

    // UI Elements
    border: '#D9D3D6',
    buttonDisabled: '#BDB3B9',
    
    // Semantic Colors
    success: '#73636D',
    warning: '#F2C879',
    error: '#E58A7A',
    info: '#A597A1',
    successBg: '#E3E0E2',
    warningBg: '#FDF6E4',
    infoBg: '#EDEAEB',
  },
  taupe: {
    name: 'Taupe',
    isDark: false,
    
    // Core Palette
    primary: '#8D8279',
    primaryDark: '#6B615A',
    primaryLight: '#A9A09A',
    secondary: '#EAE6E2',
    accent: '#A9A09A',

    // Text
    text: '#3D3A3A',
    textLight: '#6E6A6A',
    textOnPrimary: '#FFFFFF',
    
    // Backgrounds
    background: '#F9F8F6',
    cardBackground: '#FFFFFF',
    
    // UI Elements
    border: '#DCD7D2',
    buttonDisabled: '#BDB6B1',
    
    // Semantic Colors
    success: '#8A9A8A',
    warning: '#D4A26D',
    error: '#C87A7A',
    info: '#8FA4B0',
    successBg: '#E8ECEA',
    warningBg: '#F7EBE0',
    infoBg: '#E8EFF2',
  },
  beekeeper: {
    name: 'Beekeeper (Dark)',
    isDark: true,
    
    // Core Palette - Warm amber/golden accents like the image
    primary: '#D4A853',        // Rich golden amber (like honeycomb)
    primaryDark: '#B8942A',    // Deeper amber
    primaryLight: '#E6C575',   // Light honey gold
    secondary: '#3F3F3F',      // Dark gray for secondary elements
    accent: '#E6C575',         // Light honey accent

    // Text - High contrast on dark background
    text: '#F5F5F5',           // Off-white for primary text (less harsh than pure white)
    textLight: '#C0C0C0',      // Lighter gray for better secondary text readability
    textOnPrimary: '#1A1A1A',  // Dark text on golden backgrounds
    
    // Backgrounds - Sophisticated dark grays like the image
    background: '#2A2A2A',     // Main dark gray background (like hexagon pattern)
    cardBackground: '#363636', // Slightly lighter for cards
    
    // UI Elements
    border: '#4A4A4A',         // Subtle borders
    buttonDisabled: '#666666', // Disabled state
    
    // Semantic Colors - Adjusted for dark theme
    success: '#7FB069',        // Green that works on dark
    warning: '#D4A853',        // Use primary amber for warnings
    error: '#E57373',          // Soft red for errors
    info: '#64B5F6',           // Blue for info
    successBg: '#2D4A2D',      // Dark green backgrounds
    warningBg: '#4A3D2D',      // Dark amber backgrounds
    infoBg: '#2D3A4A',         // Dark blue backgrounds
  },
};

export const defaultThemeName = 'sage';