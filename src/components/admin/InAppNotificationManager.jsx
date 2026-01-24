import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Save, X, Sparkles, Wrench, Users, Megaphone, 
  Loader, CheckCircle, AlertCircle, BellRing 
} from 'lucide-react';
import { getAnnouncements, saveAnnouncement, deleteAnnouncement } from '../../services/firebase';

const CATEGORIES = [
  { value: 'New Feature', label: 'New Feature', icon: Sparkles, color: '#5FAF8B' },
  { value: 'Improvement', label: 'Improvement', icon: Wrench, color: '#7CB8B2' },
  { value: 'Community', label: 'Community', icon: Users, color: '#E5A87A' },
  { value: 'General', label: 'General', icon: Megaphone, color: '#7F9E95' }
];

export default function InAppNotificationManager({ theme }) {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    category: 'New Feature',
    date: new Date().toISOString().split('T')[0]
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const data = await getAnnouncements();
      setAnnouncements(data);
    } catch (error) {
      console.error('Error loading announcements:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          type: 'error', 
          message: 'Failed to load announcements' 
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.message.trim()) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          type: 'warning', 
          message: 'Please fill in both title and message' 
        }
      }));
      return;
    }

    setIsSaving(true);
    try {
      const announcementData = {
        ...formData,
        title: formData.title.trim(),
        message: formData.message.trim(),
        date: new Date(formData.date).toISOString()
      };

      if (editingId) {
        announcementData.id = editingId;
      }

      await saveAnnouncement(announcementData);
      
      // Reload announcements first to get fresh data
      const freshAnnouncements = await getAnnouncements();
      setAnnouncements(freshAnnouncements);
      
      // Update localStorage so NotificationBell picks it up immediately
      localStorage.setItem('tpprover_announcements', JSON.stringify(freshAnnouncements));
      
      // Trigger a storage event for other tabs/components
      window.dispatchEvent(new Event('storage'));
      
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          type: 'success', 
          message: `Announcement ${editingId ? 'updated' : 'created'} successfully! Users will see it in the bell icon.` 
        }
      }));

      // Reset form
      setFormData({
        title: '',
        message: '',
        category: 'New Feature',
        date: new Date().toISOString().split('T')[0]
      });
      setEditingId(null);
      setShowForm(false);
      
    } catch (error) {
      console.error('Error saving announcement:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          type: 'error', 
          message: 'Failed to save announcement' 
        }
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (announcement) => {
    setFormData({
      title: announcement.title,
      message: announcement.message,
      category: announcement.category || 'General',
      date: announcement.date ? new Date(announcement.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
    });
    setEditingId(announcement.id);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this announcement? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteAnnouncement(id);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          type: 'success', 
          message: 'Announcement deleted successfully' 
        }
      }));
      await loadAnnouncements();
    } catch (error) {
      console.error('Error deleting announcement:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          type: 'error', 
          message: 'Failed to delete announcement' 
        }
      }));
    }
  };

  const handleCancel = () => {
    setFormData({
      title: '',
      message: '',
      category: 'New Feature',
      date: new Date().toISOString().split('T')[0]
    });
    setEditingId(null);
    setShowForm(false);
  };

  const getCategoryIcon = (categoryValue) => {
    const category = CATEGORIES.find(c => c.value === categoryValue);
    if (!category) return null;
    const Icon = category.icon;
    return <Icon size={16} style={{ color: category.color }} />;
  };

  return (
    <div className="space-y-3">
      {/* Header with Form Toggle */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Header */}
        <div 
          className="p-3 rounded-lg border"
          style={{ 
            backgroundColor: theme.cardBackground, 
            borderColor: theme.border 
          }}
        >
          <div className="flex items-center gap-2 mb-1">
            <BellRing size={20} style={{ color: theme.primary }} />
            <h2 className="text-lg font-bold" style={{ color: theme.text }}>
              In-App Notifications
            </h2>
          </div>
          <p className="text-xs" style={{ color: theme.textLight }}>
            Create announcements that appear in users' notification bell. <strong>No permissions required!</strong>
          </p>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg font-semibold text-sm mt-2 transition-all hover:opacity-90"
              style={{ 
                backgroundColor: theme.primary, 
                color: '#fff' 
              }}
            >
              <Plus size={16} />
              New Announcement
            </button>
          )}
        </div>

        {/* Info Box */}
        <div 
          className="p-3 rounded-lg border"
          style={{ 
            backgroundColor: theme.cardBackground,
            borderColor: theme.border
          }}
        >
          <div className="flex items-start gap-2">
            <AlertCircle size={16} style={{ color: theme.info, marginTop: 2 }} />
            <div>
              <h4 className="font-semibold text-sm mb-1" style={{ color: theme.text }}>
                How It Works
              </h4>
              <ul className="text-xs space-y-0.5" style={{ color: theme.textLight }}>
                <li>• No permissions required - in-app only</li>
                <li>• Appears in notification bell icon</li>
                <li>• Perfect for feature announcements</li>
                <li>• Sorted by date (newest first)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div 
          className="p-3 rounded-lg border"
          style={{ 
            backgroundColor: theme.cardBackground, 
            borderColor: theme.border 
          }}
        >
          <div className="space-y-2">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: theme.text }}>
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., New Feature: Dark Mode"
                  className="w-full px-3 py-2 rounded-lg border text-sm"
                  style={{ 
                    backgroundColor: theme.background, 
                    borderColor: theme.border,
                    color: theme.text
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: theme.text }}>
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ 
                      backgroundColor: theme.background, 
                      borderColor: theme.border,
                      color: theme.text
                    }}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1" style={{ color: theme.text }}>
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border text-sm"
                    style={{ 
                      backgroundColor: theme.background, 
                      borderColor: theme.border,
                      color: theme.text
                    }}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: theme.text }}>
                Message
              </label>
              <textarea
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Describe the announcement..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg border resize-none text-sm"
                style={{ 
                  backgroundColor: theme.background, 
                  borderColor: theme.border,
                  color: theme.text
                }}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 justify-end pt-1">
              <button
                onClick={handleCancel}
                className="px-3 py-1.5 rounded-lg border font-medium transition-all hover:opacity-80 text-sm"
                style={{ 
                  borderColor: theme.border,
                  color: theme.textLight 
                }}
              >
                <X size={14} className="inline mr-1" />
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50 text-sm"
                style={{ 
                  backgroundColor: theme.success, 
                  color: '#fff' 
                }}
              >
                {isSaving ? (
                  <>
                    <Loader size={14} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={14} />
                    {editingId ? 'Update' : 'Create'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Announcements Grid */}
      <div 
        className="p-3 rounded-lg border"
        style={{ 
          backgroundColor: theme.cardBackground, 
          borderColor: theme.border 
        }}
      >
        <h3 className="text-sm font-semibold mb-2" style={{ color: theme.text }}>
          Active Announcements
        </h3>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader size={20} className="animate-spin" style={{ color: theme.primary }} />
          </div>
        ) : announcements.length === 0 ? (
          <div className="text-center py-8">
            <BellRing size={40} className="mx-auto mb-3" style={{ color: theme.textLight, opacity: 0.3 }} />
            <p className="text-sm" style={{ color: theme.textLight }}>No announcements yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
            {announcements.map(announcement => (
              <div
                key={announcement.id}
                className="p-3 rounded-lg border hover:shadow-md transition-all"
                style={{ 
                  backgroundColor: theme.background, 
                  borderColor: theme.border 
                }}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {getCategoryIcon(announcement.category)}
                    <span 
                      className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                      style={{ 
                        backgroundColor: `${CATEGORIES.find(c => c.value === announcement.category)?.color || theme.textLight}15`,
                        color: CATEGORIES.find(c => c.value === announcement.category)?.color || theme.textLight
                      }}
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
                      style={{ 
                        backgroundColor: theme.primary + '20',
                        color: theme.primary 
                      }}
                      title="Edit"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      className="p-1.5 rounded-lg transition-colors hover:opacity-90"
                      style={{ 
                        backgroundColor: theme.error + '20',
                        color: theme.error 
                      }}
                      title="Delete"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                
                <h4 className="font-semibold text-sm mb-1 line-clamp-1" style={{ color: theme.text }}>
                  {announcement.title}
                </h4>
                <p className="text-xs line-clamp-2" style={{ color: theme.textLight }}>
                  {announcement.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

