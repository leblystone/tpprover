import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { themes, defaultThemeName } from '../../theme/themes';
import logo from '../../assets/tpp-logo.png';

export default function PublicNavigation() {
  const theme = themes[defaultThemeName];
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/features', label: 'Features' },
    { path: '/pricing', label: 'Pricing' },
    { path: '/blog', label: 'Resources' },
    { path: '/contact', label: 'Contact' }
  ];

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="border-b" style={{ backgroundColor: theme.white, borderColor: theme.border }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img src={logo} alt="The Pep Planner" className="h-8 w-8 rounded-full mr-3" />
            <span className="text-xl font-bold" style={{ color: theme.primaryDark }}>
              The Pep Planner
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm font-medium transition-opacity ${
                  isActive(item.path) ? '' : 'hover:opacity-75'
                }`}
                style={{ 
                  color: isActive(item.path) ? theme.primary : theme.text 
                }}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* CTA Button */}
          <div className="hidden md:flex items-center space-x-4">
            <Link
              to="/app"
              className="px-4 py-2 rounded-lg font-medium text-white transition-colors"
              style={{ backgroundColor: theme.primary }}
              onMouseEnter={(e) => e.target.style.backgroundColor = theme.primaryDark}
              onMouseLeave={(e) => e.target.style.backgroundColor = theme.primary}
            >
              Get Started
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              className="p-2 rounded-md"
              style={{ color: theme.text }}
              onClick={() => {
                // Mobile menu toggle logic would go here
                console.log('Mobile menu toggle');
              }}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation (hidden by default) */}
        <div className="md:hidden hidden" id="mobile-menu">
          <div className="px-2 pt-2 pb-3 space-y-1 border-t" style={{ borderColor: theme.border }}>
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`block px-3 py-2 text-base font-medium transition-colors ${
                  isActive(item.path) ? '' : 'hover:opacity-75'
                }`}
                style={{ 
                  color: isActive(item.path) ? theme.primary : theme.text 
                }}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/app"
              className="block px-3 py-2 mt-4 rounded-lg font-medium text-white text-center"
              style={{ backgroundColor: theme.primary }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
