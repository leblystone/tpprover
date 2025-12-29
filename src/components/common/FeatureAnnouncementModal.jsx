import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { 
  Monitor, 
  Zap, 
  Layout, 
  ArrowRight,
  Sparkles,
  Layers
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
      title="Release Notes"
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
            We've updated The Pep Planner with a focus on speed, clarity, and ease of use.
          </p>
        </div>

        {/* Flat Feature List (No Cards) */}
        <div className="space-y-6 px-4 mb-8">
          <div className="flex gap-4 group">
            <div className="flex-shrink-0 mt-0.5">
              <FlaskConical size={20} style={{ color: theme?.primary }} strokeWidth={2} />
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1" style={{ color: theme?.text }}>
                Smart Research Logic
              </h4>
              <p className="text-[13px] leading-relaxed" style={{ color: theme?.textLight }}>
                The app now intelligently switches units (like "sprays" for nasal) based on your delivery method. Dashboard tasks are also better organized by phase.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <Zap size={20} style={{ color: theme?.info }} strokeWidth={2} />
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1" style={{ color: theme?.text }}>
                Universal Search & Shortcuts
              </h4>
              <p className="text-[13px] leading-relaxed" style={{ color: theme?.textLight }}>
                Find anything instantly with the new global search. You can also hold down the navigation icons to trigger quick shortcuts like "Add Protocol."
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <Boxes size={20} style={{ color: theme?.success }} strokeWidth={2} />
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1" style={{ color: theme?.text }}>
                Beta Rewards
              </h4>
              <p className="text-[13px] leading-relaxed" style={{ color: theme?.textLight }}>
                Complete our new research survey to help shape the platform and receive automatic Lifetime Access as a thank you for your contribution.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <Activity size={20} style={{ color: theme?.warning }} strokeWidth={2} />
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-1" style={{ color: theme?.text }}>
                Enhanced Feedback
              </h4>
              <p className="text-[13px] leading-relaxed" style={{ color: theme?.textLight }}>
                With 60+ new notifications and physical haptic feedback on mobile, the app now responds instantly to your every action.
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
            <span>Start Exploring</span>
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
