import React from 'react';
import { Shield, Lock, Eye, Database, UserCheck, Globe } from 'lucide-react';
import { themes, defaultThemeName } from '../theme/themes';
import logo from '../assets/tpp_logo.png';
import { PrivacyPolicyContent } from '../components/legal/PrivacyPolicyContent';
import { usePageSEO } from '../utils/pageSEO';

export default function Privacy() {
  usePageSEO();
  const theme = themes[defaultThemeName];

  const privacyPrinciples = [
    {
      icon: <Shield className="w-8 h-8" />,
      title: "Enhanced Research Data Protection",
      description: "Your research data receives the highest level of confidentiality and security. We use it exclusively for providing our services—no commercial analysis, marketing, or third-party sharing."
    },
    {
      icon: <Lock className="w-8 h-8" />,
      title: "Secure Cloud & Local Storage",
      description: "Industry-standard encryption protects data in transit and at rest. We use Firebase for secure cloud sync and local device storage for offline access with application-level encryption."
    },
    {
      icon: <Eye className="w-8 h-8" />,
      title: "Legal Request Resistance",
      description: "We scrutinize all law enforcement requests, interpret them narrowly, and provide user notice when legally permitted. We resist invalid or overly broad requests to protect your data."
    },
    {
      icon: <Database className="w-8 h-8" />,
      title: "Data Retention & Control",
      description: "Legal agreements retained 10 years for research/medical compliance. You can request account deletion anytime—personal identifiers anonymized within 30 days while maintaining required legal records."
    },
    {
      icon: <UserCheck className="w-8 h-8" />,
      title: "Purpose Limitation & Consent",
      description: "We collect only minimum data necessary for our research tracking services. Access to your data is strictly limited to authorized personnel for technical support or service maintenance."
    },
    {
      icon: <Globe className="w-8 h-8" />,
      title: "Research Use Only",
      description: "This application is designed for research tracking purposes only. All tracked substances are for RESEARCH USE ONLY and NOT INTENDED FOR HUMAN CONSUMPTION."
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
              <a href="/cancellation-policy" className="text-sm hover:opacity-75 transition-opacity" style={{ color: theme.textLight }}>
                Cancellation Policy
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
