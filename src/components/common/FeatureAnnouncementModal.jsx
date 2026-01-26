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
import logo from '../../assets/tpp_logo.png';

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
          <h2 className="text-2xl font-semibold tracking-tight mb-2" style={{ color: theme?.text }}>
            Your Pep Planner Has Been Updated!
          </h2>
          <p className="text-sm opacity-60 leading-relaxed" style={{ color: theme?.text }}>
            We've added powerful new features to help you track peptides more efficiently with smarter tools and better support.
          </p>
        </div>

        {/* Flat Feature List (No Cards) */}
        <div className="space-y-6 px-4 mb-8">
          <div className="flex gap-4 group">
            <div className="flex-shrink-0 mt-0.5">
              <Activity size={20} style={{ color: theme?.primary }} strokeWidth={2} />
            </div>
            <div>
              <h4 className="text-sm font-semibold" style={{ color: theme?.text }}>
                Push Notifications
              </h4>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <Sparkles size={20} style={{ color: theme?.info }} strokeWidth={2} />
            </div>
            <div>
              <h4 className="text-sm font-semibold" style={{ color: theme?.text }}>
                Enhanced Support System
              </h4>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <FlaskConical size={20} style={{ color: theme?.success }} strokeWidth={2} />
            </div>
            <div>
              <h4 className="text-sm font-semibold" style={{ color: theme?.text }}>
                Smarter Recon Calculator
              </h4>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="flex-shrink-0 mt-0.5">
              <Monitor size={20} style={{ color: theme?.warning }} strokeWidth={2} />
            </div>
            <div>
              <h4 className="text-sm font-semibold" style={{ color: theme?.text }}>
                Better Feedback
              </h4>
            </div>
          </div>
        </div>

        {/* Logo Sign-off */}
        <div className="flex items-center justify-center gap-3 px-4 mb-6">
          <div className="h-px flex-1" style={{ backgroundColor: `${theme?.border}80` }} />
          <img 
            src={logo} 
            alt="The Pep Planner" 
            className="h-8 w-8 rounded-full object-contain opacity-80"
            style={{
              imageRendering: 'auto',
              backfaceVisibility: 'hidden',
              transform: 'translateZ(0)'
            }}
          />
          <div className="h-px flex-1" style={{ backgroundColor: `${theme?.border}80` }} />
        </div>

        {/* Clean Primary Button */}
        <div className="px-4">
          <button
            onClick={handleClose}
            className="w-full py-2.5 px-5 rounded-lg text-white text-sm font-semibold transition-all flex items-center justify-center gap-2 active:scale-[0.98] hover:opacity-90"
            style={{
              backgroundColor: theme?.primary,
              boxShadow: `0 2px 8px ${theme?.primary}30`
            }}
          >
            <span>Happy Researching!</span>
            <ArrowRight size={16} />
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
