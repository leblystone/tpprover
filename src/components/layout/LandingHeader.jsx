import React from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/tpp_logo.png';

/**
 * Shared header for public pages: Landing, FAQ, Terms, Privacy.
 * Same layout and styling as the Landing page nav.
 */
export default function LandingHeader() {
  const navigate = useNavigate();

  const handleSignIn = () => {
    navigate('/login');
  };

  const handleGetStarted = () => {
    navigate('/login?trial=true');
  };

  return (
    <header className="pt-3 pb-3 md:pt-4 md:pb-3" style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #DDE6DE' }}>
      <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">
        {/* Mobile Layout */}
        <div className="flex lg:hidden items-center justify-between">
          <h1 className="text-[8px] font-bold tracking-widest uppercase" style={{ color: '#9CA3AF', fontFamily: 'Poppins, sans-serif', letterSpacing: '0.15em' }}>Organize Your Research</h1>
          <button type="button" onClick={() => navigate('/')} className="cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0">
            <img
              src={logo}
              alt="Logo"
              className="rounded-full shadow object-contain"
              style={{
                width: '48px',
                height: '48px',
                imageRendering: 'auto',
                backfaceVisibility: 'hidden',
                transform: 'translateZ(0)',
                WebkitBackfaceVisibility: 'hidden',
                willChange: 'transform',
                WebkitTransform: 'translateZ(0)',
                msTransform: 'translateZ(0)'
              }}
            />
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSignIn}
              className="px-2 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{ color: '#7F9E95', backgroundColor: 'transparent' }}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={handleGetStarted}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-md hover:shadow-lg btn-primary-inset"
              style={{ backgroundColor: '#7F9E95', color: '#FFFFFF' }}
            >
              Sign Up
            </button>
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:flex items-center justify-between">
          <h1 className="text-sm font-medium tracking-widest uppercase" style={{ color: '#9CA3AF', fontFamily: 'Poppins, sans-serif', letterSpacing: '0.15em' }}>Organize Your Research</h1>
          <div className="flex-1 flex justify-center">
            <button type="button" onClick={() => navigate('/')} className="cursor-pointer hover:opacity-80 transition-opacity bg-transparent border-0 p-0">
              <img src={logo} alt="Logo" className="rounded-full shadow object-cover" style={{ width: '80px', height: '80px' }} />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleSignIn}
              className="px-4 py-2 rounded-lg font-medium transition-colors"
              style={{ color: '#7F9E95', backgroundColor: 'transparent' }}
            >
              Log In
            </button>
            <button
              type="button"
              onClick={handleGetStarted}
              className="px-6 py-2 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg btn-primary-inset"
              style={{ backgroundColor: '#7F9E95', color: '#FFFFFF' }}
            >
              Sign Up
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
