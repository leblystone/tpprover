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
    accentText: '#2F3B3A',

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
    accentText: '#4A4A4A',

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

  taupe: {
    name: 'Taupe',
    isDark: false,
    
    // Core Palette - Visually sampled from the "Research Planner" image with the taupe color.
    primary: '#C4B8B0',       // The main, earthy taupe color
    primaryDark: '#A39890',    // Darker shade of the taupe
    primaryLight: '#D9D1CB',   // Lighter shade of the taupe
    secondary: '#F9F8F7',      // A very clean, light off-white background
    accent: '#E9E5E3',         // A subtle accent color
    accentText: '#3A3A3A',

    // Text
    text: '#3A3A3A',           // The dark text color from the image
    textLight: '#8A8A8A',      // A lighter gray for secondary text
    textOnPrimary: '#FFFFFF',
    
    // Backgrounds
    background: '#F9F8F7',      // Main off-white background
    cardBackground: '#FFFFFF', // Pure white for cards
    
    // UI Elements
    border: '#D9D1CB',         // Using the light primary shade for soft borders
    buttonDisabled: '#E0DADC', // A muted version of the primary color
    
    // Semantic Colors
    success: '#82A077',        // A muted, complementary green
    warning: '#D4B26F',       // A muted gold
    error: '#C78F90',         // A muted rose/red
    info: '#C4B8B0',           // The primary color for info states
    successBg: '#F2F5F1',
    warningBg: '#FAF7F0',
    infoBg: '#F8F7F7',
  },

  softDark: {
    name: 'Soft Dark',
    isDark: true,
    
    // Core Palette - Exact colors from the provided soft dark palette
    primary: '#5A685A',        // Sage/moss green (4th color in palette)
    primaryDark: '#405A5A',    // Dark teal (5th color - for hover states)
    primaryLight: '#6B7D7A',   // Lighter variation for subtle accents
    secondary: '#2C2C30',      // Dark slate (2nd color - secondary surfaces)
    accent: '#338238',         // Olive green (3rd color - accent elements)
    accentText: '#FFFFFF',     // White text on accent

    // Text - Light colors for dark backgrounds
    text: '#E8E8E8',           // Very light gray for primary text
    textLight: '#A8A8A8',      // Medium gray for secondary text
    textOnPrimary: '#FFFFFF',  // White text on colored buttons
    
    // Backgrounds - Using exact palette colors
    background: '#1A1A1D',     // Darkest color (1st) - main background
    cardBackground: '#2C2C30', // Dark slate (2nd) - card/surface background
    
    // UI Elements
    border: '#3A3A40',         // Subtle border slightly lighter than cards
    buttonDisabled: '#35353A', // Muted dark for disabled states
    
    // Semantic Colors (adjusted for dark backgrounds with good contrast)
    success: '#6FA080',        // Soft green visible on dark
    warning: '#E5B872',        // Warm gold visible on dark
    error: '#E59688',          // Soft red visible on dark
    info: '#6B9A9A',           // Soft teal visible on dark
    successBg: '#273830',      // Dark green tinted background
    warningBg: '#3A3428',      // Dark gold tinted background
    infoBg: '#283838',         // Dark teal tinted background
  },
};

export const defaultThemeName = 'sage';