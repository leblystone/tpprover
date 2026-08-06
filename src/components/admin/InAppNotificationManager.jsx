import React, { useState, useEffect } from 'react';
import {
  Plus, PencilSimple, Trash, FloppyDisk, X, Sparkle, Users,
  CircleNotch, BellRinging, Rocket, Bug, CalendarBlank,
} from '@phosphor-icons/react';
import { Fire, ThumbsUp, Heart, SealCheck } from '@phosphor-icons/react';
import AnimatedEmptyState from '../ui/AnimatedEmptyState';
import { useSlideOutRemove } from '../../hooks/useSlideOutRemove';
import CustomDropdown from '../common/inputs/CustomDropdown';
import { AdminBottomSheet } from './adminUi';
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
  { id: 'helpful', Icon: ThumbsUp, label: 'Helpful', phosphor: true, ...HELPFUL_ICON },
  { id: 'love', Icon: Heart, label: 'Love it', phosphor: true, ...LOVE_ICON },
  { id: 'exciting', Icon: Fire, label: 'Exciting', phosphor: true, ...FIRE_ICON },
  { id: 'noted', Icon: SealCheck, label: 'Noted', phosphor: true, ...NOTED_ICON },
];

const CATEGORIES = [
  { value: "What's New", label: "What's New", icon: Sparkle, color: '#6366f1', hint: 'Shipped features & improvements' },
  { value: 'Coming Up', label: 'Coming Up', icon: Rocket, color: '#f59e0b', hint: 'In-progress / planned work' },
  { value: 'Known Bug', label: 'Known Bug', icon: Bug, color: '#ef4444', hint: 'Active bugs users should know' },
  { value: 'Team Update', label: 'Team Update', icon: Users, color: '#22c55e', hint: 'General team announcements' },
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

  const pillShadow = theme.isDark ? '0 2px 8px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.08)';

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
        const counts = await getAnnouncementReactionCounts(data.map((a) => a.id));
        setReactionCounts(counts);
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { type: 'error', message: 'Failed to load announcements' },
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { type: 'warning', message: 'Please fill in both title and message' },
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
        },
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
        detail: { type: 'error', message: 'Failed to save announcement' },
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (announcement) => {
    const categoryMap = {
      'New Feature': "What's New",
      Improvement: "What's New",
      'Patch Note': "What's New",
      'In Progress': 'Coming Up',
      'WIP Bug': 'Known Bug',
      Community: 'Team Update',
      General: 'Team Update',
    };
    const rawCat = announcement.category || 'Team Update';
    const mappedCat = CATEGORIES.find((c) => c.value === rawCat)
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
          detail: { type: 'success', message: 'Announcement deleted successfully' },
        }));
      } catch (error) {
        console.error('Error deleting announcement:', error);
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { type: 'error', message: 'Failed to delete announcement' },
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

  const getCategoryMeta = (value) => CATEGORIES.find((c) => c.value === value) || CATEGORIES[3];

  const formCategoryOptions = CATEGORIES.map((cat) => {
    const Icon = cat.icon;
    return {
      value: cat.value,
      label: cat.label,
      icon: <Icon size={18} weight="duotone" style={{ color: cat.color }} />,
    };
  });

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2
          className="text-sm font-bold flex items-center gap-2 pb-1 border-b"
          style={{ color: theme.text, borderColor: theme.border }}
        >
          <Sparkle size={16} weight="duotone" style={{ color: theme.primary }} />
          Active Posts
          <span className="font-normal text-[11px]" style={{ color: theme.textLight }}>
            {announcements.length} post{announcements.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={() => {
              setFormData({ ...DEFAULT_FORM, date: new Date().toISOString().split('T')[0] });
              setEditingId(null);
              setShowForm(true);
            }}
            className="ml-auto px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide flex items-center gap-1.5 transition-all hover:brightness-105 active:scale-[0.97] shrink-0"
            style={{
              backgroundColor: theme.primary,
              color: theme.textOnPrimary || '#fff',
              boxShadow: theme.isDark
                ? '0 2px 8px rgba(0,0,0,0.35)'
                : `0 2px 8px ${theme.primary}45`,
            }}
          >
            <Plus size={14} weight="bold" />
            New
          </button>
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <CircleNotch size={24} weight="duotone" className="animate-spin" style={{ color: theme.primary }} />
          </div>
        ) : announcements.length === 0 ? (
          <AnimatedEmptyState
            icon={BellRinging}
            theme={theme}
            title="No announcements yet"
            description="Create your first announcement for the What's New sheet."
            className="py-10"
          />
        ) : (
          <div className="space-y-3">
            {announcements.map((announcement) => {
              const meta = getCategoryMeta(announcement.category);
              const Icon = meta.icon;
              const counts = reactionCounts[announcement.id] || {};
              const total = REACTIONS.reduce((s, r) => s + (counts[r.id] || 0), 0);

              return (
                <div
                  key={announcement.id}
                  className={`rounded-2xl border overflow-hidden transition-all ${isRemoving(announcement.id) ? 'tpp-slide-out' : ''}`}
                  style={{
                    borderColor: theme.border,
                    backgroundColor: theme.cardBackground,
                    boxShadow: theme.isDark
                      ? '0 4px 16px rgba(0,0,0,0.2)'
                      : '0 4px 16px rgba(47,59,58,0.05)',
                  }}
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="flex-shrink-0 p-2.5 rounded-xl"
                        style={{ backgroundColor: `${meta.color}18` }}
                      >
                        <Icon size={20} weight="duotone" style={{ color: meta.color }} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm truncate" style={{ color: theme.text }}>
                              {announcement.title}
                            </h4>
                            <p className="text-xs mt-0.5 line-clamp-2" style={{ color: theme.textLight }}>
                              {announcement.message || announcement.body || announcement.content || ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleEdit(announcement)}
                              className="p-2 rounded-full transition-all hover:brightness-105 active:scale-[0.97]"
                              style={{
                                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.05)',
                                color: theme.primary,
                                border: `1px solid ${theme.border}`,
                              }}
                              title="Edit"
                            >
                              <PencilSimple size={16} weight="duotone" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(announcement.id)}
                              className="p-2 rounded-full transition-all hover:brightness-105 active:scale-[0.97]"
                              style={{
                                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.05)',
                                color: theme.error || '#ef4444',
                                border: `1px solid ${theme.border}`,
                              }}
                              title="Delete"
                            >
                              <Trash size={16} weight="duotone" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium"
                        style={{ backgroundColor: `${meta.color}18`, color: meta.color }}
                      >
                        <Icon size={14} weight="duotone" />
                        {meta.label}
                      </span>
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium"
                        style={{
                          backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.05)',
                          color: theme.text,
                        }}
                      >
                        <CalendarBlank size={14} weight="duotone" style={{ color: theme.primary }} />
                        {new Date(announcement.date).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="pt-3 border-t space-y-2" style={{ borderColor: theme.border }}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-[11px] font-semibold" style={{ color: theme.text }}>
                          Reactions
                        </p>
                        <p className="text-[10px]" style={{ color: theme.textLight }}>
                          {total} total · adjust counts shown in-app
                        </p>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        {REACTIONS.map((r) => {
                          const n = counts[r.id] || 0;
                          const busy = adjustingReaction === `${announcement.id}:${r.id}`;
                          return (
                            <div
                              key={r.id}
                              className="flex items-center gap-1.5 rounded-xl border px-2 py-1.5 min-w-0"
                              style={{
                                borderColor: theme.border,
                                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(47,59,58,0.03)',
                              }}
                              title={r.label}
                            >
                              <r.Icon
                                size={r.size ?? 14}
                                weight={r.weight ?? 'duotone'}
                                color={r.color ?? '#EA580C'}
                                aria-hidden
                                className="flex-shrink-0"
                              />
                              <span
                                className="flex-1 min-w-[2ch] text-[12px] font-semibold tabular-nums text-center"
                                style={{ color: theme.text }}
                              >
                                {busy ? (
                                  <CircleNotch size={12} className="inline animate-spin" style={{ color: theme.textLight }} />
                                ) : (
                                  n
                                )}
                              </span>
                              <div className="flex items-center gap-0.5 flex-shrink-0">
                                <button
                                  type="button"
                                  disabled={!!adjustingReaction || n <= 0}
                                  onClick={() => handleAdjustReaction(announcement.id, r.id, -1)}
                                  className="w-6 h-6 rounded-lg text-[13px] font-semibold leading-none flex items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-30"
                                  style={{
                                    backgroundColor: theme.cardBackground,
                                    color: theme.text,
                                    border: `1px solid ${theme.border}`,
                                  }}
                                  title={`Remove one ${r.label}`}
                                  aria-label={`Remove one ${r.label}`}
                                >
                                  −
                                </button>
                                <button
                                  type="button"
                                  disabled={!!adjustingReaction}
                                  onClick={() => handleAdjustReaction(announcement.id, r.id, 1)}
                                  className="w-6 h-6 rounded-lg text-[13px] font-semibold leading-none flex items-center justify-center transition-opacity hover:opacity-90 disabled:opacity-40"
                                  style={{
                                    backgroundColor: theme.primary,
                                    color: theme.textOnPrimary ?? '#fff',
                                  }}
                                  title={`Add ${r.label}`}
                                  aria-label={`Add ${r.label}`}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <AdminBottomSheet
        open={showForm}
        onClose={handleCancel}
        title={editingId ? 'Edit Announcement' : 'New Announcement'}
        theme={theme}
        wide
        seamlessContent={false}
        fitContent
        footer={(
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide flex items-center gap-1.5 transition-all hover:brightness-105 active:scale-[0.97]"
              style={{
                backgroundColor: theme.cardBackground,
                color: theme.text,
                border: `1px solid ${theme.border}`,
                boxShadow: pillShadow,
              }}
            >
              <X size={14} weight="bold" />
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`ml-auto px-4 py-1.5 rounded-full text-[11px] font-semibold tracking-wide flex items-center gap-1.5 transition-all hover:brightness-105 active:scale-[0.97] disabled:opacity-50 ${saveFlash ? 'tpp-save-flash' : ''}`}
              style={{
                backgroundColor: theme.success || theme.primary,
                color: '#fff',
                boxShadow: theme.isDark
                  ? '0 2px 8px rgba(0,0,0,0.35)'
                  : `0 2px 8px ${(theme.success || theme.primary)}45`,
              }}
            >
              {isSaving ? (
                <>
                  <CircleNotch size={14} weight="duotone" className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <FloppyDisk size={14} weight="duotone" />
                  {editingId ? 'Update' : 'Create'}
                </>
              )}
            </button>
          </div>
        )}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: theme.text }}>
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Injection site tracker is live"
              className="w-full px-3 py-2.5 rounded-xl border text-sm"
              style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: theme.text }}>
                Category
              </label>
              <CustomDropdown
                value={formData.category}
                onChange={(val) => setFormData({ ...formData, category: val })}
                options={formCategoryOptions}
                theme={theme}
                outlined
                customShadow
                placeholder="Category…"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: theme.text }}>
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2.5 rounded-xl border text-sm"
                style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: theme.text }}>
              Message
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              placeholder="Describe the announcement..."
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl border resize-none text-sm"
              style={{ backgroundColor: theme.background, borderColor: theme.border, color: theme.text }}
            />
          </div>
        </div>
      </AdminBottomSheet>
    </div>
  );
}
