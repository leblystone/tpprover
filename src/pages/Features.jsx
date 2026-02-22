import React from 'react';
import { 
  Calendar, 
  Package, 
  FlaskConical, 
  Users, 
  Target, 
  BarChart3, 
  Shield, 
  Zap, 
  BookOpen, 
  Bell,
  FileText,
  TrendingUp,
  Database,
  Smartphone
} from 'lucide-react';
import { themes, defaultThemeName } from '../theme/themes';
import logo from '../assets/tpp_logo.png';
import { usePageSEO } from '../utils/pageSEO';

export default function Features() {
  usePageSEO();
  const theme = themes[defaultThemeName];

  const mainFeatures = [
    {
      icon: <Calendar className="w-12 h-12" />,
      title: "Research Calendar",
      description: "Plan and schedule your peptide research protocols with our intuitive calendar system. Track injection schedules, reconstitution dates, and protocol milestones.",
      benefits: ["Visual timeline view", "Automated reminders", "Protocol scheduling", "Progress tracking"]
    },
    {
      icon: <Package className="w-12 h-12" />,
      title: "Inventory Management",
      description: "Keep track of your peptide stockpile, reconstitution status, and expiration dates. Never run out of supplies or use expired materials.",
      benefits: ["Stock level monitoring", "Expiration alerts", "Reconstitution tracking", "Vendor management"]
    },
    {
      icon: <FlaskConical className="w-12 h-12" />,
      title: "Protocol Library",
      description: "Access and manage a comprehensive library of peptide research protocols. Create custom protocols and share them with your research team.",
      benefits: ["Pre-built protocols", "Custom protocol creation", "Team collaboration", "Version control"]
    },
    {
      icon: <Target className="w-12 h-12" />,
      title: "Goal Tracking",
      description: "Set research objectives and monitor your progress. Track milestones, measure outcomes, and stay focused on your research goals.",
      benefits: ["Objective setting", "Progress visualization", "Milestone tracking", "Outcome measurement"]
    },
    {
      icon: <BarChart3 className="w-12 h-12" />,
      title: "Analytics Dashboard",
      description: "Gain insights into your research patterns with comprehensive analytics. Track protocol effectiveness, timing optimization, and research trends.",
      benefits: ["Performance metrics", "Trend analysis", "Protocol optimization", "Data visualization"]
    },
    {
      icon: <Shield className="w-12 h-12" />,
      title: "Security & Privacy",
      description: "Your research data is protected with enterprise-grade security. End-to-end encryption ensures your sensitive information stays private.",
      benefits: ["End-to-end encryption", "Secure data storage", "Privacy controls", "Compliance ready"]
    }
  ];

  const additionalFeatures = [
    {
      icon: <Bell className="w-6 h-6" />,
      title: "Smart Notifications",
      description: "Get timely reminders for injections, reconstitution, and protocol milestones."
    },
    {
      icon: <FileText className="w-6 h-6" />,
      title: "Documentation Tools",
      description: "Comprehensive note-taking and documentation features for your research."
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: "Progress Tracking",
      description: "Monitor your research progress with detailed tracking and reporting."
    },
    {
      icon: <Database className="w-6 h-6" />,
      title: "Data Export",
      description: "Export your research data in multiple formats for analysis and reporting."
    },
    {
      icon: <Smartphone className="w-6 h-6" />,
      title: "Mobile Access",
      description: "Access your research data anywhere with our mobile-optimized interface."
    },
    {
      icon: <BookOpen className="w-6 h-6" />,
      title: "Knowledge Base",
      description: "Access comprehensive resources and best practices for peptide research."
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
              <a href="/features" className="text-sm font-medium" style={{ color: theme.primary }}>
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
            Powerful Features for Research
          </h1>
          <p className="text-xl md:text-2xl mb-8" style={{ color: theme.textLight }}>
            Everything you need to organize, track, and optimize your peptide research protocols.
          </p>
        </div>
      </div>

      {/* Main Features Grid */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {mainFeatures.map((feature, index) => (
              <div key={index} className="p-8 rounded-2xl" style={{ backgroundColor: theme.white }}>
                <div className="mb-6" style={{ color: theme.primary }}>
                  {feature.icon}
                </div>
                <h3 className="text-2xl font-bold mb-4" style={{ color: theme.primaryDark }}>
                  {feature.title}
                </h3>
                <p className="text-base mb-6 leading-relaxed" style={{ color: theme.textLight }}>
                  {feature.description}
                </p>
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, benefitIndex) => (
                    <li key={benefitIndex} className="flex items-center text-sm" style={{ color: theme.text }}>
                      <div className="w-2 h-2 rounded-full mr-3" style={{ backgroundColor: theme.primary }}></div>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Features Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.white }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: theme.primaryDark }}>
              Additional Features
            </h2>
            <p className="text-lg" style={{ color: theme.textLight }}>
              More tools to enhance your research workflow
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {additionalFeatures.map((feature, index) => (
              <div key={index} className="p-6 rounded-xl border" style={{ borderColor: theme.border }}>
                <div className="flex items-start">
                  <div className="mr-4 mt-1" style={{ color: theme.primary }}>
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: theme.primaryDark }}>
                      {feature.title}
                    </h3>
                    <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: theme.primaryDark }}>
              Why Choose The Pep Planner?
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: theme.primary }}>
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: theme.primaryDark }}>
                Save Time
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                Streamline your research workflow and reduce administrative overhead with automated tracking and reminders.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: theme.primary }}>
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: theme.primaryDark }}>
                Stay Compliant
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                Maintain proper documentation and compliance with research protocols and safety standards.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: theme.primary }}>
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: theme.primaryDark }}>
                Improve Results
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                Optimize your research protocols with data-driven insights and performance analytics.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.white }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: theme.primaryDark }}>
            Ready to Transform Your Research?
          </h2>
          <p className="text-lg mb-8" style={{ color: theme.textLight }}>
            Experience the power of organized research with The Pep Planner.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/app"
              className="px-8 py-3 rounded-lg font-medium text-white transition-colors"
              style={{ backgroundColor: theme.primary }}
              onMouseEnter={(e) => e.target.style.backgroundColor = theme.primaryDark}
              onMouseLeave={(e) => e.target.style.backgroundColor = theme.primary}
            >
              Start Free Trial
            </a>
            <a
              href="/pricing"
              className="px-8 py-3 rounded-lg font-medium border transition-colors"
              style={{ 
                borderColor: theme.primary, 
                color: theme.primary,
                backgroundColor: 'transparent'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = theme.primary;
                e.target.style.color = 'white';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
                e.target.style.color = theme.primary;
              }}
            >
              View Pricing
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 lg:px-8 border-t" style={{ backgroundColor: theme.background, borderColor: theme.border }}>
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <img src={logo} alt="The Pep Planner" className="h-6 w-6 rounded-full mr-2" />
              <span className="text-sm font-medium" style={{ color: theme.textLight }}>
                © 2026 Belix Company LLC. All rights reserved.
              </span>
              <span className="text-sm font-medium block mt-1" style={{ color: theme.textLight }}>
                The Pep Planner is a trade name of Belix Company LLC.
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
