// src/utils/notificationTemplates.js
import { loadSettings } from '../pages/Settings';

// Default notification templates with personality
const DEFAULT_TEMPLATES = {
  lowStock: {
    title: "🔬 Stock Running Low!",
    body: "You're down to {count} vials of {peptideName}. Time to reorder?",
    actionText: "Check Stockpile",
    actionUrl: "/app/stockpile"
  },
  orderArrived: {
    title: "📦 Peptide Delivery Alert!",
    body: "Hey there! Did your {peptideName} recently arrive? Don't forget to add it to your stockpile!",
    actionText: "Update Stockpile",
    actionUrl: "/app/stockpile"
  },
  orderStatusUpdate: {
    title: "📋 Order Update!",
    body: "Your {peptideName} order status changed to: {status}. {additionalMessage}",
    actionText: "View Order",
    actionUrl: "/app/orders"
  },
  washoutReminder: {
    title: "⏰ Washout Period Reminder",
    body: "Your {protocolName} protocol ended {daysAgo} days ago. Time to start your washout period!",
    actionText: "View Protocol",
    actionUrl: "/app/protocols"
  },
  cycleReminder: {
    title: "🔄 Cycle Coming Up!",
    body: "Your {protocolName} cycle is starting in {daysUntil} days! Ready to confirm it for your schedule?",
    actionText: "Confirm Cycle",
    actionUrl: "/app/protocols"
  },
  cycleEndReminder: {
    title: "🏁 Cycle Ending Soon!",
    body: "Your {protocolName} cycle ends in {daysUntil} days. Time to plan your next phase!",
    actionText: "View Protocol",
    actionUrl: "/app/protocols"
  },
  researchReminder: {
    title: "🧪 Research Reminder",
    body: "Time for your {peptideName} dose! You have {taskCount} research task(s) scheduled for today.",
    actionText: "View Tasks",
    actionUrl: "/app/dashboard"
  }
};

// Load custom templates from localStorage or use defaults
export function getNotificationTemplate(type, variables = {}) {
  try {
    const customTemplates = JSON.parse(localStorage.getItem('tpp_notification_templates') || '{}');
    const template = customTemplates[type] || DEFAULT_TEMPLATES[type];
    
    if (!template) {
      console.warn(`No notification template found for type: ${type}`);
      return DEFAULT_TEMPLATES.researchReminder; // Fallback
    }
    
    // Replace variables in the template
    let processedTemplate = { ...template };
    
    Object.keys(variables).forEach(key => {
      const placeholder = `{${key}}`;
      processedTemplate.title = processedTemplate.title?.replace(new RegExp(placeholder, 'g'), variables[key] || '');
      processedTemplate.body = processedTemplate.body?.replace(new RegExp(placeholder, 'g'), variables[key] || '');
    });
    
    return processedTemplate;
  } catch (error) {
    console.error('Error loading notification template:', error);
    return DEFAULT_TEMPLATES.researchReminder; // Fallback
  }
}

// Save custom templates to localStorage
export function saveNotificationTemplate(type, template) {
  try {
    const customTemplates = JSON.parse(localStorage.getItem('tpp_notification_templates') || '{}');
    customTemplates[type] = template;
    localStorage.setItem('tpp_notification_templates', JSON.stringify(customTemplates));
    return true;
  } catch (error) {
    console.error('Error saving notification template:', error);
    return false;
  }
}

// Get all available templates
export function getAllTemplates() {
  try {
    const customTemplates = JSON.parse(localStorage.getItem('tpp_notification_templates') || '{}');
    return { ...DEFAULT_TEMPLATES, ...customTemplates };
  } catch (error) {
    console.error('Error loading all templates:', error);
    return DEFAULT_TEMPLATES;
  }
}

// Reset templates to defaults
export function resetTemplatesToDefault() {
  try {
    localStorage.removeItem('tpp_notification_templates');
    return true;
  } catch (error) {
    console.error('Error resetting templates:', error);
    return false;
  }
}

// Check if user has notifications enabled for a specific type
export function isNotificationEnabled(type) {
  try {
    const settings = loadSettings();
    return settings?.notifications?.[type] !== false;
  } catch (error) {
    console.error('Error checking notification setting:', error);
    return true; // Default to enabled
  }
}

// Get notification variables for different types
export function getNotificationVariables(type, data = {}) {
  switch (type) {
    case 'lowStock':
      return {
        count: data.count || 0,
        peptideName: data.peptideName || 'your peptide'
      };
    case 'orderArrived':
    case 'orderStatusUpdate':
      return {
        peptideName: data.peptideName || 'your peptide',
        status: data.status || 'unknown',
        additionalMessage: data.additionalMessage || ''
      };
    case 'washoutReminder':
      return {
        protocolName: data.protocolName || 'your protocol',
        daysAgo: data.daysAgo || 0
      };
    case 'cycleReminder':
    case 'cycleEndReminder':
      return {
        protocolName: data.protocolName || 'your protocol',
        daysUntil: data.daysUntil || 0
      };
    case 'researchReminder':
      return {
        peptideName: data.peptideName || 'your research',
        taskCount: data.taskCount || 0
      };
    default:
      return {};
  }
}

// Export default templates for admin panel
export { DEFAULT_TEMPLATES };
