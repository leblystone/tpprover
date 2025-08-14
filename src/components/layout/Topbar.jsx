import React from 'react'
import { Search, Upload, Menu, BookText, HelpCircle } from 'lucide-react'
import { useLocation } from 'react-router-dom'
import GlobalSearchInline from '../search/GlobalSearchInline'
import GlossaryQuickModal from '../glossary/GlossaryQuickModal'
import MobileSidebar from './MobileSidebar'
import HelpTipsModal from '../ui/HelpTipsModal'

export default function Topbar({ theme }) {
  const location = useLocation()
  const seg = (location.pathname.split('/')[1] || 'dashboard')
  const onDashboard = seg === 'dashboard'
  const titles = {
    '': 'Welcome to your Pep Planner.',
    dashboard: 'Welcome to your Pep Planner.',
    research: 'Research',
    calendar: 'Calendar',
    recon: 'Reconstitution',
    protocols: 'Protocols',
    orders: 'Orders',
    vendors: 'Vendors',
    stockpile: 'Stockpile',
    glossary: 'Glossary',
    imports: 'Import Review',
    settings: 'Settings',
    account: 'Account',
    login: 'Login',
  }
  const title = titles[seg] || 'TPPRover'
  const [showSearch, setShowSearch] = React.useState(false)
  const [showGlossary, setShowGlossary] = React.useState(false)
  const [showHelp, setShowHelp] = React.useState(false)
  const [showMobile, setShowMobile] = React.useState(false)
  return (
    <header className="fixed top-0 left-0 md:left-24 right-0 bg-white/90 backdrop-blur border-b card-shadow z-30">
      <div className="flex items-center justify-between px-5 py-3 relative">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold tracking-tight topbar-title" style={{ color: theme?.primaryDark }}>{title}</h1>
        </div>
        <div className="flex items-center gap-2 flex-1 justify-end">
          {showSearch && (
            <div className="hidden md:block w-full max-w-xl mr-2">
              <GlobalSearchInline theme={theme} onClose={() => setShowSearch(false)} onNavigate={(to) => { setShowSearch(false); window.history.pushState({}, '', to); window.dispatchEvent(new PopStateEvent('popstate')) }} />
            </div>
          )}
          <button className="p-2 rounded-full hover:bg-gray-100" title="Global Search" onClick={() => setShowSearch(s => !s)}><Search className="h-5 w-5" /></button>
          <button className="p-2 rounded-full hover:bg-gray-100" title="Peptide Glossary" onClick={() => setShowGlossary(true)}><BookText className="h-5 w-5" /></button>
          {onDashboard && (
            <button className="p-2 rounded-full hover:bg-gray-100" title="Import (OCR)" onClick={() => window.dispatchEvent(new CustomEvent('tpp:openImport'))}><Upload className="h-5 w-5" /></button>
          )}
          <button className="p-2 rounded-full hover:bg-gray-100" title="Help" onClick={() => setShowHelp(true)}><HelpCircle className="h-5 w-5" /></button>
          <button className="md:hidden p-2 rounded-full hover:bg-gray-100" title="Menu" onClick={() => setShowMobile(true)}><Menu className="h-5 w-5" /></button>
        </div>
      </div>
      <GlossaryQuickModal open={showGlossary} onClose={() => setShowGlossary(false)} theme={theme} />
      <HelpTipsModal open={showHelp} onClose={() => setShowHelp(false)} seg={seg} theme={theme} />
      <MobileSidebar open={showMobile} onClose={() => setShowMobile(false)} theme={theme} />
    </header>
  )
 }


