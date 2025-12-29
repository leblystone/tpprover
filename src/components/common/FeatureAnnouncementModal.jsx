import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { Sparkles, Rocket, Palette, Zap, X, PartyPopper } from 'lucide-react';

/**
 * Feature Announcement Modal
 * For announcing major updates, redesigns, and new features
 * Shows once per announcement based on localStorage tracking
 */
export default function FeatureAnnouncementModal({ 
  open, 
  onClose, 
  announcementId,  // Unique ID for this announcement (e.g., 'redesign-v2')
  theme 
}) {
  const [hasSeenAnnouncement, setHasSeenAnnouncement] = useState(false);

  // Check if user has already seen this announcement
  useEffect(() => {
    if (!announcementId) return;
    
    try {
      const seenAnnouncements = JSON.parse(localStorage.getItem('tpp_seen_announcements') || '{}');
      if (seenAnnouncements[announcementId]) {
        setHasSeenAnnouncement(true);
      }
    } catch (error) {
      console.error('Error checking announcement status:', error);
    }
  }, [announcementId]);

  const handleClose = () => {
    // Mark this announcement as seen
    if (announcementId) {
      try {
        const seenAnnouncements = JSON.parse(localStorage.getItem('tpp_seen_announcements') || '{}');
        seenAnnouncements[announcementId] = {
          seenAt: new Date().toISOString(),
          timestamp: Date.now()
        };
        localStorage.setItem('tpp_seen_announcements', JSON.stringify(seenAnnouncements));
      } catch (error) {
        console.error('Error saving announcement status:', error);
      }
    }
    
    onClose();
  };

  // Don't show if already seen
  if (hasSeenAnnouncement) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="🎉 Exciting Update!"
      theme={theme}
      variant="modern"
      maxWidth="max-w-lg"
    >
      <div className="space-y-5">
        {/* Hero Section with Gradient */}
        <div 
          className="rounded-xl p-8 text-center relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #7F9E95 0%, #5F7F76 50%, #3d5a52 100%)',
            color: '#ffffff'
          }}
        >
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Sparkles size={40} className="animate-pulse" />
              <Palette size={40} />
              <Rocket size={40} className="animate-bounce" />
            </div>
            <h2 className="text-3xl font-bold mb-3">
              Fresh New Look!
            </h2>
            <p className="text-lg opacity-95">
              <em>The Pep Planner</em> just got a major redesign
            </p>
          </div>
        </div>

        {/* What's New Section */}
        <div 
          className="rounded-lg p-5 space-y-4"
          style={{
            background: theme?.cardBackground || '#f9fafb',
            border: `1px solid ${theme?.border || '#e5e7eb'}`
          }}
        >
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2" style={{ color: theme?.text || '#000' }}>
            <Zap size={20} style={{ color: theme?.primary || '#7F9E95' }} />
            What's New
          </h3>
          
          <div className="space-y-3">
            {/* Feature 1 */}
            <div className="flex items-start gap-3">
              <div 
                className="p-2 rounded-lg flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${theme?.primary || '#7F9E95'}20` }}
              >
                <Palette size={18} style={{ color: theme?.primary || '#7F9E95' }} />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1" style={{ color: theme?.text || '#000' }}>
                  Modern UI Design
                </h4>
                <p className="text-sm" style={{ color: theme?.textLight || '#666' }}>
                  Cleaner interface with improved navigation and better visual hierarchy throughout the app.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex items-start gap-3">
              <div 
                className="p-2 rounded-lg flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${theme?.success || '#5FAF8B'}20` }}
              >
                <Sparkles size={18} style={{ color: theme?.success || '#5FAF8B' }} />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1" style={{ color: theme?.text || '#000' }}>
                  Enhanced User Experience
                </h4>
                <p className="text-sm" style={{ color: theme?.textLight || '#666' }}>
                  Smoother animations, faster load times, and more intuitive workflows for your research planning.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex items-start gap-3">
              <div 
                className="p-2 rounded-lg flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${theme?.info || '#7CB8B2'}20` }}
              >
                <Rocket size={18} style={{ color: theme?.info || '#7CB8B2' }} />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1" style={{ color: theme?.text || '#000' }}>
                  Performance Improvements
                </h4>
                <p className="text-sm" style={{ color: theme?.textLight || '#666' }}>
                  Faster page transitions and optimized data loading for a snappier experience.
                </p>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="flex items-start gap-3">
              <div 
                className="p-2 rounded-lg flex-shrink-0 mt-0.5"
                style={{ backgroundColor: `${theme?.warning || '#E5A87A'}20` }}
              >
                <PartyPopper size={18} style={{ color: theme?.warning || '#E5A87A' }} />
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-1" style={{ color: theme?.text || '#000' }}>
                  New Features Coming Soon
                </h4>
                <p className="text-sm" style={{ color: theme?.textLight || '#666' }}>
                  This redesign sets the foundation for exciting new features we're building for you!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Friendly Message */}
        <div 
          className="rounded-lg p-4 text-center"
          style={{
            background: `${theme?.success || '#5FAF8B'}10`,
            border: `1px solid ${theme?.success || '#5FAF8B'}30`
          }}
        >
          <p className="text-sm font-medium" style={{ color: theme?.text || '#000' }}>
            💚 We hope you love the new look! As always, we're here to support your research journey.
          </p>
        </div>

        {/* Action Button */}
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={handleClose}
            className="w-full px-6 py-3.5 rounded-lg text-white font-semibold shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            style={{
              background: 'linear-gradient(135deg, #7F9E95 0%, #5F7F76 100%)'
            }}
          >
            <Sparkles size={20} />
            Let's Explore!
          </button>
        </div>

        {/* Footer Note */}
        <p 
          className="text-xs text-center leading-relaxed"
          style={{ color: theme?.textLight || '#9ca3af' }}
        >
          Have feedback? We'd love to hear it! Reach out anytime through the support menu.
        </p>
      </div>
    </Modal>
  );
}

/**
 * Utility function to check if announcement should be shown
 * @param {string} announcementId - Unique ID for the announcement
 * @returns {boolean} - True if announcement should be shown
 */
export function shouldShowAnnouncement(announcementId) {
  try {
    const seenAnnouncements = JSON.parse(localStorage.getItem('tpp_seen_announcements') || '{}');
    return !seenAnnouncements[announcementId];
  } catch (error) {
    console.error('Error checking announcement status:', error);
    return false;
  }
}

/**
 * Utility function to manually reset announcement (for testing)
 * @param {string} announcementId - Unique ID for the announcement to reset
 */
export function resetAnnouncement(announcementId) {
  try {
    const seenAnnouncements = JSON.parse(localStorage.getItem('tpp_seen_announcements') || '{}');
    delete seenAnnouncements[announcementId];
    localStorage.setItem('tpp_seen_announcements', JSON.stringify(seenAnnouncements));
    console.log(`✅ Announcement '${announcementId}' has been reset`);
  } catch (error) {
    console.error('Error resetting announcement:', error);
  }
}

