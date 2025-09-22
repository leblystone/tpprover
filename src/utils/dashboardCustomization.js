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
  SUPPLEMENTS: 'supplements'
};

export const WIDGET_SIZES = {
  SMALL: 'small',      // 1x1
  MEDIUM: 'medium',    // 2x1 
  LARGE: 'large',      // 2x2
  WIDE: 'wide',        // 3x1
  FULL: 'full'         // full width
};

export const DEFAULT_WIDGETS = [
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
    id: 'upcoming_order',
    type: WIDGET_TYPES.UPCOMING_ORDER,
    title: 'Incoming Peptides',
    size: WIDGET_SIZES.MEDIUM,
    position: { x: 2, y: 0 },
    enabled: true,
    settings: {
      showTracking: true,
      autoRefresh: true
    }
  },
  {
    id: 'goals_only',
    type: 'goals_only',
    title: 'Goals',
    size: WIDGET_SIZES.MEDIUM,
    position: { x: 0, y: 1 },
    enabled: true,
    settings: {
      maxItems: 5
    }
  },
  {
    id: 'upcoming_buys',
    type: WIDGET_TYPES.UPCOMING_BUYS,
    title: 'Upcoming Buys',
    size: WIDGET_SIZES.MEDIUM,
    position: { x: 2, y: 1 },
    enabled: true,
    settings: {
      maxItems: 3
    }
  },
  {
    id: 'metrics_only',
    type: 'metrics_only',
    title: 'Body Metrics',
    size: WIDGET_SIZES.MEDIUM,
    position: { x: 0, y: 2 },
    enabled: true,
    settings: {
      maxItems: 3
    }
  },
  {
    id: 'compliance',
    type: WIDGET_TYPES.COMPLIANCE,
    title: 'Compliance',
    size: WIDGET_SIZES.SMALL,
    position: { x: 2, y: 2 },
    enabled: true,
    settings: {}
  },
  {
    id: 'spending',
    type: WIDGET_TYPES.SPENDING,
    title: 'Spending',
    size: WIDGET_SIZES.SMALL,
    position: { x: 3, y: 2 },
    enabled: true,
    settings: {}
  },
  {
    id: 'lead_time',
    type: WIDGET_TYPES.LEAD_TIME,
    title: 'Lead Times',
    size: WIDGET_SIZES.SMALL,
    position: { x: 0, y: 3 },
    enabled: true,
    settings: {}
  },
  {
    id: 'inventory',
    type: WIDGET_TYPES.INVENTORY,
    title: 'Inventory',
    size: WIDGET_SIZES.SMALL,
    position: { x: 1, y: 3 },
    enabled: true,
    settings: {}
  },
  {
    id: 'badges',
    type: WIDGET_TYPES.BADGES,
    title: 'Your Badges',
    size: WIDGET_SIZES.WIDE,
    position: { x: 2, y: 3 },
    enabled: true,
    settings: {
      showProgress: true
    }
  },
  {
    id: 'pending_vendors',
    type: WIDGET_TYPES.PENDING_VENDORS,
    title: 'Pending Vendors',
    size: WIDGET_SIZES.MEDIUM,
    position: { x: 0, y: 4 },
    enabled: true, // Show by default, will hide automatically when empty
    settings: {}
  },
  {
    id: 'supplements',
    type: WIDGET_TYPES.SUPPLEMENTS,
    title: 'Supplements',
    size: WIDGET_SIZES.MEDIUM,
    position: { x: 2, y: 4 },
    enabled: true,
    settings: {
      showSchedule: true
    }
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
      { key: 'groupByTime', label: 'Group by AM/PM', type: 'boolean', default: true }
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
    title: 'Compliance',
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
    title: 'Lead Times',
    description: 'Track delivery times and vendor performance',
    icon: 'Truck',
    availableSizes: [WIDGET_SIZES.SMALL, WIDGET_SIZES.MEDIUM],
    settings: []
  },
  [WIDGET_TYPES.INVENTORY]: {
    title: 'Inventory',
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
    title: 'Body Metrics',
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
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults for any missing widgets
      return mergeDashboardLayouts(DEFAULT_WIDGETS, parsed);
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

export const mergeDashboardLayouts = (defaultWidgets, savedWidgets) => {
  const savedMap = new Map(savedWidgets.map(w => [w.id, w]));
  
  return defaultWidgets.map(defaultWidget => {
    const savedWidget = savedMap.get(defaultWidget.id);
    if (savedWidget) {
      // Merge settings, keeping defaults for missing settings
      const mergedSettings = { ...defaultWidget.settings, ...savedWidget.settings };
      return { ...defaultWidget, ...savedWidget, settings: mergedSettings };
    }
    return defaultWidget;
  });
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


