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
    textLight: '#8A8077',   // Warm greige — neutral secondary text with subtle warmth
    textOnPrimary: '#FFFFFF',
    
    // Backgrounds
    background: '#EFF2EE',
    cardBackground: '#FFFFFF',
    
    // UI Elements
    border: '#DDE6DE',
    buttonDisabled: '#B0C4BF',
    
    // Semantic Colors
    success: '#E08472',     // Dusty Coral — warm positive (wellness/feminine context)
    warning: '#D4A843',     // Honey Amber — richer, more authority than washed-out gold
    error: '#C4714F',       // Terracotta — grounded error, less harsh than salmon
    info: '#7A5C75',        // Dusty Plum — cool contrast, fully distinct from sage
    successBg: '#FBF0EE',   // Soft coral tint
    warningBg: '#FDF8E8',   // Warm amber tint
    infoBg: '#F3EFF4',      // Soft plum tint
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
    background: '#E8E5E3',      // Darker background for better card contrast
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
    background: '#EAE6E3',      // Darker background for better card contrast
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
    name: 'Dark Mode',
    isDark: true,
    
    // Core Palette - Exact colors from the reference screenshot
    primary: '#929e82',        // Sage green for highlights and accents
    primaryDark: '#7a8570',    // Darker sage for hover states
    primaryLight: '#a8b499',   // Lighter sage for subtle highlights
    secondary: '#29303b',      // Items within cards/buttons
    accent: '#a5b6be',         // Chips and badges (light blue-gray)
    accentText: '#181c22',     // Dark text on light accent/chips

    // Text - Light colors matching screenshot
    text: '#ededee',           // Main text color (very light gray)
    textLight: '#b8bbaa',      // Warm gray for secondary text and descriptive text
    textOnPrimary: '#1F2937',  // Dark text on bright cyan buttons
    
    // Backgrounds - Matching the screenshot's navy/charcoal palette
    background: '#222831',     // Dark navy background (main app background)
    cardBackground: '#29303b', // Card background (lighter than main bg)
    
    // UI Elements
    border: '#b8bbaa',         // Page breaks and dividers (warm gray for better visibility)
    buttonDisabled: '#29303b', // Muted dark for disabled states
    
    // Semantic Colors (adjusted for dark backgrounds with proper contrast)
    success: '#10B981',        // Bright green for success
    warning: '#F59E0B',        // Bright amber for warnings
    error: '#EF4444',          // Bright red for errors
    info: '#22D3EE',           // Cyan for info (matches primary)
    successBg: '#064E3B',      // Dark green background
    warningBg: '#78350F',      // Dark amber background
    infoBg: '#164E63',         // Dark cyan background
  },

  twilight: {
    name: 'Twilight',
    isDark: false,

    // Dreamy pastel palette — Pastel Blue, Soft Pink, Cream, Light Lavender, Pale Lemon, Mint Green
    primary: '#A3C4BC',       // Pastel Blue — CTAs, highlights, nav accents
    primaryDark: '#7AADA3',   // Deeper teal for hover / active states
    primaryLight: '#C8DDD9',  // Lightest pastel blue for subtle highlights
    secondary: '#FFF8E1',     // Cream — items within cards / inner surfaces
    accent: '#D9EAD3',        // Mint Green — chips, badges
    accentText: '#2F4542',    // Deep teal for text on mint chips

    text: '#3A3240',          // Soft near-black with a warm undertone
    textLight: '#8A7E8A',     // Muted mauve-gray for secondary text
    textOnPrimary: '#FFFFFF',

    background: '#FFF8E1',    // Cream — main app shell
    cardBackground: '#FFFFFF',

    border: '#EAD7D1',        // Light Lavender — dividers and card borders
    buttonDisabled: '#C8C4CC',

    success: '#7AADA3',       // Deepened Pastel Blue-Green
    warning: '#E8B570',       // Deepened Pale Lemon for legibility
    error: '#D48A8A',         // Deepened Soft Pink for legibility
    info: '#A3C4BC',          // Pastel Blue
    successBg: '#D9EAD3',     // Mint Green
    warningBg: '#FFE3B3',     // Pale Lemon
    errorBg: '#F5CAC3',       // Soft Pink
    infoBg: '#C8DDD9',        // Light Pastel Blue

    lightMainGradient:
      'linear-gradient(180deg, #FFF8E1 0%, #F5CAC3 30%, #EAD7D1 55%, #D9EAD3 80%, #FFF8E1 100%)',
  },
};

export const defaultThemeName = 'sage';