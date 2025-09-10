import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Plus, Edit, Trash2, Save, X, Eye, Sparkles, Wrench, Users, Mail, Key, Copy, Check, Loader, MessageSquare, Clock, CheckCircle,
  BarChart3, TrendingUp, Activity, Smartphone, Monitor, CreditCard, DollarSign, Target, ToggleLeft, ToggleRight, 
  Flag, Palette, Bell, Settings, Hash, ThumbsUp, ThumbsDown, TrendingDown, Zap, Shield, AlertTriangle
} from 'lucide-react';
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
  getAllFeedback,
  updateFeedback,
  deleteFeedback
} from '../services/firebase';

// Mock data generation functions
const generateMockUserGrowth = () => {
  const data = [];
  const now = new Date();
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      users: Math.floor(Math.random() * 10) + (30 - i) * 2,
      newUsers: Math.floor(Math.random() * 5) + 1
    });
  }
  return data;
};

const generateMockFeatureUsage = () => ({
  protocols: { uses: 245, trend: 'up' },
  calendar: { uses: 189, trend: 'up' },
  recon: { uses: 156, trend: 'down' },
  orders: { uses: 134, trend: 'up' },
  stockpile: { uses: 98, trend: 'up' },
  feedback: { uses: 67, trend: 'up' }
});

const generateMockSessionData = () => {
  const data = [];
  for (let i = 7; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      avgDuration: Math.floor(Math.random() * 300) + 600, // 10-15 minutes
      sessions: Math.floor(Math.random() * 20) + 30
    });
  }
  return data;
};

const generateMockDeviceBreakdown = () => ({
  mobile: { count: 156, percentage: 62 },
  desktop: { count: 87, percentage: 35 },
  tablet: { count: 8, percentage: 3 }
});

const generateMockSubscriptionData = () => ({
  active: 23,
  trial: 45,
  cancelled: 3,
  revenue: 2847.50,
  conversions: [
    { date: '2024-09-10', count: 5, revenue: 149.50 },
    { date: '2024-09-11', count: 8, revenue: 239.20 },
    { date: '2024-09-12', count: 3, revenue: 89.70 }
  ]
});

const analyzeFeedback = (feedbackList) => {
  const categories = {};
  const sentiment = { positive: 0, negative: 0, neutral: 0 };
  
  feedbackList.forEach(item => {
    // Simple categorization based on keywords
    const message = item.message.toLowerCase();
    if (message.includes('bug') || message.includes('error') || message.includes('broken')) {
      categories.bugs = (categories.bugs || 0) + 1;
    } else if (message.includes('feature') || message.includes('add') || message.includes('want')) {
      categories.features = (categories.features || 0) + 1;
    } else if (message.includes('love') || message.includes('great') || message.includes('awesome')) {
      categories.praise = (categories.praise || 0) + 1;
      sentiment.positive++;
    } else if (message.includes('hate') || message.includes('bad') || message.includes('terrible')) {
      sentiment.negative++;
    } else {
      sentiment.neutral++;
    }
  });
  
  return {
    categories,
    sentiment,
    trends: [
      { week: 'This week', feedback: feedbackList.length, change: '+12%' },
      { week: 'Last week', feedback: Math.max(0, feedbackList.length - 5), change: '+8%' }
    ],
    autoResponses: []
  };
};

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

function Admin() {
  const theme = adminTheme;
  const [announcements, setAnnouncements] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics');
  const [inviteCodes, setInviteCodes] = useState({});
  const [emailWhitelist, setEmailWhitelist] = useState([]);
  const [newEmails, setNewEmails] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [feedback, setFeedback] = useState([]);
  const [expandedFeedback, setExpandedFeedback] = useState(null);
  const [analytics, setAnalytics] = useState({
    userGrowth: [],
    featureUsage: {},
    sessionData: [],
    deviceBreakdown: {}
  });
  const [subscriptions, setSubscriptions] = useState({
    active: 0,
    trial: 0,
    cancelled: 0,
    revenue: 0,
    conversions: []
  });
  const [featureFlags, setFeatureFlags] = useState({
    betaFeatures: {},
    uiExperiments: {},
    emailSettings: {},
    maintenanceMode: false
  });
  const [feedbackAnalysis, setFeedbackAnalysis] = useState({
    categories: {},
    sentiment: {},
    trends: [],
    autoResponses: []
  });
  const [loading, setLoading] = useState({
    announcements: false,
    feedback: false,
    inviteCodes: false,
    emailWhitelist: false,
    submitting: false,
    analytics: false,
    subscriptions: false
  });
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    category: 'General',
    date: new Date().toISOString().slice(0, 10)
  });

  // Simple admin authentication
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
    loadAnalytics();
    loadSubscriptionData();
    loadFeatureFlags();
    loadFeedbackAnalysis();
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
      await loadAnnouncements();
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
      console.log('📥 Loading feedback from Firebase...');
      const feedbackData = await getAllFeedback();
      console.log('📥 Loaded feedback:', feedbackData.length, 'items');
      setFeedback(feedbackData);
    } catch (error) {
      console.error('❌ Error loading feedback:', error);
    } finally {
      setLoading(prev => ({ ...prev, feedback: false }));
    }
  };

  const loadAnalytics = async () => {
    setLoading(prev => ({ ...prev, analytics: true }));
    try {
      // Generate mock analytics data - in production, this would come from Firebase Analytics
      const userGrowth = generateMockUserGrowth();
      const featureUsage = generateMockFeatureUsage();
      const sessionData = generateMockSessionData();
      const deviceBreakdown = generateMockDeviceBreakdown();
      
      setAnalytics({
        userGrowth,
        featureUsage,
        sessionData,
        deviceBreakdown
      });
    } catch (error) {
      console.error('❌ Error loading analytics:', error);
    } finally {
      setLoading(prev => ({ ...prev, analytics: false }));
    }
  };

  const loadSubscriptionData = async () => {
    setLoading(prev => ({ ...prev, subscriptions: true }));
    try {
      // Generate mock subscription data - in production, this would come from Stripe/Firebase
      const mockSubscriptions = generateMockSubscriptionData();
      setSubscriptions(mockSubscriptions);
    } catch (error) {
      console.error('❌ Error loading subscription data:', error);
    } finally {
      setLoading(prev => ({ ...prev, subscriptions: false }));
    }
  };

  const loadFeatureFlags = async () => {
    try {
      // Load feature flags from localStorage for now - in production, from Firebase
      const flags = JSON.parse(localStorage.getItem('tpp_admin_feature_flags') || '{}');
      setFeatureFlags({
        betaFeatures: flags.betaFeatures || {},
        uiExperiments: flags.uiExperiments || {},
        emailSettings: flags.emailSettings || {},
        maintenanceMode: flags.maintenanceMode || false
      });
    } catch (error) {
      console.error('❌ Error loading feature flags:', error);
    }
  };

  const loadFeedbackAnalysis = async () => {
    try {
      // Analyze existing feedback for insights
      const analysis = analyzeFeedback(feedback);
      setFeedbackAnalysis(analysis);
    } catch (error) {
      console.error('❌ Error analyzing feedback:', error);
    }
  };

  const handleUpdateFeedback = async (feedbackId, updates) => {
    try {
      await updateFeedback(feedbackId, updates);
      await loadFeedback();
    } catch (error) {
      console.error('Error updating feedback:', error);
    }
  };

  const handleDeleteFeedback = async (feedbackId) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;
    
    try {
      await deleteFeedback(feedbackId);
      await loadFeedback();
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
        while (existingCodes[code]) {
          code = generateInviteCode();
        }
        
        createdCodes.push({
          code,
          email: emails[i] || null,
        });
      }
      
      await createInviteCodes(createdCodes);
      await loadInviteData();
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
      
      while (existingCodes[code]) {
        code = generateUniversalCode(phase);
      }
      
      const universalCode = {
        code,
        email: null,
        isUniversal: true,
        active: true,
        used: false,
        phase: phase,
        createdAt: new Date().toISOString(),
        description: `Universal code for Phase ${phase} beta testing`,
        usageCount: 0,
        usedBy: []
      };
      
      await createInviteCodes([universalCode]);
      await loadInviteData();
      return code;
    } catch (error) {
      console.error('Error creating universal code:', error);
      return null;
    }
  };

  const deleteInviteCodeFirebase = async (code) => {
    try {
      await deleteInviteCode(code);
      await loadInviteData();
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
      await loadInviteData();
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
      await loadInviteData();
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
      await loadAnnouncements();
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
      <div className="bg-white border-b shadow-sm" style={{ borderColor: theme.border }}>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primary + '15' }}>
                <Wrench size={24} style={{ color: theme.primary }} />
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: theme.primaryDark }}>Admin Dashboard</h1>
                <p className="text-sm" style={{ color: theme.textLight }}>Manage your The Pep Planner platform</p>
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

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            { 
              id: 'analytics', 
              label: 'Analytics', 
              icon: BarChart3, 
              count: analytics.userGrowth.length > 0 ? analytics.userGrowth[analytics.userGrowth.length - 1]?.users || 0 : 0,
              desc: 'User growth & feature usage',
              color: '#3b82f6' 
            },
            { 
              id: 'subscriptions', 
              label: 'Subscriptions', 
              icon: CreditCard, 
              count: subscriptions.active + subscriptions.trial,
              desc: 'Revenue & conversion tracking',
              color: '#10b981' 
            },
            { 
              id: 'features', 
              label: 'Feature Toggles', 
              icon: Flag, 
              count: Object.keys(featureFlags.betaFeatures || {}).length,
              desc: 'Beta flags & experiments',
              color: '#f59e0b' 
            },
            { 
              id: 'feedback', 
              label: 'Smart Feedback', 
              icon: MessageSquare, 
              count: feedback.filter(f => f.status === 'new').length,
              desc: 'AI-powered feedback insights',
              color: '#8b5cf6' 
            },
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
              color: '#06b6d4' 
            },
            { 
              id: 'whitelist', 
              label: 'Email Whitelist', 
              icon: Mail, 
              count: emailWhitelist.length,
              desc: 'Manage approved email addresses',
              color: '#64748b' 
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

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* User Growth Chart */}
            <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>User Growth</h2>
                  <p className="text-sm mt-1" style={{ color: theme.textLight }}>Daily user registration and activity</p>
                </div>
                <div className="flex items-center gap-2 text-sm" style={{ color: theme.success }}>
                  <TrendingUp size={16} />
                  +23% this week
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="h-64 flex items-end justify-between gap-1 p-4 rounded-lg" style={{ backgroundColor: theme.background }}>
                    {analytics.userGrowth.slice(-14).map((day, index) => (
                      <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
                        <div 
                          className="bg-blue-500 rounded-t w-full transition-all hover:bg-blue-600"
                          style={{ height: `${(day.users / Math.max(...analytics.userGrowth.map(d => d.users))) * 200}px`, minHeight: '4px' }}
                          title={`${day.date}: ${day.users} users`}
                        />
                        <span className="text-xs" style={{ color: theme.textLight }}>
                          {new Date(day.date).getDate()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 rounded-lg" style={{ backgroundColor: theme.background }}>
                    <div className="text-2xl font-bold" style={{ color: theme.info }}>{analytics.userGrowth[analytics.userGrowth.length - 1]?.users || 0}</div>
                    <div className="text-sm" style={{ color: theme.textLight }}>Total Users</div>
                  </div>
                  <div className="p-4 rounded-lg" style={{ backgroundColor: theme.background }}>
                    <div className="text-2xl font-bold" style={{ color: theme.success }}>{analytics.userGrowth.reduce((sum, day) => sum + day.newUsers, 0)}</div>
                    <div className="text-sm" style={{ color: theme.textLight }}>New This Month</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Usage */}
            <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: theme.primaryDark }}>Feature Usage</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(analytics.featureUsage).map(([feature, data]) => (
                  <div key={feature} className="p-4 rounded-lg" style={{ backgroundColor: theme.background }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize" style={{ color: theme.text }}>{feature}</span>
                      {data.trend === 'up' ? (
                        <TrendingUp size={16} style={{ color: theme.success }} />
                      ) : (
                        <TrendingDown size={16} style={{ color: theme.error }} />
                      )}
                    </div>
                    <div className="text-2xl font-bold" style={{ color: theme.primaryDark }}>{data.uses}</div>
                    <div className="text-xs" style={{ color: theme.textLight }}>total uses</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Session Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: theme.primaryDark }}>Session Duration</h2>
                <div className="space-y-3">
                  {analytics.sessionData.slice(-5).map((session) => (
                    <div key={session.date} className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: theme.background }}>
                      <span className="text-sm" style={{ color: theme.text }}>{new Date(session.date).toLocaleDateString()}</span>
                      <div className="text-right">
                        <div className="text-sm font-medium" style={{ color: theme.primaryDark }}>
                          {Math.floor(session.avgDuration / 60)}m {session.avgDuration % 60}s
                        </div>
                        <div className="text-xs" style={{ color: theme.textLight }}>{session.sessions} sessions</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: theme.primaryDark }}>Device Breakdown</h2>
                <div className="space-y-4">
                  {Object.entries(analytics.deviceBreakdown).map(([device, data]) => (
                    <div key={device} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {device === 'mobile' && <Smartphone size={16} style={{ color: theme.info }} />}
                          {device === 'desktop' && <Monitor size={16} style={{ color: theme.success }} />}
                          {device === 'tablet' && <Smartphone size={16} style={{ color: theme.warning }} />}
                          <span className="text-sm font-medium capitalize" style={{ color: theme.text }}>{device}</span>
                        </div>
                        <span className="text-sm" style={{ color: theme.textLight }}>{data.count} ({data.percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full bg-blue-500" 
                          style={{ width: `${data.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="space-y-6">
            {/* Revenue Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.success + '20' }}>
                    <DollarSign size={20} style={{ color: theme.success }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: theme.success }}>${subscriptions.revenue}</div>
                    <div className="text-sm" style={{ color: theme.textLight }}>Total Revenue</div>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.info + '20' }}>
                    <Users size={20} style={{ color: theme.info }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: theme.info }}>{subscriptions.active}</div>
                    <div className="text-sm" style={{ color: theme.textLight }}>Active Subs</div>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.warning + '20' }}>
                    <Clock size={20} style={{ color: theme.warning }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: theme.warning }}>{subscriptions.trial}</div>
                    <div className="text-sm" style={{ color: theme.textLight }}>Trial Users</div>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.error + '20' }}>
                    <X size={20} style={{ color: theme.error }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: theme.error }}>{subscriptions.cancelled}</div>
                    <div className="text-sm" style={{ color: theme.textLight }}>Cancelled</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Conversion Tracking */}
            <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: theme.primaryDark }}>Recent Conversions</h2>
              <div className="space-y-3">
                {subscriptions.conversions.map((conversion, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: theme.background }}>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.success + '20' }}>
                        <Target size={16} style={{ color: theme.success }} />
                      </div>
                      <div>
                        <div className="text-sm font-medium" style={{ color: theme.text }}>{conversion.date}</div>
                        <div className="text-xs" style={{ color: theme.textLight }}>{conversion.count} conversions</div>
                      </div>
                    </div>
                    <div className="text-sm font-medium" style={{ color: theme.success }}>${conversion.revenue}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'features' && (
          <div className="space-y-6">
            {/* Feature Flags */}
            <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Beta Feature Flags</h2>
                  <p className="text-sm mt-1" style={{ color: theme.textLight }}>Control feature rollouts and experiments</p>
                </div>
                <button className="px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-90" style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}>
                  <Plus size={16} className="mr-2" />
                  Add Flag
                </button>
              </div>
              
              <div className="space-y-3">
                {[
                  { name: 'Advanced Analytics', key: 'advanced_analytics', enabled: true, description: 'Enhanced analytics dashboard' },
                  { name: 'AI Recommendations', key: 'ai_recommendations', enabled: false, description: 'AI-powered protocol suggestions' },
                  { name: 'Team Collaboration', key: 'team_collaboration', enabled: false, description: 'Share protocols with team members' },
                  { name: 'Export to PDF', key: 'pdf_export', enabled: true, description: 'Export reports as PDF files' }
                ].map((flag) => (
                  <div key={flag.key} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: theme.background }}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <Flag size={16} style={{ color: flag.enabled ? theme.success : theme.textLight }} />
                        <span className="font-medium" style={{ color: theme.text }}>{flag.name}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${flag.enabled ? 'text-green-700 bg-green-100' : 'text-gray-700 bg-gray-100'}`}>
                          {flag.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: theme.textLight }}>{flag.description}</p>
                    </div>
                    <button 
                      className="ml-4 p-2 rounded-lg hover:opacity-70"
                      style={{ color: flag.enabled ? theme.success : theme.textLight }}
                    >
                      {flag.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Maintenance Mode */}
            <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.error + '20' }}>
                    <Shield size={24} style={{ color: theme.error }} />
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: theme.primaryDark }}>Maintenance Mode</h3>
                    <p className="text-sm" style={{ color: theme.textLight }}>Temporarily disable app access for updates</p>
                  </div>
                </div>
                <button 
                  className="p-2 rounded-lg hover:opacity-70"
                  style={{ color: featureFlags.maintenanceMode ? theme.error : theme.textLight }}
                >
                  {featureFlags.maintenanceMode ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                </button>
              </div>
              {featureFlags.maintenanceMode && (
                <div className="mt-4 p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: theme.error + '10' }}>
                  <AlertTriangle size={16} style={{ color: theme.error }} />
                  <span className="text-sm" style={{ color: theme.error }}>Maintenance mode is currently ACTIVE</span>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'announcements' && (
          <div className="space-y-6">
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
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="space-y-6">
            {/* Feedback Analytics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.info + '20' }}>
                    <MessageSquare size={20} style={{ color: theme.info }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: theme.info }}>{feedback.length}</div>
                    <div className="text-sm" style={{ color: theme.textLight }}>Total Feedback</div>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.success + '20' }}>
                    <ThumbsUp size={20} style={{ color: theme.success }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: theme.success }}>{feedbackAnalysis.sentiment.positive || 0}</div>
                    <div className="text-sm" style={{ color: theme.textLight }}>Positive</div>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.error + '20' }}>
                    <ThumbsDown size={20} style={{ color: theme.error }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: theme.error }}>{feedbackAnalysis.sentiment.negative || 0}</div>
                    <div className="text-sm" style={{ color: theme.textLight }}>Negative</div>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.warning + '20' }}>
                    <Hash size={20} style={{ color: theme.warning }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: theme.warning }}>{Object.keys(feedbackAnalysis.categories).length}</div>
                    <div className="text-sm" style={{ color: theme.textLight }}>Categories</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feedback Categories & Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: theme.primaryDark }}>Feedback Categories</h2>
                <div className="space-y-3">
                  {Object.entries(feedbackAnalysis.categories).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: theme.background }}>
                      <div className="flex items-center gap-2">
                        {category === 'bugs' && <AlertTriangle size={16} style={{ color: theme.error }} />}
                        {category === 'features' && <Sparkles size={16} style={{ color: theme.info }} />}
                        {category === 'praise' && <ThumbsUp size={16} style={{ color: theme.success }} />}
                        <span className="text-sm font-medium capitalize" style={{ color: theme.text }}>{category}</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: theme.primaryDark }}>{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <h2 className="text-lg font-semibold mb-4" style={{ color: theme.primaryDark }}>Feedback Trends</h2>
                <div className="space-y-3">
                  {feedbackAnalysis.trends.map((trend, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: theme.background }}>
                      <div>
                        <div className="text-sm font-medium" style={{ color: theme.text }}>{trend.week}</div>
                        <div className="text-xs" style={{ color: theme.textLight }}>{trend.feedback} feedback items</div>
                      </div>
                      <div className="flex items-center gap-1 text-sm font-medium" style={{ color: theme.success }}>
                        <TrendingUp size={14} />
                        {trend.change}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-lg border content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="p-6 border-b" style={{ borderColor: theme.border }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Smart Feedback Inbox</h2>
                    <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                      AI-powered categorization and sentiment analysis
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

        {activeTab === 'invites' && (
          <div className="space-y-6">
            <div className="rounded-lg border content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="p-6 border-b" style={{ borderColor: theme.border }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Beta Invite Codes</h2>
                    <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                      Generate and manage beta invitation codes
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => createInviteCodesFirebase(5)}
                      className="px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-90"
                      style={{ backgroundColor: theme.info, color: theme.textOnPrimary }}
                    >
                      Generate 5 Codes
                    </button>
                    <button
                      onClick={() => createUniversalCodeFirebase(1)}
                      className="px-4 py-2 rounded-lg font-semibold text-sm hover:opacity-90"
                      style={{ backgroundColor: theme.accent, color: theme.accentText }}
                    >
                      Universal Code
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                {loading.inviteCodes ? (
                  <div className="text-center py-8">
                    <Loader size={24} className="animate-spin mx-auto" style={{ color: theme.primary }} />
                    <p className="mt-2 text-sm" style={{ color: theme.textLight }}>Loading invite codes...</p>
                  </div>
                ) : Object.keys(inviteCodes).length === 0 ? (
                  <div className="text-center py-8">
                    <Key size={48} className="mx-auto mb-3" style={{ color: theme.textLight }} />
                    <h3 className="font-semibold" style={{ color: theme.primaryDark }}>No invite codes yet</h3>
                    <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                      Generate codes to invite beta testers
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(inviteCodes).map(([code, data]) => (
                      <div key={code} className="flex items-center justify-between p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <code className="font-mono text-sm px-2 py-1 rounded" style={{ backgroundColor: theme.primary + '15', color: theme.primaryDark }}>
                              {code}
                            </code>
                            {data.isUniversal && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: theme.accent + '20', color: theme.accent }}>
                                Universal
                              </span>
                            )}
                            {data.used && !data.isUniversal && (
                              <span className="px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: theme.success + '20', color: theme.success }}>
                                Used
                              </span>
                            )}
                          </div>
                          {data.email && (
                            <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                              Email: {data.email}
                            </p>
                          )}
                          {data.isUniversal && (
                            <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                              Uses: {data.usageCount || 0} • Phase {data.phase}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(code, code)}
                            className="p-2 rounded hover:opacity-70"
                            style={{ color: theme.primary }}
                            title="Copy code"
                          >
                            {copiedCode === code ? <Check size={16} /> : <Copy size={16} />}
                          </button>
                          <button
                            onClick={() => deleteInviteCodeFirebase(code)}
                            className="p-2 rounded hover:opacity-70"
                            style={{ color: theme.error }}
                            title="Delete code"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'whitelist' && (
          <div className="space-y-6">
            <div className="rounded-lg border content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="p-6 border-b" style={{ borderColor: theme.border }}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Email Whitelist</h2>
                    <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                      Manage approved email addresses for beta access
                    </p>
                  </div>
                  <div className="text-sm" style={{ color: theme.textLight }}>
                    {emailWhitelist.length} approved emails
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                    Add Email Addresses
                  </label>
                  <textarea
                    value={newEmails}
                    onChange={(e) => setNewEmails(e.target.value)}
                    placeholder="Enter email addresses (one per line, or comma-separated)"
                    className="w-full p-3 border rounded-lg h-32 resize-none"
                    style={{ borderColor: theme.border, backgroundColor: theme.background }}
                  />
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      onClick={() => updateEmailWhitelistFirebase(newEmails)}
                      disabled={!newEmails.trim() || loading.emailWhitelist}
                      className="px-4 py-2 rounded-lg font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
                      style={{ backgroundColor: theme.success, color: theme.textOnPrimary }}
                    >
                      {loading.emailWhitelist ? (
                        <>
                          <Loader size={16} className="animate-spin mr-2" />
                          Adding...
                        </>
                      ) : (
                        'Add to Whitelist'
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium mb-3" style={{ color: theme.text }}>
                    Approved Emails ({emailWhitelist.length})
                  </h3>
                  {emailWhitelist.length === 0 ? (
                    <div className="text-center py-8">
                      <Mail size={48} className="mx-auto mb-3" style={{ color: theme.textLight }} />
                      <h3 className="font-semibold" style={{ color: theme.primaryDark }}>No emails whitelisted</h3>
                      <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                        Add email addresses to allow beta access
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {emailWhitelist.map((email, index) => (
                        <div key={index} className="flex items-center justify-between p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                          <span className="text-sm font-mono" style={{ color: theme.text }}>
                            {email}
                          </span>
                          <button
                            onClick={() => removeFromWhitelistFirebase(email)}
                            className="p-1 rounded hover:opacity-70"
                            style={{ color: theme.error }}
                            title="Remove from whitelist"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center py-8">
          <p className="text-sm" style={{ color: theme.textLight }}>
            Admin Panel - The Pep Planner Management System
          </p>
        </div>
      </div>
    </div>
  );
}

export default Admin;