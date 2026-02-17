import React from 'react';
import Modal from './Modal';
import { Smartphone, Sparkles, Shield, X, Lock, Bug, AlertTriangle } from 'lucide-react';
import { recordDismissal, getStoreUrl } from '../../utils/versionChecker';

export default function UpdatePromptModal({ 
  open, 
  onClose, 
  updateInfo, 
  theme 
}) {
  // TEST HELPER: Listen for test events (remove in production)
  React.useEffect(() => {
    const handleTestUpdate = (event) => {
      console.log('🧪 Test update event received:', event.detail);
      // This helps you see what data the modal receives during testing
    };
    window.addEventListener('tpp:test-update', handleTestUpdate);
    return () => window.removeEventListener('tpp:test-update', handleTestUpdate);
  }, []);
  
  if (!updateInfo) return null;
  
  const { 
    currentVersion, 
    latestVersion, 
    urgency, 
    isRequired, 
    releaseNotes, 
    storeUrls 
  } = updateInfo;
  
  // Determine modal styling based on urgency
  const isCritical = urgency === 'critical' || isRequired;
  const isRecommended = urgency === 'recommended';
  
  const handleUpdate = () => {
    const storeUrl = getStoreUrl(storeUrls);
    window.open(storeUrl, '_blank');
    if (!isRequired) {
      onClose();
    }
  };
  
  const handleDismiss = () => {
    if (!isRequired) {
      recordDismissal();
      onClose();
    }
  };
  
  // Parse release notes (support sections and sub-items)
  const parseReleaseNotes = (notes) => {
    if (typeof notes === 'string') {
      const lines = notes.split('\n').filter(line => line.trim());
      const sections = [];
      let currentSection = null;
      
      lines.forEach(line => {
        const trimmed = line.trim();
        // Check if line looks like a section header (ends with emoji or colon, or doesn't start with dash/bullet)
        const isSectionHeader = !trimmed.match(/^[-•*]\s/) && (
          trimmed.match(/[🧫🔍🤌🏻🦠✨]$/) || // Ends with emoji
          trimmed.endsWith(':') || // Ends with colon
          trimmed.match(/[A-Z]/) && !trimmed.includes('-') // Has capital letters but no dash
        );
        
        if (isSectionHeader || (!trimmed.match(/^[-•*]\s/) && currentSection === null)) {
          // Start new section
          const cleanLine = trimmed.replace(/^[-•*]\s*/, '').replace(/:\s*$/, '').trim();
          currentSection = {
            header: cleanLine,
            items: []
          };
          sections.push(currentSection);
        } else {
          // Add as sub-item to current section
          if (currentSection) {
            const cleanLine = trimmed.replace(/^[-•*]\s*/, '').trim();
            if (cleanLine) {
              currentSection.items.push(cleanLine);
            }
          } else {
            // No section yet, create one
            currentSection = {
              header: null,
              items: [trimmed.replace(/^[-•*]\s*/, '').trim()]
            };
            sections.push(currentSection);
          }
        }
      });
      
      return sections;
    }
    return Array.isArray(notes) ? [{ header: null, items: notes }] : [{ header: null, items: [notes] }];
  };
  
  const notesSections = parseReleaseNotes(releaseNotes);
  
  return (
    <Modal
      open={open}
      onClose={isRequired ? () => {} : onClose}
      title={isCritical ? "Update Required" : "Update Available"}
      theme={theme}
      variant="modern"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Big Friendly Header */}
        <div 
          className="rounded-lg p-5 text-center"
          style={{
            background: isCritical 
              ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
              : isRecommended
              ? 'linear-gradient(135deg, #5F7F76 0%, #3d5a52 100%)'
              : 'linear-gradient(135deg, #5F7F76 0%, #3d5a52 100%)',
            color: '#ffffff'
          }}
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            {isCritical ? (
              <Shield size={36} />
            ) : (
              <Sparkles size={36} />
            )}
          </div>
          <h2 className="text-xl font-semibold mb-1 flex items-center justify-center gap-2">
            {isCritical ? <><span>Update Required</span><Lock size={18} /></> : "Hey! Update Your App!"}
          </h2>
        </div>
        
        {/* Friendly Message - What we did */}
        <div>
          <p className="text-base leading-relaxed" style={{ color: theme?.text || '#000' }}>
            {isCritical ? (
              <>This update is <strong>required</strong> to keep using <em>The Pep Planner</em> safely and securely.</>
            ) : (
              <span className="inline-flex items-center gap-1 flex-wrap">We've found some bugs <Bug size={14} className="inline" /> and updated some useful features to make <em>The Pep Planner</em> better. <Sparkles size={14} className="inline" /></span>
            )}
          </p>
        </div>
        
        {/* Release Notes */}
        {notesSections && notesSections.length > 0 && (
          <div 
            className="rounded-lg p-4 space-y-3"
            style={{
              background: theme?.cardBackground || '#f9fafb',
              border: `1px solid ${theme?.border || '#e5e7eb'}`
            }}
          >
            <h3 className="text-sm font-semibold mb-3" style={{ color: theme?.text || '#000' }}>
              What's New in Version {latestVersion}:
            </h3>
            <div className="space-y-3">
              {notesSections.map((section, sectionIndex) => (
                <div key={sectionIndex} className="space-y-1.5">
                  {section.header && (
                    <h4 className="text-sm font-semibold" style={{ color: theme?.primary || '#5F7F76' }}>
                      {section.header}
                    </h4>
                  )}
                  {section.items.length > 0 && (
                    <ul className="space-y-1 ml-4">
                      {section.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-start gap-2 text-sm" style={{ color: theme?.text || '#000' }}>
                          <span style={{ color: theme?.primary || '#5F7F76' }} className="mt-1">•</span>
                          <span className="flex-1">{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Critical Warning (if needed) */}
        {isCritical && (
          <div className="rounded-lg p-3 border" style={{ backgroundColor: theme?.isDark ? 'rgba(239,68,68,0.1)' : '#fef2f2', borderColor: theme?.isDark ? 'rgba(239,68,68,0.2)' : '#fecaca' }}>
            <p className="text-sm font-medium flex items-center gap-1.5" style={{ color: theme?.isDark ? '#fca5a5' : '#7f1d1d' }}>
              <AlertTriangle size={14} />
              Please update now to continue using the app. This includes important security fixes.
            </p>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={handleUpdate}
            className="w-full px-6 py-3 rounded-lg text-white font-semibold text-sm shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            style={{
              background: isCritical
                ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                : 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)'
            }}
          >
            <Smartphone size={18} />
            Update Now
          </button>
          
          {!isRequired && (
            <button
              onClick={handleDismiss}
              className="w-full px-6 py-3 rounded-lg font-medium text-sm transition-all hover:opacity-80"
              style={{
                background: theme?.cardBackground || '#f3f4f6',
                color: theme?.textLight || '#6b7280'
              }}
            >
              Remind Me Later
            </button>
          )}
        </div>
        
        {/* Dismissal Info */}
        {!isRequired && (
          <p 
            className="text-xs text-center"
            style={{ color: theme?.textLight || '#9ca3af' }}
          >
            We'll remind you again in 5 days
          </p>
        )}
      </div>
    </Modal>
  );
}

