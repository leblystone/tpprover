// Full Launch Coming Soon Page
import React from 'react';
import { Rocket, Clock } from 'lucide-react';
import { themes, defaultThemeName } from '../theme/themes';
import logo from '../assets/tpp-logo.png';

export default function LaunchComingSoon() {
  const theme = themes[defaultThemeName];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center" style={{ backgroundColor: theme.background }}>
      <div className="w-full max-w-md">
        <img src={logo} alt="The Pep Planner Logo" className="h-20 w-20 rounded-full shadow-lg object-cover mx-auto mb-4" />
        <h1 className="text-3xl font-bold" style={{ color: theme.primaryDark }}>The Pep Planner</h1>
        <p className="mt-2 text-md text-gray-500">Organize Your Research</p>
        
        <div className="p-8 mt-8 space-y-6 rounded-xl shadow-lg" style={{ backgroundColor: theme.white }}>
          <div className="flex items-center justify-center">
            <Rocket size={48} className="mx-auto" style={{ color: theme.primary }} />
          </div>
          
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold" style={{ color: theme.primaryDark }}>
              Full Launch Coming Soon!
            </h2>
            
            <p className="text-gray-600 leading-relaxed">
              Thank you for your interest in The Pep Planner! Our beta testing phase has concluded, 
              and we're putting the finishing touches on the full version.
            </p>
            
            <div className="flex items-center justify-center gap-2 text-sm" style={{ color: theme.primary }}>
              <Clock size={16} />
              <span className="font-medium">Full launch expected soon</span>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
