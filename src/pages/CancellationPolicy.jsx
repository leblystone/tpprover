import React from 'react';
import { XCircle, Calendar, DollarSign, Database, RefreshCw, Mail, AlertCircle } from 'lucide-react';
import { themes, defaultThemeName } from '../theme/themes';
import logo from '../assets/tpp_logo.png';
import { CancellationPolicyContent } from '../components/legal/CancellationPolicyContent';

export default function CancellationPolicy() {
  const theme = themes[defaultThemeName];

  const keyPoints = [
    {
      icon: <XCircle className="w-8 h-8" />,
      title: "Easy Cancellation",
      description: "Cancel your subscription at any time through your account settings or by contacting support."
    },
    {
      icon: <Calendar className="w-8 h-8" />,
      title: "Access Until Period End",
      description: "Your subscription remains active until the end of your current billing period after cancellation."
    },
    {
      icon: <DollarSign className="w-8 h-8" />,
      title: "No Hidden Fees",
      description: "Clear and transparent cancellation process with no surprise charges or fees."
    },
    {
      icon: <Database className="w-8 h-8" />,
      title: "30-Day Data Access",
      description: "Your research data remains accessible for 30 days after cancellation for easy export."
    },
    {
      icon: <RefreshCw className="w-8 h-8" />,
      title: "Easy Reactivation",
      description: "You can reactivate your subscription anytime within the 30-day grace period."
    },
    {
      icon: <Mail className="w-8 h-8" />,
      title: "Confirmation Emails",
      description: "Receive clear confirmation and instructions when you cancel your subscription."
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
            Cancellation Policy
          </h1>
          <p className="text-xl md:text-2xl mb-8" style={{ color: theme.textLight }}>
            Clear and straightforward cancellation process for your subscription.
          </p>
          <p className="text-sm" style={{ color: theme.textLight }}>
            Last updated: December 2024
          </p>
        </div>
      </div>

      {/* Key Points */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: theme.primaryDark }}>
              Key Points
            </h2>
            <p className="text-lg" style={{ color: theme.textLight }}>
              Important highlights from our cancellation policy
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {keyPoints.map((point, index) => (
              <div key={index} className="p-6 rounded-xl text-center" style={{ backgroundColor: theme.white }}>
                <div className="mb-4 flex justify-center" style={{ color: theme.primary }}>
                  {point.icon}
                </div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: theme.primaryDark }}>
                  {point.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cancellation Policy Content */}
      <div className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.white }}>
        <div className="max-w-4xl mx-auto">
          <CancellationPolicyContent />
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



