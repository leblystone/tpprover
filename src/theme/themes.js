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
    
    // Core Palette - Visually sampled from the "Research Planner" image.
    primary: '#9F8F95',       // The main dusty mauve color
    primaryDark: '#7D6F74',    // Darker shade for gradients, hover states
    primaryLight: '#BDB1B5',   // Lighter shade for accents
    secondary: '#F8F7F7',      // Very light gray for backgrounds
    accent: '#EDEAE2',         // A warm off-white accent

    // Text
    text: '#4A4A4A',           // Dark gray for high contrast text
    textLight: '#888888',      // Lighter gray for secondary text
    textOnPrimary: '#FFFFFF',
    
    // Backgrounds
    background: '#F8F7F7',      // Main background
    cardBackground: '#FFFFFF', // Pure white for cards
    
    // UI Elements
    border: '#BDB1B5',         // Softer border using the light primary shade
    buttonDisabled: '#D1CACD', // Muted version of the primary color
    
    // Semantic Colors
    success: '#82A077',        // A muted, complementary green
    warning: '#D4B26F',       // A muted gold
    error: '#C78F90',         // A muted rose/red
    info: '#9F8F95',           // The primary color for info states
    successBg: '#F2F5F1',
    warningBg: '#FAF7F0',
    infoBg: '#F5F3F4',
  },

  paddiePeptide: {
    name: 'Paddie Peptide',
    isDark: false,
    
    // Core Palette - Visually sampled from the "Paddie's Peptides" ad.
    primary: '#007B8C',       // The retro blue from the ad's background
    primaryDark: '#005F6B',    // Darker shade of the blue
    primaryLight: '#339DAA',   // Lighter shade of the blue
    secondary: '#FDFBEF',      // The creamy, vintage off-white background
    accent: '#E8D5A3',         // Muted yellow from the woman's dress

    // Text
    text: '#2A2A2A',           // Dark, near-black text color
    textLight: '#A9A9A9',      // Gray from the man's suit
    textOnPrimary: '#FFFFFF',
    
    // Backgrounds
    background: '#FDFBEF',      // Main creamy background
    cardBackground: '#FFFFFF', // Pure white for cards to pop
    
    // UI Elements
    border: '#E0DCCA',         // A slightly darker shade of the cream for subtle borders
    buttonDisabled: '#C0C0C0', // A neutral gray for disabled states
    
    // Semantic Colors & Pop Colors
    success: '#007B8C',        // Using the primary blue for success
    warning: '#E8D5A3',       // Muted yellow from the dress
    error: '#D95D39',         // The reddish-orange from the vial caps
    info: '#A9A9A9',           // Gray from the suit for info states
    successBg: '#E6F2F3',
    warningBg: '#FBF8F0',
    infoBg: '#F6F6F6',
  },

  theAlchemist: {
    name: 'The Alchemist',
    isDark: true,
    
    // Core Palette - Visually sampled from "The Alchemist" rabbit image.
    primary: '#D4AF37',       // The glowing gold from the vial ring
    primaryDark: '#B89B65',    // A slightly deeper, less saturated gold
    primaryLight: '#E8D5A3',   // A lighter, paler gold
    secondary: '#1A1A1A',      // The very dark, near-black background
    accent: '#3B4A54',         // The cool, bluish-gray from the vials

    // Text
    text: '#EAEAEA',           // Bright, off-white for high readability on dark backgrounds
    textLight: '#A9B4BB',      // Lighter shade of the vial's bluish-gray
    textOnPrimary: '#000000',  // Black text on gold buttons for high contrast
    
    // Backgrounds
    background: '#121212',      // A deep, pure black main background
    cardBackground: '#1E1E1E', // A slightly lighter charcoal for cards
    
    // UI Elements
    border: '#3B4A54',         // Using the cool vial color for borders
    buttonDisabled: '#555555', // A neutral dark gray for disabled states
    
    // Semantic Colors
    success: '#82A077',        // A muted, complementary green that works on dark backgrounds
    warning: '#D4AF37',       // The primary gold for warnings
    error: '#C78F90',         // A muted rose/red that works on dark backgrounds
    info: '#A9B4BB',           // The light bluish-gray for info states
    successBg: '#2A3C24',
    warningBg: '#4A3E24',
    infoBg: '#343E45',
  },
};

export const defaultThemeName = 'sage';