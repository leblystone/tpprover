import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Megaphone, Plus, Edit, Trash2, Save, X, Eye, Sparkles, Wrench, Users } from 'lucide-react';
import { formatMMDDYYYY } from '../utils/date';

export default function Admin() {
  const { theme } = useOutletContext();
  const [announcements, setAnnouncements] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    category: 'General',
    date: new Date().toISOString().slice(0, 10)
  });

  // Simple admin authentication (you can change this password)
  const ADMIN_PASSWORD = 'tpp-admin-2024';

  const categoryOptions = [
    { value: 'New Feature', icon: Sparkles, color: theme.info },
    { value: 'Improvement', icon: Wrench, color: theme.success },
    { value: 'Community', icon: Users, color: theme.warning },
    { value: 'General', icon: Megaphone, color: theme.textLight }
  ];

  useEffect(() => {
    // Check if already authenticated
    const authStatus = localStorage.getItem('tpp_admin_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
    
    // Load announcements
    loadAnnouncements();
  }, []);

  const loadAnnouncements = () => {
    try {
      const saved = localStorage.getItem('tpprover_announcements');
      if (saved) {
        setAnnouncements(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading announcements:', error);
    }
  };

  const saveAnnouncements = (newAnnouncements) => {
    try {
      localStorage.setItem('tpprover_announcements', JSON.stringify(newAnnouncements));
      setAnnouncements(newAnnouncements);
    } catch (error) {
      console.error('Error saving announcements:', error);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('tpp_admin_auth', 'true');
      setPassword('');
    } else {
      alert('Incorrect password');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('tpp_admin_auth');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const newAnnouncement = {
      ...formData,
      id: editingAnnouncement ? editingAnnouncement.id : Date.now(),
    };

    let updatedAnnouncements;
    if (editingAnnouncement) {
      // Update existing
      updatedAnnouncements = announcements.map(a => 
        a.id === editingAnnouncement.id ? newAnnouncement : a
      );
    } else {
      // Add new
      updatedAnnouncements = [newAnnouncement, ...announcements];
    }

    saveAnnouncements(updatedAnnouncements);
    resetForm();
  };

  const handleEdit = (announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      body: announcement.body,
      category: announcement.category,
      date: announcement.date
    });
    setShowAddForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      const updatedAnnouncements = announcements.filter(a => a.id !== id);
      saveAnnouncements(updatedAnnouncements);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      body: '',
      category: 'General',
      date: new Date().toISOString().slice(0, 10)
    });
    setEditingAnnouncement(null);
    setShowAddForm(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.background }}>
        <div className="max-w-md w-full p-8 rounded-lg border shadow-lg" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="text-center mb-6">
            <Megaphone size={48} className="mx-auto mb-4" style={{ color: theme.primary }} />
            <h1 className="text-2xl font-bold" style={{ color: theme.primaryDark }}>Admin Panel</h1>
            <p className="text-sm" style={{ color: theme.textLight }}>Enter admin password to continue</p>
          </div>
          
          <form onSubmit={handleLogin}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin password"
              className="w-full p-3 rounded border mb-4"
              style={{ borderColor: theme.border, backgroundColor: theme.background }}
              required
            />
            <button
              type="submit"
              className="w-full p-3 rounded font-semibold"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: theme.primaryDark }}>Admin Panel</h1>
          <p className="text-sm" style={{ color: theme.textLight }}>Manage announcements and app content</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 rounded-md font-semibold flex items-center gap-2"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          >
            <Plus size={18} />
            New Announcement
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-md font-semibold"
            style={{ backgroundColor: theme.accent, color: theme.accentText }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>
              {editingAnnouncement ? 'Edit Announcement' : 'New Announcement'}
            </h2>
            <button onClick={resetForm} className="p-1 hover:opacity-70">
              <X size={20} style={{ color: theme.textLight }} />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="w-full p-3 rounded border"
                style={{ borderColor: theme.border, backgroundColor: theme.background }}
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>Body</label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                className="w-full p-3 rounded border h-32 resize-none"
                style={{ borderColor: theme.border, backgroundColor: theme.background }}
                required
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full p-3 rounded border"
                  style={{ borderColor: theme.border, backgroundColor: theme.background }}
                >
                  {categoryOptions.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.value}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>Date</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full p-3 rounded border"
                  style={{ borderColor: theme.border, backgroundColor: theme.background }}
                  required
                />
              </div>
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="px-6 py-2 rounded-md font-semibold flex items-center gap-2"
                style={{ backgroundColor: theme.success, color: theme.textOnPrimary }}
              >
                <Save size={18} />
                {editingAnnouncement ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 rounded-md font-semibold"
                style={{ backgroundColor: theme.accent, color: theme.accentText }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Announcements List */}
      <div className="rounded-lg border content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="p-6 border-b" style={{ borderColor: theme.border }}>
          <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>
            Announcements ({announcements.length})
          </h2>
        </div>
        
        <div className="divide-y" style={{ borderColor: theme.border }}>
          {announcements.length === 0 ? (
            <div className="p-8 text-center">
              <Megaphone size={48} className="mx-auto mb-4 opacity-50" style={{ color: theme.textLight }} />
              <p className="text-lg font-medium" style={{ color: theme.text }}>No announcements yet</p>
              <p className="text-sm" style={{ color: theme.textLight }}>Create your first announcement to get started</p>
            </div>
          ) : (
            announcements.map(announcement => {
              const categoryInfo = categoryOptions.find(cat => cat.value === announcement.category);
              const CategoryIcon = categoryInfo?.icon || Megaphone;
              
              return (
                <div key={announcement.id} className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: theme.secondary, color: categoryInfo?.color }}>
                          <CategoryIcon size={14} />
                          {announcement.category}
                        </span>
                        <span className="text-xs" style={{ color: theme.textLight }}>
                          {formatMMDDYYYY(announcement.date)}
                        </span>
                      </div>
                      
                      <h3 className="font-semibold text-lg mb-1" style={{ color: theme.text }}>
                        {announcement.title}
                      </h3>
                      <p className="text-sm" style={{ color: theme.textLight }}>
                        {announcement.body}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="p-2 rounded hover:opacity-70"
                        style={{ backgroundColor: theme.accent, color: theme.accentText }}
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="p-2 rounded hover:opacity-70"
                        style={{ backgroundColor: theme.error, color: theme.textOnPrimary }}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
