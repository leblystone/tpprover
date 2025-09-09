import React, { useState, useEffect } from 'react';
import { Megaphone, Plus, Edit, Trash2, Save, X, Eye, Sparkles, Wrench, Users, Mail, Key, Copy, Check, Loader, MessageSquare, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
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
  getAnalytics,
  getAllFeedback,
  updateFeedback,
  deleteFeedback
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
  const [feedback, setFeedback] = useState([]);
  const [expandedFeedback, setExpandedFeedback] = useState(null);
  const [loading, setLoading] = useState({
    announcements: false,
    feedback: false,
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
    loadFeedback();
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

  const loadFeedback = async () => {
    setLoading(prev => ({ ...prev, feedback: true }));
    try {
      const feedbackData = await getAllFeedback();
      setFeedback(feedbackData);
    } catch (error) {
      console.error('Error loading feedback:', error);
    } finally {
      setLoading(prev => ({ ...prev, feedback: false }));
    }
  };

  const handleUpdateFeedback = async (feedbackId, updates) => {
    try {
      await updateFeedback(feedbackId, updates);
      await loadFeedback(); // Reload to get updated data
    } catch (error) {
      console.error('Error updating feedback:', error);
    }
  };

  const handleDeleteFeedback = async (feedbackId) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;
    
    try {
      await deleteFeedback(feedbackId);
      await loadFeedback(); // Reload to get updated data
    } catch (error) {
      console.error('Error deleting feedback:', error);
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

  const generateUniversalCode = (phase) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = `BETA-PHASE${phase}-`;
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

  const createUniversalCodeFirebase = async (phase) => {
    try {
      const existingCodes = await getInviteCodes();
      let code = generateUniversalCode(phase);
      
      // Ensure unique codes
      while (existingCodes[code]) {
        code = generateUniversalCode(phase);
      }
      
      const universalCode = {
        code,
        email: null,
        isUniversal: true,
        active: true,
        used: false, // Explicitly set universal codes as never used
        phase: phase,
        createdAt: new Date().toISOString(),
        description: `Universal code for Phase ${phase} beta testing`,
        usageCount: 0, // Track usage count for universal codes
        usedBy: [] // Track who used the code
      };
      
      await createInviteCodes([universalCode]);
      await loadInviteData(); // Reload to get updated data
      return code;
    } catch (error) {
      console.error('Error creating universal code:', error);
      return null;
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
        // Only include id for existing announcements, let Firebase generate ID for new ones
        ...(editingAnnouncement?.id && { id: editingAnnouncement.id })
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
        <div className="max-w-md w-full p-8 rounded-lg border shadow-sm content-card" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primary + '20' }}>
              <Megaphone size={32} style={{ color: theme.primary }} />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: theme.primaryDark }}>Admin Panel</h1>
            <p className="text-sm" style={{ color: theme.textLight }}>Enter admin password to continue</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                className="w-full p-4 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50"
                style={{ 
                  borderColor: theme.border, 
                  backgroundColor: theme.background,
                  focusRingColor: theme.primary
                }}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full p-4 rounded-lg font-semibold transition-colors hover:opacity-90"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              Access Admin Panel
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      {/* Modern Header */}
      <div className="bg-white border-b shadow-sm" style={{ borderColor: theme.border }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primary + '15' }}>
                <Wrench size={24} style={{ color: theme.primary }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: theme.primaryDark }}>Admin Dashboard</h1>
                <p className="text-sm" style={{ color: theme.textLight }}>Manage your TPP Rover platform</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {activeTab === 'announcements' && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                >
                  <Plus size={18} />
                  New Announcement
                </button>
              )}
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: theme.success + '15' }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.success }}></div>
                <span className="text-sm font-medium" style={{ color: theme.success }}>Admin Active</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
                style={{ backgroundColor: theme.error, color: theme.textOnPrimary }}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">

        {/* Modern Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {[
            { 
              id: 'announcements', 
              label: 'Announcements', 
              icon: Megaphone, 
              count: announcements.length,
              desc: 'Manage app-wide announcements',
              color: theme.primary 
            },
            { 
              id: 'invites', 
              label: 'Beta Invites', 
              icon: Key, 
              count: Object.keys(inviteCodes).length,
              desc: 'Generate & manage invite codes',
              color: '#8b5cf6' 
            },
            { 
              id: 'whitelist', 
              label: 'Email Whitelist', 
              icon: Mail, 
              count: emailWhitelist.length,
              desc: 'Manage approved email addresses',
              color: '#06b6d4' 
            },
            { 
              id: 'feedback', 
              label: 'Feedback Inbox', 
              icon: MessageSquare, 
              count: feedback.filter(f => f.status === 'new').length,
              desc: 'User feedback & bug reports',
              color: '#f59e0b' 
            },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-6 rounded-xl text-left transition-all duration-200 hover:scale-[1.02] ${
                  isActive ? 'ring-2 ring-opacity-50 shadow-lg' : 'hover:shadow-md'
                }`}
                style={{
                  backgroundColor: isActive ? tab.color + '10' : theme.cardBackground,
                  border: `1px solid ${theme.border}`,
                  ringColor: isActive ? tab.color : 'transparent'
                }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center`} style={{ backgroundColor: tab.color + '20' }}>
                    <Icon size={24} style={{ color: tab.color }} />
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold" style={{ color: tab.color }}>{tab.count}</div>
                    <div className="text-xs" style={{ color: theme.textLight }}>items</div>
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-1" style={{ color: theme.text }}>{tab.label}</h3>
                <p className="text-sm" style={{ color: theme.textLight }}>{tab.desc}</p>
                {isActive && (
                  <div className="mt-3 flex items-center gap-2 text-xs font-medium" style={{ color: tab.color }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tab.color }}></div>
                    Currently viewing
                  </div>
                )}
              </button>
            );
          })}
        </div>

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
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

      {/* Modern Announcements List */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold" style={{ color: theme.primaryDark }}>
            Recent Announcements
          </h2>
          <div className="text-sm" style={{ color: theme.textLight }}>
            {announcements.length} total
          </div>
        </div>
        
        {announcements.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border" style={{ borderColor: theme.border }}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primary + '20' }}>
              <Megaphone size={32} style={{ color: theme.primary }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>No announcements yet</h3>
            <p className="text-sm mb-6" style={{ color: theme.textLight }}>Create your first announcement to communicate with users</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 rounded-lg font-semibold flex items-center gap-2 mx-auto hover:opacity-90 transition-opacity"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              <Plus size={18} />
              Create Announcement
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {announcements.map(announcement => {
              const categoryInfo = categoryOptions.find(cat => cat.value === announcement.category);
              const CategoryIcon = categoryInfo?.icon || Megaphone;
              
              return (
                <div key={announcement.id} className="bg-white rounded-xl p-6 border hover:shadow-md transition-shadow" style={{ borderColor: theme.border }}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium" style={{ backgroundColor: categoryInfo?.color + '20', color: categoryInfo?.color }}>
                          <CategoryIcon size={12} />
                          {announcement.category}
                        </div>
                        <div className="text-xs px-2 py-1 rounded" style={{ backgroundColor: theme.border, color: theme.textLight }}>
                          {formatMMDDYYYY(announcement.date)}
                        </div>
                      </div>
                      
                      <h3 className="font-semibold text-lg mb-2" style={{ color: theme.text }}>
                        {announcement.title}
                      </h3>
                      <p className="text-sm leading-relaxed" style={{ color: theme.textLight }}>
                        {announcement.body}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(announcement)}
                        className="p-2 rounded-lg hover:scale-105 transition-transform"
                        style={{ backgroundColor: theme.primary + '15', color: theme.primary }}
                        title="Edit announcement"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(announcement.id)}
                        className="p-2 rounded-lg hover:scale-105 transition-transform"
                        style={{ backgroundColor: theme.error + '15', color: theme.error }}
                        title="Delete announcement"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
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
            <div className="p-6 space-y-6">
              {/* Universal Codes Section */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 mb-2">Universal Phase Codes</h3>
                <p className="text-sm text-blue-700 mb-4">
                  Create universal codes for different testing phases. All whitelisted users can use these codes for bulk invitations.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => createUniversalCodeFirebase(1)}
                    disabled={loading.inviteCodes}
                    className="px-4 py-2 rounded-md font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {loading.inviteCodes ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                    Phase 1 Code
                  </button>
                  <button
                    onClick={() => createUniversalCodeFirebase(2)}
                    disabled={loading.inviteCodes}
                    className="px-4 py-2 rounded-md font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {loading.inviteCodes ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                    Phase 2 Code
                  </button>
                  <button
                    onClick={() => createUniversalCodeFirebase(3)}
                    disabled={loading.inviteCodes}
                    className="px-4 py-2 rounded-md font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {loading.inviteCodes ? <Loader size={16} className="animate-spin" /> : <Plus size={16} />}
                    Phase 3 Code
                  </button>
                </div>
              </div>

              {/* Individual Codes Section */}
              <div>
                <h3 className="font-semibold mb-3" style={{ color: theme.text }}>Individual Codes (Optional)</h3>
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
                          {invite.isUniversal ? (
                            <>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                Universal - Phase {invite.phase}
                              </span>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${invite.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                {invite.active ? 'Active' : 'Inactive'}
                              </span>
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                                {invite.usageCount || 0} uses
                              </span>
                            </>
                          ) : (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${invite.used ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                              {invite.used ? 'Used' : 'Available'}
                            </span>
                          )}
                          {invite.email && (
                            <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: theme.secondary, color: theme.text }}>
                              {invite.email}
                            </span>
                          )}
                        </div>
                        <div className="text-xs" style={{ color: theme.textLight }}>
                          Created: {formatMMDDYYYY(invite.created)}
                          {invite.isUniversal && invite.usageCount > 0 && (
                            <span> • Used {invite.usageCount} times</span>
                          )}
                          {invite.isUniversal && invite.lastUsedAt && (
                            <span> • Last used: {formatMMDDYYYY(invite.lastUsedAt)}</span>
                          )}
                          {!invite.isUniversal && invite.used && invite.usedBy && (
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

      {/* Feedback Inbox Tab */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <div className="rounded-lg border content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <div className="p-6 border-b" style={{ borderColor: theme.border }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Feedback Inbox</h2>
                  <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                    User feedback, bug reports, and suggestions
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm" style={{ color: theme.textLight }}>
                    {feedback.filter(f => f.status === 'new').length} new, {feedback.length} total
                  </div>
                  <button
                    onClick={loadFeedback}
                    className="p-2 rounded hover:opacity-70"
                    style={{ color: theme.primary }}
                    title="Refresh"
                  >
                    <Loader size={16} className={loading.feedback ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
            </div>
            
            <div className="divide-y" style={{ borderColor: theme.border }}>
              {loading.feedback ? (
                <div className="p-8 text-center">
                  <Loader size={24} className="animate-spin mx-auto" style={{ color: theme.primary }} />
                  <p className="mt-2 text-sm" style={{ color: theme.textLight }}>Loading feedback...</p>
                </div>
              ) : feedback.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare size={48} className="mx-auto mb-3" style={{ color: theme.textLight }} />
                  <h3 className="font-semibold" style={{ color: theme.primaryDark }}>No feedback yet</h3>
                  <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                    User feedback will appear here when submitted
                  </p>
                </div>
              ) : (
                feedback.map((item) => {
                  const isExpanded = expandedFeedback === item.id;
                  const statusColors = {
                    'new': { bg: theme.warning + '15', color: theme.warning, icon: Clock },
                    'reviewed': { bg: theme.info + '15', color: theme.info, icon: Eye },
                    'resolved': { bg: theme.success + '15', color: theme.success, icon: CheckCircle }
                  };
                  const statusConfig = statusColors[item.status] || statusColors.new;
                  const StatusIcon = statusConfig.icon;

                  return (
                    <div key={item.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium" 
                                 style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}>
                              <StatusIcon size={12} />
                              {item.status}
                            </div>
                            <span className="text-sm font-medium" style={{ color: theme.text }}>
                              {item.userEmail}
                            </span>
                            <span className="text-xs" style={{ color: theme.textLight }}>
                              {item.submittedAt?.toDate ? 
                                formatMMDDYYYY(item.submittedAt.toDate()) : 
                                'Recent'
                              }
                            </span>
                          </div>
                          <p className={`text-sm ${isExpanded ? '' : 'line-clamp-2'}`} style={{ color: theme.text }}>
                            {item.message}
                          </p>
                          {item.url && (
                            <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                              From: {item.url}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setExpandedFeedback(isExpanded ? null : item.id)}
                            className="p-1 rounded hover:opacity-70"
                            style={{ color: theme.primary }}
                          >
                            {isExpanded ? <X size={16} /> : <Eye size={16} />}
                          </button>
                          
                          {item.status === 'new' && (
                            <button
                              onClick={() => handleUpdateFeedback(item.id, { status: 'reviewed' })}
                              className="p-1 rounded hover:opacity-70"
                              style={{ color: theme.info }}
                              title="Mark as reviewed"
                            >
                              <Eye size={16} />
                            </button>
                          )}
                          
                          {(item.status === 'new' || item.status === 'reviewed') && (
                            <button
                              onClick={() => handleUpdateFeedback(item.id, { status: 'resolved' })}
                              className="p-1 rounded hover:opacity-70"
                              style={{ color: theme.success }}
                              title="Mark as resolved"
                            >
                              <CheckCircle size={16} />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDeleteFeedback(item.id)}
                            className="p-1 rounded hover:opacity-70"
                            style={{ color: theme.error }}
                            title="Delete feedback"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: theme.border }}>
                          <div className="text-xs space-y-1" style={{ color: theme.textLight }}>
                            <p><strong>User Agent:</strong> {item.userAgent}</p>
                            <p><strong>Submitted:</strong> {item.timestamp || 'Unknown'}</p>
                            {item.userId && <p><strong>User ID:</strong> {item.userId}</p>}
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>
                              Admin Notes
                            </label>
                            <textarea
                              value={item.adminNotes || ''}
                              onChange={(e) => {
                                const updatedFeedback = feedback.map(f => 
                                  f.id === item.id ? { ...f, adminNotes: e.target.value } : f
                                );
                                setFeedback(updatedFeedback);
                              }}
                              onBlur={() => handleUpdateFeedback(item.id, { adminNotes: item.adminNotes })}
                              className="w-full p-2 border rounded text-sm"
                              style={{ borderColor: theme.border, backgroundColor: theme.background }}
                              rows="2"
                              placeholder="Add internal notes..."
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}