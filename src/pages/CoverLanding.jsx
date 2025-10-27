import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { themes, defaultThemeName } from '../theme/themes';
import logo from '../assets/tpp-logo.png';
import { isNative } from '../utils/platform';
import Login from './Login';

export default function CoverLanding() {
  const theme = themes[defaultThemeName];
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  // Auto-redirect native apps and local development to /app (only once)
  useEffect(() => {
    const hasRedirected = sessionStorage.getItem('tpp_redirected_from_landing');
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    if ((isNative() || isLocalhost) && !hasRedirected) {
      console.log('🚀 CoverLanding: Auto-redirecting to /app (native or localhost)');
      sessionStorage.setItem('tpp_redirected_from_landing', 'true');
      
      // Use replace to avoid back button issues
      window.location.replace('/app');
    } else if ((isNative() || isLocalhost) && hasRedirected) {
      console.log('⚠️ CoverLanding: Already redirected, forcing to /app');
      // If we're back here after redirect, force to app page
      window.location.replace('/app');
    } else {
      console.log('🌐 CoverLanding: Production web app detected, showing countdown');
    }
  }, []);

  // Set launch date to Friday, November 21, 2025 at midnight
  useEffect(() => {
    const launchDate = new Date('2025-11-21T00:00:00');

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = launchDate.getTime() - now;

      if (distance > 0) {
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // For native apps and localhost, show loading while redirecting
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isNative() || isLocalhost) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.background }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-2" style={{ borderColor: theme.primary }}></div>
          <p className="text-sm" style={{ color: theme.textLight }}>Loading app...</p>
        </div>
      </div>
    );
  }

  // Show countdown interface for web users
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center" style={{ backgroundColor: theme.background }}>
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="mb-8">
          <img
            src={logo}
            alt="The Pep Planner Logo"
            className="h-24 w-24 md:h-32 md:w-32 rounded-full shadow-lg object-cover mx-auto mb-6"
          />
        </div>

        {/* App Title */}
        <div className="mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-3" style={{ color: theme.primaryDark, fontFamily: 'Poppins, sans-serif' }}>
            The Pep Planner
          </h1>
          <p className="text-lg md:text-xl" style={{ color: '#6B7D7A' }}>
            Organize Your Research
          </p>
        </div>

        {/* Opening Soon Card */}
        <div className="p-8 md:p-12 rounded-2xl shadow-xl" style={{ backgroundColor: theme.white }}>

          {/* Countdown Timer */}
          <div className="mb-8">
            <div className="flex items-center justify-center gap-2 mb-6" style={{ color: theme.primary }}>
              <Clock size={20} />
              <span className="font-medium text-sm uppercase tracking-wider">Opening Countdown</span>
            </div>

            <div className="grid grid-cols-4 gap-4 max-w-md mx-auto">
              {/* Days */}
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold py-3 px-2 rounded-lg" style={{ backgroundColor: theme.primary, color: '#FFFFFF' }}>
                  {timeLeft.days.toString().padStart(2, '0')}
                </div>
                <div className="text-xs font-medium uppercase tracking-wider mt-2" style={{ color: '#6B7D7A' }}>
                  Days
                </div>
              </div>

              {/* Hours */}
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold py-3 px-2 rounded-lg" style={{ backgroundColor: theme.primary, color: '#FFFFFF' }}>
                  {timeLeft.hours.toString().padStart(2, '0')}
                </div>
                <div className="text-xs font-medium uppercase tracking-wider mt-2" style={{ color: '#6B7D7A' }}>
                  Hours
                </div>
              </div>

              {/* Minutes */}
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold py-3 px-2 rounded-lg" style={{ backgroundColor: theme.primary, color: '#FFFFFF' }}>
                  {timeLeft.minutes.toString().padStart(2, '0')}
                </div>
                <div className="text-xs font-medium uppercase tracking-wider mt-2" style={{ color: '#6B7D7A' }}>
                  Minutes
                </div>
              </div>

              {/* Seconds */}
              <div className="text-center">
                <div className="text-3xl md:text-4xl font-bold py-3 px-2 rounded-lg" style={{ backgroundColor: theme.primary, color: '#FFFFFF' }}>
                  {timeLeft.seconds.toString().padStart(2, '0')}
                </div>
                <div className="text-xs font-medium uppercase tracking-wider mt-2" style={{ color: '#6B7D7A' }}>
                  Seconds
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Message */}
          <div className="text-center text-base mt-2" style={{ color: '#D1D9D6', fontFamily: 'Cedarville Cursive, cursive' }}>
            <p>- for the love of research</p>
          </div>
        </div>
      </div>
    </div>
  );
}
