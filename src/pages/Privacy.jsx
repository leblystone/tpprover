import React from 'react';
import { Shield, Lock, Eye, Database, UserCheck, Globe } from 'lucide-react';
import { themes, defaultThemeName } from '../theme/themes';
import logo from '../assets/tpp_logo.png';
import { PrivacyPolicyContent } from '../components/legal/PrivacyPolicyContent';

export default function Privacy() {
  const theme = themes[defaultThemeName];

  const privacyPrinciples = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Data Protection",
      description: "We implement industry-standard security measures to protect your research data."
    },
    {
      icon: <Lock className="w-8 h-8" />,
      title: "Encryption",
      description: "All data is encrypted in transit and at rest using enterprise-grade encryption."
    },
    {
      icon: <Eye className="w-8 h-8" />,
      title: "Transparency",
      description: "We're transparent about how we collect, use, and protect your information."
    },
    {
      icon: <Database className="w-8 h-8" />,
      title: "Data Control",
      description: "You maintain full control over your data and can export or delete it at any time."
    },
    {
      icon: <UserCheck className="w-8 h-8" />,
      title: "Consent",
      description: "We only collect data with your explicit consent and for legitimate purposes."
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Compliance",
      description: "We comply with applicable privacy laws and regulations worldwide."
    }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
      {/* Navigation */}
      <nav className="border-b" style={{ backgroundColor: theme.white, borderColor: theme.border }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <img src={logo} alt="The Pep Planner" className="h-8 w-8 rounded-full mr-3" />
              <span className="text-xl font-bold" style={{ color: theme.primaryDark }}>The Pep Planner</span>
            </div>
            <div className="flex space-x-8">
              <a href="/" className="text-sm font-medium hover:opacity-75 transition-opacity" style={{ color: theme.text }}>
                Home
              </a>
              <a href="/about" className="text-sm font-medium hover:opacity-75 transition-opacity" style={{ color: theme.text }}>
                About
              </a>
              <a href="/features" className="text-sm font-medium hover:opacity-75 transition-opacity" style={{ color: theme.text }}>
                Features
              </a>
              <a href="/pricing" className="text-sm font-medium hover:opacity-75 transition-opacity" style={{ color: theme.text }}>
                Pricing
              </a>
              <a href="/contact" className="text-sm font-medium hover:opacity-75 transition-opacity" style={{ color: theme.text }}>
                Contact
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: theme.primaryDark }}>
            Privacy Policy
          </h1>
          <p className="text-xl md:text-2xl mb-8" style={{ color: theme.textLight }}>
            Your privacy and data security are our top priorities.
          </p>
          <p className="text-sm" style={{ color: theme.textLight }}>
            Last updated: October 27, 2025
          </p>
        </div>
      </div>

      {/* Privacy Principles */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: theme.primaryDark }}>
              Our Privacy Principles
            </h2>
            <p className="text-lg" style={{ color: theme.textLight }}>
              We follow these core principles to protect your privacy
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {privacyPrinciples.map((principle, index) => (
              <div key={index} className="p-6 rounded-xl text-center" style={{ backgroundColor: theme.white }}>
                <div className="mb-4 flex justify-center" style={{ color: theme.primary }}>
                  {principle.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: theme.primaryDark }}>
                  {principle.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                  {principle.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Privacy Policy Content */}
      <div className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.white }}>
        <div className="max-w-4xl mx-auto">
          <PrivacyPolicyContent />
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t" style={{ backgroundColor: theme.background, borderColor: theme.border }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <img src={logo} alt="The Pep Planner" className="h-6 w-6 rounded-full mr-2" />
              <span className="text-sm font-medium" style={{ color: theme.textLight }}>
                © 2024 The Pep Planner. All rights reserved.
              </span>
            </div>
            <div className="flex space-x-6">
              <a href="/privacy" className="text-sm hover:opacity-75 transition-opacity" style={{ color: theme.textLight }}>
                Privacy Policy
              </a>
              <a href="/terms" className="text-sm hover:opacity-75 transition-opacity" style={{ color: theme.textLight }}>
                Terms of Service
              </a>
              <a href="/contact" className="text-sm hover:opacity-75 transition-opacity" style={{ color: theme.textLight }}>
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
