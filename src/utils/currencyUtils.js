/**
 * Currency formatting utilities for international users
 */

// Currency configuration
const CURRENCY_CONFIG = {
  USD: { symbol: '$', code: 'USD', name: 'US Dollar', locale: 'en-US' },
  EUR: { symbol: '€', code: 'EUR', name: 'Euro', locale: 'en-EU' },
  GBP: { symbol: '£', code: 'GBP', name: 'British Pound', locale: 'en-GB' },
  CAD: { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar', locale: 'en-CA' },
  AUD: { symbol: 'A$', code: 'AUD', name: 'Australian Dollar', locale: 'en-AU' },
  JPY: { symbol: '¥', code: 'JPY', name: 'Japanese Yen', locale: 'ja-JP' },
  CHF: { symbol: 'CHF', code: 'CHF', name: 'Swiss Franc', locale: 'de-CH' },
};

/**
 * Get current currency setting from localStorage
 */
export function getCurrentCurrency() {
  try {
    const settings = JSON.parse(localStorage.getItem('tpprover_settings') || '{}');
    return settings.region?.currency || 'USD';
  } catch (error) {
    console.warn('Failed to get currency setting:', error);
    return 'USD';
  }
}

/**
 * Get currency configuration for a given currency code
 */
export function getCurrencyConfig(currencyCode = null) {
  const code = currencyCode || getCurrentCurrency();
  return CURRENCY_CONFIG[code] || CURRENCY_CONFIG.USD;
}

/**
 * Format a number as currency using the user's preferred currency
 * @param {number|string} amount - The amount to format
 * @param {string} currencyCode - Optional currency code override
 * @param {object} options - Intl.NumberFormat options
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, currencyCode = null, options = {}) {
  if (amount == null || amount === '') return '—';
  
  const num = Number(amount);
  if (isNaN(num)) return String(amount);
  
  const config = getCurrencyConfig(currencyCode);
  const defaultOptions = {
    style: 'currency',
    currency: config.code,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  };
  
  // Special handling for currencies that don't use decimal places
  if (config.code === 'JPY') {
    defaultOptions.minimumFractionDigits = 0;
    defaultOptions.maximumFractionDigits = 0;
  }
  
  const formatOptions = { ...defaultOptions, ...options };
  
  try {
    return new Intl.NumberFormat(config.locale, formatOptions).format(num);
  } catch (error) {
    console.warn('Currency formatting failed, falling back to simple format:', error);
    // Fallback to simple format
    return `${config.symbol}${num.toFixed(config.code === 'JPY' ? 0 : 2)}`;
  }
}

/**
 * Format currency with custom symbol (for backwards compatibility)
 * @param {number|string} amount - The amount to format
 * @param {string} currencyCode - Optional currency code override
 * @returns {string} Formatted currency string with symbol
 */
export function formatCurrencyWithSymbol(amount, currencyCode = null) {
  if (amount == null || amount === '') return '—';
  
  const num = Number(amount);
  if (isNaN(num)) return String(amount);
  
  const config = getCurrencyConfig(currencyCode);
  const decimals = config.code === 'JPY' ? 0 : 2;
  
  return `${config.symbol}${num.toFixed(decimals)}`;
}

/**
 * Get available currency options for dropdowns
 */
export function getCurrencyOptions() {
  return Object.entries(CURRENCY_CONFIG).map(([code, config]) => ({
    value: code,
    label: `${config.name} (${config.symbol})`,
  }));
}

/**
 * Convert amount between currencies (basic exchange rate simulation)
 * Note: This is a placeholder - in production you'd use real exchange rates
 * @param {number} amount - Amount to convert
 * @param {string} fromCurrency - Source currency
 * @param {string} toCurrency - Target currency
 * @returns {number} Converted amount
 */
export function convertCurrency(amount, fromCurrency, toCurrency) {
  // This is a placeholder with mock exchange rates
  // In production, you'd fetch real-time exchange rates
  const exchangeRates = {
    USD: 1.0,
    EUR: 0.85,
    GBP: 0.73,
    CAD: 1.35,
    AUD: 1.50,
    JPY: 110.0,
    CHF: 0.92,
  };
  
  const fromRate = exchangeRates[fromCurrency] || 1.0;
  const toRate = exchangeRates[toCurrency] || 1.0;
  
  return (amount / fromRate) * toRate;
}

/**
 * Enhanced renderCost function that uses currency preferences
 * This replaces the hardcoded $ formatting throughout the app
 */
export function renderCost(cost, currencyCode = null) {
  return formatCurrencyWithSymbol(cost, currencyCode);
}

/**
 * Enhanced renderCostPerMg function that uses currency preferences
 */
export function renderCostPerMg(order, currencyCode = null) {
  const c = Number(order?.cost);
  const mgPerVial = Number(order?.mg);
  const qty = Math.max(1, Number(order?.quantity) || 1);
  const unitMult = String(order?.unit || 'vial').toLowerCase() === 'kit' ? 10 : 1;
  const totalMg = (mgPerVial > 0 ? mgPerVial : NaN) * qty * unitMult;
  
  if (isNaN(c) || isNaN(totalMg) || totalMg <= 0) return '—';
  
  const costPerMg = c / totalMg;
  return formatCurrencyWithSymbol(costPerMg, currencyCode);
}
