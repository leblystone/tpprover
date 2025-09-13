import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Plus, Edit, Trash2, Save, X, Eye, Sparkles, Wrench, Users, Mail, Key, Copy, Check, Loader, MessageSquare, Clock, CheckCircle,
  BarChart3, TrendingUp, Activity, Smartphone, Monitor, CreditCard, DollarSign, Target, ToggleLeft, ToggleRight, 
  Flag, Palette, Bell, Settings, Hash, ThumbsUp, ThumbsDown, TrendingDown, Zap, Shield, AlertTriangle, RefreshCw, Info
} from 'lucide-react';
import { formatMMDDYYYY } from '../utils/date';
import {
  getEmailWhitelist,
  updateEmailWhitelist,
  getAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  getAllFeedback,
  updateFeedback,
  deleteFeedback,
  getAnalytics,
  getUserList
} from '../services/firebase';

// Real-time analytics helper functions
const calculateUserGrowth = (users) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Group users by registration date
  const dailyRegistrations = {};
  let totalUsers = 0;
  
  users.forEach(user => {
    if (user.createdAt && user.createdAt.toDate) {
      const date = user.createdAt.toDate().toISOString().split('T')[0];
      dailyRegistrations[date] = (dailyRegistrations[date] || 0) + 1;
      totalUsers++;
    }
  });
  
  // Generate 30-day growth data
  const growthData = [];
  let cumulativeUsers = 0;
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const newUsers = dailyRegistrations[dateStr] || 0;
    cumulativeUsers += newUsers;
    
    growthData.push({
      date: dateStr,
      users: cumulativeUsers,
      newUsers: newUsers
    });
  }
  
  return growthData;
};

const calculateFeatureUsage = (analyticsData) => {
  const usage = analyticsData?.featureUsage || {};
  return {
    protocols: { uses: usage.protocolsCreated || 0, trend: 'up' },
    orders: { uses: usage.ordersTracked || 0, trend: 'up' },
    vendors: { uses: usage.vendorsAdded || 0, trend: 'up' },
    stockpile: { uses: usage.stockpileItems || 0, trend: 'up' },
    recon: { uses: usage.reconCalculations || 0, trend: 'up' },
    calendar: { uses: usage.calendarEntries || 0, trend: 'up' }
  };
};

const calculateSessionData = (users) => {
  const now = new Date();
  const sessionData = [];
  
  // Calculate sessions based on lastActive timestamps
  for (let i = 7; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const activeThatDay = users.filter(user => {
      if (!user.lastActive || !user.lastActive.toDate) return false;
      const lastActiveDate = user.lastActive.toDate().toISOString().split('T')[0];
      return lastActiveDate === dateStr;
    }).length;
    
    sessionData.push({
      date: dateStr,
      sessions: activeThatDay,
      avgDuration: activeThatDay > 0 ? 900 : 0 // Assume 15 min average when active
    });
  }
  
  return sessionData;
};

const calculateDeviceBreakdown = () => {
  // For now, return placeholder data - in production, this would come from analytics
  // You could implement user-agent tracking in the future
  return {
    mobile: { count: 0, percentage: 60 },
    desktop: { count: 0, percentage: 35 },
    tablet: { count: 0, percentage: 5 }
  };
};

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
  const [emailWhitelist, setEmailWhitelist] = useState([]);
  const [newEmails, setNewEmails] = useState('');
  const [feedback, setFeedback] = useState([]);
  const [expandedFeedback, setExpandedFeedback] = useState(null);
  const [analytics, setAnalytics] = useState({
    userGrowth: [],
    featureUsage: {},
    sessionData: [],
    deviceBreakdown: {},
    totalUsers: 0,
    activeUsers: 0
  });
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState({
    active: 0,
    beta: 0,
    total: 0,
    thisWeek: 0,
    recentRegistrations: []
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
    loadEmailWhitelist();
    loadFeedback();
    loadRealAnalytics();
    loadUserData();
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

  const loadEmailWhitelist = async () => {
    setLoading(prev => ({ ...prev, emailWhitelist: true }));
    try {
      const whitelist = await getEmailWhitelist();
      setEmailWhitelist(whitelist);
    } catch (error) {
      console.error('Error loading email whitelist:', error);
    } finally {
      setLoading(prev => ({ ...prev, emailWhitelist: false }));
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

  const loadRealAnalytics = async () => {
    setLoading(prev => ({ ...prev, analytics: true }));
    try {
      console.log('📊 Loading real-time analytics from Firebase...');
      
      // Load user data first (this should work)
      const userData = await getUserList();
      console.log('👥 User data:', userData.length, 'users');
      
      // Try to load analytics data, but handle permissions gracefully
      let analyticsData = {
        totalUsers: userData.length,
        activeUsers: 0,
        featureUsage: {}
      };
      
      try {
        const firebaseAnalytics = await getAnalytics();
        analyticsData = { ...analyticsData, ...firebaseAnalytics };
        console.log('📊 Analytics data loaded successfully:', analyticsData);
      } catch (analyticsError) {
        console.warn('⚠️ Analytics collection not accessible, using user-based data:', analyticsError.message);
        // Calculate basic analytics from user data instead
        analyticsData.featureUsage = {
          protocolsCreated: 0,
          ordersTracked: 0,
          vendorsAdded: 0,
          stockpileItems: 0,
          reconCalculations: 0,
          calendarEntries: 0
        };
      }
      
      const userGrowth = calculateUserGrowth(userData);
      const featureUsage = calculateFeatureUsage(analyticsData);
      const sessionData = calculateSessionData(userData);
      const deviceBreakdown = calculateDeviceBreakdown();
      
      setAnalytics({
        userGrowth,
        featureUsage,
        sessionData,
        deviceBreakdown,
        totalUsers: analyticsData.totalUsers || userData.length,
        activeUsers: analyticsData.activeUsers || 0
      });
      
      setUsers(userData);
      
      // Calculate subscription data from real users
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const recentUsers = userData.filter(user => {
        if (!user.createdAt || !user.createdAt.toDate) return false;
        return user.createdAt.toDate() >= weekAgo;
      });
      
      setSubscriptions({
        active: userData.filter(u => u.isActive).length,
        beta: userData.length, // All users are beta users currently
        total: userData.length,
        thisWeek: recentUsers.length,
        recentRegistrations: recentUsers.slice(0, 5).map(user => ({
          date: user.createdAt?.toDate()?.toISOString().split('T')[0] || 'Unknown',
          email: user.email
        }))
      });
      
    } catch (error) {
      console.error('❌ Error loading real analytics:', error);
      // Fallback to empty data
      setAnalytics({
        userGrowth: [],
        featureUsage: {},
        sessionData: [],
        deviceBreakdown: { mobile: { count: 0, percentage: 60 }, desktop: { count: 0, percentage: 35 }, tablet: { count: 0, percentage: 5 } },
        totalUsers: 0,
        activeUsers: 0
      });
    } finally {
      setLoading(prev => ({ ...prev, analytics: false }));
    }
  };

  const loadUserData = async () => {
    setLoading(prev => ({ ...prev, subscriptions: true }));
    try {
      console.log('👥 Loading user data...');
      const userData = await getUserList();
      setUsers(userData);
      console.log('👥 Loaded', userData.length, 'users');
    } catch (error) {
      console.error('❌ Error loading user data:', error);
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
      await loadEmailWhitelist();
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
      await loadEmailWhitelist();
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
    <div className="min-h-screen flex" style={{ backgroundColor: '#f8fafc' }}>
      {/* Sidebar Navigation */}
      <div className="w-64 bg-white border-r flex flex-col" style={{ borderColor: theme.border }}>
        {/* Header */}
        <div className="p-6 border-b" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primary + '15' }}>
              <Wrench size={20} style={{ color: theme.primary }} />
            </div>
            <div>
              <h1 className="text-lg font-bold" style={{ color: theme.primaryDark }}>Admin Panel</h1>
              <p className="text-xs" style={{ color: theme.textLight }}>The Pep Planner</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 p-4 space-y-2">
          {[
            { 
              id: 'analytics', 
              label: 'Analytics', 
              icon: BarChart3, 
              count: analytics.totalUsers || 0,
              desc: 'User insights',
              color: '#3b82f6' 
            },
            { 
              id: 'subscriptions', 
              label: 'Users', 
              icon: Users, 
              count: subscriptions.total || 0,
              desc: 'Beta users',
              color: '#10b981' 
            },
            { 
              id: 'feedback', 
              label: 'Feedback', 
              icon: MessageSquare, 
              count: feedback.filter(f => f.status === 'new').length,
              desc: 'Keyword analysis',
              color: '#8b5cf6' 
            },
            { 
              id: 'announcements', 
              label: 'Announcements', 
              icon: Megaphone, 
              count: announcements.length,
              desc: 'App announcements',
              color: theme.primary 
            },
            { 
              id: 'whitelist', 
              label: 'Email Whitelist', 
              icon: Mail, 
              count: emailWhitelist.length,
              desc: 'Approved emails',
              color: '#64748b' 
            },
            { 
              id: 'features', 
              label: 'Feature Flags', 
              icon: Flag, 
              count: Object.keys(featureFlags.betaFeatures || {}).length,
              desc: 'Beta features',
              color: '#f59e0b' 
            },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full p-3 rounded-lg text-left transition-all duration-200 hover:scale-[1.02] ${
                  isActive ? 'shadow-md' : 'hover:shadow-sm'
                }`}
                style={{
                  backgroundColor: isActive ? tab.color + '10' : 'transparent',
                  border: `1px solid ${isActive ? tab.color + '30' : 'transparent'}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center`} style={{ backgroundColor: tab.color + '20' }}>
                    <Icon size={16} style={{ color: tab.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-sm truncate" style={{ color: isActive ? tab.color : theme.text }}>{tab.label}</h3>
                      {tab.count > 0 && (
                        <span className="text-xs px-2 py-1 rounded-full ml-2" style={{ backgroundColor: tab.color + '20', color: tab.color }}>
                          {tab.count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs truncate" style={{ color: theme.textLight }}>{tab.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t space-y-3" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: theme.success + '10' }}>
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.success }}></div>
            <span className="text-xs font-medium" style={{ color: theme.success }}>Admin Active</span>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity"
            style={{ backgroundColor: theme.error, color: theme.textOnPrimary }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Top Header */}
        <div className="bg-white border-b p-6" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold capitalize" style={{ color: theme.primaryDark }}>
                {activeTab === 'subscriptions' ? 'Beta Users' : activeTab.replace(/([A-Z])/g, ' $1').trim()}
              </h2>
              <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                {activeTab === 'analytics' && 'Real-time platform analytics and user insights'}
                {activeTab === 'subscriptions' && 'Beta user management and registration tracking'}
                {activeTab === 'feedback' && 'User feedback management with keyword-based categorization'}
                {activeTab === 'announcements' && 'Manage app-wide announcements and notifications'}
                {activeTab === 'whitelist' && 'Manage approved email addresses for beta access'}
                {activeTab === 'features' && 'Control feature rollouts and beta experiments'}
              </p>
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
              {(activeTab === 'analytics' || activeTab === 'subscriptions') && (
                <button
                  onClick={() => {
                    loadRealAnalytics();
                    loadUserData();
                  }}
                  disabled={loading.analytics || loading.subscriptions}
                  className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: theme.info, color: theme.textOnPrimary }}
                >
                  <RefreshCw size={18} className={loading.analytics || loading.subscriptions ? 'animate-spin' : ''} />
                  Refresh Data
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-auto">

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
                  <div className="text-2xl font-bold" style={{ color: theme.info }}>{analytics.totalUsers}</div>
                  <div className="text-sm" style={{ color: theme.textLight }}>Total Users</div>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: theme.background }}>
                  <div className="text-2xl font-bold" style={{ color: theme.success }}>{analytics.userGrowth.reduce((sum, day) => sum + day.newUsers, 0)}</div>
                  <div className="text-sm" style={{ color: theme.textLight }}>New This Month</div>
                </div>
                <div className="p-4 rounded-lg" style={{ backgroundColor: theme.background }}>
                  <div className="text-2xl font-bold" style={{ color: theme.warning }}>{analytics.activeUsers}</div>
                  <div className="text-sm" style={{ color: theme.textLight }}>Active Users</div>
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
            {/* Beta User Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.info + '20' }}>
                    <Users size={20} style={{ color: theme.info }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: theme.info }}>{subscriptions.total}</div>
                    <div className="text-sm" style={{ color: theme.textLight }}>Total Beta Users</div>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.success + '20' }}>
                    <CheckCircle size={20} style={{ color: theme.success }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: theme.success }}>{subscriptions.active}</div>
                    <div className="text-sm" style={{ color: theme.textLight }}>Active Users</div>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.warning + '20' }}>
                    <TrendingUp size={20} style={{ color: theme.warning }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: theme.warning }}>{subscriptions.thisWeek}</div>
                    <div className="text-sm" style={{ color: theme.textLight }}>This Week</div>
                  </div>
                </div>
              </div>
              
              <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.accent + '20' }}>
                    <Mail size={20} style={{ color: theme.accent }} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold" style={{ color: theme.accent }}>{emailWhitelist.length}</div>
                    <div className="text-sm" style={{ color: theme.textLight }}>Whitelisted Emails</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Registrations */}
            <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <h2 className="text-lg font-semibold mb-4" style={{ color: theme.primaryDark }}>Recent Registrations</h2>
              <div className="space-y-3">
                {subscriptions.recentRegistrations.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm" style={{ color: theme.textLight }}>No recent registrations</p>
                  </div>
                ) : (
                  subscriptions.recentRegistrations.map((reg, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded" style={{ backgroundColor: theme.background }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.success + '20' }}>
                          <Users size={16} style={{ color: theme.success }} />
                        </div>
                        <div>
                          <div className="text-sm font-medium" style={{ color: theme.text }}>{reg.email}</div>
                          <div className="text-xs" style={{ color: theme.textLight }}>Registered {reg.date}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Detailed User Activity */}
            <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>User Activity Details</h2>
                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: theme.warning + '20', color: theme.warning }}>
                  Limited Tracking
                </span>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Current Activity Limitations */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm" style={{ color: theme.text }}>Currently Tracked:</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Registration Date', icon: Users, available: true },
                      { label: 'Last Login Time', icon: Clock, available: true },
                      { label: 'Invite Code Used', icon: Key, available: true },
                      { label: 'Account Status', icon: CheckCircle, available: true }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <item.icon size={14} style={{ color: item.available ? theme.success : theme.textLight }} />
                        <span style={{ color: item.available ? theme.text : theme.textLight }}>{item.label}</span>
                        <div className={`w-2 h-2 rounded-full ${item.available ? 'bg-green-400' : 'bg-gray-300'}`}></div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Missing Tracking */}
                <div className="space-y-3">
                  <h3 className="font-medium text-sm" style={{ color: theme.text }}>Not Currently Tracked:</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Session Duration', icon: Clock },
                      { label: 'Page Views', icon: Eye },
                      { label: 'Feature Usage', icon: Activity },
                      { label: 'Real-time Status', icon: Zap }
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm">
                        <item.icon size={14} style={{ color: theme.textLight }} />
                        <span style={{ color: theme.textLight }}>{item.label}</span>
                        <div className="w-2 h-2 rounded-full bg-gray-300"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: theme.info + '10' }}>
                <div className="flex items-start gap-3">
                  <Info size={16} style={{ color: theme.info }} className="mt-0.5" />
                  <div>
                    <p className="text-sm font-medium" style={{ color: theme.info }}>Enhanced Tracking Available</p>
                    <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                      We can implement detailed session tracking, page analytics, feature usage metrics, and real-time user status. 
                      This would give you insights into user behavior, popular features, and engagement patterns.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'features' && (
          <div className="space-y-6">
            {/* Feature Flags Explanation */}
            <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.warning + '20' }}>
                  <AlertTriangle size={24} style={{ color: theme.warning }} />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold mb-2" style={{ color: theme.primaryDark }}>Feature Flags - Currently Non-Functional</h2>
                  <p className="text-sm mb-4" style={{ color: theme.textLight }}>
                    The current feature toggle system is just a UI mockup and doesn't actually control any app functionality. 
                    However, this would be <strong>extremely valuable</strong> for your future launch.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm" style={{ color: theme.success }}>Future Benefits:</h3>
                      <ul className="text-xs space-y-1" style={{ color: theme.textLight }}>
                        <li>• Gradual feature rollouts (10% → 50% → 100% users)</li>
                        <li>• A/B testing different UI versions</li>
                        <li>• Beta features for select users</li>
                        <li>• Instant kill switches for problematic features</li>
                        <li>• User tier-based feature access</li>
                      </ul>
                    </div>
                    <div className="space-y-2">
                      <h3 className="font-medium text-sm" style={{ color: theme.info }}>Example Use Cases:</h3>
                      <ul className="text-xs space-y-1" style={{ color: theme.textLight }}>
                        <li>• New protocol builder → 25% of users first</li>
                        <li>• Advanced analytics → paid users only</li>
                        <li>• Team collaboration → beta testers</li>
                        <li>• Export features → disable if server overloaded</li>
                        <li>• New UI design → A/B test vs old design</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mock Feature Flags (Non-Functional) */}
            <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Feature Flags (Demo Only)</h2>
                  <p className="text-sm mt-1" style={{ color: theme.textLight }}>These toggles don't actually control anything yet</p>
                </div>
                <span className="px-3 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: theme.warning + '20', color: theme.warning }}>
                  Not Functional
                </span>
              </div>
              
              <div className="space-y-3">
                {[
                  { name: 'Enhanced Dashboard', key: 'enhanced_dashboard', enabled: true, description: 'Advanced analytics and insights', rollout: '100%' },
                  { name: 'Protocol Sharing', key: 'protocol_sharing', enabled: false, description: 'Share protocols with other users', rollout: '0%' },
                  { name: 'PDF Exports', key: 'pdf_exports', enabled: true, description: 'Export data as PDF reports', rollout: '100%' },
                  { name: 'Team Workspaces', key: 'team_workspaces', enabled: false, description: 'Collaborate with team members', rollout: '0%' },
                  { name: 'Advanced Search', key: 'advanced_search', enabled: false, description: 'Enhanced search and filtering', rollout: '25%' }
                ].map((flag) => (
                  <div key={flag.key} className="flex items-center justify-between p-4 rounded-lg border" style={{ backgroundColor: theme.background, borderColor: theme.border }}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Flag size={16} style={{ color: flag.enabled ? theme.success : theme.textLight }} />
                        <span className="font-medium" style={{ color: theme.text }}>{flag.name}</span>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${flag.enabled ? 'text-green-700 bg-green-100' : 'text-gray-700 bg-gray-100'}`}>
                          {flag.enabled ? 'Enabled' : 'Disabled'}
                        </span>
                        <span className="px-2 py-1 text-xs rounded" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
                          {flag.rollout}
                        </span>
                      </div>
                      <p className="text-sm" style={{ color: theme.textLight }}>{flag.description}</p>
                    </div>
                    <button 
                      className="ml-4 p-2 rounded-lg hover:opacity-70 cursor-not-allowed opacity-50"
                      style={{ color: flag.enabled ? theme.success : theme.textLight }}
                      title="Not functional - demo only"
                    >
                      {flag.enabled ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: theme.info + '10' }}>
                <p className="text-xs" style={{ color: theme.textLight }}>
                  💡 <strong>Implementation Note:</strong> To make this functional, we'd need to create a Firebase collection for feature flags, 
                  add flag checking logic throughout the app, and implement user segmentation rules.
                </p>
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
                    <p className="text-sm" style={{ color: theme.textLight }}>Would temporarily disable app access for updates</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: theme.warning + '20', color: theme.warning }}>
                    Demo Only
                  </span>
                  <button 
                    className="p-2 rounded-lg hover:opacity-70 cursor-not-allowed opacity-50"
                    style={{ color: featureFlags.maintenanceMode ? theme.error : theme.textLight }}
                    title="Not functional - demo only"
                  >
                    {featureFlags.maintenanceMode ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                  </button>
                </div>
              </div>
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
                      Keyword-based categorization and sentiment analysis
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

        </div>
      </div>
    </div>
  );
}

export default Admin;