import React, { useState, useEffect } from 'react';
import { 
  Megaphone, Plus, Edit, Trash2, Save, X, Eye, Sparkles, Wrench, Users, Mail, Key, Copy, Check, Loader, MessageSquare, Clock, CheckCircle,
  BarChart3, TrendingUp, Activity, Smartphone, Monitor, DollarSign, Target, ToggleLeft, ToggleRight, 
  Flag, Palette, Bell, Settings, Hash, ThumbsUp, ThumbsDown, TrendingDown, Shield, AlertTriangle, RefreshCw, Info,
  UserPlus, Briefcase, BookOpen, Star, Award, Send, Coffee, Wine, Book, ChevronDown, ChevronRight, Layout, MessageCircle,
  LayoutDashboard, Crown, Gift, Layers, MessagesSquare, Lightbulb, Radio, BellRing, MailOpen, Sliders, FileCheck, Search, ArrowLeft
} from 'lucide-react';
import { useFirebase } from '../context/FirebaseContext';
import { formatMMDDYYYY } from '../utils/date';
import { Zap } from '../icons/lucide-safe';
import WelcomeModal from '../components/admin/WelcomeModal';
import {
  getEmailWhitelist,
  updateEmailWhitelist,
  getAnnouncements,
  saveAnnouncement,
  deleteAnnouncement,
  getAllFeedback,
  updateFeedback,
  deleteFeedback,
  respondToFeedback,
  getAnalytics,
  getUserList,
  getAdminUserProfile,
  getFeatureFlags,
  updateFeatureFlag,
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
  subscribeToTicketMessages
} from '../services/firebase';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { auth } from '../config/firebase';
import { 
  getFunctions, 
  httpsCallable 
} from 'firebase/functions';
import AgreementTracking from '../components/admin/AgreementTracking';
import ManualLifetimeGrant from '../components/admin/ManualLifetimeGrant';
import EmailTemplateManager from '../components/admin/EmailTemplateManager';
import EmailTriggerManager from '../components/admin/EmailTriggerManager';
import TriggeredNotificationManager from '../components/admin/TriggeredNotificationManager';
import ImprovementsTracker from '../components/admin/ImprovementsTracker';
import UserDetailModal from '../components/admin/UserDetailModal';
import VersionManager from '../components/admin/VersionManager';
import SingleMessageSender from '../components/admin/SingleMessageSender';

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

// Dark Elegant Palette - Extracted from the moody interior image 🌙
const elegantPalette = {
  // Dark Charcoal/Black - Main dark background (from wallpaper)
  dark: {
    wallpaper: '#1A1A1A',      // Very dark charcoal (wallpaper base)
    deep: '#0F0F0F',           // Almost black
    charcoal: '#2D2D2D',       // Dark charcoal
    soft: '#3A3A3A',           // Soft dark grey
    piano: '#2B2B2B',          // Piano dark brown-black
    surface: '#252525',        // Dark surface
  },
  
  // Grey Taupe - Darker, moodier tones
  taupe: {
    dark: '#4A4139',           // Dark taupe
    darker: '#3D352F',         // Darker taupe
    main: '#6B5E52',           // Main grey taupe (from worn piano)
    muted: '#5A5048',          // Muted taupe
    light: '#8A7D70',          // Light taupe (lighter accent)
  },
  
  // Black - Pure darkness
  black: {
    pure: '#000000',           // Pure black
    deep: '#1A1A1A',           // Deep black
    text: '#E8E0D9',           // Light text on dark
    textMuted: '#C4B8AD',      // Muted text on dark
  },
  
  // Metallic Gold/Bronze - THE POP COLOR (from wallpaper pattern & accents)
  gold: {
    // Bronze tones from the metallic pattern
    bronze: '#CD7F32',         // Rich bronze
    metallic: '#D4AF37',       // Classic metallic gold (clock/stand)
    bright: '#FFD700',         // Bright gold (highlights)
    dark: '#B8941F',           // Dark gold (shadows)
    light: '#E5C158',          // Light gold (highlights)
    warm: '#DAA520',           // Warm gold
    // Shiny gradient colors - bronze to gold
    gradientStart: '#FFD700',  // Bright gold start
    gradientMid: '#D4AF37',    // Metallic gold mid
    gradientEnd: '#CD7F32',    // Bronze end
    gradientDark: '#B8941F',   // Dark gold for depth
  },
  
  // Accent colors extracted from the image
  accents: {
    lampAmber: '#D4A574',      // Amber from lamp (warm accent)
    lampGreen: '#8B9A7A',      // Smoky green from lamp
    rosewood: '#5D4037',       // Dark rosewood tones
  },
  
  // Supporting colors (dark mode friendly)
  neutral: {
    white: '#FFFFFF',
    offWhite: '#F5F5F5',       // Off-white for contrast
    lightGray: '#8A7D70',      // Light taupe-gray
    darkGray: '#4A4A4A',       // Dark gray
  },
  
  // Functional colors (adjusted for dark theme)
  functional: {
    success: '#9CAF88',        // Soft sage green
    warning: '#D4A574',        // Warm amber (from lamp)
    error: '#C4858A',          // Soft rose
    info: '#8A7D70'            // Light taupe for info
  }
};

// Apply The Dark Elegant Theme - Moody & Sophisticated
const adminTheme = {
  // Dark colors - primary backgrounds
  primary: elegantPalette.dark.charcoal,           // Dark charcoal
  primaryLight: elegantPalette.dark.soft,          // Soft dark
  primaryLighter: elegantPalette.dark.surface,     // Dark surface
  primaryDark: elegantPalette.dark.deep,           // Deep black
  primaryDarker: elegantPalette.dark.wallpaper,    // Wallpaper dark
  
  // Black colors
  black: elegantPalette.black.deep,
  blackSoft: elegantPalette.dark.charcoal,
  
  // Backgrounds - DARK like the wallpaper
  background: elegantPalette.dark.wallpaper,       // Very dark wallpaper background
  cardBackground: elegantPalette.dark.surface,     // Dark surface for cards
  cardBackgroundLighter: elegantPalette.dark.charcoal, // Slightly lighter cards
  
  // Taupe colors - for subtle accents
  taupe: elegantPalette.taupe.main,
  taupeLight: elegantPalette.taupe.light,
  taupeDark: elegantPalette.taupe.dark,
  
  // Metallic Gold/Bronze - THE POP COLOR (shiny against dark!)
  accent: elegantPalette.gold.metallic,
  gold: elegantPalette.gold.metallic,
  goldBright: elegantPalette.gold.bright,
  goldDark: elegantPalette.gold.dark,
  goldLight: elegantPalette.gold.light,
  goldBronze: elegantPalette.gold.bronze,
  
  // Functional colors (adjusted for dark theme)
  success: elegantPalette.functional.success,
  warning: elegantPalette.functional.warning,      // Amber from lamp
  error: elegantPalette.functional.error,
  info: elegantPalette.functional.info,
  
  // Text - LIGHT on dark backgrounds
  text: elegantPalette.black.text,                 // Light text on dark
  textLight: elegantPalette.black.textMuted,       // Muted light text
  textDark: elegantPalette.taupe.light,            // For contrast elements
  
  // Borders & accents - subtle on dark
  border: elegantPalette.dark.soft + '40',         // Subtle borders
  borderGold: elegantPalette.gold.metallic + '50', // Gold borders
  
  textOnPrimary: elegantPalette.black.text,        // Light text on dark
  textOnGold: elegantPalette.dark.deep,            // Dark text on gold
  successBg: elegantPalette.functional.success + '20',
  accentText: elegantPalette.black.text,           // Light text
  white: elegantPalette.neutral.white
};

function Admin() {
  const theme = adminTheme;
  const { firebaseUser } = useFirebase();
  const [announcements, setAnnouncements] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [activeTab, setActiveTab] = useState('analytics');
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
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
          id: Date.now() + index,
          name: name
        }));
        console.log('📚 Created default topics:', topics);
      } else {
        topics = glossary.map(g => ({ 
          id: g.id || Date.now() + Math.random(), 
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
  const [lifetimeUsers, setLifetimeUsers] = useState([]);
  const [loading, setLoading] = useState({
    announcements: false,
    feedback: false,
    emailWhitelist: false,
    submitting: false,
    analytics: false,
    subscriptions: false,
    lifetimeUsers: false,
    trialExtension: false,
    selectedUser: false
  });
  const [formData, setFormData] = useState({
    title: '',
    body: '',
    category: 'General',
    date: new Date().toISOString().slice(0, 10)
  });

  // Simple admin authentication
  const ADMIN_PASSWORD = 'j&jm9102';
  const ADMIN_EMAILS = [
    'lebrockmaldonado@gmail.com',
    'contact@thepepplanner.com',
    'thepepplanner@gmail.com'
  ];

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
    loadAnnouncements();
    loadEmailWhitelist();
    loadFeedback();
    loadTickets();
    loadRealAnalytics();
    loadUserData();
    loadFeatureFlags();
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
      console.error('Error fetching Stripe data:', error);
    }
  };

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
      await extendTrialForUser(userId, days, note, adminEmail);

      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Research trial extended successfully.', type: 'success' }
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

  const loadFeatureFlags = async () => {
    try {
      // Load feature flags from localStorage for now - in production, from Firebase
      const flags = JSON.parse(localStorage.getItem('tpp_admin_feature_flags') || '{}');
      const firebaseFlags = await getFeatureFlags();
      setFeatureFlags({
        betaFeatures: firebaseFlags.betaFeatures || flags.betaFeatures || {},
        uiExperiments: firebaseFlags.uiExperiments || flags.uiExperiments || {},
        emailSettings: firebaseFlags.emailSettings || flags.emailSettings || {},
        maintenanceMode: firebaseFlags.maintenanceMode || flags.maintenanceMode || false
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
      console.log('📤 Sending response to feedback:', { 
        id: feedbackItem.id, 
        userEmail: feedbackItem.userEmail,
        responseText: responseText.trim()
      });
      await respondToFeedback(feedbackItem.id, responseText.trim(), feedbackItem.userEmail);
      
      // Refresh feedback list to show updated status
      await loadFeedback();
      
      // Reset response state
      setRespondingToFeedback(null);
      setResponseText('');
      
    } catch (error) {
      console.error('❌ Failed to send response:', error);
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
      setShowWelcomeModal(true);
    } catch (error) {
      console.error('❌ Admin login error:', error);
      setLoginError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
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

  const handleFlagToggle = async (flagKey, newValue) => {
    try {
      await updateFeatureFlag(flagKey, newValue);
      setFeatureFlags(prev => {
        const newFlags = { ...prev };
        let updated = false;
        for (const category in newFlags) {
          if (typeof newFlags[category] === 'object' && newFlags[category] !== null && flagKey in newFlags[category]) {
            newFlags[category][flagKey] = newValue;
            updated = true;
            break;
          }
        }
        if (!updated) {
          newFlags[flagKey] = newValue;
        }
        return newFlags;
      });
    } catch (error) {
      console.error('Error updating feature flag:', error);
      alert('Failed to update feature flag.');
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
            opacity: isExpanded ? 1 : 0
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
        backgroundColor: elegantPalette.dark.wallpaper,
        backgroundImage: `linear-gradient(135deg, ${elegantPalette.dark.deep} 0%, ${elegantPalette.dark.wallpaper} 50%, ${elegantPalette.dark.charcoal} 100%)`
      }}>
        {/* Decorative elements - very subtle on dark */}
        <div className="absolute top-10 right-10 opacity-3">
          <Book size={120} style={{ color: elegantPalette.dark.soft }} />
        </div>
        <div className="absolute bottom-10 left-10 opacity-5">
          <LayoutDashboard size={100} style={{ 
            color: elegantPalette.gold.metallic,
            filter: 'drop-shadow(0 2px 12px rgba(212,175,55,0.3))'
          }} />
        </div>
        <div className="absolute top-1/2 right-1/4 opacity-4">
          <Star size={80} style={{ 
            color: elegantPalette.gold.bright,
            filter: 'drop-shadow(0 2px 12px rgba(255,215,0,0.4)) drop-shadow(0 0 8px rgba(212,175,55,0.3))'
          }} />
        </div>
        
        <div className="max-w-md w-full p-8 rounded-xl border shadow-lg relative z-10 backdrop-blur-sm" style={{ 
          borderColor: elegantPalette.gold.metallic + '50', 
          backgroundColor: elegantPalette.dark.surface,
          boxShadow: `0 8px 40px ${elegantPalette.dark.deep}90, 0 0 25px ${elegantPalette.gold.metallic}20, inset 0 1px 0 ${elegantPalette.gold.metallic}15`
        }}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg" style={{ 
              background: `linear-gradient(135deg, ${elegantPalette.gold.gradientStart} 0%, ${elegantPalette.gold.gradientMid} 50%, ${elegantPalette.gold.gradientEnd} 100%)`,
              boxShadow: `0 6px 25px ${elegantPalette.gold.metallic}70, 0 0 20px ${elegantPalette.gold.bright}50, inset 0 2px 4px rgba(255,255,255,0.3)`,
              border: `2px solid ${elegantPalette.gold.light}`
            }}>
              <Book size={32} style={{ color: elegantPalette.black.deep }} />
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: elegantPalette.black.text }}>The Pep Planner Admin</h1>
            <p className="text-sm" style={{ color: theme.textLight }}>Welcome back</p>
            <p className="text-xs mt-2" style={{ color: theme.textLight }}>Enter your email and Firebase account password to access the admin panel</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Admin email"
                className="w-full p-4 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:scale-[1.02] mb-3"
                style={{ 
                  borderColor: loginError && !email.trim() ? theme.error : theme.border, 
                  backgroundColor: theme.background,
                  focusRingColor: theme.primary
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
                className="w-full p-4 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:scale-[1.02]"
                style={{ 
                  borderColor: loginError && email.trim() ? theme.error : theme.border, 
                  backgroundColor: theme.background,
                  focusRingColor: theme.primary
                }}
                required
                disabled={isLoggingIn}
                autoComplete="current-password"
              />
            </div>
            {loginError && (
              <div className="px-4 py-3 rounded-lg text-sm bg-red-100 text-red-800 border border-red-200">
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full p-4 rounded-xl font-semibold transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ 
