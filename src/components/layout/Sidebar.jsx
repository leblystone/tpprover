import React, { useState, useEffect } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { Home, BarChart2, FlaskConical, Calendar, ShoppingCart, Users, Settings, Building, Megaphone, User, Boxes, Calculator, Store, LogOut, MessageSquare, DownloadCloud } from 'lucide-react'
import logo from '../../assets/tpp-logo.png'
import '../../styles/sidebar.css'
import { useAppContext } from '../../context/AppContext'
import FeedbackModal from '../common/FeedbackModal'
import InstallInstructionsModal from '../common/InstallInstructionsModal';
import PwaUnsupportedModal from '../common/PwaUnsupportedModal';

const Sidebar = ({ theme, installPrompt, isPwaSupported, isPwaInstalled }) => {
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const { logout } = useAppContext();
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [showUnsupportedModal, setShowUnsupportedModal] = useState(false);

  useEffect(() => {
    const updateIsOpen = () => {
      setIsOpen(window.innerWidth >= 768)
    }
    updateIsOpen()
    window.addEventListener('resize', updateIsOpen)
    return () => window.removeEventListener('resize', updateIsOpen)
  }, [])

  const handleInstallClick = () => {
    if (installPrompt) {
      installPrompt.prompt();
    } else if (isPwaSupported) {
      setShowInstallModal(true);
    } else {
      setShowUnsupportedModal(true);
    }
  };

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: Home, tourId: 'dashboard-welcome' },
    { to: '/calendar', label: 'Calendar', icon: Calendar, tourId: 'sidebar-calendar' },
    { to: '/protocols', label: 'Protocols', icon: FlaskConical, tourId: 'sidebar-protocols' },
    { to: '/recon', label: 'Reconstitution', icon: Calculator, tourId: 'sidebar-recon' },
    { to: '/stockpile', label: 'Stockpile', icon: Boxes, tourId: 'sidebar-stockpile' },
    { to: '/orders', label: 'Orders', icon: ShoppingCart, tourId: 'sidebar-orders' },
    { to: '/vendors', label: 'Vendors', icon: Store, tourId: 'sidebar-vendors' },
  ]

  const bottomLinks = [
    { to: '/announcements', icon: Megaphone, label: 'Announcements', tourId: 'sidebar-announcements' },
    { to: '/account', icon: User, label: 'Account' },
    { to: '/settings', icon: Settings, label: 'Settings' },
  ]

  return (
    <>
      <style>{`
        .sidebar-link-active {
          background-color: ${theme.primary};
          color: ${theme.textOnPrimary};
          border-radius: 0.5rem;
        }
        .sidebar-link:hover:not(.sidebar-link-active) {
          background-color: ${theme.primaryLight} !important;
          color: ${theme.textOnPrimary} !important;
          border-radius: 0.5rem;
        }
      `}</style>
      <aside 
        className="hidden md:flex md:w-24 md:flex-col p-3 border-r card-shadow fixed left-0 top-0 h-screen z-40 sidebar-container"
        style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
      >
        <div className="mb-4 mt-2 flex items-center justify-center">
          <img src={logo} alt="Logo" className="h-16 w-16 rounded-full shadow object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
        </div>
        <nav className="flex flex-col space-y-2">
          {links.map(({ to, icon: Icon, label, tourId }) => (
            <NavLink key={to} to={to} title={label} data-tour={tourId} 
              className={({ isActive }) => `flex items-center justify-start h-14 w-full sidebar-link p-4 ${isActive ? 'sidebar-link-active' : ''}`}
              style={({ isActive }) => ({ color: isActive ? theme.textOnPrimary : theme.textLight })}
            >
              <Icon className="h-6 w-6 flex-shrink-0" />
              <span className="text-sm font-semibold ml-4 sidebar-link-label">{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto space-y-2">
          {bottomLinks.map(({ to, icon: Icon, label, tourId }) => (
            <NavLink key={to} to={to} title={label} data-tour={tourId}
              className={({ isActive }) => `flex items-center justify-start h-14 w-full sidebar-link p-4 ${isActive ? 'sidebar-link-active' : ''}`}
              style={({ isActive }) => ({ color: isActive ? theme.textOnPrimary : theme.textLight })}
            >
              <Icon className="h-6 w-6 flex-shrink-0" />
              <span className="text-sm font-semibold ml-4 sidebar-link-label">{label}</span>
            </NavLink>
          ))}
          <button onClick={() => setShowFeedbackModal(true)} title="Feedback"
            className="flex items-center justify-start h-14 w-full sidebar-link p-4"
            style={{ color: theme.textLight }}
          >
            <MessageSquare className="h-6 w-6 flex-shrink-0" />
            <span className="text-sm font-semibold ml-4 sidebar-link-label">Feedback</span>
          </button>
          <button 
            onClick={handleInstallClick} 
            title={isPwaInstalled ? "App is already installed" : "Install App"}
            className="flex items-center justify-start h-14 w-full sidebar-link p-4"
            style={{ color: theme.textLight, cursor: isPwaInstalled ? 'default' : 'pointer', opacity: isPwaInstalled ? 0.6 : 1 }}
            disabled={isPwaInstalled}
          >
            <DownloadCloud className="h-6 w-6 flex-shrink-0" />
            <span className="text-sm font-semibold ml-4 sidebar-link-label">{isPwaInstalled ? 'Installed' : 'Install App'}</span>
          </button>
        </div>
      </aside>
      <FeedbackModal open={showFeedbackModal} onClose={() => setShowFeedbackModal(false)} theme={theme} />
      <InstallInstructionsModal open={showInstallModal} onClose={() => setShowInstallModal(false)} theme={theme} />
      <PwaUnsupportedModal open={showUnsupportedModal} onClose={() => setShowUnsupportedModal(false)} theme={theme} />
    </>
  )
}

export default Sidebar


