// Professional Screenshot Guide for Store Listings
// Run this in your browser console on localhost:5173

// Screenshot dimensions for different stores
const SCREENSHOT_SIZES = {
  googlePlay: {
    phone: { width: 1080, height: 1920 },
    tablet: { width: 1200, height: 1920 }
  },
  appStore: {
    iphone67: { width: 1290, height: 2796 },
    iphone65: { width: 1242, height: 2688 },
    ipad129: { width: 2048, height: 2732 },
    ipad11: { width: 1668, height: 2388 }
  }
};

// Key screens to capture (in order of importance)
const SCREENS_TO_CAPTURE = [
  {
    name: 'dashboard',
    url: '/app/dashboard',
    description: 'Main dashboard showing protocol overview'
  },
  {
    name: 'protocols',
    url: '/app/protocols',
    description: 'Protocol management interface'
  },
  {
    name: 'recon-calculator',
    url: '/app/recon',
    description: 'Reconstitution calculator in action'
  },
  {
    name: 'orders',
    url: '/app/orders',
    description: 'Order tracking and management'
  },
  {
    name: 'stockpile',
    url: '/app/stockpile',
    description: 'Inventory management'
  },
  {
    name: 'vendors',
    url: '/app/vendors',
    description: 'Vendor management system'
  },
  {
    name: 'calendar',
    url: '/app/calendar',
    description: 'Calendar integration'
  }
];

// Instructions for taking screenshots
console.log(`
📱 PROFESSIONAL SCREENSHOT GUIDE

1. Open Chrome DevTools (F12)
2. Click the device toggle button (📱)
3. Select "iPhone 12 Pro" for mobile screenshots
4. Navigate to each screen below:

SCREENS TO CAPTURE:
${SCREENS_TO_CAPTURE.map((screen, i) => 
  `${i + 1}. ${screen.name.toUpperCase()}
     URL: http://localhost:5173${screen.url}
     Description: ${screen.description}`
).join('\n\n')}

SCREENSHOT TIPS:
- Use your best theme (mauve/sage) for consistency
- Make sure you have some sample data visible
- Take both light and dark theme screenshots if applicable
- Capture the most impressive/feature-rich views
- Avoid empty states - show populated data

SAVE SCREENSHOTS AS:
- dashboard-hero.png
- protocols-management.png
- recon-calculator.png
- orders-tracking.png
- stockpile-inventory.png
- vendors-management.png
- calendar-integration.png
`);

// Function to help with screenshot automation
function takeScreenshot(name, size = 'googlePlay') {
  const dimensions = SCREENSHOT_SIZES[size];
  console.log(`Taking screenshot: ${name} at ${dimensions.width}x${dimensions.height}`);
  
  // This would be used with a screenshot automation tool
  return {
    name,
    dimensions,
    timestamp: new Date().toISOString()
  };
}

// Export for use
window.ScreenshotGuide = {
  SCREENSHOT_SIZES,
  SCREENS_TO_CAPTURE,
  takeScreenshot
};


