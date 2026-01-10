import React from 'react';
import { Link } from 'react-router-dom';
import { themes, defaultThemeName } from '../../theme/themes';
import logo from '../../assets/tpp_logo.png';

export default function PublicFooter() {
  const theme = themes[defaultThemeName];

  const footerLinks = {
    product: [
      { label: 'Features', path: '/features' },
      { label: 'Pricing', path: '/pricing' },
      { label: 'Resources', path: '/blog' },
      { label: 'About', path: '/about' }
    ],
    support: [
      { label: 'FAQ', path: '/faq' },
      { label: 'Contact', path: '/contact' },
      { label: 'Help Center', path: '/contact' },
      { label: 'Community', path: '/contact' }
    ],
    legal: [
      { label: 'Privacy Policy', path: '/privacy' },
      { label: 'Terms of Service', path: '/terms' },
      { label: 'Cancellation Policy', path: '/cancellation-policy' },
      { label: 'Cookie Policy', path: '/privacy' },
      { label: 'GDPR', path: '/privacy' }
    ]
  };

  return (
    <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t" style={{ backgroundColor: theme.background, borderColor: theme.border }}>
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <div className="flex items-center mb-4">
              <img src={logo} alt="The Pep Planner" className="h-8 w-8 rounded-full mr-3" />
              <span className="text-xl font-bold" style={{ color: theme.primaryDark }}>
                The Pep Planner
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: theme.textLight }}>
              Empowering researchers with the tools they need to conduct peptide research safely and effectively.
            </p>
            <div className="flex space-x-4">
              {/* Social media links would go here */}
              <a href="#" className="text-sm hover:opacity-75 transition-opacity" style={{ color: theme.textLight }}>
                Twitter
              </a>
              <a href="#" className="text-sm hover:opacity-75 transition-opacity" style={{ color: theme.textLight }}>
                LinkedIn
              </a>
              <a href="#" className="text-sm hover:opacity-75 transition-opacity" style={{ color: theme.textLight }}>
                GitHub
              </a>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: theme.primaryDark }}>
              Product
            </h3>
            <ul className="space-y-2">
              {footerLinks.product.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm hover:opacity-75 transition-opacity"
                    style={{ color: theme.textLight }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: theme.primaryDark }}>
              Support
            </h3>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm hover:opacity-75 transition-opacity"
                    style={{ color: theme.textLight }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="text-sm font-semibold mb-4 uppercase tracking-wider" style={{ color: theme.primaryDark }}>
              Legal
            </h3>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-sm hover:opacity-75 transition-opacity"
                    style={{ color: theme.textLight }}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-8 pt-8 border-t" style={{ borderColor: theme.border }}>
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-4 md:mb-0">
              <span className="text-sm font-medium" style={{ color: theme.textLight }}>
                © 2024 The Pep Planner. All rights reserved.
              </span>
            </div>
            <div className="flex items-center space-x-6">
              <span className="text-sm" style={{ color: theme.textLight }}>
                Made with ❤️ for researchers
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
