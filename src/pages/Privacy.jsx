import React from 'react';
import { Shield, Lock, Eye, Database, UserCheck, Globe } from 'lucide-react';
import { themes, defaultThemeName } from '../theme/themes';
import logo from '../assets/tpp_logo.png';

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
          <div className="prose prose-lg max-w-none">
            
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                1. Information We Collect
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>
                  <strong>Account Information:</strong> When you create an account, we collect your name, email address, and password. This information is necessary to provide you with access to our services.
                </p>
                <p>
                  <strong>Research Data:</strong> We store the research protocols, schedules, and data you input into The Pep Planner. This data is encrypted and stored securely on our servers.
                </p>
                <p>
                  <strong>Usage Information:</strong> We collect information about how you use our service, including features accessed, time spent, and interactions with the platform. This helps us improve our service.
                </p>
                <p>
                  <strong>Device Information:</strong> We may collect information about your device, including IP address, browser type, and operating system for security and analytics purposes.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                2. How We Use Your Information
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>
                  <strong>Service Provision:</strong> We use your information to provide, maintain, and improve The Pep Planner service, including processing your research data and providing customer support.
                </p>
                <p>
                  <strong>Communication:</strong> We may use your contact information to send you important updates about the service, security notifications, and respond to your inquiries.
                </p>
                <p>
                  <strong>Analytics:</strong> We analyze usage patterns to improve our service, develop new features, and ensure optimal performance.
                </p>
                <p>
                  <strong>Security:</strong> We use your information to protect against fraud, abuse, and security threats to our service and users.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                3. Information Sharing and Disclosure
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>
                  <strong>We do not sell your personal information.</strong> We may share your information only in the following limited circumstances:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>With your explicit consent</li>
                  <li>To comply with legal obligations or court orders</li>
                  <li>To protect our rights, property, or safety, or that of our users</li>
                  <li>With service providers who assist us in operating our platform (under strict confidentiality agreements)</li>
                  <li>In connection with a business transfer or acquisition</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                4. Data Security
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>
                  We implement comprehensive security measures to protect your information:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>End-to-end encryption for all data transmission</li>
                  <li>Encryption at rest for all stored data</li>
                  <li>Regular security audits and penetration testing</li>
                  <li>Access controls and authentication measures</li>
                  <li>Secure data centers with physical security measures</li>
                  <li>Regular security training for our team</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                5. Your Rights and Choices
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>You have the following rights regarding your personal information:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li><strong>Access:</strong> Request a copy of the personal information we hold about you</li>
                  <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                  <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                  <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
                  <li><strong>Restriction:</strong> Limit how we process your information</li>
                  <li><strong>Objection:</strong> Object to certain types of processing</li>
                </ul>
                <p>
                  To exercise these rights, please contact us at privacy@thepepplanner.app.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                6. Data Retention
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>
                  We retain your information for as long as necessary to provide our services and fulfill the purposes outlined in this policy. Specifically:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Account information is retained while your account is active</li>
                  <li>Research data is retained until you delete it or close your account</li>
                  <li>Usage analytics are retained for up to 2 years</li>
                  <li>Legal and security logs may be retained longer as required by law</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                7. International Data Transfers
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>
                  Your information may be transferred to and processed in countries other than your own. We ensure that such transfers comply with applicable data protection laws and implement appropriate safeguards, including:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Standard contractual clauses approved by relevant authorities</li>
                  <li>Adequacy decisions by relevant data protection authorities</li>
                  <li>Other appropriate safeguards as required by law</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                8. Children's Privacy
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>
                  The Pep Planner is not intended for use by children under 13 years of age. We do not knowingly collect personal information from children under 13. If we become aware that we have collected personal information from a child under 13, we will take steps to delete such information.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                9. Changes to This Policy
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                10. Contact Us
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>
                  If you have any questions about this Privacy Policy or our privacy practices, please contact us:
                </p>
                <ul className="list-none space-y-2">
                  <li><strong>Email:</strong> privacy@thepepplanner.app</li>
                  <li><strong>General Support:</strong> support@thepepplanner.app</li>
                  <li><strong>Address:</strong> The Pep Planner, United States</li>
                </ul>
              </div>
            </section>

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
