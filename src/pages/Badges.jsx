import React from 'react';
import { useOutletContext } from 'react-router-dom';
import ViewContainer from '../components/ui/ViewContainer';
import { Award } from 'lucide-react';

// This is a new component that will be fleshed out later.
// For now, it's a placeholder to demonstrate navigation.

export default function Badges() {
  const { theme } = useOutletContext();

  return (
    <ViewContainer theme={theme} title="Badges">
      <div className="flex flex-col items-center justify-center h-full text-center">
        <Award size={64} className="mb-4" style={{ color: theme.primary }} />
        <h2 className="text-2xl font-bold mb-2" style={{ color: theme.text }}>Badges & Achievements</h2>
        <p style={{ color: theme.text }}>
          This is where you can view all of the badges you've earned.
        </p>
        <p style={{ color: theme.text }}>
          More content will be added here soon!
        </p>
      </div>
    </ViewContainer>
  );
}
