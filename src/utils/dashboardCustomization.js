// Dashboard customization utilities
export const WIDGET_TYPES = {
  TASKS: 'tasks',
  UPCOMING_ORDER: 'upcoming_order', 
  UPCOMING_BUYS: 'upcoming_buys',
  PENDING_VENDORS: 'pending_vendors',
  ANALYTICS: 'analytics',
  COMPLIANCE: 'compliance',
  SPENDING: 'spending',
  LEAD_TIME: 'lead_time',
  INVENTORY: 'inventory',
  BADGES: 'badges',
  GOALS: 'goals_only',
  METRICS: 'metrics_only',
  SUPPLEMENTS: 'supplements',
  QUICK_ACTIONS: 'quick_actions',
  WATER_TRACKER: 'water_tracker',
  GLOSSARY: 'glossary',
  FEEDBACK: 'feedback',
  NOTES: 'notes',
  INJECTION_HISTORY: 'injection_history'
};

export const WIDGET_SIZES = {
  SMALL: 'small',      // 1x1
  MEDIUM: 'medium',    // 2x1 
  TALL: 'tall',        // 1x2
  LARGE: 'large',      // 2x2
  WIDE: 'wide',        // 3x1
  FULL: 'full'         // full width
};

export const DEFAULT_WIDGETS = [
  // Row 0
  {
    id: 'tasks',
    type: WIDGET_TYPES.TASKS,
    title: 'Today\'s Research',
    size: WIDGET_SIZES.MEDIUM,
    position: { x: 0, y: 0 },
    enabled: true,
    settings: {
      showCompleted: true,
      groupByTime: true
    }
  },
  {
    id: 'quick_actions',
    type: WIDGET_TYPES.QUICK_ACTIONS,
    title: 'Quick Actions',
    size: WIDGET_SIZES.SMALL,
    position: { x: 2, y: 0 },
    enabled: true,
    settings: {}
  },
  {
    id: 'inventory',
    type: WIDGET_TYPES.INVENTORY,
    title: 'Stockpile',
    size: WIDGET_SIZES.SMALL,
    position: { x: 3, y: 0 },
    enabled: true,
    settings: {}
  },
  {
    id: 'upcoming_order',
    type: WIDGET_TYPES.UPCOMING_ORDER,
    title: 'Incoming Peptides',
    size: WIDGET_SIZES.MEDIUM,
    position: { x: 4, y: 0 },
    enabled: true,
    settings: {
      showTracking: true,
      autoRefresh: true
    }
  },
  // Row 1
  {
    id: 'supplements',
    type: WIDGET_TYPES.SUPPLEMENTS,
    title: 'Supplements',
    size: WIDGET_SIZES.MEDIUM,
    position: { x: 0, y: 1 },
    enabled: true,
    settings: {
      showSchedule: true
    }
  },
  {
    id: 'goals_only',
    type: 'goals_only',
    title: 'Goals',
    size: WIDGET_SIZES.SMALL,
    position: { x: 2, y: 1 },
    enabled: true,
    settings: {
      maxItems: 5
    }
  },
  {
    id: 'spending',
    type: WIDGET_TYPES.SPENDING,
    title: 'Spending',
    size: WIDGET_SIZES.SMALL,
    position: { x: 3, y: 1 },
    enabled: true,
    settings: {}
  },
  {
    id: 'metrics_only',
    type: 'metrics_only',
    title: 'Bio-Metrics',
    size: WIDGET_SIZES.MEDIUM,
    position: { x: 4, y: 1 },
    enabled: true,
    settings: {
      maxItems: 3
    }
  },
  // Row 2
  {
    id: 'compliance',
    type: WIDGET_TYPES.COMPLIANCE,
    title: 'Research Consistency',
    size: WIDGET_SIZES.SMALL,
    position: { x: 0, y: 2 },
    enabled: true,
    settings: {}
  },
  {
    id: 'upcoming_buys',
    type: WIDGET_TYPES.UPCOMING_BUYS,
    title: 'Upcoming Buys',
    size: WIDGET_SIZES.SMALL,
    position: { x: 1, y: 2 },
    enabled: true,
    settings: {
      maxItems: 3
    }
  },
  {
    id: 'lead_time',
    type: WIDGET_TYPES.LEAD_TIME,
    title: 'Average Delivery',
    size: WIDGET_SIZES.SMALL,
    position: { x: 2, y: 2 },
    enabled: true,
    settings: {}
  },
  {
    id: 'notes',
    type: WIDGET_TYPES.NOTES,
    title: 'Research Notes',
    size: WIDGET_SIZES.SMALL,
    position: { x: 3, y: 2 },
    enabled: true,
    settings: {}
  },
  {
    id: 'water_tracker',
    type: WIDGET_TYPES.WATER_TRACKER,
    title: 'Hydration',
    size: WIDGET_SIZES.SMALL,
    position: { x: 4, y: 2 },
    enabled: true,
    settings: {
      defaultGoal: 8
    }
  },
  {
    id: 'badges',
    type: WIDGET_TYPES.BADGES,
    title: 'Your Badges',
    size: WIDGET_SIZES.SMALL,
    position: { x: 5, y: 2 },
    enabled: true,
    settings: {
      showProgress: true
    }
  },
  // Row 3
  {
    id: 'glossary',
    type: WIDGET_TYPES.GLOSSARY,
    title: 'Research Glossary',
    size: WIDGET_SIZES.MEDIUM,
    position: { x: 0, y: 3 },
    enabled: true,
    settings: {
      showRecent: true,
      showFavorites: true
    }
  },
  {
    id: 'feedback',
    type: WIDGET_TYPES.FEEDBACK,
    title: 'Feedback',
    size: WIDGET_SIZES.SMALL,
    position: { x: 1, y: 3 },
    enabled: true,
    settings: {}
  },
  // Optional widgets (disabled by default but available for customization)
  {
    id: 'pending_vendors',
    type: WIDGET_TYPES.PENDING_VENDORS,
    title: 'Pending Vendors',
    size: WIDGET_SIZES.MEDIUM,
    position: { x: 0, y: 4 },
    enabled: false, // Hidden by default as it only shows when needed
    settings: {}
  }
];

export const WIDGET_METADATA = {
  [WIDGET_TYPES.TASKS]: {
    title: 'Today\'s Research',
    description: 'View and manage your daily supplement and peptide tasks',
    icon: 'CheckSquare',
    availableSizes: [WIDGET_SIZES.SMALL, WIDGET_SIZES.MEDIUM, WIDGET_SIZES.LARGE],
    settings: [
      { key: 'showCompleted', label: 'Show completed tasks', type: 'boolean', default: true },
      { key: 'groupByTime', label: 'Group by time slot', type: 'boolean', default: true }
    ]
  },
  [WIDGET_TYPES.UPCOMING_ORDER]: {
    title: 'Incoming Peptides',
    description: 'Track your incoming orders and shipments',
    icon: 'Package',
    availableSizes: [WIDGET_SIZES.MEDIUM, WIDGET_SIZES.LARGE],
    settings: [
      { key: 'showTracking', label: 'Show tracking info', type: 'boolean', default: true },
      { key: 'autoRefresh', label: 'Auto-refresh tracking', type: 'boolean', default: true }
    ]
  },
  [WIDGET_TYPES.UPCOMING_BUYS]: {
    title: 'Upcoming Buys',
    description: 'View scheduled group buys and purchases',
    icon: 'ShoppingCart',
    availableSizes: [WIDGET_SIZES.SMALL, WIDGET_SIZES.MEDIUM, WIDGET_SIZES.LARGE],
    settings: [
      { key: 'maxItems', label: 'Max items to show', type: 'number', default: 3, min: 1, max: 10 }
    ]
  },
  [WIDGET_TYPES.PENDING_VENDORS]: {
    title: 'Pending Vendors',
    description: 'Complete vendor information for auto-created vendors',
    icon: 'Users',
    availableSizes: [WIDGET_SIZES.MEDIUM, WIDGET_SIZES.LARGE],
    settings: []
  },
  [WIDGET_TYPES.ANALYTICS]: {
    title: 'Analytics Dashboard',
    description: 'View compliance, spending, and inventory analytics',
    icon: 'BarChart3',
    availableSizes: [WIDGET_SIZES.LARGE, WIDGET_SIZES.FULL],
    settings: [
      { key: 'defaultTab', label: 'Default tab', type: 'select', default: 'compliance', options: [
        { value: 'compliance', label: 'Compliance' },
        { value: 'spending', label: 'Spending' },
        { value: 'inventory', label: 'Inventory' }
      ]}
    ]
  },
  [WIDGET_TYPES.BADGES]: {
    title: 'Your Badges',
    description: 'Track your achievement progress',
    icon: 'Award',
    availableSizes: [WIDGET_SIZES.MEDIUM, WIDGET_SIZES.WIDE, WIDGET_SIZES.FULL],
    settings: [
      { key: 'showProgress', label: 'Show progress bar', type: 'boolean', default: true }
    ]
  },
  [WIDGET_TYPES.GOALS]: {
    title: 'Goals & Metrics',
    description: 'Track your research goals and body metrics',
    icon: 'Target',
    availableSizes: [WIDGET_SIZES.MEDIUM, WIDGET_SIZES.LARGE],
    settings: [
      { key: 'showMetrics', label: 'Show body metrics', type: 'boolean', default: true },
      { key: 'showGoals', label: 'Show goals', type: 'boolean', default: true },
      { key: 'maxItems', label: 'Max items to show', type: 'number', default: 5, min: 1, max: 10 }
    ]
  },
  [WIDGET_TYPES.COMPLIANCE]: {
    title: 'Research Consistency',
    description: 'Track your supplement compliance and streaks',
    icon: 'CheckCircle',
    availableSizes: [WIDGET_SIZES.SMALL, WIDGET_SIZES.MEDIUM],
    settings: []
  },
  [WIDGET_TYPES.SPENDING]: {
    title: 'Spending',
    description: 'Monitor your monthly and total spending',
    icon: 'DollarSign',
    availableSizes: [WIDGET_SIZES.SMALL, WIDGET_SIZES.MEDIUM],
    settings: []
  },
  [WIDGET_TYPES.LEAD_TIME]: {
    title: 'Average Delivery',
    description: 'Track delivery times and vendor performance',
    icon: 'Truck',
    availableSizes: [WIDGET_SIZES.SMALL, WIDGET_SIZES.MEDIUM],
    settings: []
  },
  [WIDGET_TYPES.INVENTORY]: {
    title: 'Stockpile',
    description: 'Monitor stock levels and low inventory alerts',
    icon: 'Archive',
    availableSizes: [WIDGET_SIZES.SMALL, WIDGET_SIZES.MEDIUM],
    settings: []
  },
  ['goals_only']: {
    title: 'Goals',
    description: 'Track and manage your research goals',
    icon: 'Target',
    availableSizes: [WIDGET_SIZES.MEDIUM, WIDGET_SIZES.LARGE],
    settings: [
      { key: 'maxItems', label: 'Max items to show', type: 'number', default: 5, min: 1, max: 10 }
    ]
  },
  ['metrics_only']: {
    title: 'Bio-Metrics',
    description: 'Record and track your body metrics',
    icon: 'Activity',
    availableSizes: [WIDGET_SIZES.MEDIUM, WIDGET_SIZES.LARGE],
    settings: [
      { key: 'maxItems', label: 'Max items to show', type: 'number', default: 3, min: 1, max: 10 }
    ]
  },
  [WIDGET_TYPES.SUPPLEMENTS]: {
    title: 'Supplements',
    description: 'Manage your supplement schedule',
    icon: 'Pill',
    availableSizes: [WIDGET_SIZES.SMALL, WIDGET_SIZES.MEDIUM, WIDGET_SIZES.LARGE],
    settings: [
      { key: 'showSchedule', label: 'Show schedule', type: 'boolean', default: true }
    ]
  },
  [WIDGET_TYPES.QUICK_ACTIONS]: {
    title: 'Quick Actions',
    description: 'Essential actions: reconstitute, add to stockpile, add vendor, add protocol',
    icon: 'Zap',
    availableSizes: [WIDGET_SIZES.SMALL, WIDGET_SIZES.MEDIUM],
    settings: []
  },
  [WIDGET_TYPES.WATER_TRACKER]: {
    title: 'Hydration',
    description: 'Track daily water intake with customizable goals',
    icon: 'Droplets',
    availableSizes: [WIDGET_SIZES.SMALL, WIDGET_SIZES.MEDIUM],
    settings: [
      { key: 'defaultGoal', label: 'Default daily goal (glasses)', type: 'number', default: 8, min: 1, max: 20 }
    ]
  },
  [WIDGET_TYPES.GLOSSARY]: {
    title: 'Research Glossary',
    description: 'Comprehensive inline peptide research tool with search, browse, and notes',
    icon: 'BookOpen',
    availableSizes: [WIDGET_SIZES.MEDIUM, WIDGET_SIZES.LARGE, WIDGET_SIZES.WIDE, WIDGET_SIZES.FULL],
    settings: [
      { key: 'showRecent', label: 'Show recent searches', type: 'boolean', default: true },
      { key: 'showFavorites', label: 'Show favorite entries', type: 'boolean', default: true }
    ]
  },
  [WIDGET_TYPES.FEEDBACK]: {
    title: 'Feedback',
    description: 'Share feedback, suggestions, and report issues',
    icon: 'MessageSquare',
    availableSizes: [WIDGET_SIZES.SMALL, WIDGET_SIZES.MEDIUM],
    settings: []
  },
  [WIDGET_TYPES.NOTES]: {
    title: 'Research Notes',
    description: 'Quick note-taking for research observations and ideas',
    icon: 'FileText',
    availableSizes: [WIDGET_SIZES.SMALL, WIDGET_SIZES.MEDIUM, WIDGET_SIZES.LARGE],
    settings: []
  },
  [WIDGET_TYPES.INJECTION_HISTORY]: {
    title: 'View History',
    description: 'Track your injection sites and history for better rotation',
    icon: 'Pipette',
    availableSizes: [WIDGET_SIZES.SMALL, WIDGET_SIZES.MEDIUM],
    settings: [
      { key: 'showRecent', label: 'Number of recent injections to show', type: 'number', default: 5, min: 1, max: 20 }
    ]
  }
};

// Grid layout utilities
export const GRID_COLS = 4;
export const GRID_ROWS = 10;

export const getSizeConfig = (size) => {
  switch (size) {
    case WIDGET_SIZES.SMALL:
      return { w: 1, h: 1 };
    case WIDGET_SIZES.MEDIUM:
      return { w: 2, h: 1 };
    case WIDGET_SIZES.TALL:
      return { w: 1, h: 2 };
    case WIDGET_SIZES.LARGE:
      return { w: 2, h: 2 };
    case WIDGET_SIZES.WIDE:
      return { w: 3, h: 1 };
    case WIDGET_SIZES.FULL:
      return { w: 4, h: 2 };
    default:
      return { w: 2, h: 1 };
  }
};

// Storage utilities
export const STORAGE_KEY = 'tpprover_dashboard_layout';

export const loadDashboardLayout = () => {
  try {
    // Check if we need to force a reset due to widget size updates
    const layoutVersion = localStorage.getItem('tpprover_dashboard_version');
    const currentVersion = '3.2'; // UPDATED LAYOUT: Research Glossary widget size changed to MEDIUM to match Supplements card
    
    console.log('🔍 Dashboard version check:', { layoutVersion, currentVersion, match: layoutVersion === currentVersion });
    
    if (layoutVersion !== currentVersion) {
      localStorage.setItem('tpprover_dashboard_version', currentVersion);
      localStorage.removeItem(STORAGE_KEY);
      return DEFAULT_WIDGETS;
    }
    
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      
      // CRITICAL FIX: Remove duplicate widgets from saved layouts
      const cleanedParsed = removeDuplicateWidgets(parsed);
      
      // Merge with defaults for any missing widgets
      return mergeDashboardLayouts(DEFAULT_WIDGETS, cleanedParsed);
    }
  } catch (error) {
    console.warn('Failed to load dashboard layout:', error);
  }
  return DEFAULT_WIDGETS;
};

export const saveDashboardLayout = (widgets) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widgets));
  } catch (error) {
    console.error('Failed to save dashboard layout:', error);
  }
};

// Remove duplicate widgets from saved layouts (cleanup function)
export const removeDuplicateWidgets = (widgets) => {
  const seenIds = new Set();
  const seenTypes = new Set();
  const duplicateTypes = new Set(['compliance', 'spending', 'lead_time']); // Known duplicates
  
  return widgets.filter(widget => {
    // Remove duplicates by ID (primary check)
    if (seenIds.has(widget.id)) {
      return false;
    }
    seenIds.add(widget.id);
    
    // For known problematic types, also check by type
    if (duplicateTypes.has(widget.id) || duplicateTypes.has(widget.type)) {
      const key = widget.id || widget.type;
      if (seenTypes.has(key)) {
        return false;
      }
      seenTypes.add(key);
    }
    
    return true; // Keep widget
  });
};

export const mergeDashboardLayouts = (defaultWidgets, savedWidgets) => {
  const savedMap = new Map(savedWidgets.map(w => [w.id, w]));
  
  const mergedWidgets = defaultWidgets.map(defaultWidget => {
    const savedWidget = savedMap.get(defaultWidget.id);
    if (savedWidget) {
      // Merge settings, keeping defaults for missing settings
      const mergedSettings = { ...defaultWidget.settings, ...savedWidget.settings };
      return { ...defaultWidget, ...savedWidget, settings: mergedSettings };
    }
    return defaultWidget;
  });

  // Apply grid compaction to remove empty spaces
  return compactGrid(mergedWidgets);
};

// Grid compaction function to eliminate empty spaces
export const compactGrid = (widgets) => {
  if (!widgets || widgets.length === 0) return widgets;

  // Filter only enabled widgets
  const enabledWidgets = widgets.filter(w => w.enabled);
  const disabledWidgets = widgets.filter(w => !w.enabled);

  // Sort by current position (y first, then x) to maintain relative order
  enabledWidgets.sort((a, b) => {
    const aY = a.position?.y || 0;
    const bY = b.position?.y || 0;
    if (aY !== bY) return aY - bY;
    const aX = a.position?.x || 0;
    const bX = b.position?.x || 0;
    return aX - bX;
  });

  // Create a grid to track occupied spaces
  const grid = [];
  const GRID_COLS = 6; // 6-column grid

  // Get widget dimensions based on size (matching getSizeConfig)
  const getWidgetDimensions = (size) => {
    switch (size) {
      case WIDGET_SIZES.SMALL: return { width: 1, height: 1 };
      case WIDGET_SIZES.MEDIUM: return { width: 2, height: 1 };
      case WIDGET_SIZES.TALL: return { width: 1, height: 2 };
      case WIDGET_SIZES.LARGE: return { width: 2, height: 2 };
      case WIDGET_SIZES.WIDE: return { width: 3, height: 1 };
      case WIDGET_SIZES.FULL: return { width: 4, height: 2 };
      default: return { width: 2, height: 1 };
    }
  };

  // Helper functions for grid management
  const isPositionAvailable = (x, y, width, height) => {
    // Check bounds
    if (x < 0 || y < 0 || x + width > GRID_COLS) return false;
    
    // Check if position is already occupied
    for (let row = y; row < y + height; row++) {
      for (let col = x; col < x + width; col++) {
        if (grid[row] && grid[row][col]) return false;
      }
    }
    return true;
  };

  const markPositionOccupied = (x, y, width, height) => {
    for (let row = y; row < y + height; row++) {
      if (!grid[row]) grid[row] = [];
      for (let col = x; col < x + width; col++) {
        grid[row][col] = true;
      }
    }
  };

  // Reposition widgets to eliminate gaps
  const compactedWidgets = enabledWidgets.map(widget => {
    const { width, height } = getWidgetDimensions(widget.size);
    
    // Find the first available position starting from top-left
    let bestY = 0, bestX = 0, found = false;

    for (let y = 0; y < 50 && !found; y++) { // Max 50 rows
      for (let x = 0; x <= GRID_COLS - width && !found; x++) {
        if (isPositionAvailable(x, y, width, height)) {
          bestX = x; bestY = y; found = true;
        }
      }
    }

    markPositionOccupied(bestX, bestY, width, height);
    return { ...widget, position: { x: bestX, y: bestY } };
  });

  return [...compactedWidgets, ...disabledWidgets];
};

export const resetDashboardLayout = () => {
  localStorage.removeItem(STORAGE_KEY);
  return DEFAULT_WIDGETS;
};

// Widget position utilities
export const findEmptyPosition = (widgets, size) => {
  const { w, h } = getSizeConfig(size);
  const occupied = new Set();
  
  // Mark all occupied positions
  widgets.forEach(widget => {
    const { w: widgetW, h: widgetH } = getSizeConfig(widget.size);
    for (let x = widget.position.x; x < widget.position.x + widgetW; x++) {
      for (let y = widget.position.y; y < widget.position.y + widgetH; y++) {
        occupied.add(`${x},${y}`);
      }
    }
  });
  
  // Find first empty position that fits
  for (let y = 0; y < GRID_ROWS; y++) {
    for (let x = 0; x <= GRID_COLS - w; x++) {
      let canFit = true;
      for (let dx = 0; dx < w && canFit; dx++) {
        for (let dy = 0; dy < h && canFit; dy++) {
          if (occupied.has(`${x + dx},${y + dy}`)) {
            canFit = false;
          }
        }
      }
      if (canFit) {
        return { x, y };
      }
    }
  }
  
  // If no space found, place at end
  return { x: 0, y: Math.max(...widgets.map(w => w.position.y + getSizeConfig(w.size).h), 0) };
};

export const validateWidgetPosition = (widget, widgets, excludeId = null) => {
  const { w, h } = getSizeConfig(widget.size);
  const { x, y } = widget.position;
  
  // Check bounds
  if (x < 0 || y < 0 || x + w > GRID_COLS) {
    return false;
  }
  
  // Check for overlaps
  const otherWidgets = widgets.filter(w => w.id !== excludeId);
  for (const other of otherWidgets) {
    const { w: otherW, h: otherH } = getSizeConfig(other.size);
    const { x: otherX, y: otherY } = other.position;
    
    // Check if rectangles overlap
    if (!(x >= otherX + otherW || x + w <= otherX || y >= otherY + otherH || y + h <= otherY)) {
      return false;
    }
  }
  
  return true;
};


