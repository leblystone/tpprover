/**
 * App Version - Single Source of Truth
 * 
 * This file automatically imports the version from package.json
 * so you only have to update it in ONE place!
 */

import packageJson from '../../package.json';

// Export the version from package.json as the single source of truth
export const APP_VERSION = packageJson.version;

// Helper to get full version info
export function getVersionInfo() {
  return {
    version: APP_VERSION,
    buildDate: __BUILD_DATE__,
    buildType: import.meta.env.MODE
  };
}

// Log version on import (useful for debugging)
console.log(`📱 The Pep Planner v${APP_VERSION} (${import.meta.env.MODE})`);
