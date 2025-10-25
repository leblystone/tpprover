import React, { useState, useEffect } from 'react';
import { Mail, Eye, Save, Send, RotateCcw, Copy, CheckCircle } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';

const DEFAULT_TEMPLATES = {
  welcome: {
    name: 'Welcome Email',
    subject: 'Welcome to The Pep Planner! 🎉',
    heading: 'Welcome to The Pep Planner! 🎉',
    greeting: "Hi there! We're thrilled to have you join our research community.",
    mainMessage: "The Pep Planner is your complete research management platform, designed to help you organize protocols, track progress, and optimize your research journey.",
    ctaText: 'Get Started',
    ctaLink: 'https://thepepplanner.app/app/dashboard',
    highlightTitle: '🎁 Your 7-Day Free Trial is Active!',
    highlightMessage: 'Full access to all features. No credit card required.',
    features: [
      'Create Custom Protocols – Build and manage research protocols',
      'Track Your Progress – Calendar integration and task management',
      'Reconstitution Calculator – Calculate dosages with precision',
      'Inventory Management – Track orders, stockpile, and vendors',
      'Research Notes – Document findings and observations',
      'Data Analytics – Visualize trends and metrics'
    ]
  },
  verification: {
    name: 'Email Verification',
    subject: 'Verify your email for The Pep Planner',
    heading: 'Verify Your Email 📧',
    greeting: 'Thanks for signing up! Please verify your email address to ensure you can:',
    mainMessage: '',
    ctaText: 'Verify Email Address',
    ctaLink: '%VERIFICATION_LINK%',
    highlightTitle: '',
    highlightMessage: "⚠️ If you didn't create an account with The Pep Planner, you can safely ignore this email.",
    features: [
      'Reset your password if needed',
      'Receive important account notifications',
      'Access all features securely'
    ]
  },
  passwordReset: {
    name: 'Password Reset',
    subject: 'Reset your password for The Pep Planner',
    heading: 'Reset Your Password 🔐',
    greeting: 'We received a request to reset the password for your account.',
    mainMessage: 'Click the button below to create a new password:',
    ctaText: 'Reset Password',
    ctaLink: '%RESET_LINK%',
    highlightTitle: '⏱️ This link expires in 1 hour',
    highlightMessage: 'For your security, this password reset link is only valid for 60 minutes.',
    features: []
  },
  trialEnding: {
    name: 'Trial Ending Soon',
    subject: 'Your trial ends in 2 days - The Pep Planner',
    heading: 'Your Trial Ends in 2 Days ⏰',
    greeting: "Hi there! We hope you're enjoying The Pep Planner.",
    mainMessage: 'Your 7-day free trial will end in 2 days. To continue accessing your research data and all features, please choose a subscription plan.',
    ctaText: 'View Plans & Pricing',
    ctaLink: 'https://thepepplanner.app/app/account',
    highlightTitle: '✨ Continue Your Research Journey',
    highlightMessage: 'Choose from flexible plans starting at $8.99/month',
    features: []
  },
  subscription: {
    name: 'Subscription Confirmed',
    subject: 'Subscription Confirmed - The Pep Planner',
    heading: 'Welcome to Pro Plan! 🎉',
    greeting: 'Thank you for subscribing to The Pep Planner!',
    mainMessage: 'You now have full access to all features. Your subscription will automatically renew, and you can manage your billing at any time from your account settings.',
    ctaText: 'Go to Dashboard',
    ctaLink: 'https://thepepplanner.app/app/dashboard',
    highlightTitle: 'Subscription Details',
    highlightMessage: 'Plan: Pro Plan • Status: Active ✓',
    features: []
  }
};

const DEFAULT_COLORS = {
  primary: '#344E41',
  primaryLight: '#3A5A40',
  secondary: '#A3B18A',
  sage: '#D4D7CD',
  white: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280'
};

export default function EmailTemplateManager({ theme }) {
  const [selectedTemplate, setSelectedTemplate] = useState('welcome');
  const [templates, setTemplates] = useState(() => {
    // Load from localStorage or use defaults
    const saved = localStorage.getItem('tpp_email_templates');
    return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
  });
  const [colors, setColors] = useState(() => {
    const saved = localStorage.getItem('tpp_email_colors');
    return saved ? JSON.parse(saved) : DEFAULT_COLORS;
  });
  const [showPreview, setShowPreview] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const currentTemplate = templates[selectedTemplate];

  // Save templates to localStorage
  const saveTemplates = () => {
    setIsSaving(true);
    localStorage.setItem('tpp_email_templates', JSON.stringify(templates));
    localStorage.setItem('tpp_email_colors', JSON.stringify(colors));
    
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { message: '✅ Email templates saved!', type: 'success' }
    }));
    
    setTimeout(() => setIsSaving(false), 1000);
  };

  // Reset to defaults
  const resetToDefaults = () => {
    if (confirm('Reset all templates to default? This cannot be undone.')) {
      setTemplates(DEFAULT_TEMPLATES);
      setColors(DEFAULT_COLORS);
      localStorage.removeItem('tpp_email_templates');
      localStorage.removeItem('tpp_email_colors');
      
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: '🔄 Templates reset to defaults', type: 'success' }
      }));
    }
  };

  // Update template field
  const updateTemplate = (field, value) => {
    setTemplates({
      ...templates,
      [selectedTemplate]: {
        ...currentTemplate,
        [field]: value
      }
    });
  };

  // Update feature in list
  const updateFeature = (index, value) => {
    const newFeatures = [...currentTemplate.features];
    newFeatures[index] = value;
    updateTemplate('features', newFeatures);
  };

  // Add feature
  const addFeature = () => {
    updateTemplate('features', [...currentTemplate.features, 'New feature']);
  };

  // Remove feature
  const removeFeature = (index) => {
    const newFeatures = currentTemplate.features.filter((_, i) => i !== index);
    updateTemplate('features', newFeatures);
  };

  // Generate preview HTML
  const generatePreviewHTML = () => {
    const template = currentTemplate;
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background-color: ${colors.sage};">
  <div style="background-color: ${colors.sage}; padding: 20px 0;">
    <div style="max-width: 600px; margin: 20px auto; background-color: ${colors.white}; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <div style="background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryLight} 100%); padding: 40px 20px; text-align: center;">
        <img src="https://thepepplanner.app/tpp-logo.png" alt="The Pep Planner" style="width: 120px; height: auto; margin: 0 auto 12px; filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2));" />
        <div style="color: ${colors.sage}; font-size: 14px; font-weight: 500; letter-spacing: 0.5px;">Organize Your Research</div>
      </div>
      <div style="padding: 40px 32px; color: ${colors.text};">
        <h1 style="color: ${colors.primary}; font-size: 28px; margin: 0 0 16px 0;">${template.heading}</h1>
        
        <p style="font-size: 16px; line-height: 1.6; color: ${colors.text};">
          ${template.greeting}
        </p>
        
        ${template.mainMessage ? `<p style="font-size: 16px; line-height: 1.6; color: ${colors.text};">${template.mainMessage}</p>` : ''}

        ${template.highlightTitle ? `
        <div style="background-color: #F0FDF4; border-left: 4px solid ${colors.secondary}; padding: 16px; margin: 20px 0; border-radius: 12px;">
          <p style="margin: 0; font-weight: 600; color: ${colors.primary};">${template.highlightTitle}</p>
          <p style="margin: 8px 0 0 0; font-size: 14px; color: ${colors.textLight};">
            ${template.highlightMessage}
          </p>
        </div>
        ` : ''}

        ${template.features.length > 0 ? `
        <h2 style="color: ${colors.primary}; font-size: 20px; margin: 32px 0 16px 0;">What you can do:</h2>
        <ul style="list-style: none; padding: 0; margin: 20px 0;">
          ${template.features.map(f => `
          <li style="padding: 12px 0; padding-left: 32px; position: relative;">
            <span style="position: absolute; left: 0; color: ${colors.secondary}; font-weight: bold; font-size: 18px;">✓</span>
            ${f}
          </li>
          `).join('')}
        </ul>
        ` : ''}

        <center>
          <a href="${template.ctaLink}" style="display: inline-block; padding: 16px 32px; background-color: ${colors.primary}; color: ${colors.white} !important; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin: 24px 0; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);">
            ${template.ctaText}
          </a>
        </center>

        <p style="font-size: 16px; line-height: 1.6; color: ${colors.text}; margin-top: 24px;">
          Best,<br>
          <strong style="color: ${colors.primary};">The Pep Planner Team</strong>
        </p>
      </div>
      <div style="background-color: ${colors.sage}; padding: 32px; text-align: center; color: ${colors.textLight}; font-size: 13px;">
        <p style="margin: 0 0 12px 0; font-weight: 600; color: ${colors.text};">The Pep Planner</p>
        <p style="margin: 0 0 16px 0;">Your research management platform</p>
        <p style="margin: 0;">
          <a href="https://thepepplanner.app" style="color: ${colors.primary}; text-decoration: none;">Visit Website</a> • 
          <a href="https://thepepplanner.app/app/dashboard" style="color: ${colors.primary}; text-decoration: none;">Dashboard</a>
        </p>
        <p style="margin: 16px 0 0 0; font-size: 11px; color: ${colors.textLight};">
          © 2025 The Pep Planner. All rights reserved.
        </p>
      </div>
    </div>
  </div>
</body>
</html>
    `;
  };

  // Copy HTML to clipboard
  const copyHTML = () => {
    const html = generatePreviewHTML();
    navigator.clipboard.writeText(html);
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { message: '📋 HTML copied to clipboard!', type: 'success' }
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: theme.text }}>
            Email Template Manager
          </h2>
          <p className="text-sm" style={{ color: theme.textLight }}>
            Customize your transactional emails - no coding required!
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={resetToDefaults}
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all"
            style={{ backgroundColor: theme.secondary, color: theme.text }}
          >
            <RotateCcw size={16} />
            Reset to Defaults
          </button>
          <button
            onClick={saveTemplates}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          >
            {isSaving ? <CheckCircle size={16} /> : <Save size={16} />}
            {isSaving ? 'Saved!' : 'Save Templates'}
          </button>
        </div>
      </div>

      {/* Template Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Object.entries(templates).map(([key, template]) => (
          <button
            key={key}
            onClick={() => setSelectedTemplate(key)}
            className="px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all"
            style={{
              backgroundColor: selectedTemplate === key ? theme.primary : theme.secondary,
              color: selectedTemplate === key ? theme.textOnPrimary : theme.text
            }}
          >
            {template.name}
          </button>
        ))}
      </div>

      {/* Editor Layout - Desktop Optimized */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Left: Editor */}
        <div className="space-y-6">
          <div className="p-6 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text }}>
              Edit Template
            </h3>

            {/* Subject Line */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                Subject Line
              </label>
              <input
                type="text"
                value={currentTemplate.subject}
                onChange={(e) => updateTemplate('subject', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }}
                placeholder="Email subject line"
              />
            </div>

            {/* Heading */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                Main Heading
              </label>
              <input
                type="text"
                value={currentTemplate.heading}
                onChange={(e) => updateTemplate('heading', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }}
                placeholder="Main heading"
              />
            </div>

            {/* Greeting */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                Opening Message
              </label>
              <textarea
                value={currentTemplate.greeting}
                onChange={(e) => updateTemplate('greeting', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }}
                rows="2"
                placeholder="Opening greeting"
              />
            </div>

            {/* Main Message */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                Main Message
              </label>
              <textarea
                value={currentTemplate.mainMessage}
                onChange={(e) => updateTemplate('mainMessage', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }}
                rows="3"
                placeholder="Main email content"
              />
            </div>

            {/* Highlight Box */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                Highlight Box (Optional)
              </label>
              <input
                type="text"
                value={currentTemplate.highlightTitle}
                onChange={(e) => updateTemplate('highlightTitle', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm mb-2"
                style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }}
                placeholder="Highlight title (leave empty to hide)"
              />
              <textarea
                value={currentTemplate.highlightMessage}
                onChange={(e) => updateTemplate('highlightMessage', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }}
                rows="2"
                placeholder="Highlight message"
              />
            </div>

            {/* Features List */}
            {selectedTemplate === 'welcome' || selectedTemplate === 'verification' ? (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium" style={{ color: theme.text }}>
                    Feature List
                  </label>
                  <button
                    onClick={addFeature}
                    className="text-xs px-2 py-1 rounded"
                    style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                  >
                    + Add Feature
                  </button>
                </div>
                {currentTemplate.features.map((feature, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={feature}
                      onChange={(e) => updateFeature(index, e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg border text-sm"
                      style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }}
                    />
                    <button
                      onClick={() => removeFeature(index)}
                      className="px-3 py-2 rounded-lg text-sm hover:opacity-80"
                      style={{ backgroundColor: theme.error, color: theme.white }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            {/* CTA Button */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                Call-to-Action Button
              </label>
              <input
                type="text"
                value={currentTemplate.ctaText}
                onChange={(e) => updateTemplate('ctaText', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm mb-2"
                style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }}
                placeholder="Button text"
              />
              <input
                type="text"
                value={currentTemplate.ctaLink}
                onChange={(e) => updateTemplate('ctaLink', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm"
                style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }}
                placeholder="Button link URL"
              />
            </div>
          </div>

          {/* Color Customization - Compact */}
          <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <h3 className="text-sm font-semibold mb-3" style={{ color: theme.text }}>
              Brand Colors
            </h3>

            <div className="grid grid-cols-3 gap-3">
              {Object.entries(colors).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-xs font-medium mb-1 capitalize" style={{ color: theme.textLight }}>
                    {key.replace(/([A-Z])/g, ' $1')}
                  </label>
                  <div className="flex gap-1">
                    <input
                      type="color"
                      value={value}
                      onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                      className="w-8 h-8 rounded border cursor-pointer"
                      style={{ borderColor: theme.border }}
                    />
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                      className="flex-1 px-2 py-1 rounded border text-xs font-mono"
                      style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Preview - Always Visible */}
        <div className="sticky top-4">
          <div className="p-6 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
                Live Preview
              </h3>
              <button
                onClick={copyHTML}
                className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 hover:opacity-90"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                <Copy size={14} />
                Copy HTML
              </button>
            </div>

            <iframe
              srcDoc={generatePreviewHTML()}
              className="w-full rounded-lg border"
              style={{ height: '700px', borderColor: theme.border }}
              title="Email Preview"
            />
          </div>
        </div>
      </div>

    </div>
  );
}

