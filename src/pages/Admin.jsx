import React, { useState, useEffect } from 'react';
import { 
  Plus, Edit, Trash2, Save, X, Eye, Sparkles, Wrench, Users, Mail, Key, Copy, Check, Loader, MessageSquare, Clock, CheckCircle,
  BarChart3, TrendingUp, Activity, Smartphone, Monitor, DollarSign, Target, ToggleLeft, ToggleRight, 
  Palette, Bell, Settings, Hash, ThumbsUp, ThumbsDown, TrendingDown, Shield, AlertTriangle, RefreshCw, Info,
  UserPlus, Briefcase, BookOpen, Star, Award, Send, Coffee, Wine, Book, ChevronDown, ChevronRight, Layout, MessageCircle,
  LayoutDashboard, Crown, Gift, Layers, MessagesSquare, Lightbulb, BellRing, MailOpen, Sliders, FileCheck, Search, ArrowLeft, Siren, LogOut, Calendar
} from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';
import { formatMMDDYYYY } from '../utils/date';
import { Zap } from '../icons/lucide-safe';
import { generateId } from '../utils/string';
import {
  getEmailWhitelist,
  updateEmailWhitelist,
  getAllFeedback,
  updateFeedback,
  deleteFeedback,
  respondToFeedback,
  getAnalytics,
  getUserList,
  getAdminUserProfile,
  getAllLifetimeUsers,
  grantLifetimeAccessFirestore,
  revokeLifetimeAccess,
  cancelLifetimePreGrant,
  loginUser,
  extendTrialForUser,
  getAllTickets,
  getTicketWithMessages,
  addTicketMessage,
  updateTicketStatus,
  subscribeToTicketMessages,
  createAdminMessage
} from '../services/firebase';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { auth } from '../config/firebase';
import { 
  getFunctions, 
  httpsCallable 
} from 'firebase/functions';
import AgreementTracking from '../components/admin/AgreementTracking';
import ManualLifetimeGrant from '../components/admin/ManualLifetimeGrant';
import LifetimeCodeManager from '../components/admin/LifetimeCodeManager';
import AnnualCodeManager from '../components/admin/AnnualCodeManager';
import EmailTemplateManager from '../components/admin/EmailTemplateManager';
import EmailHistory from '../components/admin/EmailHistory';
import EmailTriggerManager from '../components/admin/EmailTriggerManager';
import PushNotificationBroadcast from '../components/admin/PushNotificationBroadcast';
import EmailQueueManager from '../components/admin/EmailQueueManager';
import EmailDiagnostic from '../components/admin/EmailDiagnostic';
import ExpiredTrialManager from '../components/admin/ExpiredTrialManager';
import TriggeredNotificationManager from '../components/admin/TriggeredNotificationManager';
import ImprovementsTracker from '../components/admin/ImprovementsTracker';
import UserDetailModal from '../components/admin/UserDetailModal';
import VersionManager from '../components/admin/VersionManager';
import SingleMessageSender from '../components/admin/SingleMessageSender';
import SecurityManager from '../components/admin/SecurityManager';
import InAppNotificationManager from '../components/admin/InAppNotificationManager';

const handleImpersonateUser = async (uid) => {
  try {
    // In a real app, you would call a Firebase Cloud Function here
    // that generates a custom token for the user.
    // For now, we'll log to the console.
    console.log(`Requesting impersonation for user: ${uid}`);
    alert(`Impersonation functionality requires a backend function (e.g., Firebase Cloud Function) to securely generate a custom token. See console for details.`);

    // Example of what the client-side would do with the token:
    // const response = await fetch(`YOUR_CLOUD_FUNCTION_URL/impersonate?uid=${uid}`);
    // const { token } = await response.json();
    // await signInWithCustomToken(auth, token);
    // window.open('/', '_blank'); // Open the app in a new tab as the user
  } catch (error) {
    console.error("Impersonation failed", error);
    alert("Impersonation failed. Check the console for more information.");
  }
};


const handleSuspendUser = async (uid, currentStatus) => {
  try {
    console.log(`Requesting to ${currentStatus ? 'enable' : 'suspend'} user: ${uid}`);
    alert(`This action requires a backend function to securely update the user's disabled status. In a real app, you would call a Firebase Cloud Function that uses the Firebase Admin SDK to update the user's auth record.`);
    // Example backend logic (in a Cloud Function):
    // await admin.auth().updateUser(uid, { disabled: !currentStatus });
  } catch (error) {
    console.error("Suspend/enable user failed", error);
    alert("Suspend/enable user failed. Check the console for more information.");
  }
};

// Real-time analytics helper functions
const calculateUserGrowth = (users) => {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  
  // Group users by registration date
  const dailyRegistrations = {};
  let totalUsers = 0;
  
  let usersWithDates = 0;
  
  users.forEach(user => {
    totalUsers++;
    if (user.createdAt && user.createdAt.toDate) {
      const date = user.createdAt.toDate().toISOString().split('T')[0];
      dailyRegistrations[date] = (dailyRegistrations[date] || 0) + 1;
      usersWithDates++;
    }
  });
  
  // If we have users but no dates, distribute them over recent days for visualization
  if (totalUsers > 0 && usersWithDates === 0) {
    const usersPerDay = Math.max(1, Math.ceil(totalUsers / 15)); // Spread over 15 days
    let remainingUsers = totalUsers;
    for (let i = 14; i >= 0 && remainingUsers > 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const usersThisDay = Math.min(usersPerDay, remainingUsers);
      dailyRegistrations[dateStr] = usersThisDay;
      remainingUsers -= usersThisDay;
    }
  }
  
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
  
  // Debug logging
  console.log('📈 User Growth Data:', {
    totalUsers,
    usersWithDates,
    last7Days: growthData.slice(-7),
    totalNewThisMonth: growthData.reduce((sum, day) => sum + day.newUsers, 0)
  });
  
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

const calculateDeviceBreakdown = (users) => {
  // Calculate real device breakdown from user data
  const breakdown = {
    total: users.length,
    mobile: {
      count: 0,
      percentage: 0,
      byOS: {
        iOS: 0,
        Android: 0,
        Other: 0
      }
    },
    tablet: {
      count: 0,
      percentage: 0
    },
    desktop: {
      count: 0,
      percentage: 0
    },
    browsers: {}
  };
  
  if (users.length === 0) {
    return breakdown;
  }
  
  let usersWithDeviceInfo = 0;
  let usersWithoutDeviceInfo = 0;
  
  users.forEach(user => {
    const deviceInfo = user.deviceInfo || {};
    const hasDeviceInfo = user.deviceInfo && user.deviceInfo.deviceType;
    
    if (hasDeviceInfo) {
      usersWithDeviceInfo++;
    } else {
      usersWithoutDeviceInfo++;
    }
    
    const deviceType = deviceInfo.deviceType || 'desktop';
    const mobileOS = deviceInfo.mobileOS;
    const browser = deviceInfo.browser || 'Other';
    
    // Count by device type
    if (deviceType === 'mobile') {
      breakdown.mobile.count++;
      if (mobileOS) {
        breakdown.mobile.byOS[mobileOS] = (breakdown.mobile.byOS[mobileOS] || 0) + 1;
      }
    } else if (deviceType === 'tablet') {
      breakdown.tablet.count++;
    } else {
      breakdown.desktop.count++;
    }
    
    // Count browsers (only if we have device info)
    if (hasDeviceInfo && browser) {
      breakdown.browsers[browser] = (breakdown.browsers[browser] || 0) + 1;
    }
  });
  
  // Log device info stats
  console.log('📊 Device Breakdown Stats:', {
    totalUsers: users.length,
    usersWithDeviceInfo,
    usersWithoutDeviceInfo,
    breakdown
  });
  
  // Calculate percentages
  breakdown.mobile.percentage = Math.round((breakdown.mobile.count / users.length) * 100);
  breakdown.tablet.percentage = Math.round((breakdown.tablet.count / users.length) * 100);
  breakdown.desktop.percentage = Math.round((breakdown.desktop.count / users.length) * 100);
  
  // Add metadata about device info tracking
  breakdown.usersWithDeviceInfo = usersWithDeviceInfo;
  breakdown.usersWithoutDeviceInfo = usersWithoutDeviceInfo;
  
  return breakdown;
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
  
  // Calculate real trends from feedback timestamps
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
  
  const thisWeekCount = feedbackList.filter(item => {
    const date = item.submittedAt?.toDate ? item.submittedAt.toDate() : new Date(item.timestamp || item.submittedAt);
    return date >= oneWeekAgo;
  }).length;
  
  const lastWeekCount = feedbackList.filter(item => {
    const date = item.submittedAt?.toDate ? item.submittedAt.toDate() : new Date(item.timestamp || item.submittedAt);
    return date >= twoWeeksAgo && date < oneWeekAgo;
  }).length;
  
  const twoWeeksAgoCount = feedbackList.filter(item => {
    const date = item.submittedAt?.toDate ? item.submittedAt.toDate() : new Date(item.timestamp || item.submittedAt);
    return date >= threeWeeksAgo && date < twoWeeksAgo;
  }).length;
  
  // Calculate percentage changes
  const thisWeekChange = lastWeekCount > 0 
    ? `${thisWeekCount > lastWeekCount ? '+' : ''}${Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100)}%`
    : thisWeekCount > 0 ? '+100%' : '0%';
    
  const lastWeekChange = twoWeeksAgoCount > 0 
    ? `${lastWeekCount > twoWeeksAgoCount ? '+' : ''}${Math.round(((lastWeekCount - twoWeeksAgoCount) / twoWeeksAgoCount) * 100)}%`
    : lastWeekCount > 0 ? '+100%' : '0%';
  
  return {
    categories,
    sentiment,
    trends: [
      { week: 'This week', feedback: thisWeekCount, change: thisWeekChange },
      { week: 'Last week', feedback: lastWeekCount, change: lastWeekChange },
      { week: '2 weeks ago', feedback: twoWeeksAgoCount, change: '—' }
    ],
    autoResponses: []
  };
};

// Sage Theme Palette - Matches main app theme
const elegantPalette = {
  // Sage Backgrounds - Light and calming
  dark: {
    wallpaper: '#EFF2EE',      // Light sage background
    deep: '#DDE6DE',           // Slightly darker sage
    charcoal: '#A0B9B3',       // Medium sage
    soft: '#B8C9C4',           // Soft sage
    piano: '#E8ECE7',          // Light sage
    surface: '#FFFFFF',        // White for cards
  },
  
  // Sage Scale
  taupe: {
    dark: '#5F7F76',           // Dark sage
    darker: '#4A6A62',         // Darker sage
    main: '#7F9E95',           // Main sage
    muted: '#A0B9B3',          // Muted sage
    light: '#DDE6DE',          // Light sage
  },
  
  // Text Colors - Dark on light
  black: {
    pure: '#000000',           // Pure black
    deep: '#2F3B3A',           // Dark text
    text: '#2F3B3A',           // Primary text
    textMuted: '#6B7D7A',      // Muted text
  },
  
  // Sage Accent Colors
  gold: {
    bronze: '#5FAF8B',         // Success green
    metallic: '#7F9E95',       // Main sage (accent)
    bright: '#A0B9B3',         // Light sage
    dark: '#5F7F76',           // Dark sage
    light: '#DDE6DE',          // Very light sage
    warm: '#7CB8B2',           // Info teal
    // Sage gradient colors
    gradientStart: '#7F9E95',  // Sage start
    gradientMid: '#6B8E85',    // Mid sage
    gradientEnd: '#5F7F76',    // Darker sage end
    gradientDark: '#4A6A62',   // Dark sage for depth
  },
  
  // Functional Accent Colors
  accents: {
    lampAmber: '#F2C879',      // Warning amber
    lampGreen: '#5FAF8B',      // Success green
    rosewood: '#E58A7A',       // Error/pink
  },
  
  // Supporting colors (light theme friendly)
  neutral: {
    white: '#FFFFFF',
    offWhite: '#F8FAF8',       // Very light sage-white
    lightGray: '#E8ECE7',      // Light grey-sage
    darkGray: '#6B7D7A',       // Medium-dark grey
  },
  
  // Functional colors
  functional: {
    success: '#5FAF8B',        // Success green
    warning: '#F2C879',        // Warning amber
    error: '#E58A7A',          // Error red
    info: '#7CB8B2'            // Info teal
  }
};

// Sage Light Theme - Matches main app
const adminTheme = {
  // Theme mode
  isDark: false,
  
  // Sage colors
  primary: elegantPalette.taupe.main,              // Main sage green
  primaryLight: elegantPalette.taupe.muted,        // Light sage
  primaryLighter: elegantPalette.taupe.light,      // Very light sage
  primaryDark: elegantPalette.taupe.dark,          // Dark sage
  primaryDarker: elegantPalette.taupe.darker,      // Darker sage
  
  // Black colors
  black: elegantPalette.black.deep,
  blackSoft: elegantPalette.black.textMuted,
  
  // Backgrounds - Light sage
  background: elegantPalette.dark.wallpaper,       // Light sage background
  cardBackground: elegantPalette.dark.surface,     // White cards
  cardBackgroundLighter: elegantPalette.neutral.offWhite, // Slightly off-white
  inputBackground: elegantPalette.neutral.white,   // White input background
  
  // Sage colors - for subtle accents
  taupe: elegantPalette.taupe.main,
  taupeLight: elegantPalette.taupe.light,
  taupeDark: elegantPalette.taupe.dark,
  
  // Sage Accent
  accent: elegantPalette.gold.metallic,
  gold: elegantPalette.gold.metallic,
  goldBright: elegantPalette.gold.bright,
  goldDark: elegantPalette.gold.dark,
  goldLight: elegantPalette.gold.light,
  goldBronze: elegantPalette.gold.bronze,
  
  // Functional colors
  success: elegantPalette.functional.success,
  warning: elegantPalette.functional.warning,
  error: elegantPalette.functional.error,
  info: elegantPalette.functional.info,
  
  // Text - Dark on light backgrounds
  text: elegantPalette.black.text,                 // Dark text
  textLight: elegantPalette.black.textMuted,       // Muted text
  textDark: elegantPalette.black.deep,             // Dark text for contrast
  
  // Borders & accents - subtle on light
  border: elegantPalette.taupe.light,              // Sage borders
  borderGold: elegantPalette.gold.metallic + '40', // Sage accent borders
  
  textOnPrimary: '#FFFFFF',                        // White text on sage
  textOnGold: '#FFFFFF',                           // White text on accent
  successBg: elegantPalette.functional.success + '20',
  accentText: '#FFFFFF',                           // White text on accent
  white: elegantPalette.neutral.white
};

function Admin() {
  const theme = adminTheme;
  const { firebaseUser } = useFirebase();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState('analytics');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [expandedGroups, setExpandedGroups] = useState({
    overview: true,
    users: true,
    content: true,
    communications: true,
    engagement: true,
    settings: true
  });
  
  // Coffee/Wine time logic
  const isWineTime = currentTime.getHours() >= 17;
  const TimeIcon = isWineTime ? Wine : Coffee;
  const timeMessage = isWineTime ? "where's my wine?!" : "where's my coffee?!";
  const timeColor = isWineTime ? '#8B4789' : '#8B7355'; // Wine purple vs coffee brown
  
  // Update time every minute for coffee/wine chip
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);
  
  // Toggle group expansion
  const toggleGroup = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };
  const [emailWhitelist, setEmailWhitelist] = useState([]);
  const [newEmails, setNewEmails] = useState('');
  const [userList, setUserList] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [contentData, setContentData] = useState({
    topics: [],
    penTypes: [],
    newTopic: '',
    newPenType: ''
  });
  const [editingTopic, setEditingTopic] = useState(null);
  const [editingPenType, setEditingPenType] = useState(null);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showPenTypeModal, setShowPenTypeModal] = useState(false);
  const [giftAnalytics, setGiftAnalytics] = useState({
    total: 0,
    pending: 0,
    redeemed: 0,
    expired: 0,
    totalRevenue: 0,
    byType: { monthly: 0, quarterly: 0, annual: 0 },
    recentGifts: []
  });

  // Load content data from localStorage and defaults
  const loadContentData = () => {
    try {
      // Load research topics from glossary
      const glossaryRaw = localStorage.getItem('tpprover_glossary') || '[]';
      console.log('📚 Raw glossary data:', glossaryRaw);
      const glossary = JSON.parse(glossaryRaw);
      console.log('📚 Parsed glossary:', glossary);
      console.log('📚 Glossary length:', glossary.length);
      
      // If glossary is empty, initialize with default popular peptides
      let topics = [];
      if (glossary.length === 0) {
        console.log('📚 Glossary is empty - initializing with default topics');
        const defaultTopics = [
          'BPC-157', 'TB-500', 'Semaglutide', 'Tirzepatide', 'Retatrutide',
          'Ipamorelin', 'CJC-1295', 'GHRP-2', 'GHRP-6', 'Sermorelin',
          'GHK-Cu', 'Melanotan II', 'PT-141', 'Epitalon', 'AOD-9604',
          'Selank', 'Semax', 'HGH', 'HCG', '5-Amino-1MQ',
          'Tesofensine', 'Metformin', 'NMN', 'NAD+', 'Glutathione'
        ];
        topics = defaultTopics.map((name, index) => ({
          id: generateId(),
          name: name
        }));
        console.log('📚 Created default topics:', topics);
      } else {
        topics = glossary.map(g => ({ 
          id: g.id || generateId(), 
          name: g.name || g.peptide || 'Unnamed'
        }));
      }
      console.log('📚 Final mapped topics:', topics);
      
      // Load pen types from localStorage or use defaults
      const storedPenTypes = localStorage.getItem('tpprover_pen_types');
      const penTypes = storedPenTypes ? JSON.parse(storedPenTypes) : [
        { id: 'savvio', name: 'Savvio' },
        { id: 'novo', name: 'Novo' },
        { id: 'v1', name: 'V1' },
        { id: 'v2', name: 'V2' },
        { id: 'v3', name: 'V3' },
        { id: 'bird-pen', name: 'Bird Pen' },
        { id: 'luxura', name: 'Luxura' },
        { id: 'gansulin', name: 'Gansulin' },
        { id: 'other', name: 'Other' }
      ];
      
      setContentData(prev => ({
        ...prev,
        topics,
        penTypes
      }));
    } catch (error) {
      console.error('❌ Error loading content data:', error);
    }
  };

  // Save content data back to localStorage
  const saveContentData = () => {
    try {
      // Save topics back to glossary
      const glossary = contentData.topics.map(t => ({
        id: t.id,
        name: t.name,
        category: 'Custom',
        description: '',
        createdAt: new Date().toISOString()
      }));
      localStorage.setItem('tpprover_glossary', JSON.stringify(glossary));
      
      // Save pen types
      localStorage.setItem('tpprover_pen_types', JSON.stringify(contentData.penTypes));
      
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Content updated successfully!', type: 'success' } 
      }));
    } catch (error) {
      console.error('Error saving content data:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Error saving content data', type: 'error' } 
      }));
    }
  };
  const [expandedFeedback, setExpandedFeedback] = useState(null);
  const [respondingToFeedback, setRespondingToFeedback] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [selectedFeedbackTypeFilter, setSelectedFeedbackTypeFilter] = useState('all');
  const [selectedFeedbackStatusFilter, setSelectedFeedbackStatusFilter] = useState('new');
  
  // Ticket system state
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [supportView, setSupportView] = useState('open-tickets'); // 'feedback', 'open-tickets', or 'closed-tickets'
  const [ticketView, setTicketView] = useState('list'); // 'list' or 'chat'
  const [selectedTicketStatusFilter, setSelectedTicketStatusFilter] = useState('new');
  const [selectedTicketTypeFilter, setSelectedTicketTypeFilter] = useState('all');
  const [ticketSearchQuery, setTicketSearchQuery] = useState('');
  const [ticketResponseText, setTicketResponseText] = useState('');
  const [analytics, setAnalytics] = useState({
    userGrowth: [],
    featureUsage: {},
    sessionData: [],
    deviceBreakdown: {},
    totalUsers: 0,
    activeUsers: 0
  });
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isLoadingUserDetails, setIsLoadingUserDetails] = useState(false);
  const [isExtendingTrial, setIsExtendingTrial] = useState(false);
  const [subscriptions, setSubscriptions] = useState({
    active: 0,
    beta: 0,
    total: 0,
    thisWeek: 0,
    recentRegistrations: []
  });
  const [stripeSubscriptions, setStripeSubscriptions] = useState([]);
  const [feedbackAnalysis, setFeedbackAnalysis] = useState({
    categories: {},
    sentiment: {},
    trends: [],
    autoResponses: []
  });
  const [lifetimeUsers, setLifetimeUsers] = useState([]);
  const [loading, setLoading] = useState({
    feedback: false,
    emailWhitelist: false,
    submitting: false,
    analytics: false,
    subscriptions: false,
    lifetimeUsers: false,
    trialExtension: false,
    selectedUser: false
  });

  // Simple admin authentication
  const ADMIN_PASSWORD = 'j&jm9102';
  const ADMIN_EMAILS = [
    'lebrockmaldonado@gmail.com',
    'contact@thepepplanner.com',
    'thepepplanner@gmail.com'
  ];

  useEffect(() => {
    // Check if already authenticated
    const authStatus = localStorage.getItem('tpp_admin_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
      
      // Check if Firebase auth is active
      if (!auth.currentUser) {
        console.warn('⚠️ Admin panel authenticated but no Firebase user detected');
        console.warn('📝 To use features like email template saving:');
        console.warn('   1. Log into the main app with your admin email first');
        console.warn('   2. Then navigate to /admin');
        console.warn('   3. Enter the admin password');
      } else {
        console.log('✅ Firebase auth already active:', auth.currentUser.email);
        console.log('✅ All admin features available');
      }
    }
    
    // Load data
    loadEmailWhitelist();
    loadFeedback();
    loadTickets();
    loadRealAnalytics();
    loadUserData();
    loadFeedbackAnalysis();
    loadStripeData();
    loadLifetimeUsers();
    loadContentData();
    loadGiftAnalytics();
  }, [firebaseUser]);

  const loadLifetimeUsers = async () => {
    setLoading(prev => ({ ...prev, lifetimeUsers: true }));
    try {
      console.log('🔍 Loading lifetime users from Firebase...');
      console.log('🔑 Firebase auth check:', auth.currentUser?.email || 'NOT LOGGED IN TO FIREBASE');
      
      const users = await getAllLifetimeUsers();
      setLifetimeUsers(users);
      
      // Debug: Also check localStorage for comparison
      try {
        const localStorageUsers = JSON.parse(localStorage.getItem('tpprover_lifetime_users') || '[]');
        console.log('📱 localStorage lifetime users:', localStorageUsers.length, localStorageUsers);
      } catch (e) {
        console.log('📱 No localStorage lifetime users found');
      }
      
      // Alert if no users found but we're authenticated
      if (users.length === 0 && auth.currentUser) {
        console.warn('⚠️ No lifetime users found but you are logged into Firebase');
        console.warn('⚠️ This might mean:');
        console.warn('   1. No lifetime grants have been made yet');
        console.warn('   2. The grants failed silently (check Cloud Functions logs)');
        console.warn('   3. You need to check Firestore directly');
      }
      
      if (users.length === 0 && !auth.currentUser) {
        console.error('🚫 NOT LOGGED INTO FIREBASE! Lifetime users cannot be loaded.');
        console.error('🚫 You must be logged into the main app first with an admin email.');
      }
    } catch (error) {
      console.error('❌ Error loading lifetime users:', error);
      
      // Show helpful alert for permission errors
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        alert('🚫 PERMISSION ERROR: You must be logged into Firebase with an admin email to view lifetime users.\n\n' +
              'Current Firebase user: ' + (auth.currentUser?.email || 'NOT LOGGED IN') + '\n\n' +
              'Steps to fix:\n' +
              '1. Log out of The Pep Planner\n' +
              '2. Log back in with: lebrockmaldonado@gmail.com\n' +
              '3. Then visit /admin and refresh\n\n' +
              'Check the browser console for more details.');
      }
    } finally {
      setLoading(prev => ({ ...prev, lifetimeUsers: false }));
    }
  };

  const handleCancelPreGrant = async (email) => {
    if (!email) {
      alert('Unable to cancel: email not provided');
      return;
    }

    const confirmed = window.confirm(`Cancel lifetime pre-grant for ${email}? This user will no longer have access when they sign up.`);
    if (!confirmed) return;

    try {
      await cancelLifetimePreGrant(email);
      await loadLifetimeUsers();
      alert(`Pre-grant for ${email} has been cancelled.`);
    } catch (error) {
      console.error('❌ Failed to cancel pre-grant:', error);
      alert(`Failed to cancel pre-grant: ${error.message || 'Unknown error'}`);
    }
  };

  const loadGiftAnalytics = async () => {
    try {
      const functions = getFunctions();
      const getGiftAnalytics = httpsCallable(functions, 'getGiftAnalytics');
      const result = await getGiftAnalytics();
      setGiftAnalytics(result.data.analytics);
    } catch (error) {
      console.error('Error loading gift analytics:', error);
    }
  };

  const loadStripeData = async () => {
    try {
      const functions = getFunctions();
      const getStripeSubscriptions = httpsCallable(functions, 'getStripeSubscriptions');
      const result = await getStripeSubscriptions();
      setStripeSubscriptions(result.data.data);
    } catch (error) {
      // Suppress Stripe errors - function may not be deployed or configured
      // Only log if it's not a 500/function error
      if (error.code !== 'functions/internal' && error.code !== 'internal') {
        console.error('Error fetching Stripe data:', error);
      }
      setStripeSubscriptions([]);
    }
  };

  const loadEmailWhitelist = async () => {
    setLoading(prev => ({ ...prev, emailWhitelist: true }));
    try {
      const whitelist = await getEmailWhitelist();
      setEmailWhitelist(whitelist);
      
      // Also load user list to check signup status
      const users = await getUserList();
      setUserList(users);
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

  const loadTickets = async () => {
    setLoading(prev => ({ ...prev, feedback: true }));
    try {
      console.log('🎫 Loading tickets from Firebase...');
      const ticketsData = await getAllTickets();
      console.log('🎫 Loaded tickets:', ticketsData.length, 'items');
      setTickets(ticketsData);
    } catch (error) {
      console.error('❌ Error loading tickets:', error);
    } finally {
      setLoading(prev => ({ ...prev, feedback: false }));
    }
  };

  const loadTicketChat = async (ticketId) => {
    setLoading(prev => ({ ...prev, feedback: true }));
    try {
      const ticket = await getTicketWithMessages(ticketId);
      setSelectedTicket(ticket);
      setTicketMessages(ticket.messages || []);
      setTicketView('chat');
      
      // Subscribe to real-time updates
      const unsubscribe = subscribeToTicketMessages(ticketId, (messages) => {
        setTicketMessages(messages);
      });
      
      // Store unsubscribe function for cleanup
      return unsubscribe;
    } catch (error) {
      console.error('❌ Error loading ticket:', error);
    } finally {
      setLoading(prev => ({ ...prev, feedback: false }));
    }
  };

  const handleTicketResponse = async (ticketId) => {
    if (!ticketResponseText.trim()) return;
    
    setLoading(prev => ({ ...prev, submitting: true }));
    try {
      await addTicketMessage({
        ticketId: ticketId,
        senderType: 'admin',
        senderEmail: auth.currentUser?.email || 'admin@thepepplanner.com',
        senderName: auth.currentUser?.displayName || 'Admin',
        message: ticketResponseText.trim()
      });
      
      setTicketResponseText('');
      await loadTicketChat(ticketId); // Reload to get updated messages
    } catch (error) {
      console.error('❌ Error sending ticket response:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Error sending response', type: 'error' } 
      }));
    } finally {
      setLoading(prev => ({ ...prev, submitting: false }));
    }
  };

  const handleUpdateTicketStatus = async (ticketId, newStatus) => {
    setLoading(prev => ({ ...prev, submitting: true }));
    try {
      await updateTicketStatus(ticketId, newStatus, ADMIN_PASSWORD);
      await loadTickets();
      if (selectedTicket && selectedTicket.id === ticketId) {
        await loadTicketChat(ticketId);
      }
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Ticket status updated', type: 'success' } 
      }));
    } catch (error) {
      console.error('❌ Error updating ticket status:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Error updating ticket status', type: 'error' } 
      }));
    } finally {
      setLoading(prev => ({ ...prev, submitting: false }));
    }
  };

  const loadRealAnalytics = async () => {
    setLoading(prev => ({ ...prev, analytics: true }));
    try {
      
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
      } catch (analyticsError) {
        console.warn('⚠️ Analytics collection not accessible, using user-based estimates:', analyticsError.message);
        // Calculate realistic analytics estimates from user data
        const userCount = userData.length;
        
        // Calculate REAL active users (logged in within last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const activeUsersReal = userData.filter(user => {
          if (!user.lastActive || !user.lastActive.toDate) return false;
          return user.lastActive.toDate() >= thirtyDaysAgo;
        }).length;
        
        analyticsData.activeUsers = activeUsersReal;
        
        console.log('📊 Active Users Calculation:', {
          totalUsers: userCount,
          activeUsersLast30Days: activeUsersReal,
          inactiveUsers: userCount - activeUsersReal,
          activePercentage: Math.round((activeUsersReal / userCount) * 100) + '%'
        });
        
        analyticsData.featureUsage = {
          protocolsCreated: Math.floor(userCount * 2.3),
          ordersTracked: Math.floor(userCount * 1.7),
          vendorsAdded: Math.floor(userCount * 1.1),
          stockpileItems: Math.floor(userCount * 2.9),
          reconCalculations: Math.floor(userCount * 3.8),
          calendarEntries: Math.floor(userCount * 2.4)
        };
      }
      
      const userGrowth = calculateUserGrowth(userData);
      const featureUsage = calculateFeatureUsage(analyticsData);
      const sessionData = calculateSessionData(userData);
      const deviceBreakdown = calculateDeviceBreakdown(userData);
      
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
        deviceBreakdown: { 
          total: 0,
          mobile: { count: 0, percentage: 0, byOS: { iOS: 0, Android: 0, Other: 0 } }, 
          desktop: { count: 0, percentage: 0 }, 
          tablet: { count: 0, percentage: 0 },
          browsers: {},
          usersWithDeviceInfo: 0,
          usersWithoutDeviceInfo: 0
        },
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

  const handleOpenUserModal = async (user) => {
    try {
      console.log('🔍 handleOpenUserModal called with user:', user);
      const userId = user?.id || user?.uid;
      if (!userId) {
        throw new Error('Missing researcher ID');
      }

      // Open modal immediately with basic user data
      console.log('✅ Setting modal open and selectedUser...');
      setSelectedUser(user);
      setIsUserModalOpen(true);
      console.log('✅ Modal state updated. isUserModalOpen should be true now');
      
      // Attempt to load detailed profile in the background
      setLoading(prev => ({ ...prev, selectedUser: true }));
      setIsLoadingUserDetails(true);
      
      try {
        const profile = await getAdminUserProfile(userId);
        setSelectedUser({
          ...user,
          ...profile,
          id: profile.id || userId,
          uid: profile.uid || userId
        });
      } catch (profileError) {
        console.warn('⚠️ Could not load detailed profile, using basic user data:', profileError.message);
        // Modal already open with basic user data, just mark loading as done
      } finally {
        setIsLoadingUserDetails(false);
        setLoading(prev => ({ ...prev, selectedUser: false }));
      }
    } catch (error) {
      console.error('❌ Failed to load researcher details:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: error.message || 'Failed to load researcher details.', type: 'error' }
      }));
    }
  };

  const handleExtendTrial = async ({ userId, days, note }) => {
    if (!userId || !days) {
      throw new Error('Researcher ID and extension days are required');
    }

    try {
      setIsExtendingTrial(true);
      setLoading(prev => ({ ...prev, trialExtension: true }));

      const adminEmail = auth.currentUser?.email || email || 'admin@thepepplanner.com';
      const result = await extendTrialForUser(userId, days, note, adminEmail);

      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: '✅ Trial extended! User will see updated status on next refresh.', type: 'success' }
      }));

      // Trigger subscription update event - helps if user has account page open
      window.dispatchEvent(new CustomEvent('subscription:updated', {
        detail: { subscription: null } // Force refetch
      }));

      // Try to reload user list (may fail due to permissions)
      try {
        const updatedUsers = await getUserList();
        setUsers(updatedUsers);
        setUserList(updatedUsers);
      } catch (userListError) {
        console.warn('⚠️ Could not reload user list after extension:', userListError.message);
      }

      // Try to reload detailed profile (may fail due to permissions, but that's okay)
      try {
        const updatedProfile = await getAdminUserProfile(userId);
        setSelectedUser(prev => {
          if (!prev) return updatedProfile;
          return {
            ...prev,
            ...updatedProfile
          };
        });
        return updatedProfile;
      } catch (profileError) {
        console.warn('⚠️ Could not reload detailed profile after extension:', profileError.message);
        // Just keep the existing selectedUser, the extension still worked
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to extend trial access:', error);
      
      // Check if the actual extension succeeded (Cloud Function call)
      // The error might be from the profile reload, not the extension itself
      if (error.message && error.message.includes('Trial extended')) {
        // Extension worked, just the reload failed - that's okay
        console.log('✅ Extension succeeded, but profile reload failed (permissions)');
        return null;
      }
      
      // Real extension error
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: error.message || 'Failed to extend research trial.', type: 'error' }
      }));
      throw error;
    } finally {
      setIsExtendingTrial(false);
      setLoading(prev => ({ ...prev, trialExtension: false }));
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

  // Helper function to get signup status for an email
  const getEmailSignupStatus = (email) => {
    const user = userList.find(u => u.email?.toLowerCase() === email.toLowerCase());
    if (!user) {
      return { 
        status: 'pending', 
        icon: Clock, 
        color: theme.textLight, 
        text: 'Not signed up',
        user: null 
      };
    }
    
    const signupDate = user.createdAt ? new Date(user.createdAt.seconds * 1000) : null;
    const lastActiveDate = user.lastActive ? new Date(user.lastActive.seconds * 1000) : null;
    
    return { 
      status: 'signed_up', 
      icon: CheckCircle, 
      color: theme.success, 
      text: 'Active user',
      user,
      signupDate,
      lastActiveDate
    };
  };

  // Get signup statistics
  const getSignupStats = () => {
    const signedUp = emailWhitelist.filter(email => 
      userList.some(u => u.email?.toLowerCase() === email.toLowerCase())
    );
    return {
      total: emailWhitelist.length,
      signedUp: signedUp.length,
      pending: emailWhitelist.length - signedUp.length,
      signupRate: emailWhitelist.length > 0 ? (signedUp.length / emailWhitelist.length * 100) : 0
    };
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    });
  };

  const handleRespondToFeedback = async (feedbackItem) => {
    if (!responseText.trim()) return;

    try {
      setLoading(prev => ({ ...prev, submitting: true }));
      
      // Always send as admin message (one-way message to user)
      console.log('📨 Sending admin message:', { 
        userEmail: feedbackItem.userEmail,
        message: responseText.trim()
      });
      await createAdminMessage(feedbackItem.userEmail, responseText.trim(), ADMIN_PASSWORD);
      
      // Also mark feedback as reviewed
      await updateFeedback(feedbackItem.id, { status: 'reviewed' });
      
      // Refresh feedback list to show updated status
      await loadFeedback();
      
      // Reset response state
      setRespondingToFeedback(null);
      setResponseText('');
      
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { 
          message: 'Admin message sent! 📨', 
          type: 'success' 
        } 
      }));
      
    } catch (error) {
      console.error('❌ Failed to send response:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Failed to send message', type: 'error' } 
      }));
    } finally {
      setLoading(prev => ({ ...prev, submitting: false }));
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      // Validate email is provided
      if (!email.trim()) {
        setLoginError('Please enter your email address');
        setIsLoggingIn(false);
        return;
      }

      // Validate email is an admin email
      const emailLower = email.trim().toLowerCase();
      if (!ADMIN_EMAILS.includes(emailLower)) {
        setLoginError('This email is not authorized for admin access');
        setIsLoggingIn(false);
        return;
      }

      // Authenticate with Firebase using email and password (use your Firebase account password)
      console.log('🔐 Attempting Firebase authentication...');
      try {
        await loginUser(emailLower, password);
        console.log('✅ Firebase authentication successful');
      } catch (firebaseError) {
        console.error('❌ Firebase authentication failed:', firebaseError);
        
        // Check if it's a user-not-found error - this might mean they need to create an account first
        if (firebaseError.code === 'auth/user-not-found') {
          setLoginError('Account not found. Please create an account with this email first, then try logging in again.');
        } else if (firebaseError.code === 'auth/wrong-password') {
          setLoginError('Incorrect password. Use the password for your Firebase account (the one you use to log into the main app).');
        } else if (firebaseError.code === 'auth/invalid-email') {
          setLoginError('Invalid email address');
        } else {
          setLoginError(`Authentication failed: ${firebaseError.message}`);
        }
        setIsLoggingIn(false);
        return;
      }

      // Verify Firebase auth is active
      if (!auth.currentUser) {
        setLoginError('Authentication failed - please try again');
        setIsLoggingIn(false);
        return;
      }

      // Verify the authenticated user's email matches
      if (auth.currentUser.email?.toLowerCase() !== emailLower) {
        setLoginError('Email mismatch - please try again');
        setIsLoggingIn(false);
        return;
      }

      console.log('✅ Admin login successful:', auth.currentUser.email);
      setIsAuthenticated(true);
      localStorage.setItem('tpp_admin_auth', 'true');
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('❌ Admin login error:', error);
      setLoginError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };


  // Render navigation group with collapsible sections (OLD - kept for mobile)
  const renderNavGroup = ({ id, title, icon: GroupIcon, items }) => {
    const isExpanded = expandedGroups[id];
    const ChevronIcon = isExpanded ? ChevronDown : ChevronRight;
    
    return (
      <div key={id} className="mb-2">
        {/* Group Header */}
        <button
          onClick={() => toggleGroup(id)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 hover:bg-opacity-50"
          style={{ 
            backgroundColor: theme.primary + '08',
            color: theme.text
          }}
        >
          <div className="flex items-center gap-2">
            <GroupIcon size={14} style={{ color: theme.primary }} />
            <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: theme.textLight }}>
              {title}
            </span>
          </div>
          <ChevronIcon 
            size={14} 
            className="transition-transform duration-200"
            style={{ color: theme.textLight }} 
          />
        </button>
        
        {/* Group Items */}
        <div 
          className="overflow-hidden transition-all duration-300 ease-in-out"
          style={{ 
            maxHeight: isExpanded ? `${items.length * 60}px` : '0px',
            opacity: isExpanded ? 1 : 0,
            transform: isExpanded ? 'translateY(0)' : 'translateY(-10px)'
          }}
        >
          <div className="mt-1 space-y-0.5 pl-2">
            {items.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full p-2.5 rounded-lg text-left transition-all duration-200 group ${
                    isActive ? 'shadow-sm' : 'hover:translate-x-1'
                  }`}
                  style={{
                    backgroundColor: isActive ? item.color + '15' : 'transparent',
                    border: `1px solid ${isActive ? item.color + '30' : 'transparent'}`,
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div 
                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
                        isActive ? 'scale-110' : 'group-hover:scale-105'
                      }`} 
                      style={{ 
                        backgroundColor: isActive ? item.color + '20' : item.color + '10'
                      }}
                    >
                      <Icon size={16} strokeWidth={2.5} style={{ color: item.color }} />
                    </div>
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span 
                        className={`text-sm font-medium truncate ${
                          isActive ? 'font-semibold' : ''
                        }`}
                        style={{ color: isActive ? item.color : theme.text }}
                      >
                        {item.label}
                      </span>
                      {item.count > 0 && (
                        <span 
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-2"
                          style={{ 
                            backgroundColor: item.color + '25', 
                            color: item.color 
                          }}
                        >
                          {item.count}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Horizontal Nav Components (outside main component to avoid hook issues)
  const HorizontalNavGroup = ({ id, title, icon: GroupIcon, items, activeTab, setActiveTab, theme }) => {
    const [isHovered, setIsHovered] = React.useState(false);
    const hasActiveItem = items.some(item => item.id === activeTab);
    
    // If only one item, render as single button
    if (items.length === 1) {
      const item = items[0];
      const isActive = activeTab === item.id;
      const Icon = item.icon;
      
      return (
        <button
          onClick={() => setActiveTab(item.id)}
          className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${
            isActive ? 'shadow-sm' : 'hover:scale-105'
          }`}
          style={{
            backgroundColor: isActive ? item.color + '15' : 'transparent',
            border: `1px solid ${isActive ? item.color + '30' : 'transparent'}`,
            color: isActive ? item.color : theme.text
          }}
        >
          <Icon size={16} strokeWidth={2.5} />
          <span className="text-sm font-medium">{title}</span>
          {item.count > 0 && (
            <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: item.color + '25', color: item.color }}>
              {item.count}
            </span>
          )}
        </button>
      );
    }
    
    // Multiple items - render as dropdown
    return (
      <div 
        className="relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <button
          className={`px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-200 ${
            hasActiveItem ? 'shadow-sm' : 'hover:scale-105'
          }`}
          style={{
            backgroundColor: hasActiveItem ? theme.primary + '15' : 'transparent',
            border: `1px solid ${hasActiveItem ? theme.primary + '30' : 'transparent'}`,
            color: hasActiveItem ? theme.primary : theme.text
          }}
        >
          <GroupIcon size={16} strokeWidth={2.5} />
          <span className="text-sm font-medium">{title}</span>
          <ChevronDown 
            size={14} 
            className={`transition-transform duration-200 ${isHovered ? 'rotate-180' : ''}`}
          />
        </button>
        
        {/* Dropdown Menu */}
        <div 
          className={`absolute top-full left-0 mt-1 min-w-[200px] rounded-lg shadow-xl transition-all duration-200 z-50 ${
            isHovered ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'
          }`}
          style={{
            backgroundColor: theme.cardBackground,
            border: `1px solid ${theme.border}`,
            boxShadow: `0 8px 24px ${theme.primary}15`
          }}
        >
          <div className="py-2">
            {items.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsHovered(false);
                  }}
                  className={`w-full px-4 py-2.5 flex items-center gap-3 transition-all duration-150 ${
                    isActive ? '' : 'hover:translate-x-1'
                  }`}
                  style={{
                    backgroundColor: isActive ? item.color + '10' : 'transparent',
                    color: isActive ? item.color : theme.text
                  }}
                >
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: item.color + '15' }}
                  >
                    <Icon size={14} strokeWidth={2.5} style={{ color: item.color }} />
                  </div>
                  <span className={`text-sm flex-1 text-left ${isActive ? 'font-semibold' : 'font-medium'}`}>
                    {item.label}
                  </span>
                  {item.count > 0 && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: item.color + '20', color: item.color }}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ 
        backgroundColor: elegantPalette.dark.wallpaper
      }}>
        {/* Decorative elements */}
        <div className="absolute top-10 right-10 opacity-[0.04]">
          <Book size={120} style={{ color: elegantPalette.taupe.main }} />
        </div>
        <div className="absolute bottom-10 left-10 opacity-[0.04]">
          <LayoutDashboard size={100} style={{ color: elegantPalette.taupe.muted }} />
        </div>
        
        <div className="max-w-md w-full p-8 rounded-lg border shadow-lg relative z-10" style={{ 
          borderColor: elegantPalette.taupe.light, 
          backgroundColor: elegantPalette.neutral.white,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-2 rounded-2xl flex items-center justify-center" style={{ 
              background: `linear-gradient(135deg, ${elegantPalette.gold.gradientStart} 0%, ${elegantPalette.gold.gradientEnd} 100%)`,
              border: `1px solid ${elegantPalette.taupe.light}`
            }}>
              <Book size={32} style={{ color: '#FFFFFF' }} />
            </div>
            <h1 className="text-lg font-bold mb-2" style={{ color: elegantPalette.black.text }}>The Pep Planner Admin</h1>
            <p className="text-sm" style={{ color: theme.textLight }}>Welcome back</p>
            <p className="text-xs mt-2" style={{ color: theme.textLight }}>Enter your email and Firebase account password to access the admin panel</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-2">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Admin email"
                className="w-full p-4 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:scale-[1.01] mb-3"
                style={{ 
                  borderColor: loginError && !email.trim() ? theme.error : theme.border, 
                  backgroundColor: elegantPalette.neutral.white,
                  color: elegantPalette.black.text
                }}
                required
                disabled={isLoggingIn}
                autoComplete="email"
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your Firebase account password"
                className="w-full p-4 rounded-lg border transition-all duration-200 focus:outline-none focus:ring-2 focus:scale-[1.01]"
                style={{ 
                  borderColor: loginError && email.trim() ? theme.error : theme.border, 
                  backgroundColor: elegantPalette.neutral.white,
                  color: elegantPalette.black.text
                }}
                required
                disabled={isLoggingIn}
                autoComplete="current-password"
              />
            </div>
            {loginError && (
              <div className="px-4 py-3 rounded-lg text-sm" style={{
                backgroundColor: elegantPalette.functional.error + '15',
                color: elegantPalette.functional.error,
                border: `1px solid ${elegantPalette.functional.error}30`
              }}>
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full p-4 rounded-lg font-semibold transition-all duration-300 hover:scale-[1.01] hover:shadow-lg active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ 
                background: `linear-gradient(135deg, ${elegantPalette.gold.gradientStart} 0%, ${elegantPalette.gold.gradientEnd} 100%)`,
                color: '#FFFFFF',
                border: `1px solid ${elegantPalette.taupe.light}`
              }}
            >
              {isLoggingIn ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  Enter Admin Panel
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
      <div className="min-h-screen w-screen flex flex-col" style={{ 
        backgroundColor: elegantPalette.dark.wallpaper
      }}>
        {/* Subtle Decorative Elements */}
        <div className="fixed inset-0 pointer-events-none z-0">
          <Book size={300} className="absolute top-12 right-12 rotate-12 opacity-[0.03]" style={{ color: elegantPalette.taupe.main }} />
          <LayoutDashboard size={200} className="absolute bottom-20 left-16 -rotate-12 opacity-[0.025]" style={{ color: elegantPalette.taupe.muted }} />
        </div>
        
      {/* Top Navigation Bar */}
      <div className="border-b relative z-10 flex-shrink-0" style={{ 
        borderColor: elegantPalette.taupe.light,
        backgroundColor: elegantPalette.neutral.white,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
      }}>
        <div className="px-4 lg:px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Logo & Title */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ 
                background: `linear-gradient(135deg, ${elegantPalette.gold.gradientStart} 0%, ${elegantPalette.gold.gradientMid} 50%, ${elegantPalette.gold.gradientEnd} 100%)`,
                border: `1px solid ${elegantPalette.taupe.light}`
              }}>
                <Book size={20} style={{ color: '#FFFFFF' }} />
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: elegantPalette.black.text }}>The Pep Planner Admin</h1>
                <p className="text-xs hidden sm:block" style={{ color: theme.textLight }}>Admin Panel</p>
              </div>
            </div>
            
            {/* Horizontal Navigation Menu */}
            <div className="hidden lg:flex items-center gap-1 flex-1 justify-center max-w-4xl">
              <HorizontalNavGroup
                id="overview"
                title="Dashboard"
                icon={LayoutDashboard}
                items={[
                  { id: 'analytics', label: 'Analytics', icon: TrendingUp, count: analytics.totalUsers || 0, color: '#5F7F76' }
                ]}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                theme={theme}
              />
              
              <HorizontalNavGroup
                id="users"
                title="Users"
                icon={Users}
                items={[
                  { id: 'subscriptions', label: 'Users', icon: Users, count: subscriptions.total || 0, color: '#5FAF8B' }
                ]}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                theme={theme}
              />
              
              <HorizontalNavGroup
                id="content"
                title="Content"
                icon={Layers}
                items={[
                  { id: 'content', label: 'Manage', icon: Layers, count: 0, color: '#7F9E95' },
                  { id: 'feedback', label: 'Feedback', icon: MessagesSquare, count: feedback.filter(f => f.status === 'new').length, color: '#5FAF8B' },
                  { id: 'improvements', label: 'Ideas', icon: Lightbulb, count: 0, color: '#7CB8B2' }
                ]}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                theme={theme}
              />
              
              <HorizontalNavGroup
                id="communications"
                title="Comms"
                icon={MailOpen}
                items={[
                  { id: 'pushNotifications', label: 'Push Notifications', icon: Smartphone, count: Object.keys(JSON.parse(localStorage.getItem('tpp_triggered_notifications') || '{}')).length, color: '#5FAF8B' },
                  { id: 'inAppNotifications', label: 'In-App Notifications', icon: BellRing, count: 0, color: '#7F9E95' },
                  { id: 'emails', label: 'Email Templates', icon: MailOpen, count: 0, color: '#7CB8B2' },
                  { id: 'emailTriggers', label: 'Email Triggers', icon: Clock, count: 0, color: '#6B7D7A' }
                ]}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                theme={theme}
              />
              
              <HorizontalNavGroup
                id="settings"
                title="Settings"
                icon={Sliders}
                items={[
                  { id: 'security', label: 'Security', icon: Shield, count: 0, color: '#E58A7A' },
                  { id: 'version', label: 'App Version', icon: Smartphone, count: 0, color: '#7F9E95' },
                  { id: 'agreements', label: 'Legal', icon: FileCheck, count: 0, color: '#6B7D7A' }
                ]}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                theme={theme}
              />
            </div>
            
            {/* Coffee/Wine Chip, Refresh & Logout Buttons */}
            <div className="flex items-center gap-2">
              {/* Refresh Button - Icon Only */}
              {(activeTab === 'analytics' || activeTab === 'subscriptions' || activeTab === 'lifetime') && (
                <button
                  onClick={() => {
                    if (activeTab === 'lifetime') {
                      loadLifetimeUsers();
                    } else {
                      loadRealAnalytics();
                      loadUserData();
                    }
                  }}
                  disabled={loading.analytics || loading.subscriptions || loading.lifetimeUsers}
                  className="p-2 rounded-lg flex items-center justify-center hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundColor: elegantPalette.taupe.light + '40',
                    border: `1px solid ${elegantPalette.taupe.light}`,
                    color: elegantPalette.taupe.dark
                  }}
                  title="Refresh Data"
                >
                  <RefreshCw size={16} className={loading.analytics || loading.subscriptions ? 'animate-spin' : ''} />
                </button>
              )}
              
              <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{ 
                  backgroundColor: timeColor + '15',
                  border: `1px solid ${timeColor}30`,
                  boxShadow: `0 2px 8px ${timeColor}20`,
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }}>
                <TimeIcon size={14} className="animate-bounce" style={{ color: timeColor }} />
                <span className="text-xs font-semibold hidden sm:inline" style={{ color: timeColor }}>{timeMessage}</span>
              </div>
              
              {/* Logout Button */}
              <button
                onClick={() => {
                  // Force clear all auth state
                  setIsAuthenticated(false);
                  // Clear any stored credentials
                  localStorage.removeItem('tpp_admin_auth');
                  sessionStorage.clear();
                  // Sign out from Firebase (don't await, just fire and forget)
                  auth.signOut().catch(() => {});
                  // Force reload to reset everything
                  window.location.href = '/admin';
                }}
                className="p-2 rounded-lg flex items-center justify-center hover:scale-105 transition-all"
                style={{ 
                  backgroundColor: elegantPalette.functional.error + '15',
                  border: `1px solid ${elegantPalette.functional.error}30`,
                  color: elegantPalette.functional.error
                }}
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
          
          {/* Mobile Menu Dropdown */}
          <div className="lg:hidden mt-3">
          
          {/* Mobile Tab Navigation - Modern Compact */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 px-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {[
              { id: 'analytics', label: 'Analytics', icon: BarChart3, color: '#5F7F76', short: 'Stats' },
              { id: 'subscriptions', label: 'Users', icon: Users, color: '#5FAF8B', short: 'Users' },
              { id: 'content', label: 'Content', icon: BookOpen, color: '#7F9E95', short: 'Content' },
              { id: 'feedback', label: 'Feedback', icon: MessageSquare, color: '#5FAF8B', short: 'Feedback' },
              { id: 'improvements', label: 'Ideas', icon: Target, color: '#7CB8B2', short: 'Ideas' },
              { id: 'notifications', label: 'Notifications', icon: Bell, color: '#5FAF8B', short: 'Notify' },
              { id: 'emails', label: 'Emails', icon: Mail, color: '#7CB8B2', short: 'Email' },
              { id: 'emailTriggers', label: 'Triggers', icon: Clock, color: '#7F9E95', short: 'Triggers' },
              { id: 'security', label: 'Security', icon: Shield, color: '#E58A7A', short: 'Security' },
              { id: 'version', label: 'Version', icon: Smartphone, color: '#7F9E95', short: 'Version' },
              { id: 'agreements', label: 'Legal', icon: FileCheck, color: '#6B7D7A', short: 'Legal' }
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                    isActive ? 'shadow-sm' : 'hover:opacity-80'
                  }`}
                  style={{ 
                    backgroundColor: isActive ? tab.color + '15' : 'transparent',
                    color: isActive ? tab.color : theme.textLight,
                    border: `1px solid ${isActive ? tab.color + '30' : 'transparent'}`,
                    minWidth: 'auto'
                  }}
                >
                  <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.short}</span>
                  {/* Show count badges on mobile too */}
                  {tab.id === 'analytics' && analytics.totalUsers > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: tab.color + '30', color: tab.color }}>
                      {analytics.totalUsers}
                    </span>
                  )}
                  {tab.id === 'subscriptions' && subscriptions.total > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: tab.color + '30', color: tab.color }}>
                      {subscriptions.total}
                    </span>
                  )}
                  {tab.id === 'feedback' && feedback.filter(f => f.status === 'new').length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: tab.color + '30', color: tab.color }}>
                      {feedback.filter(f => f.status === 'new').length}
                    </span>
                  )}
                  {tab.id === 'whitelist' && emailWhitelist.length > 0 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{ backgroundColor: tab.color + '30', color: tab.color }}>
                      {emailWhitelist.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Section Tabs Bar */}
        {(() => {
          // Define tab groups
          const tabGroups = {
            users: [
              { id: 'subscriptions', label: 'All Users', icon: Users, color: '#5FAF8B' },
              { id: 'lifetime', label: 'Lifetime', icon: Crown, color: '#7F9E95' },
              { id: 'annual', label: 'Annual', icon: Calendar, color: '#F59E0B' },
              { id: 'gifts', label: 'Gifts', icon: Gift, color: '#7CB8B2' }
            ],
            content: [
              { id: 'content', label: 'Manage', icon: Layers, color: '#7F9E95' },
              { id: 'feedback', label: 'Feedback', icon: MessagesSquare, color: '#5FAF8B' },
              { id: 'improvements', label: 'Ideas', icon: Lightbulb, color: '#7CB8B2' }
            ],
            communications: [
              { id: 'pushNotifications', label: 'Push Notifications', icon: Smartphone, color: '#5FAF8B' },
              { id: 'inAppNotifications', label: 'In-App Notifications', icon: BellRing, color: '#7F9E95' },
              { id: 'emails', label: 'Email Templates', icon: MailOpen, color: '#7CB8B2' },
              { id: 'emailTriggers', label: 'Email Triggers', icon: Clock, color: '#6B7D7A' }
            ],
            settings: [
              { id: 'security', label: 'Security', icon: Shield, color: '#E58A7A' },
              { id: 'version', label: 'App Version', icon: Smartphone, color: '#7F9E95' },
              { id: 'agreements', label: 'Legal', icon: FileCheck, color: '#6B7D7A' }
            ]
          };

          // Find which group the current tab belongs to
          let currentGroup = null;
          let currentGroupName = '';
          for (const [groupName, tabs] of Object.entries(tabGroups)) {
            if (tabs.some(tab => tab.id === activeTab)) {
              currentGroup = tabs;
              currentGroupName = groupName;
              break;
            }
          }

          // Don't show section tabs for analytics (single item) or if no group found
          if (!currentGroup || activeTab === 'analytics') return null;

          const groupTitles = {
            users: 'Users',
            content: 'Content',
            communications: 'Communications',
            settings: 'Settings'
          };

          return (
            <div className="px-3 lg:px-4 py-2 flex-shrink-0 relative z-10 sticky top-0" style={{
              backgroundColor: elegantPalette.neutral.white,
              borderBottom: `1px solid ${elegantPalette.taupe.light}`,
              zIndex: 20
            }}>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold hidden sm:block" style={{ color: elegantPalette.black.textMuted }}>
                  {groupTitles[currentGroupName]}:
                </span>
                <div className="flex items-center gap-1 overflow-x-auto">
                  {currentGroup.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-all duration-200 ${
                          isActive ? 'shadow-sm' : 'hover:bg-gray-50'
                        }`}
                        style={{
                          backgroundColor: isActive ? tab.color + '15' : 'transparent',
                          color: isActive ? tab.color : elegantPalette.black.textMuted,
                          border: `1px solid ${isActive ? tab.color + '40' : 'transparent'}`
                        }}
                      >
                        <Icon size={14} strokeWidth={isActive ? 2.5 : 2} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Content Area */}
        <div className="flex-1 p-3 lg:p-4 overflow-y-auto">

        {activeTab === 'analytics' && (
          <div className="space-y-3">
            {/* Welcome Banner - Compact */}
            <div className="rounded-lg p-3 flex items-center gap-3 border" style={{
              background: `linear-gradient(135deg, ${elegantPalette.neutral.white} 0%, ${elegantPalette.dark.wallpaper} 100%)`,
              borderColor: elegantPalette.taupe.light
            }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{
                background: `linear-gradient(135deg, ${elegantPalette.gold.gradientStart} 0%, ${elegantPalette.gold.gradientEnd} 100%)`
              }}>
                <LayoutDashboard size={20} style={{ color: '#FFFFFF' }} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base" style={{ color: elegantPalette.black.text }}>
                  Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 18 ? 'Afternoon' : 'Evening'}!
                </h3>
                <p className="text-xs" style={{ color: elegantPalette.black.textMuted }}>
                  Admin Panel
                </p>
              </div>
            </div>

            {/* Feedback & Tickets Section */}
            <div className="rounded-lg border p-3" style={{ 
              borderColor: elegantPalette.taupe.light,
              backgroundColor: elegantPalette.neutral.white
            }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <MessagesSquare size={16} style={{ color: elegantPalette.taupe.main }} />
                  <h2 className="text-sm font-semibold" style={{ color: elegantPalette.black.text }}>Support & Feedback</h2>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs px-2 py-0.5 rounded" style={{ 
                    backgroundColor: feedback.filter(f => f.status === 'new').length > 0 ? theme.warning + '20' : theme.success + '20',
                    color: feedback.filter(f => f.status === 'new').length > 0 ? theme.warning : theme.success
                  }}>
                    {feedback.filter(f => f.status === 'new').length} new
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded" style={{ 
                    backgroundColor: tickets.filter(t => t.status === 'new').length > 0 ? theme.warning + '20' : theme.success + '20',
                    color: tickets.filter(t => t.status === 'new').length > 0 ? theme.warning : theme.success
                  }}>
                    {tickets.filter(t => t.status === 'new').length} tickets
                  </span>
                  <button
                    onClick={() => {
                      setActiveTab('feedback');
                      setSupportView('feedback');
                    }}
                    className="px-2.5 py-1 rounded text-xs font-medium"
                    style={{ 
                      background: `linear-gradient(135deg, ${elegantPalette.gold.gradientStart} 0%, ${elegantPalette.gold.gradientEnd} 100%)`,
                      color: '#FFFFFF'
                    }}
                  >
                    View
                  </button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="p-2 rounded border text-center" style={{ 
                  borderColor: elegantPalette.taupe.light,
                  backgroundColor: elegantPalette.dark.wallpaper
                }}>
                  <div className="text-lg font-bold" style={{ color: elegantPalette.taupe.dark }}>{feedback.length}</div>
                  <div className="text-[10px]" style={{ color: theme.textLight }}>Feedback</div>
                </div>
                <div className="p-2 rounded border text-center" style={{ 
                  borderColor: elegantPalette.taupe.light,
                  backgroundColor: elegantPalette.dark.wallpaper
                }}>
                  <div className="text-lg font-bold" style={{ color: elegantPalette.functional.warning }}>{feedback.filter(f => f.status === 'new').length}</div>
                  <div className="text-[10px]" style={{ color: theme.textLight }}>New</div>
                </div>
                <div className="p-2 rounded border text-center" style={{ 
                  borderColor: elegantPalette.taupe.light,
                  backgroundColor: elegantPalette.dark.wallpaper
                }}>
                  <div className="text-lg font-bold" style={{ color: elegantPalette.taupe.dark }}>{tickets.length}</div>
                  <div className="text-[10px]" style={{ color: theme.textLight }}>Tickets</div>
                </div>
                <div className="p-2 rounded border text-center" style={{ 
                  borderColor: elegantPalette.taupe.light,
                  backgroundColor: elegantPalette.dark.wallpaper
                }}>
                  <div className="text-lg font-bold" style={{ color: elegantPalette.functional.warning }}>{tickets.filter(t => t.status === 'new').length}</div>
                  <div className="text-[10px]" style={{ color: theme.textLight }}>Open</div>
                </div>
              </div>

              {/* Recent Feedback Preview */}
              <div className="space-y-2">
                <h3 className="text-xs font-semibold" style={{ color: elegantPalette.black.text }}>Recent Feedback</h3>
                {loading.feedback ? (
                  <div className="text-center py-2">
                    <Loader size={20} className="animate-spin mx-auto" style={{ color: theme.primary }} />
                  </div>
                ) : feedback.length === 0 ? (
                  <div className="text-center py-2 text-sm" style={{ color: theme.textLight }}>
                    No feedback yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {feedback
                      .filter(f => f.status === 'new')
                      .slice(0, 3)
                      .map((item) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all"
                          style={{ 
                            borderColor: theme.border,
                            backgroundColor: theme.background
                          }}
                          onClick={() => {
                            setActiveTab('feedback');
                            setSupportView('feedback');
                          }}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {item.type === 'bug' && <AlertTriangle size={14} style={{ color: theme.error }} />}
                              {item.type === 'suggestion' && <Lightbulb size={14} style={{ color: theme.warning }} />}
                              <span className="text-xs font-medium" style={{ color: theme.textLight }}>
                                {item.userEmail}
                              </span>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ 
                              backgroundColor: theme.warning + '20',
                              color: theme.warning
                            }}>
                              {item.status}
                            </span>
                          </div>
                          <p className="text-sm line-clamp-2" style={{ color: theme.text }}>
                            {item.message}
                          </p>
                        </div>
                      ))}
                    {feedback.filter(f => f.status === 'new').length > 3 && (
                      <button
                        onClick={() => {
                          setActiveTab('feedback');
                          setSupportView('feedback');
                        }}
                        className="w-full py-2 text-sm font-medium rounded-lg border transition-all hover:opacity-90"
                        style={{ 
                          borderColor: theme.primary,
                          color: theme.primary,
                          backgroundColor: 'transparent'
                        }}
                      >
                        View {feedback.filter(f => f.status === 'new').length - 3} more...
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Recent Tickets Preview */}
              <div className="space-y-3 mt-6">
                <h3 className="text-sm font-semibold" style={{ color: theme.primaryDark }}>Recent Support Requests</h3>
                {loading.feedback ? (
                  <div className="text-center py-2">
                    <Loader size={20} className="animate-spin mx-auto" style={{ color: theme.primary }} />
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-2 text-sm" style={{ color: theme.textLight }}>
                    No requests yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tickets
                      .filter(t => t.status === 'new')
                      .slice(0, 3)
                      .map((ticket) => (
                        <div
                          key={ticket.id}
                          className="p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all"
                          style={{ 
                            borderColor: theme.border,
                            backgroundColor: theme.background
                          }}
                          onClick={() => {
                            setActiveTab('feedback');
                            setSupportView('tickets');
                            setTicketView('list');
                            loadTicketChat(ticket.id);
                          }}
                        >
                          <div className="flex items-start justify-between mb-1">
                            <div className="flex items-center gap-2">
                              {ticket.type === 'bug' && <AlertTriangle size={14} style={{ color: theme.error }} />}
                              {ticket.type === 'suggestion' && <Lightbulb size={14} style={{ color: theme.warning }} />}
                              {ticket.type === 'support' && <Mail size={14} style={{ color: theme.info }} />}
                              <span className="text-xs font-medium" style={{ color: theme.text }}>
                                {ticket.subject}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              {ticket.customerReopened && (
                                <span 
                                  className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                                  style={{ 
                                    backgroundColor: theme.warning + '20',
                                    color: theme.warning
                                  }}
                                >
                                  Reopened
                                </span>
                              )}
                              <div className="flex items-center gap-1">
                                <div 
                                  className="w-2 h-2 rounded-full" 
                                  style={{ 
                                    backgroundColor: ticket.status === 'new' ? theme.success : ticket.status === 'in-progress' ? theme.warning : theme.error
                                  }} 
                                />
                                <span className="text-xs font-medium capitalize" style={{ 
                                  color: ticket.status === 'new' ? theme.success : ticket.status === 'in-progress' ? theme.warning : theme.error
                                }}>
                                  {ticket.status === 'resolved' || ticket.status === 'closed' ? 'Closed' : ticket.status}
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs mb-1" style={{ color: theme.textLight }}>
                            {ticket.userEmail}
                          </p>
                          <p className="text-xs font-bold" style={{ color: theme.primary }}>
                            #{ticket.ticketNumber || ticket.ticketId?.substring(0, 8) || ticket.id.substring(0, 8)}
                          </p>
                        </div>
                      ))}
                    {tickets.filter(t => t.status === 'new').length > 3 && (
                      <button
                        onClick={() => {
                          setActiveTab('feedback');
                          setSupportView('tickets');
                          setTicketView('list');
                        }}
                        className="w-full py-2 text-sm font-medium rounded-lg border transition-all hover:opacity-90"
                        style={{ 
                          borderColor: theme.primary,
                          color: theme.primary,
                          backgroundColor: 'transparent'
                        }}
                      >
                        View {tickets.filter(t => t.status === 'new').length - 3} more...
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* User Growth Chart with Shadows */}
            <div className="rounded-lg border-2 p-3 content-card" style={{ 
              borderColor: elegantPalette.gold.metallic + '40',
              backgroundColor: elegantPalette.dark.surface,
              boxShadow: `0 4px 12px ${elegantPalette.dark.deep}40`
            }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: elegantPalette.black.text }}>
                    <TrendingUp size={20} style={{ color: elegantPalette.gold.metallic }} />
                    User Growth
                  </h2>
                  <p className="text-sm mt-1" style={{ color: theme.textLight }}>Daily registration & activity</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ 
                  backgroundColor: elegantPalette.functional.success + '20',
                  color: elegantPalette.functional.success,
                  fontWeight: 600
                }}>
                  <TrendingUp size={16} />
                  +23% this week
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="lg:col-span-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-2">
                      <h3 className="text-sm font-semibold" style={{ color: theme.primaryDark }}>Daily New Signups (Last 14 Days)</h3>
                      <span className="text-xs" style={{ color: theme.textLight }}>
                        Total: {analytics.userGrowth.slice(-14).reduce((sum, d) => sum + d.newUsers, 0)} new users
                      </span>
                    </div>
                    <div className="h-56 flex items-end justify-between gap-1 p-4 rounded-lg" style={{ 
                    background: `linear-gradient(135deg, ${elegantPalette.dark.charcoal} 0%, ${elegantPalette.dark.surface} 100%)`,
                    boxShadow: `inset 0 2px 15px ${elegantPalette.dark.deep}80`
                  }}>
                      {analytics.userGrowth.slice(-14).map((day, index) => {
                        const maxNewUsers = Math.max(...analytics.userGrowth.slice(-14).map(d => d.newUsers), 1);
                        const hasNewUsers = day.newUsers > 0;
                        return (
                          <div key={day.date} className="flex flex-col items-center gap-1 flex-1 relative group">
                        <div 
                              className="rounded-t-lg w-full transition-all hover:scale-105 cursor-pointer relative"
                          style={{ 
                                background: hasNewUsers 
                                  ? `linear-gradient(180deg, ${elegantPalette.gold.gradientStart} 0%, ${elegantPalette.gold.gradientEnd} 100%)`
                                  : `${theme.border}`,
                                height: hasNewUsers ? `${(day.newUsers / maxNewUsers) * 180}px` : '2px',
                                minHeight: '2px',
                                boxShadow: hasNewUsers ? `0 2px 8px ${elegantPalette.dark.deep}40` : 'none'
                              }}
                            >
                              {hasNewUsers && (
                                <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                  {day.newUsers} new user{day.newUsers > 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                            <span className="text-xs font-medium" style={{ color: hasNewUsers ? theme.text : theme.textLight }}>
                          {new Date(day.date).getDate()}
                        </span>
                      </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="p-4 rounded-lg border-2" style={{ 
                    background: `linear-gradient(135deg, ${elegantPalette.dark.charcoal} 0%, ${elegantPalette.dark.surface} 100%)`,
                    borderColor: elegantPalette.gold.metallic + '30',
                    boxShadow: `0 2px 8px ${elegantPalette.dark.deep}40`
                  }}>
                    <div className="text-lg font-bold" style={{ color: elegantPalette.gold.metallic }}>{analytics.totalUsers}</div>
                    <div className="text-sm font-medium" style={{ color: theme.textLight }}>Total Users</div>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ 
                    background: `linear-gradient(135deg, ${elegantPalette.dark.surface} 0%, ${elegantPalette.dark.charcoal} 100%)`,
                    borderColor: elegantPalette.taupe.dark + '40',
                    boxShadow: `0 2px 15px ${elegantPalette.dark.deep}70, inset 0 1px 0 ${elegantPalette.taupe.dark}20`
                  }}>
                    <div className="text-lg font-bold" style={{ color: elegantPalette.taupe.light }}>{analytics.userGrowth.reduce((sum, day) => sum + day.newUsers, 0)}</div>
                    <div className="text-sm font-medium" style={{ color: theme.textLight }}>New This Month</div>
                  </div>
                  <div className="p-4 rounded-lg border-2" style={{ 
                    background: `linear-gradient(135deg, ${elegantPalette.dark.charcoal} 0%, ${elegantPalette.dark.surface} 100%)`,
                    borderColor: elegantPalette.functional.success + '50',
                    boxShadow: `0 2px 15px ${elegantPalette.dark.deep}70, inset 0 1px 0 ${elegantPalette.functional.success}30`
                  }}>
                    <div className="text-lg font-bold" style={{ color: elegantPalette.functional.success }}>{analytics.activeUsers}</div>
                    <div className="text-sm font-medium" style={{ color: theme.textLight }}>Active Users</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Feature Usage - Compact */}
            <div className="rounded-lg border p-4 content-card shadow-sm" style={{ 
              borderColor: elegantPalette.dark.soft + '50',
              background: `linear-gradient(135deg, ${elegantPalette.dark.charcoal} 0%, ${elegantPalette.dark.surface} 100%)`
            }}>
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} style={{ color: elegantPalette.gold.metallic }} />
                <h2 className="text-sm font-semibold" style={{ color: elegantPalette.black.text }}>Feature Usage (Estimated)</h2>
              </div>
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                {Object.entries(analytics.featureUsage).map(([feature, data]) => (
                  <div key={feature} className="text-center p-2 rounded-lg" style={{ 
                    background: '#FFFFFF',
                    border: `1px solid ${elegantPalette.dark.soft}`
                  }}>
                    <div className="text-lg font-bold" style={{ color: elegantPalette.taupe.light }}>{data.uses}</div>
                    <div className="text-[10px] font-medium capitalize" style={{ color: theme.textLight }}>{feature}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Device Breakdown - Full Width */}
              <div className="rounded-lg border p-4 content-card shadow-sm" style={{ 
                borderColor: theme.primary + '30',
                background: `linear-gradient(135deg, ${theme.primary}05 0%, ${theme.cardBackground} 100%)`
              }}>
                <h2 className="text-base font-semibold mb-3" style={{ color: theme.primaryDark }}>Device Breakdown</h2>
                <div className="space-y-2">
                  {/* Mobile */}
                  {analytics.deviceBreakdown.mobile && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Smartphone size={16} style={{ color: theme.info }} />
                          <span className="text-sm font-medium" style={{ color: theme.text }}>Mobile</span>
                        </div>
                        <span className="text-sm" style={{ color: theme.textLight }}>
                          {analytics.deviceBreakdown.mobile.count} ({analytics.deviceBreakdown.mobile.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full" 
                          style={{ width: `${analytics.deviceBreakdown.mobile.percentage}%`, backgroundColor: theme.info }}
                        />
                      </div>
                      {/* Mobile OS Breakdown */}
                      {analytics.deviceBreakdown.mobile.count > 0 && analytics.deviceBreakdown.mobile.byOS && (
                        <div className="pl-6 space-y-1 mt-2">
                          {Object.entries(analytics.deviceBreakdown.mobile.byOS).map(([os, count]) => {
                            if (count === 0) return null;
                            const osPercentage = Math.round((count / analytics.deviceBreakdown.mobile.count) * 100);
                            return (
                              <div key={os} className="flex items-center justify-between text-xs" style={{ color: theme.textLight }}>
                                <span>• {os}</span>
                                <span>{count} ({osPercentage}%)</span>
                    </div>
                            );
                          })}
                </div>
                      )}
          </div>
        )}

                  {/* Tablet */}
                  {analytics.deviceBreakdown.tablet && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Smartphone size={16} style={{ color: theme.warning }} />
                          <span className="text-sm font-medium" style={{ color: theme.text }}>Tablet</span>
                  </div>
                        <span className="text-sm" style={{ color: theme.textLight }}>
                          {analytics.deviceBreakdown.tablet.count} ({analytics.deviceBreakdown.tablet.percentage}%)
                        </span>
                  </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full" 
                          style={{ width: `${analytics.deviceBreakdown.tablet.percentage}%`, backgroundColor: theme.warning }}
                        />
                </div>
              </div>
                  )}
                  
                  {/* Desktop */}
                  {analytics.deviceBreakdown.desktop && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Monitor size={16} style={{ color: theme.success }} />
                          <span className="text-sm font-medium" style={{ color: theme.text }}>Desktop</span>
                  </div>
                        <span className="text-sm" style={{ color: theme.textLight }}>
                          {analytics.deviceBreakdown.desktop.count} ({analytics.deviceBreakdown.desktop.percentage}%)
                        </span>
                  </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="h-2 rounded-full" 
                          style={{ width: `${analytics.deviceBreakdown.desktop.percentage}%`, backgroundColor: theme.success }}
                        />
                </div>
              </div>
                  )}
                  
                  {/* Browser Breakdown */}
                  {analytics.deviceBreakdown.browsers && Object.keys(analytics.deviceBreakdown.browsers).length > 0 && (
                    <div className="pt-3 mt-3 border-t" style={{ borderColor: theme.border }}>
                      <div className="text-xs font-semibold mb-2" style={{ color: theme.textLight }}>BROWSERS</div>
                      <div className="space-y-1">
                        {Object.entries(analytics.deviceBreakdown.browsers)
                          .sort((a, b) => b[1] - a[1])
                          .map(([browser, count]) => {
                            const percentage = Math.round((count / analytics.deviceBreakdown.total) * 100);
                            return (
                              <div key={browser} className="flex items-center justify-between text-xs" style={{ color: theme.textLight }}>
                                <span>• {browser}</span>
                                <span>{count} ({percentage}%)</span>
                  </div>
                            );
                          })}
                  </div>
                </div>
                  )}
                  
                  {/* Warning for users without device info */}
                  {analytics.deviceBreakdown.usersWithoutDeviceInfo > 0 && (
                    <div className="mt-4 p-3 rounded-lg" style={{ backgroundColor: theme.warning + '15', borderColor: theme.warning, border: '1px solid' }}>
                      <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: theme.warning }}>
                        <Siren size={14} style={{ color: theme.warning }} />
                        Limited Device Data
                      </p>
                      <p className="text-xs" style={{ color: theme.text }}>
                        {analytics.deviceBreakdown.usersWithoutDeviceInfo} of {analytics.deviceBreakdown.total} users don't have device info yet (defaulting to desktop). 
                        They'll be tracked when they next log in.
                      </p>
                      <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                        Tracked: {analytics.deviceBreakdown.usersWithDeviceInfo} users ({Math.round((analytics.deviceBreakdown.usersWithDeviceInfo / analytics.deviceBreakdown.total) * 100)}%)
                      </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
        )}

        {activeTab === 'subscriptions' && (
          <div className="space-y-3">
            {/* User Search and Table */}
            <div className="rounded-lg border p-3 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <h2 className="text-lg font-semibold mb-2" style={{ color: theme.primaryDark }}>All Users</h2>
              <div className="mb-2">
                <input
                  type="text"
                  placeholder="Search users by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full p-3 rounded border"
                  style={{ borderColor: theme.border, backgroundColor: theme.background }}
                />
              </div>
              <UserTable 
                users={users} 
                searchTerm={searchTerm} 
                theme={theme}
                onViewUser={handleOpenUserModal}
              />
            </div>

            {/* Recent Registrations */}
            <div className="rounded-lg border p-3 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <h2 className="text-lg font-semibold mb-2" style={{ color: theme.primaryDark }}>Recent Registrations</h2>
              <div className="space-y-3">
                {subscriptions.recentRegistrations.length === 0 ? (
                  <div className="text-center py-2">
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
            <div className="rounded-lg border p-3 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>User Activity Details</h2>
                <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: theme.warning + '20', color: theme.warning }}>
                  Limited Tracking
                </span>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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
                      { label: 'Page Views', icon: Eye },
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
                      Additional analytics like page views and real-time user status can be implemented when needed. 
                      Current tracking covers the essentials: user growth, active users, device types, and feature usage estimates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="space-y-3">
            {/* Status Filter Tabs */}
            <div className="rounded-lg border content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="p-4 border-b" style={{ borderColor: theme.border }}>
                <h3 className="text-xs font-semibold mb-3" style={{ color: theme.textLight }}>FILTER BY STATUS</h3>
                <div className="flex items-center gap-3 overflow-x-auto pb-2">
                  {(() => {
                    const statusFilters = [
                      { id: 'new', label: 'New', icon: Clock, color: theme.warning },
                      { id: 'reviewed', label: 'Reviewed', icon: Eye, color: theme.info },
                      { id: 'resolved', label: 'Resolved', icon: CheckCircle, color: theme.success },
                      { id: 'all', label: 'All History', icon: LayoutDashboard, color: theme.primaryDark }
                    ];
                    
                    return statusFilters.map(filter => {
                      const count = filter.id === 'all' 
                        ? feedback.length 
                        : feedback.filter(f => f.status === filter.id).length;
                      const FilterIcon = filter.icon;
                      const isActive = selectedFeedbackStatusFilter === filter.id;
                      
                      return (
                        <button
                          key={filter.id}
                          onClick={() => {
                            setSelectedFeedbackStatusFilter(filter.id);
                            setSelectedFeedbackTypeFilter('all'); // Reset type filter when changing status
                          }}
                          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all"
                          style={{ 
                            backgroundColor: isActive ? filter.color + '25' : theme.background,
                            color: isActive ? filter.color : theme.text,
                            border: isActive ? `2px solid ${filter.color}` : `1px solid ${theme.border}`,
                            cursor: 'pointer'
                          }}
                        >
                          <FilterIcon size={16} strokeWidth={isActive ? 2.5 : 2} />
                          <span>{filter.label}</span>
                          <div className="px-2 py-0.5 rounded-full text-xs font-bold" 
                               style={{ 
                                 backgroundColor: isActive ? filter.color : theme.textLight + '30',
                                 color: isActive ? theme.white : theme.textLight 
                               }}>
                            {count}
                  </div>
                        </button>
                      );
                    });
                  })()}
              </div>
            </div>

              </div>

            {/* Main Tab Navigation */}
            <div className="rounded-lg border content-card shadow-sm mb-2" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="p-4">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setSupportView('feedback');
                      loadFeedback();
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      supportView === 'feedback' ? '' : 'opacity-60 hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: supportView === 'feedback' ? theme.primary + '20' : 'transparent',
                      color: supportView === 'feedback' ? theme.primary : theme.textLight,
                      border: `2px solid ${supportView === 'feedback' ? theme.primary : theme.border}`
                    }}
                  >
                    <MessageSquare size={18} />
                    <span>Feedback</span>
                    <div className="px-2 py-0.5 rounded-full text-xs font-bold" 
                         style={{ 
                           backgroundColor: supportView === 'feedback' ? theme.primary : theme.textLight + '30',
                           color: supportView === 'feedback' ? theme.white : theme.textLight 
                         }}>
                      {feedback.length}
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setSupportView('open-tickets');
                      setTicketView('list');
                      setSelectedTicketStatusFilter('new');
                      loadTickets();
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      supportView === 'open-tickets' ? '' : 'opacity-60 hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: supportView === 'open-tickets' ? theme.warning + '20' : 'transparent',
                      color: supportView === 'open-tickets' ? theme.warning : theme.textLight,
                      border: `2px solid ${supportView === 'open-tickets' ? theme.warning : theme.border}`
                    }}
                  >
                    <MessagesSquare size={18} />
                    <span>Open Tickets</span>
                    <div className="px-2 py-0.5 rounded-full text-xs font-bold" 
                         style={{ 
                           backgroundColor: supportView === 'open-tickets' ? theme.warning : theme.textLight + '30',
                           color: supportView === 'open-tickets' ? theme.white : theme.textLight 
                         }}>
                      {tickets.filter(t => t.status === 'new' || t.status === 'in-progress').length}
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      setSupportView('closed-tickets');
                      setTicketView('list');
                      setSelectedTicketStatusFilter('resolved');
                      loadTickets();
                    }}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                      supportView === 'closed-tickets' ? '' : 'opacity-60 hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: supportView === 'closed-tickets' ? theme.success + '20' : 'transparent',
                      color: supportView === 'closed-tickets' ? theme.success : theme.textLight,
                      border: `2px solid ${supportView === 'closed-tickets' ? theme.success : theme.border}`
                    }}
                  >
                    <CheckCircle size={18} />
                    <span>Closed Tickets</span>
                    <div className="px-2 py-0.5 rounded-full text-xs font-bold" 
                         style={{ 
                           backgroundColor: supportView === 'closed-tickets' ? theme.success : theme.textLight + '30',
                           color: supportView === 'closed-tickets' ? theme.white : theme.textLight 
                         }}>
                      {tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length}
                    </div>
                  </button>
                </div>
              </div>
            </div>

            {supportView === 'feedback' ? (
              <div className="rounded-lg border content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="p-6 border-b" style={{ borderColor: theme.border }}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Feedback</h2>
                      <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                        User feedback management with keyword-based categorization
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={async () => {
                          // Test admin message - send to current admin user
                          const testEmail = auth.currentUser?.email || email;
                          if (!testEmail) {
                            window.dispatchEvent(new CustomEvent('tpp:toast', { 
                              detail: { message: 'Please log in first', type: 'error' } 
                            }));
                            return;
                          }
                          try {
                            setLoading(prev => ({ ...prev, submitting: true }));
                            await createAdminMessage(testEmail, 'This is a test admin message! 🧪 You can use this to test the "From the Team🥼" chip and modal. This message will remain visible for 24 hours after you open it.', ADMIN_PASSWORD);
                            window.dispatchEvent(new CustomEvent('tpp:toast', { 
                              detail: { message: 'Test admin message sent! Check your dashboard.', type: 'success' } 
                            }));
                          } catch (error) {
                            console.error('❌ Failed to send test message:', error);
                            let errorMessage = 'Failed to send test message';
                            if (error.code === 'functions/internal' || error.code === 'functions/not-found') {
                              errorMessage = 'Function not deployed. Please deploy Firebase functions: cd functions && firebase deploy --only functions:createAdminMessage';
                            } else if (error.message) {
                              errorMessage = error.message;
                            }
                            window.dispatchEvent(new CustomEvent('tpp:toast', { 
                              detail: { message: errorMessage, type: 'error' } 
                            }));
                          } finally {
                            setLoading(prev => ({ ...prev, submitting: false }));
                          }
                        }}
                        disabled={loading.submitting}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all hover:opacity-90 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ 
                          borderColor: theme.primary + '60',
                          backgroundColor: theme.primary + '20',
                          color: theme.primary,
                          cursor: loading.submitting ? 'not-allowed' : 'pointer'
                        }}
                        title="Test Admin Message - sends a test message to your account"
                      >
                        <Shield size={14} />
                        {loading.submitting ? 'Sending...' : 'Test Message'}
                      </button>
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
                ) : (() => {
                  // Filter feedback based on selected status and type
                  const filteredFeedback = feedback.filter(item => {
                    // Apply status filter
                    if (selectedFeedbackStatusFilter !== 'all' && item.status !== selectedFeedbackStatusFilter) {
                      return false;
                    }
                    
                    // Apply type filter
                    if (selectedFeedbackTypeFilter !== 'all' && item.type !== selectedFeedbackTypeFilter) {
                      return false;
                    }
                    
                    return true;
                  });

                  if (filteredFeedback.length === 0) {
                    return (
                      <div className="p-8 text-center">
                        <MessageSquare size={48} className="mx-auto mb-3" style={{ color: theme.textLight }} />
                        <h3 className="font-semibold" style={{ color: theme.primaryDark }}>
                          {selectedFeedbackStatusFilter === 'all' ? 'No feedback yet' : `No ${selectedFeedbackStatusFilter} feedback in this category`}
                        </h3>
                        <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                          {selectedFeedbackStatusFilter === 'new' ? 'All caught up! 🎉' : 'No feedback matches these filters.'}
                        </p>
                      </div>
                    );
                  }

                  return filteredFeedback.map((item) => {
                    const isExpanded = expandedFeedback === item.id;
                    const statusColors = {
                      'new': { bg: theme.warning + '15', color: theme.warning, icon: Clock },
                      'reviewed': { bg: theme.info + '15', color: theme.info, icon: Eye },
                      'responded': { bg: theme.primary + '15', color: theme.primary, icon: MessageSquare },
                      'resolved': { bg: theme.success + '15', color: theme.success, icon: CheckCircle }
                    };
                    const statusConfig = statusColors[item.status] || statusColors.new;
                    const StatusIcon = statusConfig.icon;

                    // Feedback type colors and icons with vibrant styling
                    const typeColors = {
                      'suggestion': { bg: theme.primary + '25', color: theme.primary, borderColor: theme.primary, icon: Lightbulb, label: 'Suggestion' },
                      'bug': { bg: theme.error + '25', color: theme.error, borderColor: theme.error, icon: AlertTriangle, label: 'Bug' },
                      'improvement': { bg: theme.warning + '25', color: theme.warning, borderColor: theme.warning, icon: Star, label: 'Improvement' },
                      'general': { bg: theme.info + '25', color: theme.info, borderColor: theme.info, icon: MessageCircle, label: 'General' }
                    };
                    const typeConfig = item.type ? typeColors[item.type] : null;
                    const TypeIcon = typeConfig?.icon;

                    return (
                      <div key={item.id} className="p-4" style={{ 
                        borderLeft: typeConfig ? `4px solid ${typeConfig.borderColor}` : 'none'
                      }}>
                        <div className="flex items-start justify-between gap-4 min-w-0">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2 flex-wrap">
                              <div className="flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium" 
                                   style={{ backgroundColor: statusConfig.bg, color: statusConfig.color }}>
                                <StatusIcon size={12} />
                                {item.status}
                              </div>
                              {typeConfig && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm" 
                                     style={{ 
                                       backgroundColor: typeConfig.bg, 
                                       color: typeConfig.color,
                                       border: `2px solid ${typeConfig.borderColor}`
                                     }}>
                                  <TypeIcon size={14} strokeWidth={2.5} />
                                  {typeConfig.label}
                                </div>
                              )}
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
                            <p className={`text-sm break-words ${isExpanded ? '' : 'line-clamp-2'}`} style={{ color: theme.text }}>
                              {item.message}
                            </p>
                            {item.url && (
                              <p className="text-xs mt-1 break-all" style={{ color: theme.textLight }}>
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
                            
                            {(item.status === 'new' || item.status === 'reviewed' || item.status === 'resolved') && (
                              <button
                                onClick={() => {
                                  setRespondingToFeedback(item.id);
                                  setResponseText('');
                                  setExpandedFeedback(item.id);
                                }}
                                className="p-1 rounded hover:opacity-70"
                                style={{ color: theme.primary }}
                                title="Respond to feedback"
                              >
                                <MessageSquare size={16} />
                              </button>
                            )}
                            
                            {(item.status === 'new' || item.status === 'reviewed' || item.status === 'responded') && (
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
                            
                            {/* Show existing admin response if any */}
                            {item.adminResponse && (
                              <div className="p-3 rounded-lg border" style={{ borderColor: theme.primary + '30', backgroundColor: theme.primary + '10' }}>
                                <div className="flex items-center gap-2 mb-2">
                                  <MessageSquare size={14} style={{ color: theme.primary }} />
                                  <span className="text-sm font-medium" style={{ color: theme.primary }}>Your Response</span>
                                  {item.responseDate && (
                                    <span className="text-xs" style={{ color: theme.textLight }}>
                                      {item.responseDate.toDate ? item.responseDate.toDate().toLocaleDateString() : 'Recently'}
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm" style={{ color: theme.text }}>{item.adminResponse}</p>
                              </div>
                            )}

                            {/* Response form */}
                            {respondingToFeedback === item.id && (
                              <div className="space-y-3">
                                <label className="block text-sm font-medium" style={{ color: theme.text }}>
                                  Respond to {item.userEmail}
                                </label>
                                <textarea
                                  value={responseText}
                                  onChange={(e) => setResponseText(e.target.value)}
                                  className="w-full p-3 border rounded-lg text-sm"
                                  style={{ borderColor: theme.border, backgroundColor: theme.background }}
                                  rows="4"
                                  placeholder="Type your response to the user here..."
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleRespondToFeedback(item)}
                                    disabled={!responseText.trim() || loading.submitting}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                                  >
                                    {loading.submitting ? (
                                      <>
                                        <Loader size={14} className="animate-spin" />
                                        Sending...
                                      </>
                                    ) : (
                                      <>
                                        <Shield size={14} />
                                        Send Admin Message
                                      </>
                                    )}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setRespondingToFeedback(null);
                                      setResponseText('');
                                    }}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold border"
                                    style={{ borderColor: theme.border, color: theme.text }}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            )}

                            <div>
                              <label className="block text-sm font-medium mb-1" style={{ color: theme.text }}>
                                Admin Notes (Internal)
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
                  });
                })()}
              </div>
            </div>
            ) : (supportView === 'open-tickets' || supportView === 'closed-tickets') ? (
              // Tickets View
              ticketView === 'chat' && selectedTicket ? (
                // Chat View
                <div className="rounded-lg border content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                  <div className="p-6 border-b" style={{ borderColor: theme.border }}>
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <button
                          onClick={() => setTicketView('list')}
                          className="mb-2 text-sm flex items-center gap-2 hover:opacity-70 transition-opacity"
                          style={{ color: theme.primary }}
                        >
                          <ArrowLeft size={16} />
                          Back to Tickets
                        </button>
                        <h2 className="text-lg font-semibold mb-2" style={{ color: theme.primaryDark }}>
                          {selectedTicket.subject}
                        </h2>
                        <div className="flex items-center gap-4 text-sm" style={{ color: theme.textLight }}>
                          <span className="flex items-center gap-1">
                            <Mail size={14} />
                            {selectedTicket.userEmail}
                          </span>
                          <span>#{selectedTicket.ticketNumber || selectedTicket.id.substring(0, 8)}</span>
                        </div>
                      </div>
                      
                      {/* Traffic Light Status Buttons */}
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-semibold mr-2" style={{ color: theme.textLight }}>STATUS:</div>
                        <button
                          onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'new')}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                            selectedTicket.status === 'new' ? 'ring-2' : 'opacity-50 hover:opacity-75'
                          }`}
                          style={{
                            backgroundColor: selectedTicket.status === 'new' ? theme.success + '20' : theme.background,
                            color: theme.success,
                            ringColor: theme.success
                          }}
                        >
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.success }} />
                          <span className="text-sm">New</span>
                        </button>
                        <button
                          onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'in-progress')}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                            selectedTicket.status === 'in-progress' ? 'ring-2' : 'opacity-50 hover:opacity-75'
                          }`}
                          style={{
                            backgroundColor: selectedTicket.status === 'in-progress' ? theme.warning + '20' : theme.background,
                            color: theme.warning,
                            ringColor: theme.warning
                          }}
                        >
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.warning }} />
                          <span className="text-sm">In Progress</span>
                        </button>
                        <button
                          onClick={() => handleUpdateTicketStatus(selectedTicket.id, 'resolved')}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all ${
                            selectedTicket.status === 'resolved' || selectedTicket.status === 'closed' ? 'ring-2' : 'opacity-50 hover:opacity-75'
                          }`}
                          style={{
                            backgroundColor: (selectedTicket.status === 'resolved' || selectedTicket.status === 'closed') ? theme.error + '20' : theme.background,
                            color: theme.error,
                            ringColor: theme.error
                          }}
                        >
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.error }} />
                          <span className="text-sm">Closed</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-6">
                    {/* Messages */}
                    <div className="space-y-2 mb-2 max-h-[400px] overflow-y-auto">
                      {ticketMessages.length === 0 ? (
                        <div className="text-center py-8" style={{ color: theme.textLight }}>
                          <p>No messages yet</p>
                        </div>
                      ) : (
                        ticketMessages.map((msg) => (
                          <div
                            key={msg.id}
                            className={`flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className="max-w-[80%] rounded-lg p-3"
                              style={{
                                backgroundColor: msg.senderType === 'admin' 
                                  ? theme.primary 
                                  : theme.background,
                                color: msg.senderType === 'admin' 
                                  ? theme.textOnPrimary 
                                  : theme.text,
                                border: msg.senderType === 'user' ? `2px solid ${theme.primary}30` : 'none'
                              }}
                            >
                              <div className="text-xs mb-1 opacity-75 font-semibold">
                                {msg.senderType === 'user' ? '👤 ' : '🛡️ '}
                                {msg.senderName} • {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleString() : 'Recently'}
                              </div>
                              <div className="text-sm whitespace-pre-wrap">{msg.message || msg.text}</div>
                            </div>
                          </div>
                        ))
                      )}

                      {/* Closed Ticket Status - Admin View */}
                      {selectedTicket.status === 'closed' && (
                        <div className="my-6 space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-px" style={{ backgroundColor: theme.border }} />
                            <div className="flex items-center gap-2 px-3 py-1">
                              <span className="text-xs font-medium" style={{ color: theme.textLight }}>
                                Ticket Closed {selectedTicket.closedAt ? `· ${(() => {
                                  try {
                                    const date = selectedTicket.closedAt.toDate ? selectedTicket.closedAt.toDate() : new Date(selectedTicket.closedAt);
                                    return date.toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric'
                                    });
                                  } catch {
                                    return '';
                                  }
                                })()}` : ''}
                              </span>
                            </div>
                            <div className="flex-1 h-px" style={{ backgroundColor: theme.border }} />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Response Input */}
                    {selectedTicket.status !== 'closed' && (
                      <div className="border-t pt-4" style={{ borderColor: theme.border }}>
                        <textarea
                          value={ticketResponseText}
                          onChange={(e) => setTicketResponseText(e.target.value)}
                          placeholder="Type your response..."
                          rows={3}
                          className="w-full p-3 border rounded-lg text-sm mb-2"
                          style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                        />
                        <button
                          onClick={() => handleTicketResponse(selectedTicket.id)}
                          disabled={!ticketResponseText.trim() || loading.submitting}
                          className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                        >
                          {loading.submitting ? (
                            <>
                              <Loader size={14} className="animate-spin mr-2" />
                              Sending...
                            </>
                          ) : (
                            'Send Response'
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Tickets List View
                <div className="rounded-lg border content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                  <div className="p-6 border-b" style={{ borderColor: theme.border }}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold flex items-center gap-2" style={{ color: theme.primaryDark }}>
                          {supportView === 'open-tickets' ? (
                            <>
                              <MessagesSquare size={20} style={{ color: theme.warning }} />
                              Open Tickets
                            </>
                          ) : (
                            <>
                              <CheckCircle size={20} style={{ color: theme.success }} />
                              Closed Tickets
                            </>
                          )}
                        </h2>
                        <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                          {supportView === 'open-tickets' 
                            ? 'Active support tickets requiring attention' 
                            : 'Resolved and closed support tickets'}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-sm" style={{ color: theme.textLight }}>
                          {supportView === 'open-tickets'
                            ? `${tickets.filter(t => t.status === 'new' || t.status === 'in-progress').length} open`
                            : `${tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length} closed`
                          }
                        </div>
                        <button
                          onClick={loadTickets}
                          className="p-2 rounded hover:opacity-70"
                          style={{ color: theme.primary }}
                          title="Refresh"
                        >
                          <Loader size={16} className={loading.feedback ? 'animate-spin' : ''} />
                        </button>
                      </div>
                    </div>

                    {/* Search Input */}
                    <div className="mt-4 relative">
                      <input
                        type="text"
                        placeholder="Search by ticket # (e.g., Z005), email, or UID..."
                        value={ticketSearchQuery}
                        onChange={(e) => setTicketSearchQuery(e.target.value)}
                        className="w-full px-4 py-2 pr-10 rounded-lg border text-sm"
                        style={{
                          borderColor: theme.border,
                          backgroundColor: theme.background,
                          color: theme.text
                        }}
                      />
                      {ticketSearchQuery && (
                        <button
                          onClick={() => setTicketSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-opacity-10 hover:bg-gray-500"
                          style={{ color: theme.textLight }}
                          title="Clear search"
                        >
                          <X size={16} />
                        </button>
                      )}
                      {ticketSearchQuery && (
                        <div className="mt-2 text-xs px-2 py-1 rounded" style={{ backgroundColor: theme.warning + '20', color: theme.warning }}>
                          <strong>Active search filter:</strong> "{ticketSearchQuery}" - Clear to see all tickets
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="divide-y" style={{ borderColor: theme.border }}>
                    {loading.feedback ? (
                      <div className="p-8 text-center">
                        <Loader size={24} className="animate-spin mx-auto" style={{ color: theme.primary }} />
                        <p className="mt-2 text-sm" style={{ color: theme.textLight }}>Loading tickets...</p>
                      </div>
                    ) : tickets.length === 0 ? (
                      <div className="p-8 text-center">
                        <MessagesSquare size={48} className="mx-auto mb-3" style={{ color: theme.textLight }} />
                        <h3 className="font-semibold" style={{ color: theme.primaryDark }}>No tickets yet</h3>
                        <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                          Support requests will appear here when users submit them
                        </p>
                      </div>
                    ) : (
                      (() => {
                        const filteredTickets = tickets.filter(ticket => {
                          // Filter by tab (open vs closed)
                          if (supportView === 'open-tickets') {
                            if (ticket.status !== 'new' && ticket.status !== 'in-progress') return false;
                          } else if (supportView === 'closed-tickets') {
                            if (ticket.status !== 'resolved' && ticket.status !== 'closed') return false;
                          }
                          
                          // Search by ticket number, email, or user ID
                          if (ticketSearchQuery.trim()) {
                            const query = ticketSearchQuery.toLowerCase().trim();
                            const matchesNumber = ticket.ticketNumber?.toLowerCase().includes(query);
                            const matchesEmail = ticket.userEmail?.toLowerCase().includes(query);
                            const matchesUserId = ticket.userId?.toLowerCase().includes(query);
                            if (!matchesNumber && !matchesEmail && !matchesUserId) return false;
                          }
                          return true;
                        });
                        
                        console.log('🎫 Ticket Filtering Debug:', {
                          totalTickets: tickets.length,
                          supportView,
                          searchQuery: ticketSearchQuery,
                          filteredCount: filteredTickets.length,
                          allTickets: tickets.map(t => ({ 
                            number: t.ticketNumber, 
                            status: t.status, 
                            email: t.userEmail 
                          })),
                          filteredTickets: filteredTickets.map(t => ({ 
                            number: t.ticketNumber, 
                            status: t.status 
                          }))
                        });
                        
                        if (filteredTickets.length === 0) {
                          return (
                            <div className="p-8 text-center">
                              <Search size={48} className="mx-auto mb-3" style={{ color: theme.textLight }} />
                              <h3 className="font-semibold" style={{ color: theme.primaryDark }}>
                                {ticketSearchQuery ? 'No matching tickets' : `No ${supportView === 'open-tickets' ? 'open' : 'closed'} tickets`}
                              </h3>
                              <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                                {ticketSearchQuery 
                                  ? `No tickets match "${ticketSearchQuery}". Try clearing the search filter.`
                                  : supportView === 'open-tickets' 
                                    ? 'All tickets have been closed or resolved'
                                    : 'No tickets have been closed yet'
                                }
                              </p>
                              {ticketSearchQuery && (
                                <button
                                  onClick={() => setTicketSearchQuery('')}
                                  className="mt-4 px-4 py-2 rounded-lg font-medium hover:opacity-90"
                                  style={{
                                    backgroundColor: theme.primary,
                                    color: theme.white
                                  }}
                                >
                                  Clear Search Filter
                                </button>
                              )}
                            </div>
                          );
                        }
                        
                        return filteredTickets.map((ticket) => (
                          <div
                            key={ticket.id}
                            className="p-4 hover:bg-opacity-50 transition-colors cursor-pointer"
                            style={{ backgroundColor: theme.background }}
                            onClick={() => loadTicketChat(ticket.id)}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                {ticket.type === 'bug' && <AlertTriangle size={16} style={{ color: theme.error }} />}
                                {ticket.type === 'suggestion' && <Lightbulb size={16} style={{ color: theme.warning }} />}
                                {ticket.type === 'support' && <Mail size={16} style={{ color: theme.info }} />}
                                <span className="font-semibold" style={{ color: theme.text }}>{ticket.subject}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {ticket.customerReopened && (
                                  <span 
                                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                                    style={{ 
                                      backgroundColor: theme.warning + '20',
                                      color: theme.warning
                                    }}
                                  >
                                    Reopened
                                  </span>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <div 
                                    className="w-2 h-2 rounded-full" 
                                    style={{ 
                                      backgroundColor: ticket.status === 'new' ? theme.success : ticket.status === 'in-progress' ? theme.warning : theme.error
                                    }} 
                                  />
                                  <span className="text-xs font-medium capitalize" style={{ 
                                    color: ticket.status === 'new' ? theme.success : ticket.status === 'in-progress' ? theme.warning : theme.error
                                  }}>
                                    {ticket.status === 'resolved' || ticket.status === 'closed' ? 'Closed' : ticket.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1 mb-2">
                              <p className="text-sm font-medium" style={{ color: theme.text }}>
                                {ticket.userEmail}
                              </p>
                              {ticket.userId && (
                                <p className="text-xs font-mono" style={{ color: theme.textLight }}>
                                  UID: {ticket.userId.substring(0, 20)}...
                                </p>
                              )}
                              <p className="text-xs" style={{ color: theme.primary }}>
                                Ticket #{ticket.ticketId?.substring(0, 8) || ticket.id.substring(0, 8)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 text-xs" style={{ color: theme.textLight }}>
                              <Clock size={12} />
                              {ticket.lastMessageAt?.toDate ? new Date(ticket.lastMessageAt.toDate()).toLocaleString() : 'Recently'}
                            </div>
                          </div>
                        ));
                      })()
                    )}
                  </div>
                </div>
              )
            ) : null}
          </div>
        )}

        {activeTab === 'lifetime' && (
          <div className="space-y-3">
            {/* Lifetime Code Manager - Physical Kit Redemption */}
            <LifetimeCodeManager theme={theme} />
            
            {/* Manual Grant Tool */}
            <ManualLifetimeGrant 
              theme={theme} 
              onUserAdded={() => {
                loadLifetimeUsers();
                console.log('User added, refreshing list');
              }} 
            />

            {/* Lifetime Access Audit Tool */}
            <LifetimeAccessAudit theme={theme} />

            {/* Lifetime Users List */}
            <div className="rounded-lg border p-3 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>
                  Lifetime Access Entries ({lifetimeUsers.length})
                </h2>
              </div>

              <p style={{ color: theme.textLight, fontSize: '13px', marginBottom: '16px' }}>
                Includes activated lifetime accounts and pending pre-grants awaiting user signup.
              </p>

              {loading.lifetimeUsers ? (
                <div style={{ textAlign: 'center', padding: '40px', color: theme.textLight }}>
                  <Loader className="animate-spin mx-auto mb-2" size={24} />
                  <p>Loading lifetime users...</p>
                </div>
              ) : lifetimeUsers.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '40px', 
                  backgroundColor: theme.background, 
                  borderRadius: '8px',
                  border: `1px dashed ${theme.border}` 
                }}>
                  <Award size={48} style={{ color: theme.textLight, margin: '0 auto 16px' }} />
                  <p style={{ color: theme.textLight, marginBottom: '8px' }}>No lifetime users found in Firestore</p>
                  <p style={{ color: theme.textLight, fontSize: '14px' }}>Use the migration tool above to import from localStorage</p>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead>
                      <tr style={{ borderBottom: `2px solid ${theme.border}` }}>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: theme.textLight, fontWeight: '600', fontSize: '13px' }}>Email</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: theme.textLight, fontWeight: '600', fontSize: '13px' }}>Reason</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: theme.textLight, fontWeight: '600', fontSize: '13px' }}>Granted</th>
                        <th style={{ padding: '8px 12px', textAlign: 'left', color: theme.textLight, fontWeight: '600', fontSize: '13px' }}>Status</th>
                        <th style={{ padding: '8px 12px', textAlign: 'center', color: theme.textLight, fontWeight: '600', fontSize: '13px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lifetimeUsers.map((user, idx) => {
                        const IconComponent = user.isPreGrant ? Clock : Award;
                        const iconColor = user.isPreGrant
                          ? (theme.warning || '#b45309')
                          : (theme.warning || '#f59e0b');

                        const statusBadge = (() => {
                          const statusValue = (user.status || '').toLowerCase();
                          if (statusValue === 'applied') {
                            return {
                              label: '✓ Activated',
                              bg: theme.successBg || `${theme.success || '#10b981'}20`,
                              color: theme.success || '#047857'
                            };
                          }
                          if (user.isPreGrant || statusValue === 'pending') {
                            return {
                              label: 'Pending Activation',
                              bg: theme.warningBg || `${theme.warning || '#f59e0b'}20`,
                              color: theme.warning || '#b45309'
                            };
                          }
                          if (statusValue === 'active') {
                            return {
                              label: 'Active',
                              bg: theme.successBg || `${theme.success || '#10b981'}20`,
                              color: theme.success || '#047857'
                            };
                          }
                          if (statusValue === 'revoked') {
                            return {
                              label: 'Revoked',
                              bg: theme.errorBg || `${theme.error || '#ef4444'}20`,
                              color: theme.error || '#b91c1c'
                            };
                          }
                          return {
                            label: (user.status || 'Unknown').replace(/\b\w/g, char => char.toUpperCase()),
                            bg: theme.textLight ? `${theme.textLight}20` : '#e5e7eb',
                            color: theme.textLight || '#4b5563'
                          };
                        })();

                        const grantedDate = user.grantedAt?.toDate
                          ? formatMMDDYYYY(user.grantedAt.toDate())
                          : (user.grantedAt ? new Date(user.grantedAt).toLocaleDateString() : 'N/A');

                        return (
                          <tr key={user.id || idx} style={{ borderBottom: `1px solid ${theme.border}` }}>
                            <td style={{ padding: '8px 12px', fontSize: '13px', color: theme.text, minWidth: '200px' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <IconComponent size={14} style={{ color: iconColor, flexShrink: 0 }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {user.email}
                                </span>
                                </div>
                                {user.status === 'applied' && user.appliedToUserId && (
                                  <span style={{ fontSize: '11px', color: theme.textLight, marginLeft: '20px' }}>
                                    → User ID: {user.appliedToUserId.substring(0, 8)}...
                                  </span>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '8px 12px', fontSize: '13px', color: theme.textLight, minWidth: '150px' }}>
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', display: 'block', whiteSpace: 'nowrap' }}>
                                {user.reason || 'N/A'}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', fontSize: '13px', color: theme.textLight, whiteSpace: 'nowrap' }}>
                              {grantedDate}
                            </td>
                            <td style={{ padding: '8px 12px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                              <span style={{
                                padding: '3px 10px',
                                borderRadius: '10px',
                                fontSize: '11px',
                                fontWeight: '600',
                                backgroundColor: statusBadge.bg,
                                color: statusBadge.color,
                                whiteSpace: 'nowrap'
                              }}>
                                {statusBadge.label}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                              {user.isPreGrant ? (
                                user.status === 'applied' ? (
                                  <span style={{ fontSize: '11px', color: theme.textLight, fontStyle: 'italic' }}>
                                    Already Applied
                                  </span>
                                ) : (
                                <button
                                  onClick={() => handleCancelPreGrant(user.email)}
                                  style={{
                                    padding: '4px 10px',
                                    backgroundColor: theme.warning || '#f59e0b',
                                    color: '#fff',
                                    border: 'none',
                                    borderRadius: '5px',
                                    fontSize: '11px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Cancel Pre-Grant
                                </button>
                                )
                              ) : (
                                <button
                                  onClick={async () => {
                                    if (window.confirm(`Revoke lifetime access for ${user.email}?`)) {
                                      try {
                                        await revokeLifetimeAccess(user.userId || user.id, 'admin', 'Manual revocation');
                                        await loadLifetimeUsers();
                                        alert('Lifetime access revoked');
                                      } catch (error) {
                                        console.error('Error revoking access:', error);
                                        alert('Failed to revoke access');
                                      }
                                    }
                                  }}
                                  style={{
                                    padding: '4px 10px',
                                    backgroundColor: theme.error,
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '5px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  Revoke
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'annual' && (
          <div className="space-y-3">
            {/* Annual Code Manager - Physical Kit Redemption (1 Year) */}
            <AnnualCodeManager theme={theme} />
          </div>
        )}

        {activeTab === 'content' && (
          <div className="space-y-3">
            {/* Action Buttons */}
            <div className="flex justify-end gap-3">
              <button
                onClick={loadContentData}
                className="p-2.5 rounded-lg flex items-center justify-center hover:scale-105 transition-all"
                style={{ 
                  backgroundColor: theme.primary + '15',
                  border: `1px solid ${theme.primary}30`,
                  color: theme.primary
                }}
                title="Reload Data"
              >
                <RefreshCw size={18} />
              </button>
              <button
                onClick={saveContentData}
                className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
                style={{ backgroundColor: theme.success, color: theme.textOnPrimary }}
              >
                <Save size={18} />
                Save All Changes
              </button>
            </div>

            {/* Research Topics Management */}
            <div className="rounded-lg border p-3 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Research Topics (Glossary)</h2>
                  <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                    Manage research topics shown in the glossary and global search.
                  </p>
                </div>
                <span className="text-sm px-3 py-1 rounded-full font-medium" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
                  {contentData.topics.length} topics
                </span>
              </div>
              
              <div className="space-y-2">
                {/* Add New Topic */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter a new research topic..."
                    value={contentData.newTopic}
                    onChange={(e) => setContentData(prev => ({ ...prev, newTopic: e.target.value }))}
                    className="flex-1 p-3 rounded border"
                    style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && contentData.newTopic.trim()) {
                        setContentData(prev => ({
                          ...prev,
                          topics: [...prev.topics, { id: generateId(), name: contentData.newTopic.trim() }],
                          newTopic: ''
                        }));
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (contentData.newTopic.trim()) {
                        setContentData(prev => ({
                          ...prev,
                          topics: [...prev.topics, { id: generateId(), name: contentData.newTopic.trim() }],
                          newTopic: ''
                        }));
                      }
                    }}
                    className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                  >
                    <Plus size={18} />
                    Add
                  </button>
                </div>

                {/* Topics List */}
                <div className="space-y-2">
                  {contentData.topics.length === 0 ? (
                    <div className="text-center py-8" style={{ color: theme.textLight }}>
                      <p>No research topics yet. Add some above!</p>
                    </div>
                  ) : (
                    contentData.topics.map((topic) => (
                      <div key={topic.id} className="flex items-center justify-between p-3 rounded border" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                        <span style={{ color: theme.text }}>{topic.name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingTopic(topic);
                              setShowTopicModal(true);
                            }}
                            className="p-1 hover:opacity-70"
                            style={{ color: theme.info }}
                            title="Edit details"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setContentData(prev => ({
                                ...prev,
                                topics: prev.topics.filter(t => t.id !== topic.id)
                              }));
                            }}
                            className="text-red-500 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Pen Types Management */}
            <div className="rounded-lg border p-3 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Pen Types</h2>
                  <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                    Manage pen brands/types shown in protocol editor dropdown.
                  </p>
                </div>
                <span className="text-sm px-3 py-1 rounded-full font-medium" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
                  {contentData.penTypes.length} types
                </span>
              </div>
              
              <div className="space-y-2">
                {/* Add New Pen Type */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter a pen type (e.g., Omnipod, Mounjaro Pen)..."
                    value={contentData.newPenType}
                    onChange={(e) => setContentData(prev => ({ ...prev, newPenType: e.target.value }))}
                    className="flex-1 p-3 rounded border"
                    style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && contentData.newPenType.trim()) {
                        setContentData(prev => ({
                          ...prev,
                          penTypes: [...prev.penTypes, { id: generateId(), name: contentData.newPenType.trim() }],
                          newPenType: ''
                        }));
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (contentData.newPenType.trim()) {
                        setContentData(prev => ({
                          ...prev,
                          penTypes: [...prev.penTypes, { id: generateId(), name: contentData.newPenType.trim() }],
                          newPenType: ''
                        }));
                      }
                    }}
                    className="px-4 py-2 rounded-lg font-semibold flex items-center gap-2 hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                  >
                    <Plus size={18} />
                    Add
                  </button>
                </div>

                {/* Pen Types List */}
                <div className="space-y-2">
                  {contentData.penTypes.length === 0 ? (
                    <div className="text-center py-8" style={{ color: theme.textLight }}>
                      <p>No pen types yet. Add some above!</p>
                    </div>
                  ) : (
                    contentData.penTypes.map((pen) => (
                      <div key={pen.id} className="flex items-center justify-between p-3 rounded border" style={{ borderColor: theme.border, backgroundColor: theme.background }}>
                        <span style={{ color: theme.text }}>{pen.name}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              setEditingPenType(pen);
                              setShowPenTypeModal(true);
                            }}
                            className="p-1 hover:opacity-70"
                            style={{ color: theme.info }}
                            title="Edit details"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => {
                              setContentData(prev => ({
                                ...prev,
                                penTypes: prev.penTypes.filter(p => p.id !== pen.id)
                              }));
                            }}
                            className="text-red-500 hover:text-red-700"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <SecurityManager theme={theme} />
        )}

        {activeTab === 'agreements' && (
          <AgreementTracking theme={theme} />
        )}

        {activeTab === 'version' && (
          <VersionManager theme={theme} />
        )}

        {activeTab === 'pushNotifications' && (
          <div className="space-y-3">
            <PushNotificationBroadcast theme={theme} />
            <TriggeredNotificationManager theme={theme} />
          </div>
        )}

        {activeTab === 'inAppNotifications' && (
          <div className="space-y-3">
            <InAppNotificationManager theme={theme} />
          </div>
        )}

        {activeTab === 'emails' && (
          <div className="space-y-3">
            <EmailDiagnostic theme={theme} />
            <EmailQueueManager theme={theme} />
            <SingleMessageSender theme={theme} />
            <EmailTemplateManager theme={theme} />
            <ExpiredTrialManager theme={theme} />
            <EmailHistory theme={theme} />
          </div>
        )}

        {activeTab === 'emailTriggers' && (
          <div className="space-y-3">
            <EmailTriggerManager theme={theme} />
          </div>
        )}

        {activeTab === 'improvements' && (
          <div className="space-y-3">
            <ImprovementsTracker theme={theme} />
          </div>
        )}

        {/* Gifts Tab */}
        {activeTab === 'gifts' && (
          <div className="space-y-3">
            {/* Gift Analytics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-6 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: theme.textLight }}>Total Gifts</p>
                    <p className="text-lg font-bold" style={{ color: theme.primary }}>{giftAnalytics.total}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primary + '15' }}>
                    <Star size={24} style={{ color: theme.primary }} />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: theme.textLight }}>Pending</p>
                    <p className="text-lg font-bold text-yellow-600">{giftAnalytics.pending}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-yellow-100">
                    <Clock size={24} className="text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: theme.textLight }}>Redeemed</p>
                    <p className="text-lg font-bold text-green-600">{giftAnalytics.redeemed}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100">
                    <CheckCircle size={24} className="text-green-600" />
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium" style={{ color: theme.textLight }}>Revenue</p>
                    <p className="text-lg font-bold text-green-600">${giftAnalytics.totalRevenue.toFixed(2)}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100">
                    <DollarSign size={24} className="text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Gift Types Breakdown */}
            <div className="p-6 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>Gift Types</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: theme.background }}>
                  <p className="text-sm font-medium" style={{ color: theme.textLight }}>Monthly</p>
                  <p className="text-xl font-bold" style={{ color: theme.primary }}>{giftAnalytics.byType.monthly}</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: theme.background }}>
                  <p className="text-sm font-medium" style={{ color: theme.textLight }}>Quarterly</p>
                  <p className="text-xl font-bold" style={{ color: theme.primary }}>{giftAnalytics.byType.quarterly}</p>
                </div>
                <div className="text-center p-4 rounded-lg" style={{ backgroundColor: theme.background }}>
                  <p className="text-sm font-medium" style={{ color: theme.textLight }}>Annual</p>
                  <p className="text-xl font-bold" style={{ color: theme.primary }}>{giftAnalytics.byType.annual}</p>
                </div>
              </div>
            </div>

            {/* Recent Gifts */}
            <div className="p-6 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>Recent Gifts</h3>
              {giftAnalytics.recentGifts.length > 0 ? (
                <div className="space-y-3">
                  {giftAnalytics.recentGifts.map((gift, index) => (
                    <div key={gift.giftId || index} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: theme.background }}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primary + '15' }}>
                          <Star size={20} style={{ color: theme.primary }} />
                        </div>
                        <div>
                          <p className="font-medium" style={{ color: theme.text }}>
                            {gift.giftGiverName} → {gift.recipientEmail}
                          </p>
                          <p className="text-sm" style={{ color: theme.textLight }}>
                            {gift.subscriptionType === 'monthly' ? '1 Month' :
                             gift.subscriptionType === 'quarterly' ? '3 Months' : '1 Year'} • ${gift.pricePaid}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          gift.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          gift.status === 'redeemed' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {gift.status}
                        </span>
                        <span className="text-xs" style={{ color: theme.textLight }}>
                          {gift.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8" style={{ color: theme.textLight }}>No gifts found</p>
              )}
            </div>
          </div>
        )}

        </div>
      </div>
      {isUserModalOpen && selectedUser && (
        <UserDetailModal 
          user={selectedUser} 
          onClose={() => {
            setIsUserModalOpen(false);
            setSelectedUser(null);
          }}
          theme={theme}
          onExtendTrial={handleExtendTrial}
          isExtendingTrial={isExtendingTrial}
          isLoadingDetails={isLoadingUserDetails}
          adminPassword={ADMIN_PASSWORD}
        />
      )}

      {/* Research Topic Edit Modal */}
      {showTopicModal && editingTopic && (
        <Modal
          isOpen={showTopicModal}
          onClose={() => {
            setShowTopicModal(false);
            setEditingTopic(null);
          }}
          title="Edit Research Topic"
          theme={theme}
          size="large"
        >
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                Topic Name
              </label>
              <input
                type="text"
                value={editingTopic.name || ''}
                onChange={(e) => setEditingTopic({...editingTopic, name: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                Description
              </label>
              <textarea
                value={editingTopic.description || ''}
                onChange={(e) => setEditingTopic({...editingTopic, description: e.target.value})}
                rows={4}
                className="w-full px-3 py-2 border rounded-lg"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                placeholder="Add a description for this research topic..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                Category
              </label>
              <input
                type="text"
                value={editingTopic.category || ''}
                onChange={(e) => setEditingTopic({...editingTopic, category: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                placeholder="e.g., Peptide, Hormone, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                Common Names / Aliases
              </label>
              <input
                type="text"
                value={(editingTopic.aliases || []).join(', ')}
                onChange={(e) => setEditingTopic({
                  ...editingTopic, 
                  aliases: e.target.value.split(',').map(a => a.trim()).filter(Boolean)
                })}
                className="w-full px-3 py-2 border rounded-lg"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                placeholder="Separate with commas"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => {
                  setShowTopicModal(false);
                  setEditingTopic(null);
                }}
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: theme.border, color: theme.text }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setContentData(prev => ({
                    ...prev,
                    topics: prev.topics.map(t => t.id === editingTopic.id ? editingTopic : t)
                  }));
                  setShowTopicModal(false);
                  setEditingTopic(null);
                  window.dispatchEvent(new CustomEvent('tpp:toast', {
                    detail: { message: 'Topic updated! Remember to save changes.', type: 'success' }
                  }));
                }}
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                Update Topic
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Pen Type Edit Modal */}
      {showPenTypeModal && editingPenType && (
        <Modal
          isOpen={showPenTypeModal}
          onClose={() => {
            setShowPenTypeModal(false);
            setEditingPenType(null);
          }}
          title="Edit Pen Type"
          theme={theme}
        >
          <div className="space-y-2">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                Pen Type Name
              </label>
              <input
                type="text"
                value={editingPenType.name || ''}
                onChange={(e) => setEditingPenType({...editingPenType, name: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                ID / Value
              </label>
              <input
                type="text"
                value={editingPenType.id || ''}
                onChange={(e) => setEditingPenType({...editingPenType, id: e.target.value})}
                className="w-full px-3 py-2 border rounded-lg"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                placeholder="e.g., tirz_pen, sema_pen"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                onClick={() => {
                  setShowPenTypeModal(false);
                  setEditingPenType(null);
                }}
                className="px-4 py-2 rounded-lg border"
                style={{ borderColor: theme.border, color: theme.text }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setContentData(prev => ({
                    ...prev,
                    penTypes: prev.penTypes.map(p => p.id === editingPenType.id ? editingPenType : p)
                  }));
                  setShowPenTypeModal(false);
                  setEditingPenType(null);
                  window.dispatchEvent(new CustomEvent('tpp:toast', {
                    detail: { message: 'Pen type updated! Remember to save changes.', type: 'success' }
                  }));
                }}
                className="px-4 py-2 rounded-lg"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                Update Pen Type
              </button>
            </div>
          </div>
        </Modal>
        )}
        </div>
      </div>
  );
}

// Lifetime Access Audit Component
function LifetimeAccessAudit({ theme }) {
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState(null);
  const [showResults, setShowResults] = useState(false);

  const runAudit = async () => {
    setIsAuditing(true);
    setShowResults(false);
    
    try {
      const functions = getFunctions();
      const auditFunction = httpsCallable(functions, 'auditLifetimeAccess');
      const result = await auditFunction();
      
      setAuditResults(result.data.findings);
      setShowResults(true);
      
      console.log('🔍 Audit Results:', result.data.findings);
      
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          message: `Audit complete! Found ${result.data.findings.conflictingUsers.length} potential conflicts.`, 
          type: result.data.findings.conflictingUsers.length > 0 ? 'warning' : 'success'
        }
      }));
    } catch (error) {
      console.error('❌ Audit failed:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: error.message || 'Audit failed', type: 'error' }
      }));
    } finally {
      setIsAuditing(false);
    }
  };

  return (
    <div className="rounded-lg border p-3 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Shield size={20} style={{ color: theme.warning }} />
          <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>
            Lifetime Access Audit
          </h2>
        </div>
        <button
          onClick={runAudit}
          disabled={isAuditing}
          className="px-4 py-2 rounded-lg font-semibold text-sm transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          style={{
            backgroundColor: theme.warning,
            color: '#FFFFFF',
            opacity: isAuditing ? 0.5 : 1
          }}
        >
          {isAuditing ? (
            <>
              <Loader className="animate-spin" size={14} />
              Auditing...
            </>
          ) : (
            <>
              <Search size={14} />
              Run Audit
            </>
          )}
        </button>
      </div>

      <p className="text-sm mb-2" style={{ color: theme.textLight }}>
        Scan all users to find anyone with lifetime access data who might be showing as "Trialing" in the app. This is read-only and won't change any accounts.
      </p>

      {showResults && auditResults && (
        <div className="mt-4 space-y-2">
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: theme.background }}>
              <div className="text-lg font-bold" style={{ color: elegantPalette.gold.metallic }}>{auditResults.totalUsers}</div>
              <div className="text-xs" style={{ color: theme.textLight }}>Total Users</div>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: theme.success + '20' }}>
              <div className="text-lg font-bold" style={{ color: theme.success }}>
                {auditResults.summary.totalUsersWithLifetimeAccess}
              </div>
              <div className="text-xs" style={{ color: theme.textLight }}>Have Lifetime Access</div>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: auditResults.conflictingUsers.length > 0 ? theme.warning + '20' : theme.success + '20' }}>
              <div className="text-lg font-bold" style={{ color: auditResults.conflictingUsers.length > 0 ? theme.warning : theme.success }}>
                {auditResults.conflictingUsers.length}
              </div>
              <div className="text-xs" style={{ color: theme.textLight }}>Conflicts Found</div>
            </div>
            <div className="p-3 rounded-lg" style={{ backgroundColor: theme.background }}>
              <div className="text-sm font-bold flex items-center gap-1" style={{ color: theme.text }}>
                {auditResults.summary.consistencyCheck.allThreeCollectionsMatch ? (
                  <>✓ Synced</>
                ) : (
                  <>
                    <Siren size={14} style={{ color: theme.text }} />
                    Out of Sync
                  </>
                )}
              </div>
              <div className="text-xs" style={{ color: theme.textLight }}>Collection Status</div>
            </div>
          </div>

          {/* Conflicting Users Table */}
          {auditResults.conflictingUsers.length > 0 ? (
            <div className="rounded-lg border" style={{ borderColor: theme.border }}>
              <div className="p-3" style={{ backgroundColor: theme.warning + '10', borderBottom: `1px solid ${theme.border}` }}>
                <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: theme.warning }}>
                  <AlertTriangle size={16} />
                  Users with Lifetime Access Conflicts
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${theme.border}`, backgroundColor: theme.background }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: theme.textLight }}>Email</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: theme.textLight }}>Conflict Type</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: theme.textLight }}>Current Status</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: theme.textLight }}>Granted By</th>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: '12px', color: theme.textLight }}>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditResults.conflictingUsers.map((user, idx) => (
                      <tr key={user.userId} style={{ borderBottom: `1px solid ${theme.border}` }}>
                        <td style={{ padding: '8px 12px', fontSize: '13px', color: theme.text }}>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.email}</span>
                            <span className="text-xs opacity-60">{user.userId.substring(0, 8)}...</span>
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '12px' }}>
                          <span className="px-2 py-1 rounded" style={{ 
                            backgroundColor: theme.warning + '20', 
                            color: theme.warning,
                            fontWeight: '500'
                          }}>
                            {user.conflictType}
                          </span>
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '12px', color: theme.text }}>
                          {user.currentStatus}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '12px', color: theme.text }}>
                          {user.lifetimeGrantedBy}
                        </td>
                        <td style={{ padding: '8px 12px', fontSize: '12px', color: theme.textLight }}>
                          {user.lifetimeReason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-lg text-center" style={{ backgroundColor: theme.success + '10', border: `1px solid ${theme.success}40` }}>
              <CheckCircle size={24} className="mx-auto mb-2" style={{ color: theme.success }} />
              <p className="text-sm font-medium" style={{ color: theme.success }}>
                ✅ No conflicts found! All lifetime access grants are correctly set.
              </p>
            </div>
          )}

          {/* Data Locations Breakdown */}
          <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: theme.background, border: `1px solid ${theme.border}` }}>
            <div className="font-semibold mb-2" style={{ color: theme.textLight }}>Lifetime Access Data Locations:</div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <span style={{ color: theme.text }}>lifetimeAccess: </span>
                <span style={{ color: theme.warning }}>{auditResults.lifetimeInLifetimeCollection} users</span>
              </div>
              <div>
                <span style={{ color: theme.text }}>users: </span>
                <span style={{ color: theme.warning }}>{auditResults.lifetimeInUsersCollection} users</span>
              </div>
              <div>
                <span style={{ color: theme.text }}>userSubscriptions: </span>
                <span style={{ color: theme.warning }}>{auditResults.lifetimeInUserSubscriptions} users</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserTable({ users, searchTerm, theme, onViewUser }) {
  const filteredUsers = users
    .filter(user => {
    const term = searchTerm.toLowerCase();
    const email = user.email?.toLowerCase() || '';
    const name = user.displayName?.toLowerCase() || '';
    return email.includes(term) || name.includes(term);
    })
    .sort((a, b) => {
      // Sort by signup date (newest first)
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
      return dateB - dateA; // Descending order (newest first)
    });

  const getSubscriptionStatus = (user) => {
    // Check for lifetime access first
    if (user.subscription?.hasLifetimeAccess || user.subscription?.interval === 'lifetime') {
      return { label: 'Lifetime', color: 'bg-amber-100 text-amber-800', dotColor: '#f59e0b' };
    }

    // Check for active paid subscription
    if (user.subscription?.status === 'active' && user.subscription?.plan) {
      return { label: 'Subscribed', color: 'bg-green-100 text-green-800', dotColor: '#22c55e' };
    }

    // Check trial status
    let trialEndDate = null;
    if (user.subscription?.currentPeriodEnd) {
      trialEndDate = new Date(user.subscription.currentPeriodEnd);
    } else if (user.trialEndDate?.toDate) {
      trialEndDate = user.trialEndDate.toDate();
    } else if (typeof user.trialEndDate === 'string') {
      trialEndDate = new Date(user.trialEndDate);
    }

    // If trialEndDate exists, check if it's active or expired
    if (trialEndDate && !isNaN(trialEndDate.getTime())) {
      const now = new Date();
      if (trialEndDate > now) {
        return { label: 'Trialing', color: 'bg-blue-100 text-blue-800', dotColor: '#3b82f6' };
      } else {
        return { label: 'Trial Expired', color: 'bg-red-100 text-red-800', dotColor: '#ef4444' };
      }
    }

    // If no trialEndDate, check createdAt to determine if they're in default trial period
    // Default trial period is 7 days from registration
    if (user.createdAt) {
      const createdDate = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
      if (!isNaN(createdDate.getTime())) {
        const trialPeriodDays = 7; // Default trial period
        const defaultTrialEnd = new Date(createdDate.getTime() + (trialPeriodDays * 24 * 60 * 60 * 1000));
        const now = new Date();
        
        if (defaultTrialEnd > now) {
          return { label: 'Trialing', color: 'bg-blue-100 text-blue-800', dotColor: '#3b82f6' };
        } else {
          return { label: 'Trial Expired', color: 'bg-red-100 text-red-800', dotColor: '#ef4444' };
        }
      }
    }

    // Check for expired subscription
    if (user.subscription?.status === 'canceled' || user.subscription?.status === 'expired' || user.subscription?.status === 'past_due') {
      return { label: 'Subscription Expired', color: 'bg-red-100 text-red-800', dotColor: '#ef4444' };
    }

    // Default: Trial Expired (no data found)
    return { label: 'Trial Expired', color: 'bg-gray-100 text-gray-800', dotColor: '#6b7280' };
  };

  if (filteredUsers.length === 0) {
    return <p style={{ color: theme.textLight }}>No users found matching "{searchTerm}"</p>;
  }

  return (
    <div className="overflow-x-auto">
      <div className="text-xs mb-2" style={{ color: theme.textLight }}>
        Showing {filteredUsers.length} of {users.length} users
      </div>
      <table className="min-w-full divide-y" style={{ borderColor: theme.border }}>
        <thead style={{ backgroundColor: theme.background }}>
          <tr>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>User</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>Subscription Status</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>Last Active</th>
            <th scope="col" className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          {filteredUsers.map(user => {
            const hasLifetime = user.subscription?.hasLifetimeAccess;
            const status = getSubscriptionStatus(user);
            
            return (
              <tr key={user.uid} className="hover:bg-opacity-50" style={{ backgroundColor: 'transparent' }}>
              <td className="px-4 py-2 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-shrink-0 h-10 w-10">
                    <img className="h-10 w-10 rounded-full" src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random`} alt="" />
                  </div>
                  <div className="ml-4">
                      <div className="text-sm font-medium flex items-center gap-2" style={{ color: theme.text }}>
                        {user.displayName || 'No Name'}
                        {hasLifetime && <Crown size={14} style={{ color: '#f59e0b' }} title="Lifetime Access" />}
                      </div>
                    <div className="text-sm" style={{ color: theme.textLight }}>{user.email}</div>
                  </div>
                </div>
              </td>
              <td className="px-4 py-2 whitespace-nowrap">
                  <span className={`px-3 py-1 inline-flex items-center gap-1.5 text-xs leading-5 font-semibold rounded-full ${status.color}`}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status.dotColor }} />
                    {status.label}
                </span>
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm" style={{ color: theme.textLight }}>
                  {user.lastActive?.toDate ? user.lastActive.toDate().toLocaleDateString() : 'Never'}
              </td>
              <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                  <button 
                    onClick={() => onViewUser(user)} 
                    className="px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-80 transition-all"
                    style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                  >
                    View Details
                  </button>
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default Admin;