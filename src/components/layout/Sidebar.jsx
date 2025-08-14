 import React from 'react'
import { NavLink } from 'react-router-dom'
import { Home, Calendar, Calculator, Droplet, ClipboardList, Box, Boxes, Globe, Users, FlaskConical, Settings, User, Megaphone } from 'lucide-react'
import logo from '../../assets/tpp-logo.png'

 const links = [
   { to: '/dashboard', icon: Home, label: 'Dashboard' },
   { to: '/research', icon: FlaskConical, label: 'Research' },
   { to: '/calendar', icon: Calendar, label: 'Calendar' },
   { to: '/recon', icon: Calculator, label: 'Reconstitution' },
   { to: '/protocols', icon: ClipboardList, label: 'Protocols' },
    { to: '/stockpile', icon: Boxes, label: 'Stockpile' },
   { to: '/orders', icon: Box, label: 'Orders' },
   { to: '/vendors', icon: Globe, label: 'Vendors' },
 ]

 const bottomLinks = [
   { to: '/announcements', icon: Megaphone, label: 'Announcements' },
   { to: '/account', icon: User, label: 'Account' },
   { to: '/settings', icon: Settings, label: 'Settings' },
 ]

 export default function Sidebar() {
   return (
     <aside className="hidden md:flex md:w-24 md:flex-col bg-white/90 backdrop-blur p-3 border-r card-shadow fixed left-0 top-0 h-screen z-40">
       <div className="mb-4 mt-2 flex items-center justify-center">
         <img src={logo} alt="Logo" className="h-16 w-16 rounded-full shadow object-cover" onError={(e) => { e.currentTarget.style.display = 'none' }} />
       </div>
       <nav className="flex flex-col space-y-2">
         {links.map(({ to, icon: Icon, label }) => (
           <NavLink key={to} to={to} title={label} className={({ isActive }) => `flex flex-col items-center justify-center h-14 w-full sidebar-link ${isActive ? 'sidebar-link-active' : 'text-gray-700'}`}>
             <Icon className="h-6 w-6 mb-1" />
             <span className="text-[10px] font-medium">{label}</span>
           </NavLink>
         ))}
       </nav>
       <div className="mt-auto space-y-2">
         {bottomLinks.map(({ to, icon: Icon, label }) => (
           <NavLink key={to} to={to} title={label} className={({ isActive }) => `flex flex-col items-center justify-center h-14 w-full sidebar-link ${isActive ? 'sidebar-link-active' : 'text-gray-700'}`}>
             <Icon className="h-6 w-6 mb-1" />
             <span className="text-[10px] font-medium">{label}</span>
           </NavLink>
         ))}
       </div>
     </aside>
   )
 }


