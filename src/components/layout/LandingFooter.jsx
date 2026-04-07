import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/tpp_logo.png';
import LandingContactModal from '../legal/LandingContactModal';

/** Button that navigates without full page load (avoids 404 on lazy chunks) */
function NavButton({ to, children, className = '', style = {} }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className={`hover:underline text-left bg-transparent border-0 p-0 cursor-pointer ${className}`}
      style={{ color: 'inherit', ...style }}
    >
      {children}
    </button>
  );
}

/**
 * Shared footer for public pages: Landing, FAQ, Terms, Privacy, etc.
 * Contact opens a modal on the page instead of navigating.
 * Uses programmatic navigation (no <a>) so links never trigger full page load / 404.
 */
export default function LandingFooter() {
  const year = new Date().getFullYear();
  const [showContactModal, setShowContactModal] = useState(false);

  return (
    <footer className="py-12" style={{ backgroundColor: '#2F3B3A', borderTop: '1px solid #DDE6DE' }}>
      <div className="w-full px-3 md:max-w-7xl md:mx-auto md:px-8">
        <div className="grid grid-cols-4 md:grid-cols-4 gap-4 md:gap-8">
          <div className="col-span-2 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <img src={logo} alt="Logo" className="h-8 w-8 md:h-10 md:w-10 rounded-full shadow object-cover" />
              <div>
                <h3 className="text-sm md:text-lg font-semibold" style={{ color: '#FFFFFF' }}>Organize Your Research</h3>
                <p className="text-xs md:text-sm" style={{ color: '#A0B9B3' }}>
                  All-in-One Research Tool
                </p>
              </div>
            </div>
          </div>
          <div className="col-span-1">
            <h4 className="text-xs md:text-sm font-semibold mb-2 md:mb-4" style={{ color: '#FFFFFF' }}>Support</h4>
            <ul className="space-y-1 md:space-y-2 text-xs md:text-sm" style={{ color: '#A0B9B3' }}>
              <li><NavButton to="/about" className="hover:underline">About</NavButton></li>
              <li><NavButton to="/faq" className="hover:underline">FAQ</NavButton></li>
              <li><button type="button" onClick={() => setShowContactModal(true)} className="hover:underline text-left bg-transparent border-0 p-0 cursor-pointer" style={{ color: '#A0B9B3' }}>Contact</button></li>
            </ul>
          </div>
          <div className="col-span-1">
            <h4 className="text-xs md:text-sm font-semibold mb-2 md:mb-4" style={{ color: '#FFFFFF' }}>Legal</h4>
            <ul className="space-y-1 md:space-y-2 text-xs md:text-sm" style={{ color: '#A0B9B3' }}>
              <li><NavButton to="/privacy" className="hover:underline">Privacy Policy</NavButton></li>
              <li><NavButton to="/terms" className="hover:underline">Terms of Service</NavButton></li>
              <li><NavButton to="/cancellation-policy" className="hover:underline">Cancellation Policy</NavButton></li>
            </ul>
          </div>
        </div>
        <div className="border-t mt-8 pt-8" style={{ borderColor: '#DDE6DE' }}>
          <p className="text-center text-sm" style={{ color: '#A0B9B3' }}>
            © {year} Powered by Belix Company LLC.
          </p>
          <p className="text-center text-base mt-2" style={{ color: '#D1D9D6', fontFamily: 'Cedarville Cursive, cursive' }}>
            - for the love of research
          </p>
        </div>
      </div>
      <LandingContactModal open={showContactModal} onClose={() => setShowContactModal(false)} source="footer" />
    </footer>
  );
}
