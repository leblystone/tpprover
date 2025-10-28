import React, { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, MessageCircle, HelpCircle, Users } from 'lucide-react';
import { themes, defaultThemeName } from '../theme/themes';
import logo from '../assets/tpp_logo.png';

export default function Contact() {
  const theme = themes[defaultThemeName];
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    inquiryType: 'general'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Form submitted:', formData);
    // You can integrate with your backend or email service
  };

  const contactMethods = [
    {
      icon: <Mail className="w-6 h-6" />,
      title: "Email Support",
      description: "Get help via email",
      contact: "support@thepepplanner.app",
      action: "Send Email"
    },
    {
      icon: <MessageCircle className="w-6 h-6" />,
      title: "Live Chat",
      description: "Chat with our support team",
      contact: "Available 9 AM - 5 PM EST",
      action: "Start Chat"
    },
    {
      icon: <HelpCircle className="w-6 h-6" />,
      title: "Help Center",
      description: "Browse our knowledge base",
      contact: "Self-service resources",
      action: "Visit Help Center"
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Community Forum",
      description: "Connect with other researchers",
      contact: "Peer-to-peer support",
      action: "Join Community"
    }
  ];

  const inquiryTypes = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'support', label: 'Technical Support' },
    { value: 'billing', label: 'Billing Question' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'media', label: 'Media Inquiry' }
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
              <a href="/contact" className="text-sm font-medium" style={{ color: theme.primary }}>
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
            Get in Touch
          </h1>
          <p className="text-xl md:text-2xl mb-8" style={{ color: theme.textLight }}>
            We're here to help with your research needs. Reach out to our team anytime.
          </p>
        </div>
      </div>

      {/* Contact Methods */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {contactMethods.map((method, index) => (
              <div key={index} className="p-6 rounded-xl text-center" style={{ backgroundColor: theme.white }}>
                <div className="mb-4 flex justify-center" style={{ color: theme.primary }}>
                  {method.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: theme.primaryDark }}>
                  {method.title}
                </h3>
                <p className="text-sm mb-3" style={{ color: theme.textLight }}>
                  {method.description}
                </p>
                <p className="text-sm font-medium mb-4" style={{ color: theme.text }}>
                  {method.contact}
                </p>
                <button className="text-sm font-medium px-4 py-2 rounded-lg transition-colors" style={{ 
                  backgroundColor: theme.primary, 
                  color: 'white' 
                }}>
                  {method.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contact Form and Info */}
      <div className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.white }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <div>
              <h2 className="text-3xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                Send us a Message
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                      Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-offset-2 transition-colors"
                      style={{ 
                        borderColor: theme.border,
                        backgroundColor: theme.background,
                        color: theme.text
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      required
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-offset-2 transition-colors"
                      style={{ 
                        borderColor: theme.border,
                        backgroundColor: theme.background,
                        color: theme.text
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="inquiryType" className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                    Inquiry Type
                  </label>
                  <select
                    id="inquiryType"
                    name="inquiryType"
                    value={formData.inquiryType}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-offset-2 transition-colors"
                    style={{ 
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                      color: theme.text
                    }}
                  >
                    {inquiryTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-offset-2 transition-colors"
                    style={{ 
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                      color: theme.text
                    }}
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    required
                    rows={6}
                    value={formData.message}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-offset-2 transition-colors resize-none"
                    style={{ 
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                      color: theme.text
                    }}
                    placeholder="Tell us how we can help you..."
                  />
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center px-6 py-3 rounded-lg font-medium text-white transition-colors"
                  style={{ backgroundColor: theme.primary }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = theme.primaryDark}
                  onMouseLeave={(e) => e.target.style.backgroundColor = theme.primary}
                >
                  <Send className="w-5 h-5 mr-2" />
                  Send Message
                </button>
              </form>
            </div>

            {/* Contact Information */}
            <div>
              <h2 className="text-3xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                Contact Information
              </h2>
              
              <div className="space-y-6 mb-8">
                <div className="flex items-start">
                  <Mail className="w-6 h-6 mr-4 mt-1" style={{ color: theme.primary }} />
                  <div>
                    <h3 className="font-semibold mb-1" style={{ color: theme.primaryDark }}>
                      Email
                    </h3>
                    <p className="text-sm" style={{ color: theme.textLight }}>
                      support@thepepplanner.app
                    </p>
                    <p className="text-sm" style={{ color: theme.textLight }}>
                      info@thepepplanner.app
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <Clock className="w-6 h-6 mr-4 mt-1" style={{ color: theme.primary }} />
                  <div>
                    <h3 className="font-semibold mb-1" style={{ color: theme.primaryDark }}>
                      Support Hours
                    </h3>
                    <p className="text-sm" style={{ color: theme.textLight }}>
                      Monday - Friday: 9:00 AM - 5:00 PM EST
                    </p>
                    <p className="text-sm" style={{ color: theme.textLight }}>
                      Weekend: Limited support
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <MapPin className="w-6 h-6 mr-4 mt-1" style={{ color: theme.primary }} />
                  <div>
                    <h3 className="font-semibold mb-1" style={{ color: theme.primaryDark }}>
                      Location
                    </h3>
                    <p className="text-sm" style={{ color: theme.textLight }}>
                      United States
                    </p>
                    <p className="text-sm" style={{ color: theme.textLight }}>
                      Remote-first company
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl" style={{ backgroundColor: theme.background }}>
                <h3 className="font-semibold mb-3" style={{ color: theme.primaryDark }}>
                  Response Times
                </h3>
                <ul className="space-y-2 text-sm" style={{ color: theme.textLight }}>
                  <li>• General inquiries: 24-48 hours</li>
                  <li>• Technical support: 12-24 hours</li>
                  <li>• Billing questions: 24 hours</li>
                  <li>• Feature requests: 3-5 business days</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: theme.primaryDark }}>
              Common Questions
            </h2>
            <p className="text-lg" style={{ color: theme.textLight }}>
              Quick answers to frequently asked questions
            </p>
          </div>
          
          <div className="space-y-6">
            <div className="p-6 rounded-xl" style={{ backgroundColor: theme.white }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: theme.primaryDark }}>
                How quickly will I receive a response?
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                We typically respond to all inquiries within 24-48 hours. Technical support requests are prioritized and usually receive a response within 12-24 hours.
              </p>
            </div>
            
            <div className="p-6 rounded-xl" style={{ backgroundColor: theme.white }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: theme.primaryDark }}>
                Do you offer phone support?
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                Currently, we provide support via email and live chat. Phone support is available for enterprise customers. Contact us to discuss your needs.
              </p>
            </div>
            
            <div className="p-6 rounded-xl" style={{ backgroundColor: theme.white }}>
              <h3 className="text-lg font-semibold mb-3" style={{ color: theme.primaryDark }}>
                Can I schedule a demo?
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                Absolutely! We'd be happy to schedule a personalized demo of The Pep Planner. Please mention this in your message and we'll coordinate a time that works for you.
              </p>
            </div>
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
