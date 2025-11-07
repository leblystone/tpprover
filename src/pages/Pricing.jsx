import React, { useState } from 'react';
import { Check, Star, Zap, Shield, Users } from 'lucide-react';
import { themes, defaultThemeName } from '../theme/themes';
import logo from '../assets/tpp_logo.png';
import { formatCurrency } from '../utils/currencyUtils';

export default function Pricing() {
  const theme = themes[defaultThemeName];
  const [billingCycle, setBillingCycle] = useState('monthly');

  const plans = [
    {
      name: "Researcher",
      description: "Perfect for individual researchers",
      monthlyPrice: 19,
      yearlyPrice: 190,
      features: [
        "Unlimited protocols",
        "Basic calendar scheduling",
        "Inventory tracking",
        "Goal setting & tracking",
        "Mobile app access",
        "Email support",
        "Data export (CSV)",
        "Basic analytics"
      ],
      popular: false,
      cta: "Start Free Trial",
      ctaLink: "/app"
    },
    {
      name: "Research Team",
      description: "Ideal for small research teams",
      monthlyPrice: 49,
      yearlyPrice: 490,
      features: [
        "Everything in Researcher",
        "Team collaboration tools",
        "Advanced calendar features",
        "Protocol sharing",
        "Team analytics dashboard",
        "Priority support",
        "Advanced data export",
        "Custom protocol templates",
        "Team goal tracking"
      ],
      popular: true,
      cta: "Start Free Trial",
      ctaLink: "/app"
    },
    {
      name: "Institution",
      description: "For research institutions and labs",
      monthlyPrice: 149,
      yearlyPrice: 1490,
      features: [
        "Everything in Research Team",
        "Unlimited team members",
        "Advanced security controls",
        "Compliance reporting",
        "API access",
        "Custom integrations",
        "Dedicated support",
        "On-premise deployment option",
        "Custom branding",
        "Advanced analytics & reporting"
      ],
      popular: false,
      cta: "Contact Sales",
      ctaLink: "/contact"
    }
  ];

  const faqs = [
    {
      question: "Is there a free trial?",
      answer: "Yes! Every plan starts with a 10-day research trial. No credit card required to explore the workspace."
    },
    {
      question: "Can I change plans anytime?",
      answer: "Absolutely. You can upgrade or downgrade your plan at any time. Changes take effect immediately."
    },
    {
      question: "What happens to my data if I cancel?",
      answer: "Your data remains accessible for 30 days after cancellation. You can export all your data during this period."
    },
    {
      question: "Do you offer educational discounts?",
      answer: "Yes! We offer special pricing for educational institutions and students. Contact us for more information."
    },
    {
      question: "Is my data secure?",
      answer: "Yes. We use enterprise-grade security with end-to-end encryption to protect your research data."
    },
    {
      question: "Can I use this for commercial research?",
      answer: "Yes, all plans support both academic and commercial research applications."
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
              <a href="/pricing" className="text-sm font-medium" style={{ color: theme.primary }}>
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
            Simple, Transparent Pricing
          </h1>
          <p className="text-xl md:text-2xl mb-8" style={{ color: theme.textLight }}>
            Choose the plan that fits your research needs. Every plan includes a 10-day research trial.
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center mb-8">
            <span className={`mr-3 text-sm font-medium ${billingCycle === 'monthly' ? '' : 'opacity-50'}`} style={{ color: theme.text }}>
              Monthly
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'yearly' : 'monthly')}
              className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
              style={{ backgroundColor: billingCycle === 'yearly' ? theme.primary : '#D1D5DB' }}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`ml-3 text-sm font-medium ${billingCycle === 'yearly' ? '' : 'opacity-50'}`} style={{ color: theme.text }}>
              Yearly
            </span>
            {billingCycle === 'yearly' && (
              <span className="ml-2 px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: theme.primary, color: 'white' }}>
                Save 17%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan, index) => (
              <div
                key={index}
                className={`relative p-8 rounded-2xl ${
                  plan.popular ? 'ring-2' : ''
                }`}
                style={{
                  backgroundColor: theme.white,
                  borderColor: plan.popular ? theme.primary : theme.border,
                  border: plan.popular ? `2px solid ${theme.primary}` : `1px solid ${theme.border}`
                }}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <div className="flex items-center px-4 py-2 rounded-full text-sm font-medium text-white" style={{ backgroundColor: theme.primary }}>
                      <Star className="w-4 h-4 mr-1" />
                      Most Popular
                    </div>
                  </div>
                )}
                
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold mb-2" style={{ color: theme.primaryDark }}>
                    {plan.name}
                  </h3>
                  <p className="text-sm mb-4" style={{ color: theme.textLight }}>
                    {plan.description}
                  </p>
                  <div className="mb-4">
                    <span className="text-4xl font-bold" style={{ color: theme.primaryDark }}>
                      {formatCurrency(billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice)}
                    </span>
                    <span className="text-sm ml-1" style={{ color: theme.textLight }}>
                      /{billingCycle === 'monthly' ? 'month' : 'year'}
                    </span>
                  </div>
                  {billingCycle === 'yearly' && (
                    <p className="text-sm" style={{ color: theme.primary }}>
                      {formatCurrency(Math.round(plan.yearlyPrice / 12))}/month billed yearly
                    </p>
                  )}
                </div>

                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" style={{ color: theme.primary }} />
                      <span className="text-sm" style={{ color: theme.text }}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <a
                  href={plan.ctaLink}
                  className={`block w-full py-3 px-6 rounded-lg font-medium text-center transition-colors ${
                    plan.popular
                      ? 'text-white'
                      : 'border'
                  }`}
                  style={{
                    backgroundColor: plan.popular ? theme.primary : 'transparent',
                    borderColor: plan.popular ? theme.primary : theme.primary,
                    color: plan.popular ? 'white' : theme.primary
                  }}
                  onMouseEnter={(e) => {
                    if (plan.popular) {
                      e.target.style.backgroundColor = theme.primaryDark;
                    } else {
                      e.target.style.backgroundColor = theme.primary;
                      e.target.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (plan.popular) {
                      e.target.style.backgroundColor = theme.primary;
                    } else {
                      e.target.style.backgroundColor = 'transparent';
                      e.target.style.color = theme.primary;
                    }
                  }}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Features Comparison */}
      <div className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.white }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: theme.primaryDark }}>
              All Plans Include
            </h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: theme.primary }}>
                <Shield className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: theme.primaryDark }}>
                Enterprise Security
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                End-to-end encryption, secure data storage, and compliance with research standards.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: theme.primary }}>
                <Zap className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: theme.primaryDark }}>
                14-Day Free Trial
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                Try all features risk-free. No credit card required to get started.
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: theme.primary }}>
                <Users className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-3" style={{ color: theme.primaryDark }}>
                Expert Support
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                Get help from our team of research professionals and technical experts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: theme.primaryDark }}>
              Frequently Asked Questions
            </h2>
          </div>
          
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <div key={index} className="p-6 rounded-xl" style={{ backgroundColor: theme.white }}>
                <h3 className="text-lg font-semibold mb-3" style={{ color: theme.primaryDark }}>
                  {faq.question}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.white }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: theme.primaryDark }}>
            Ready to Get Started?
          </h2>
          <p className="text-lg mb-8" style={{ color: theme.textLight }}>
            Join thousands of researchers who trust The Pep Planner for their research organization needs.
          </p>
          <a
            href="/app"
            className="inline-block px-8 py-3 rounded-lg font-medium text-white transition-colors"
            style={{ backgroundColor: theme.primary }}
            onMouseEnter={(e) => e.target.style.backgroundColor = theme.primaryDark}
            onMouseLeave={(e) => e.target.style.backgroundColor = theme.primary}
          >
            Start Your Free Trial
          </a>
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
