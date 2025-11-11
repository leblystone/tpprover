import React from 'react';
import Modal from './Modal';
import { Smartphone, Sparkles, Shield, X } from 'lucide-react';
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
  
  // Parse release notes (support markdown-style lists)
  const parseReleaseNotes = (notes) => {
    if (typeof notes === 'string') {
      return notes.split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[-•*]\s*/, '').trim());
    }
    return Array.isArray(notes) ? notes : [notes];
  };
  
  const notesList = parseReleaseNotes(releaseNotes);
  
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
          <h2 className="text-xl font-bold mb-1">
            {isCritical ? "Update Required 🔒" : "Hey! Update Your App! 🦠"}
          </h2>
        </div>
        
        {/* Friendly Message - What we did */}
        <div>
          <p className="text-base leading-relaxed" style={{ color: theme?.text || '#000' }}>
            {isCritical ? (
              <>This update is <strong>required</strong> to keep using <em>The Pep Planner</em> safely and securely.</>
            ) : (
              <>We've found some bugs 🦠 and updated some useful features to make <em>The Pep Planner</em> better. ✨</>
            )}
          </p>
        </div>
        
        {/* Critical Warning (if needed) */}
        {isCritical && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm font-medium text-red-900">
              ⚠️ Please update now to continue using the app. This includes important security fixes.
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

