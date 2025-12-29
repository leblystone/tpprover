import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { 
  Monitor, 
  Zap, 
  Layout, 
  ArrowRight,
  Sparkles,
  Layers,
  FlaskConical,
  Boxes,
  Activity
} from 'lucide-react';

/**
 * Feature Announcement Modal
 * A sleek, modern announcement modal for major updates
 */
export default function FeatureAnnouncementModal({ 
  open, 
  onClose, 
  announcementId, 
  theme 
}) {
  const [hasSeenAnnouncement, setHasSeenAnnouncement] = useState(false);

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

  if (hasSeenAnnouncement) return null;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Update"
      theme={theme}
      variant="modern"
      maxWidth="max-w-md"
    >
      <div className="py-2">
        {/* Minimal Header */}
        <div className="mb-8 text-center px-4">
          <div 
            className="inline-flex items-center justify-center p-3 rounded-2xl mb-4"
            style={{ backgroundColor: `${theme?.primary}10` }}
          >
            <Sparkles size={28} style={{ color: theme?.primary }} strokeWidth={1.5} />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight mb-2" style={{ color: theme?.text }}>
            A Fresh Experience
          </h2>
          <p className="text-sm opacity-60 leading-relaxed" style={{ color: theme?.text }}>
            We've made The Pep Planner faster, smarter, and easier to use with helpful new features throughout.
          </p>
        </div>

        {/* Flat Feature List (No Cards) */}
        <div className="space-y-6 px-4 mb-8">
          <div className="flex gap-4 group">
            <div className="flex-shrink-0 mt-0.5">
              <Sparkles size={20} style={{ color: theme?.primary }} strokeWidth={2} />
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1" style={{ color: theme?.text }}>
                Smarter Tracking
              </h4>
              <p className="text-[13px] leading-relaxed" style={{ color: theme?.textLight }}>
                Units now change automatically based on what you pick—switch to nasal and it converts to "sprays." Your tasks are also grouped by day to keep you organized.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <Zap size={20} style={{ color: theme?.info }} strokeWidth={2} />
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1" style={{ color: theme?.text }}>
                Find Anything Fast
              </h4>
              <p className="text-[13px] leading-relaxed" style={{ color: theme?.textLight }}>
                Use the new search bar to find logs, inventory, or orders in seconds. Hold down any menu icon for quick shortcuts too.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <Monitor size={20} style={{ color: theme?.success }} strokeWidth={2} />
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1" style={{ color: theme?.text }}>
                Better Notifications
              </h4>
              <p className="text-[13px] leading-relaxed" style={{ color: theme?.textLight }}>
                Every action now gives you instant feedback. Plus, mobile users get subtle vibrations when tapping buttons or opening menus.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <Layout size={20} style={{ color: theme?.warning }} strokeWidth={2} />
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1" style={{ color: theme?.text }}>
                Stay Updated
              </h4>
              <p className="text-[13px] leading-relaxed" style={{ color: theme?.textLight }}>
                We'll let you know when a new version is ready so you always have the latest features and improvements at your fingertips.
              </p>
            </div>
          </div>
        </div>

        {/* Clean Primary Button */}
        <div className="px-4">
          <button
            onClick={handleClose}
            className="w-full h-12 rounded-xl text-white font-medium transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
            style={{
              backgroundColor: theme?.primary,
              boxShadow: `0 4px 12px ${theme?.primary}40`
            }}
          >
            <span>Happy Researching!</span>
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </Modal>
  );
}

export function shouldShowAnnouncement(announcementId) {
  try {
    const seenAnnouncements = JSON.parse(localStorage.getItem('tpp_seen_announcements') || '{}');
    return !seenAnnouncements[announcementId];
  } catch (error) {
    return false;
  }
}

export function resetAnnouncement(announcementId) {
  try {
    const seenAnnouncements = JSON.parse(localStorage.getItem('tpp_seen_announcements') || '{}');
    delete seenAnnouncements[announcementId];
    localStorage.setItem('tpp_seen_announcements', JSON.stringify(seenAnnouncements));
  } catch (error) {}
}
