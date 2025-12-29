import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { 
  Layout, 
  Activity, 
  Cpu, 
  Layers, 
  ChevronRight, 
  Microscope,
  FlaskConical,
  Boxes
} from 'lucide-react';

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
      title="Environment Update"
      theme={theme}
      variant="modern"
      maxWidth="max-w-lg"
    >
      <div className="space-y-6">
        {/* Hero Section with Sophisticated Gradient */}
        <div 
          className="rounded-xl p-10 text-center relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${theme?.primaryDark || '#5F7F76'} 0%, ${theme?.primary || '#7F9E95'} 100%)`,
            color: '#ffffff',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.1)'
          }}
        >
          {/* Subtle geometric background patterns */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[150%] rotate-12 bg-white rounded-full" />
            <div className="absolute bottom-[-50%] right-[-10%] w-[80%] h-[150%] -rotate-12 bg-white rounded-full" />
          </div>
          
          <div className="relative z-10 flex flex-col items-center">
            <div 
              className="p-4 rounded-2xl bg-white/20 backdrop-blur-md mb-6 shadow-xl border border-white/30"
            >
              <Boxes size={48} className="text-white" strokeWidth={1.5} />
            </div>
            <h2 className="text-4xl font-extrabold mb-3 tracking-tight">
              Platform Redesign
            </h2>
            <p className="text-lg opacity-90 font-medium max-w-sm">
              Significant enhancements to your research environment are now live.
            </p>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 gap-4">
          <h3 
            className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-1 px-1" 
            style={{ color: theme?.textLight || '#666' }}
          >
            <FlaskConical size={14} />
            System Improvements
          </h3>
          
          <div className="space-y-3">
            {/* Feature 1 - Modern UI */}
            <div 
              className="group flex items-center gap-4 p-4 rounded-xl transition-all border border-transparent hover:shadow-sm"
              style={{ 
                backgroundColor: theme?.cardBackground || '#FFFFFF',
                borderColor: theme?.border || '#e5e7eb'
              }}
            >
              <div 
                className="p-3 rounded-lg flex-shrink-0 transition-colors group-hover:scale-110"
                style={{ backgroundColor: `${theme?.primary || '#7F9E95'}15` }}
              >
                <Layout size={22} style={{ color: theme?.primary || '#7F9E95' }} strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm" style={{ color: theme?.text || '#000' }}>
                  Unified Interface
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: theme?.textLight || '#666' }}>
                  Streamlined navigation and refined visual hierarchy for efficient data management.
                </p>
              </div>
            </div>

            {/* Feature 2 - UX */}
            <div 
              className="group flex items-center gap-4 p-4 rounded-xl transition-all border border-transparent hover:shadow-sm"
              style={{ 
                backgroundColor: theme?.cardBackground || '#FFFFFF',
                borderColor: theme?.border || '#e5e7eb'
              }}
            >
              <div 
                className="p-3 rounded-lg flex-shrink-0 transition-colors group-hover:scale-110"
                style={{ backgroundColor: `${theme?.info || '#7CB8B2'}15` }}
              >
                <Activity size={22} style={{ color: theme?.info || '#7CB8B2' }} strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm" style={{ color: theme?.text || '#000' }}>
                  Enhanced Interaction
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: theme?.textLight || '#666' }}>
                  Optimized workflows and responsive interactions designed for professional research.
                </p>
              </div>
            </div>

            {/* Feature 3 - Performance */}
            <div 
              className="group flex items-center gap-4 p-4 rounded-xl transition-all border border-transparent hover:shadow-sm"
              style={{ 
                backgroundColor: theme?.cardBackground || '#FFFFFF',
                borderColor: theme?.border || '#e5e7eb'
              }}
            >
              <div 
                className="p-3 rounded-lg flex-shrink-0 transition-colors group-hover:scale-110"
                style={{ backgroundColor: `${theme?.success || '#5FAF8B'}15` }}
              >
                <Cpu size={22} style={{ color: theme?.success || '#5FAF8B' }} strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm" style={{ color: theme?.text || '#000' }}>
                  Core Performance
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: theme?.textLight || '#666' }}>
                  Architectural updates providing faster load times and improved protocol stability.
                </p>
              </div>
            </div>

            {/* Feature 4 - New Foundation */}
            <div 
              className="group flex items-center gap-4 p-4 rounded-xl transition-all border border-transparent hover:shadow-sm"
              style={{ 
                backgroundColor: theme?.cardBackground || '#FFFFFF',
                borderColor: theme?.border || '#e5e7eb'
              }}
            >
              <div 
                className="p-3 rounded-lg flex-shrink-0 transition-colors group-hover:scale-110"
                style={{ backgroundColor: `${theme?.warning || '#E5A87A'}15` }}
              >
                <Layers size={22} style={{ color: theme?.warning || '#E5A87A' }} strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-sm" style={{ color: theme?.text || '#000' }}>
                  Protocol Scalability
                </h4>
                <p className="text-xs leading-relaxed" style={{ color: theme?.textLight || '#666' }}>
                  A modernized foundation supporting future expansion of research capabilities.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Section */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={handleClose}
            className="w-full px-6 py-4 rounded-xl text-white font-bold shadow-lg hover:shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 group"
            style={{
              background: `linear-gradient(135deg, ${theme?.primary || '#7F9E95'} 0%, ${theme?.primaryDark || '#5F7F76'} 100%)`
            }}
          >
            <span>Access Updated Environment</span>
            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
          
          <p 
            className="text-[10px] text-center uppercase tracking-widest font-semibold opacity-60"
            style={{ color: theme?.textLight || '#9ca3af' }}
          >
            Configuration logged to local terminal
          </p>
        </div>
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
