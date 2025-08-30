// Beta Lockout Screen
import React from 'react';
import { Lock } from 'lucide-react';
import { themes, defaultThemeName } from '../theme/themes';
import logo from '../assets/tpp-logo.png';

export default function BetaEnded() {
  const theme = themes[defaultThemeName];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center" style={{ backgroundColor: theme.background }}>
      <div className="w-full max-w-md">
        <img src={logo} alt="The Pep Planner Logo" className="h-20 w-20 rounded-full shadow-lg object-cover mx-auto mb-4" />
        <h1 className="text-3xl font-bold" style={{ color: theme.primaryDark }}>The Pep Planner</h1>
        <p className="mt-2 text-md text-gray-500">Organize Your Research</p>
        
        <div className="p-8 mt-8 space-y-4 rounded-xl shadow-lg" style={{ backgroundColor: theme.white }}>
            <Lock size={48} className="mx-auto" style={{ color: theme.primary }} />
            <h2 className="text-2xl font-semibold" style={{ color: theme.primaryDark }}>Beta Access Has Ended</h2>
            <p className="text-gray-600">
                Thank you for participating in the beta trial for The Pep Planner. The trial period has now concluded.
            </p>
            <p className="text-gray-600">
                We are working hard to launch the official version soon. Stay tuned for updates!
            </p>
        </div>
      </div>
    </div>
  );
}
