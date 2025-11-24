/**
 * Development-only logging utility
 * Logs are only shown in development mode, keeping production console clean
 */

const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

export const devLog = (...args) => {
  if (isDevelopment) {
    console.log(...args);
  }
};

export const devWarn = (...args) => {
  if (isDevelopment) {
    console.warn(...args);
  }
};

export const devError = (...args) => {
  // Errors should always be logged
  console.error(...args);
};

export const devInfo = (...args) => {
  if (isDevelopment) {
    console.info(...args);
  }
};

// Always export these for production error tracking
export { console };











