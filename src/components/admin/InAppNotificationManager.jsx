import React, { useState, useEffect } from 'react';
import {
  Plus, PencilSimple, Trash, FloppyDisk, X, Sparkle, Users,
  CircleNotch, CheckCircle, WarningCircle, BellRinging, Rocket, Bug
} from '@phosphor-icons/react';
import { Fire, ThumbsUp, Heart, SealCheck } from '@phosphor-icons/react';
import AnimatedEmptyState from '../ui/AnimatedEmptyState';
import { useSlideOutRemove } from '../../hooks/useSlideOutRemove';
import {
  getAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  getAnnouncementReactionCounts,
  adjustAnnouncementReactionCount,
} from '../../services/firebase';

const HELPFUL_ICON = { size: 18, weight: 'duotone', color: '#1D434E' };
const LOVE_ICON = { size: 18, weight: 'duotone', color: '#BE123C' };
const FIRE_ICON = { size: 18, weight: 'duotone', color: '#C2410C' };
const NOTED_ICON = { size: 18, weight: 'duotone', color: '#065F46' };

const REACTIONS = [
  { id: 'helpful',  Icon: ThumbsUp, label: 'Helpful', phosphor: true, ...HELPFUL_ICON },
  { id: 'love',     Icon: Heart, label: 'Love it', phosphor: true, ...LOVE_ICON },
  { id: 'exciting', Icon: Fire, label: 'Exciting', phosphor: true, ...FIRE_ICON },
  { id: 'noted',    Icon: SealCheck, label: 'Noted', phosphor: true, ...NOTED_ICON },
];

const CATEGORIES = [
  { value: "What's New",  label: "What's New",  icon: Sparkle, color: '#6366f1' },
  { value: 'Coming Up',   label: 'Coming Up',   icon: Rocket,   color: '#f59e0b' },
  { value: 'Known Bug',   label: 'Known Bug',   icon: Bug,      color: '#ef4444' },
  { value: 'Team Update', label: 'Team Update', icon: Users,    color: '#22c55e' },
];

const DEFAULT_FORM = {
  title: '',
  message: '',
  category: "What's New",
  date: new Date().toISOString().split('T')[0],
};

export default function InAppNotificationManager({ theme }) {
  const [announcements, setAnnouncements] = useState([]);
  const [reactionCounts, setReactionCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFlash, setSaveFlash] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [adjustingReaction, setAdjustingReaction] = useState(null);
  const { isRemoving, startRemove } = useSlideOutRemove();

  const handleAdjustReaction = async (postId, reactionId, delta) => {
    const key = `${postId}:${reactionId}`;
    setAdjustingReaction(key);
    try {
      const next = await adjustAnnouncementReactionCount(postId, reactionId, delta);
      setReactionCounts((prev) => ({
        ...prev,
        [postId]: { ...(prev[postId] || {}), [reactionId]: next },
      }));
    } catch (err) {
      console.error('adjustAnnouncementReactionCount:', err);
      window.dispatchEvent(
        new CustomEvent('tpp:toast', {
          detail: { type: 'error', message: 'Could not update reaction count' },
        })
      );
    } finally {
      setAdjustingReaction(null);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await getAnnouncements();
      setAnnouncements(data);
      if (data.length > 0) {
        const counts = await getAnnouncementReactionCounts(data.map(a => a.id));
        setReactionCounts(counts);
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { type: 'error', message: 'Failed to load announcements' }
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { type: 'warning', message: 'Please fill in both title and message' }
      }));
      return;
    }

    setIsSaving(true);
    try {
      const trimmedBody = formData.message.trim();
      const announcementData = {
        ...formData,
        title: formData.title.trim(),
        message: trimmedBody,
        body: trimmedBody,
        date: new Date(formData.date).toISOString(),
      };

      if (editingId) {
        announcementData.id = editingId;
      }

      await saveAnnouncement(announcementData);

      const freshAnnouncements = await getAnnouncements();
      setAnnouncements(freshAnnouncements);
      localStorage.setItem('tpprover_announcements', JSON.stringify(freshAnnouncements));
      window.dispatchEvent(new Event('storage'));

      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: {
          type: 'success',
          message: `Announcement ${editingId ? 'updated' : 'created'} successfully!`,
        }
      }));

      setSaveFlash(true);
      setTimeout(() => {
        setSaveFlash(false);
        setFormData({ ...DEFAULT_FORM, date: new Date().toISOString().split('T')[0] });
        setEditingId(null);
        setShowForm(false);
      }, 550);
    } catch (error) {
      console.error('Error saving announcement:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { type: 'error', message: 'Failed to save announcement' }
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (announcement) => {
    // Map old categories to new ones gracefully
    const categoryMap = {
      'New Feature': "What's New",
      'Improvement': "What's New",
      'Patch Note': "What's New",
      'In Progress': 'Coming Up',
      'WIP Bug': 'Known Bug',
      'Community': 'Team Update',
      'General': 'Team Update',
    };
    const rawCat = announcement.category || 'Team Update';
    const mappedCat = CATEGORIES.find(c => c.value === rawCat)
      ? rawCat
      : (categoryMap[rawCat] || 'Team Update');

    setFormData({
      title: announcement.title,
      message: announcement.message || announcement.body || announcement.content || '',
      category: mappedCat,
      date: announcement.date
        ? new Date(announcement.date).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0],
    });
    setEditingId(announcement.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (!confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) return;
    startRemove(id, async () => {
      try {
        await deleteAnnouncement(id);
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { type: 'success', message: 'Announcement deleted successfully' }
        }));
      } catch (error) {
        console.error('Error deleting announcement:', error);
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { type: 'error', message: 'Failed to delete announcement' }
        }));
        await loadAnnouncements();
      }
    });
  };

  const handleCancel = () => {
    setFormData({ ...DEFAULT_FORM, date: new Date().toISOString().split('T')[0] });
    setEditingId(null);
    setShowForm(false);
  };

  const getCategoryMeta = (value) => CATEGORIES.find(c => c.value === value) || CATEGORIES[3];

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="p-3 rounded-lg border" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
          <div className="flex items-center gap-2 mb-1">
            <BellRinging size={20} style={{ color: theme.primary }} />
            <h2 className="text-lg font-bold" style={{ color: theme.text }}>Announcements</h2>
          </div>
          <p className="text-xs" style={{ color: theme.textLight }}>
            Post updates users see in the "What's New" sheet. No permissions required.
          </p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm mt-2 transition-all hover:opacity-90"
              style={{ backgroundColor: theme.primary, color: '#fff' }}
            >
              <Plus size={16} />
              New Announcement
            </button>
          )}
        </div>

        <div className="p-3 rounded-lg border" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
          <div className="flex items-start gap-2">
            <WarningCircle size={16} style={{ color: theme.info, marginTop: 2 }} />
            <div>
              <h4 className="font-semibold text-sm mb-1" style={{ color: theme.text }}>Categories</h4>
              <ul className="text-xs space-y-0.5" style={{ color: theme.textLight }}>
                {CATEGORIES.map(cat => {
                  const Icon = cat.icon;
                  return (
                    <li key={cat.value} className="flex items-center gap-1.5">
                      <Icon size={12} style={{ color: cat.color }} />
                      <span style={{ color: cat.color, fontWeight: 600 }}>{cat.label}</span>
                      <span>—</span>
                      <span>
                        {cat.value === "What's New" && 'shipped features & improvements'}
                        {cat.value === 'Coming Up' && 'in-progress / planned work'}
                        {cat.value === 'Known Bug' && 'active bugs users should know'}
                        {cat.value === 'Team Update' && 'general team announcements'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Create / PencilSimple Form */}
      {showForm && (
        <div className="p-3 rounded-lg border" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
          <div className="space-y-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: theme.text }}>Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Injection site tracker is live"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: theme.text }}>Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: theme.text }}>Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: theme.text }}>Message</label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Describe the announcement..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border resize-none text-sm"
                style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
              />
            </div>

            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-lg border font-medium transition-all hover:opacity-80 text-sm"
                style={{ borderColor: theme.border, color: theme.textLight }}
              >
                <X size={14} className="inline mr-1" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50 text-sm ${saveFlash ? 'tpp-save-flash' : ''}`}
                style={{ backgroundColor: theme.success, color: '#fff' }}
              >
                {isSaving ? (
                  <><CircleNotch size={14} className="animate-spin" />Saving...</>
                ) : (
                  <><FloppyDisk size={14} />{editingId ? 'Update' : 'Create'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcements list */}
      <div className="p-3 rounded-lg border" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
        <h3 className="text-sm font-semibold mb-2" style={{ color: theme.text }}>Active Announcements</h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <CircleNotch size={20} className="animate-spin" style={{ color: theme.primary }} />
          </div>
        ) : announcements.length === 0 ? (
          <AnimatedEmptyState
            icon={BellRinging}
            theme={theme}
            title="No announcements yet"
            description="Create your first announcement to notify users in the app."
            className="py-8"
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {announcements.map(announcement => {
              const meta = getCategoryMeta(announcement.category);
              const Icon = meta.icon;
              return (
                <div
                  key={announcement.id}
                  className={`p-3 rounded-lg border hover:shadow-md transition-all ${isRemoving(announcement.id) ? 'tpp-slide-out' : ''}`}
                  style={{ backgroundColor: theme.background, borderColor: theme.border }}
                >
                  <div className="flex items-start justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Icon size={14} style={{ color: meta.color }} />
                      <span
                        className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
                      >
                        {announcement.category}
                      </span>
                      <span className="text-[10px]" style={{ color: theme.textLight }}>
                        {new Date(announcement.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="p-1.5 rounded-lg transition-colors hover:opacity-90"
                        style={{ backgroundColor: theme.primary + '20', color: theme.primary }}
                        title="PencilSimple"
                      >
                        <PencilSimple size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="p-1.5 rounded-lg transition-colors hover:opacity-90"
                        style={{ backgroundColor: theme.error + '20', color: theme.error }}
                        title="Delete"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                  <h4 className="font-semibold text-sm mb-1 line-clamp-1" style={{ color: theme.text }}>
                    {announcement.title}
                  </h4>
                  <p className="text-xs line-clamp-2 mb-2" style={{ color: theme.textLight }}>
                    {announcement.message || announcement.body || announcement.content || ''}
                  </p>

                  {/* Reaction counts */}
                  {(() => {
                    const counts = reactionCounts[announcement.id] || {};
                    const total = REACTIONS.reduce((s, r) => s + (counts[r.id] || 0), 0);
                    return (
                      <div className="pt-1.5 border-t space-y-1" style={{ borderColor: theme.border }}>
                        <p className="text-[10px]" style={{ color: theme.textLight }}>
                          Click + to add reactions (shown to users in the app)
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {REACTIONS.map((r) => {
                            const n = counts[r.id] || 0;
                            const busy = adjustingReaction === `${announcement.id}:${r.id}`;
                            return (
                              <div
                                key={r.id}
                                className="flex items-center rounded-full overflow-hidden border"
                                style={{
                                  borderColor: n > 0 ? `${theme.primary}40` : theme.border,
                                  background: n > 0 ? `${theme.primary}12` : theme.background,
                                }}
                              >
                                <span
                                  className="flex items-center gap-0.5 text-[11px] pl-1.5 pr-0.5 py-0.5"
                                  style={{ color: n > 0 ? theme.primary : theme.textLight }}
                                  title={r.label}
                                >
                                  {r.phosphor && r.Icon ? (
                                    <r.Icon
                                      size={r.size ?? 14}
                                      weight={r.weight ?? 'duotone'}
                                      color={r.color ?? '#EA580C'}
                                      aria-hidden
                                      className="flex-shrink-0"
                                    />
                                  ) : (
                                    <span>{r.emoji}</span>
                                  )}
                                  <span className="font-semibold min-w-[1ch]">{n}</span>
                                </span>
                                <button
                                  type="button"
                                  disabled={!!adjustingReaction}
                                  onClick={() => handleAdjustReaction(announcement.id, r.id, 1)}
                                  className="px-1.5 py-0.5 text-[11px] font-bold transition-colors hover:opacity-90 disabled:opacity-40"
                                  style={{
                                    backgroundColor: theme.primary,
                                    color: theme.textOnPrimary ?? '#fff',
                                  }}
                                  title={`Add ${r.label}`}
                                  aria-label={`Add ${r.label}`}
                                >
                                  {busy ? '…' : '+'}
                                </button>
                                {n > 0 && (
                                  <button
                                    type="button"
                                    disabled={!!adjustingReaction}
                                    onClick={() => handleAdjustReaction(announcement.id, r.id, -1)}
                                    className="px-1 py-0.5 text-[11px] font-bold border-l transition-colors hover:opacity-80 disabled:opacity-40"
                                    style={{
                                      borderColor: `${theme.primary}30`,
                                      color: theme.textLight,
                                    }}
                                    title={`Remove one ${r.label}`}
                                    aria-label={`Remove one ${r.label}`}
                                  >
                                    −
                                  </button>
                                )}
                              </div>
                            );
                          })}
                          {total > 0 && (
                            <span className="text-[10px] ml-auto self-center" style={{ color: theme.textLight }}>
                              {total} reaction{total !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
