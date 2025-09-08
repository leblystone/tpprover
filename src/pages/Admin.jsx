import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Edit, Trash2, Save, X, Eye, Sparkles, Wrench, Users, Mail, Key, Copy, Check, Loader } from 'lucide-react';
import { formatMMDDYYYY } from '../utils/date';
import {
  getInviteCodes,
  createInviteCodes,
  deleteInviteCode,
  getEmailWhitelist,
  updateEmailWhitelist,
  getAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  getUserList,
  getAnalytics
} from '../services/firebase';

// Admin theme (standalone since admin is outside the main app context)
const adminTheme = {
  primary: '#7f9e95',
  primaryDark: '#6b8a80',
  success: '#10b981',
  successBg: '#ecfdf5',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  accent: '#8b5cf6',
  accentText: '#ffffff',
  background: '#ffffff',
  cardBackground: '#ffffff',
  text: '#111827',
  textLight: '#6b7280',
  textOnPrimary: '#ffffff',
  border: '#e5e7eb',
  white: '#ffffff'
};

export default function Admin() {
  const theme = adminTheme;
  const [announcements, setAnnouncements] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [activeTab, setActiveTab] = useState('announcements');
  const [inviteCodes, setInviteCodes] = useState({});
  const [emailWhitelist, setEmailWhitelist] = useState([]);
  const [newEmails, setNewEmails] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [loading, setLoading] = useState({
    announcements: false,
    inviteCodes: false,
    emailWhitelist: false,
    submitting: false
  });
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    category: 'General',
    date: new Date().toISOString().slice(0, 10)
  });

  // Simple admin authentication (you can change this password)
  const ADMIN_PASSWORD = 'j&jm9102';

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
    
    // Load data
    loadAnnouncements();
    loadInviteData();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(prev => ({ ...prev, announcements: true }));
    try {
      const firebaseAnnouncements = await getAnnouncements();
      setAnnouncements(firebaseAnnouncements);
    } catch (error) {
      console.error('Error loading announcements:', error);
    } finally {
      setLoading(prev => ({ ...prev, announcements: false }));
    }
  };

  const saveAnnouncementToFirebase = async (announcement) => {
    try {
      await saveAnnouncement(announcement);
      await loadAnnouncements(); // Reload to get updated data
    } catch (error) {
      console.error('Error saving announcement:', error);
    }
  };

  const loadInviteData = async () => {
    setLoading(prev => ({ ...prev, inviteCodes: true, emailWhitelist: true }));
    try {
      const codes = await getInviteCodes();
      setInviteCodes(codes);
      
      const whitelist = await getEmailWhitelist();
      setEmailWhitelist(whitelist);
    } catch (error) {
      console.error('Error loading invite data:', error);
    } finally {
      setLoading(prev => ({ ...prev, inviteCodes: false, emailWhitelist: false }));
    }
  };

  const generateInviteCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'BETA-';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const createInviteCodesFirebase = async (count, emails = []) => {
    try {
      const existingCodes = await getInviteCodes();
      const createdCodes = [];
      
      for (let i = 0; i < count; i++) {
        let code = generateInviteCode();
        // Ensure unique codes
        while (existingCodes[code]) {
          code = generateInviteCode();
        }
        
        createdCodes.push({
          code,
          email: emails[i] || null,
        });
      }
      
      await createInviteCodes(createdCodes);
      await loadInviteData(); // Reload to get updated data
      return createdCodes.map(c => c.code);
    } catch (error) {
      console.error('Error creating invite codes:', error);
      return [];
    }
  };

  const deleteInviteCodeFirebase = async (code) => {
    try {
      await deleteInviteCode(code);
      await loadInviteData(); // Reload to get updated data
    } catch (error) {
      console.error('Error deleting invite code:', error);
    }
  };

  const updateEmailWhitelistFirebase = async (emails) => {
    setLoading(prev => ({ ...prev, emailWhitelist: true }));
    try {
      const cleanEmails = emails
        .split(/[\n,;]/)
        .map(email => email.trim().toLowerCase())
        .filter(email => email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email));
      
      const uniqueEmails = [...new Set([...emailWhitelist, ...cleanEmails])];
      await updateEmailWhitelist(uniqueEmails);
      await loadInviteData(); // Reload to get updated data
      setNewEmails('');
    } catch (error) {
      console.error('Error updating email whitelist:', error);
    } finally {
      setLoading(prev => ({ ...prev, emailWhitelist: false }));
    }
  };

  const removeFromWhitelistFirebase = async (email) => {
    try {
      const newWhitelist = emailWhitelist.filter(e => e !== email);
      await updateEmailWhitelist(newWhitelist);
      await loadInviteData(); // Reload to get updated data
    } catch (error) {
      console.error('Error removing from whitelist:', error);
    }
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(prev => ({ ...prev, submitting: true }));
    
    try {
      const newAnnouncement = {
        ...formData,
        id: editingAnnouncement ? editingAnnouncement.id : undefined, // Let Firebase generate ID for new ones
      };

      await saveAnnouncementToFirebase(newAnnouncement);
      resetForm();
    } catch (error) {
      console.error('Error submitting announcement:', error);
    } finally {
      setLoading(prev => ({ ...prev, submitting: false }));
    }
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

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this announcement?')) {
      await deleteAnnouncement(id);
      await loadAnnouncements(); // Reload to get updated data
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
          <p className="text-sm" style={{ color: theme.textLight }}>Manage announcements, invites, and beta access</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'announcements' && (
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 rounded-md font-semibold flex items-center gap-2"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              <Plus size={18} />
              New Announcement
            </button>
          )}
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-md font-semibold"
            style={{ backgroundColor: theme.accent, color: theme.accentText }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b" style={{ borderColor: theme.border }}>
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('announcements')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'announcements' ? 'border-current' : 'border-transparent hover:opacity-70'}`}
            style={{ color: activeTab === 'announcements' ? theme.primary : theme.textLight }}
          >
            <Megaphone size={16} className="inline mr-2" />
            Announcements ({announcements.length})
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'invites' ? 'border-current' : 'border-transparent hover:opacity-70'}`}
            style={{ color: activeTab === 'invites' ? theme.primary : theme.textLight }}
          >
            <Key size={16} className="inline mr-2" />
            Beta Invites ({Object.keys(inviteCodes).length})
          </button>
          <button
            onClick={() => setActiveTab('whitelist')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'whitelist' ? 'border-current' : 'border-transparent hover:opacity-70'}`}
            style={{ color: activeTab === 'whitelist' ? theme.primary : theme.textLight }}
          >
            <Mail size={16} className="inline mr-2" />
            Email Whitelist ({emailWhitelist.length})
          </button>
        </nav>
      </div>

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <>
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
          
          <form onSubmit={handleSubmit} className="space-y-4" onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit(e);
            }
          }}>
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
                disabled={loading.submitting}
                className="px-6 py-2 rounded-md font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: theme.success, color: theme.textOnPrimary }}
              >
                {loading.submitting ? (
                  <>
                    <Loader size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    {editingAnnouncement ? 'Update' : 'Create'}
                  </>
                )}
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
        </>
      )}

      {/* Beta Invites Tab */}
      {activeTab === 'invites' && (
        <div className="space-y-6">
          <div className="rounded-lg border content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <div className="p-6 border-b" style={{ borderColor: theme.border }}>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Generate Invite Codes</h2>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => createInviteCodesFirebase(1)}
                  disabled={loading.inviteCodes}
                  className="px-4 py-2 rounded-md font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                >
                  {loading.inviteCodes ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                  Generate 1 Code
                </button>
                <button
                  onClick={() => createInviteCodesFirebase(5)}
                  disabled={loading.inviteCodes}
                  className="px-4 py-2 rounded-md font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: theme.success, color: theme.textOnPrimary }}
                >
                  {loading.inviteCodes ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                  Generate 5 Codes
                </button>
                <button
                  onClick={() => createInviteCodesFirebase(10)}
                  disabled={loading.inviteCodes}
                  className="px-4 py-2 rounded-md font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: theme.info, color: theme.textOnPrimary }}
                >
                  {loading.inviteCodes ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                  Generate 10 Codes
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-lg border content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <div className="p-6 border-b" style={{ borderColor: theme.border }}>
              <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>
                Invite Codes ({Object.keys(inviteCodes).length})
              </h2>
            </div>
            
            <div className="divide-y" style={{ borderColor: theme.border }}>
              {Object.keys(inviteCodes).length === 0 ? (
                <div className="p-8 text-center">
                  <Key size={48} className="mx-auto mb-4 opacity-50" style={{ color: theme.textLight }} />
                  <p className="text-lg font-medium" style={{ color: theme.text }}>No invite codes generated</p>
                  <p className="text-sm" style={{ color: theme.textLight }}>Generate codes to invite beta testers</p>
                </div>
              ) : (
                Object.values(inviteCodes).map(invite => (
                  <div key={invite.code} className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <code className="px-3 py-1 rounded bg-gray-100 font-mono text-sm font-semibold" style={{ backgroundColor: theme.secondary }}>
                            {invite.code}
                          </code>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${invite.used ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                            {invite.used ? 'Used' : 'Available'}
                          </span>
                          {invite.email && (
                            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: theme.secondary, color: theme.text }}>
                              {invite.email}
                            </span>
                          )}
                        </div>
                        <div className="text-xs" style={{ color: theme.textLight }}>
                          Created: {formatMMDDYYYY(invite.created)}
                          {invite.used && invite.usedBy && (
                            <span> • Used by {invite.usedBy} on {formatMMDDYYYY(invite.usedAt)}</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => copyToClipboard(invite.code, invite.code)}
                          className="p-2 rounded hover:opacity-70"
                          style={{ backgroundColor: theme.accent, color: theme.accentText }}
                          title="Copy Code"
                        >
                          {copiedCode === invite.code ? <Check size={16} /> : <Copy size={16} />}
                        </button>
                        <button
                          onClick={() => deleteInviteCodeFirebase(invite.code)}
                          className="p-2 rounded hover:opacity-70"
                          style={{ backgroundColor: theme.error, color: theme.textOnPrimary }}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Email Whitelist Tab */}
      {activeTab === 'whitelist' && (
        <div className="space-y-6">
          <div className="rounded-lg border content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <div className="p-6 border-b" style={{ borderColor: theme.border }}>
              <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Add Emails to Whitelist</h2>
              <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                Enter email addresses (one per line, or separated by commas/semicolons)
              </p>
            </div>
            <div className="p-6 space-y-4">
              <textarea
                value={newEmails}
                onChange={(e) => setNewEmails(e.target.value)}
                placeholder="user@example.com&#10;another@example.com&#10;test@example.com"
                className="w-full p-3 rounded border h-32 resize-none"
                style={{ borderColor: theme.border, backgroundColor: theme.background }}
              />
              <button
                onClick={() => updateEmailWhitelistFirebase(newEmails)}
                className="px-6 py-2 rounded-md font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: theme.success, color: theme.textOnPrimary }}
                disabled={!newEmails.trim() || loading.emailWhitelist}
              >
                {loading.emailWhitelist ? (
                  <>
                    <Loader size={16} className="animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Add to Whitelist
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="rounded-lg border content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <div className="p-6 border-b" style={{ borderColor: theme.border }}>
              <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>
                Whitelisted Emails ({emailWhitelist.length})
              </h2>
            </div>
            
            <div className="divide-y" style={{ borderColor: theme.border }}>
              {emailWhitelist.length === 0 ? (
                <div className="p-8 text-center">
                  <Mail size={48} className="mx-auto mb-4 opacity-50" style={{ color: theme.textLight }} />
                  <p className="text-lg font-medium" style={{ color: theme.text }}>No emails whitelisted</p>
                  <p className="text-sm" style={{ color: theme.textLight }}>Add email addresses to allow beta access</p>
                </div>
              ) : (
                emailWhitelist.map(email => (
                  <div key={email} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail size={16} style={{ color: theme.textLight }} />
                      <span style={{ color: theme.text }}>{email}</span>
                    </div>
                    <button
                      onClick={() => removeFromWhitelistFirebase(email)}
                      className="p-1 rounded hover:opacity-70"
                      style={{ color: theme.error }}
                      title="Remove from whitelist"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
