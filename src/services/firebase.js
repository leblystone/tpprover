import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  increment,
  addDoc,
  Timestamp,
  onSnapshot
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  sendEmailVerification, 
  onAuthStateChanged,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { db, auth } from '../config/firebase.js';
import { encryptUserData, decryptUserData, hashPassword } from '../utils/encryption.js';
import { getCurrentDeviceInfo } from '../utils/deviceDetection.js';

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Check if user should be granted founder status (first 100 users)
 * Only grants founder status for users who sign up on or after November 4, 2025
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - Whether user is a founder
 */
export async function checkAndAssignFounderStatus(userId) {
  try {
    // Define the founder program start date (November 4, 2025 at 00:00:00 UTC)
    const FOUNDER_PROGRAM_START_DATE = new Date('2025-11-04T00:00:00Z');
    const now = new Date();
    
    // Check if we're past the founder program start date
    if (now < FOUNDER_PROGRAM_START_DATE) {
      console.log('⏰ Founder program has not started yet (starts Nov 4, 2025)');
      return false;
    }
    
    // Get current founder count from analytics
    const analyticsRef = doc(db, 'analytics', 'founderCount');
    const analyticsDoc = await getDoc(analyticsRef);
    
    let currentFounderCount = 0;
    if (analyticsDoc.exists()) {
      currentFounderCount = analyticsDoc.data().totalFounders || 0;
    }
    
    // Check if we've already granted 100 founder badges
    if (currentFounderCount >= 100) {
      console.log('🏁 Founder program full (100/100 badges granted)');
      return false;
    }
    
    // Increment founder count
    const newFounderCount = currentFounderCount + 1;
    await setDoc(analyticsRef, {
      totalFounders: newFounderCount,
      lastUpdated: serverTimestamp()
    }, { merge: true });
    
    // Also track in user count for backwards compatibility
    const userCountRef = doc(db, 'analytics', 'userCount');
    await setDoc(userCountRef, {
      totalUsers: increment(1),
      lastUpdated: serverTimestamp()
    }, { merge: true });
    
    // Grant founder status
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      isFounder: true,
      founderNumber: newFounderCount,
      founderGrantedAt: serverTimestamp(),
      registeredAt: serverTimestamp()
    }, { merge: true });
    
    console.log(`🎉 Founder badge granted! User is founder #${newFounderCount}/100`);
    
    return true;
  } catch (error) {
    console.error('Error checking founder status:', error);
    return false;
  }
}

/**
 * Check if a user exists with the given email
 * @param {string} email - User email
 * @returns {Promise<boolean>} - Whether user exists
 */
export async function checkUserExists(email) {
  try {
    console.log('🔍 Firebase: Checking sign-in methods for:', email);
    console.log('🔍 Firebase: Using project:', auth.app.options.projectId);
    console.log('🔍 Firebase: Auth domain:', auth.app.options.authDomain);
    
    const signInMethods = await fetchSignInMethodsForEmail(auth, email);
    console.log('🔍 Firebase: Sign-in methods found:', signInMethods);
    console.log('🔍 Firebase: Sign-in methods length:', signInMethods.length);
    
    const authExists = signInMethods.length > 0;
    console.log('🔍 Firebase: User exists in AUTH?', authExists);
    
    // Check Firestore by querying users collection by email
    // Note: users collection uses UID as doc ID, so we need to query by email field
    let firestoreExists = false;
    let firestoreUserDoc = null;
    try {
      const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      firestoreExists = !querySnapshot.empty;
      console.log('🔍 Firebase: User exists in FIRESTORE?', firestoreExists);
      if (firestoreExists && !querySnapshot.empty) {
        firestoreUserDoc = querySnapshot.docs[0];
        console.log('🔍 Firebase: User data in Firestore:', firestoreUserDoc.data());
      }
    } catch (firestoreError) {
      console.log('🔍 Firebase: Could not check Firestore:', firestoreError.message);
    }
    
    // If user exists in either place, consider them as existing
    // This handles cases where user was created but there's a sync issue
    const exists = authExists || firestoreExists;
    
    console.log('🔍 Firebase: Final user exists decision:', exists, '(auth:', authExists, ', firestore:', firestoreExists, ')');
    
    return exists;
  } catch (error) {
    console.error('❌ Firebase: Error checking user existence:', error);
    console.error('❌ Firebase: Error details:', {
      code: error.code,
      message: error.message,
      projectId: auth.app.options.projectId
    });
    return false;
  }
}

/**
 * Get detailed account status for an email
 * @param {string} email - User email
 * @returns {Promise<{existsInAuth: boolean, existsInFirestore: boolean, hasPassword: boolean, details: any}>}
 */
export async function getAccountStatus(email) {
  try {
    const status = {
      existsInAuth: false,
      existsInFirestore: false,
      hasPassword: false,
      firestoreDoc: null,
      signInMethods: [],
      details: {}
    };
    
    // Check Firebase Auth
    try {
      const signInMethods = await fetchSignInMethodsForEmail(auth, email);
      status.existsInAuth = signInMethods.length > 0;
      status.signInMethods = signInMethods;
      status.hasPassword = signInMethods.includes('password');
    } catch (authError) {
      console.error('Error checking auth:', authError);
    }
    
    // Check Firestore
    try {
      const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
      const querySnapshot = await getDocs(q);
      status.existsInFirestore = !querySnapshot.empty;
      if (status.existsInFirestore && !querySnapshot.empty) {
        status.firestoreDoc = querySnapshot.docs[0].data();
        status.details.uid = querySnapshot.docs[0].id;
        status.details.createdAt = status.firestoreDoc.createdAt;
        status.details.lastActive = status.firestoreDoc.lastActive;
      }
    } catch (firestoreError) {
      console.error('Error checking Firestore:', firestoreError);
    }
    
    return status;
  } catch (error) {
    console.error('Error getting account status:', error);
    return {
      existsInAuth: false,
      existsInFirestore: false,
      hasPassword: false,
      details: { error: error.message }
    };
  }
}

/**
 * Get user's founder status from Firebase
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - Whether user is a founder
 */
export async function getUserFounderStatus(userId) {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data().isFounder || false;
    }
    return false;
  } catch (error) {
    console.error('Error getting founder status:', error);
    return false;
  }
}

/**
 * Register a new user with email and password
 */
export async function registerUser(email, password, inviteCode) {
  try {
    // Create Firebase Auth user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log('✅ Firebase Auth user created:', user.uid);
    
    // IMPORTANT: Firebase Auth automatically sends verification emails for new users
    // This is why you're seeing firebaseapp.com emails. We'll rely on our custom SendGrid emails instead.
    console.log('📧 Firebase will send automatic verification email (firebaseapp.com)');
    console.log('📧 Custom verification email will also be sent via SendGrid');
    
    // Get device information
    const deviceInfo = getCurrentDeviceInfo();
    
    // Try to create user document in Firestore (non-blocking)
    const userData = {
      email: email.toLowerCase(),
      uid: user.uid,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      isActive: true,
      emailVerified: user.emailVerified,
      deviceInfo: deviceInfo
    };
    
    try {
      console.log('🔥 Attempting to save user to Firestore...');
      // Add timeout to prevent hanging
      await Promise.race([
        setDoc(doc(db, 'users', user.uid), userData),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore timeout')), 3000))
      ]);
      console.log('✅ User document saved to Firestore');
    } catch (firestoreError) {
      console.warn('⚠️ Firestore save failed (offline?), continuing anyway:', firestoreError.message);
      // Don't block registration if Firestore is unavailable
    }
    
    // Track registration analytics (non-blocking)
    try {
      await updateAnalytics('userRegistration');
    } catch (analyticsError) {
      console.warn('⚠️ Analytics tracking failed:', analyticsError);
    }
    
    return { user, userData };
  } catch (error) {
    console.error('❌ Registration failed:', error);
    throw error;
  }
}

/**
 * Sign in existing user
 */
export async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Get current device information
    const deviceInfo = getCurrentDeviceInfo();
    
    // Update last active timestamp and device info
    await updateDoc(doc(db, 'users', user.uid), {
      lastActive: serverTimestamp(),
      deviceInfo: deviceInfo
    });
    
    // Track login analytics
    await updateAnalytics('userLogin');
    
    return user;
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function logoutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Logout failed:', error);
    throw error;
  }
}

/**
 * Listen to auth state changes
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

// ============================================================================
// USER DATA (ENCRYPTED)
// ============================================================================

/**
 * Save user's private data (encrypted)
 */
export async function saveUserData(userId, userData, password) {
  try {
    const encryptedData = encryptUserData(userData, password);
    
    await setDoc(doc(db, 'userdata', userId), encryptedData, { merge: true });
    
    // Update analytics (anonymous)
    await updateAnalytics('dataSaved', userData);
    
    return true;
  } catch (error) {
    console.error('Failed to save user data:', error);
    throw error;
  }
}

/**
 * Load user's private data (decrypt)
 */
export async function loadUserData(userId, password) {
  try {
    const docRef = doc(db, 'userdata', userId);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return null; // No data yet
    }
    
    const encryptedData = docSnap.data();
    
    // Fail fast if password is missing and data is encrypted
    if (!password && encryptedData && encryptedData.data && encryptedData.salt) {
      throw new Error('Password required for decryption');
    }
    
    // If no password and no encrypted data, return null (no data)
    if (!password && (!encryptedData || !encryptedData.data)) {
      return null;
    }
    
    const userData = decryptUserData(encryptedData, password);
    
    return userData;
  } catch (error) {
    // Only log decryption errors in development
    if (import.meta.env.DEV) {
      console.error('Failed to load user data:', error);
    }
    throw error;
  }
}

// ============================================================================
// ADMIN DATA (PUBLIC)
// ============================================================================

/**
 * Get all invite codes
 */
export async function getInviteCodes() {
  try {
    const querySnapshot = await getDocs(collection(db, 'inviteCodes'));
    const codes = {};
    querySnapshot.forEach((doc) => {
      codes[doc.id] = { id: doc.id, ...doc.data() };
    });
    return codes;
  } catch (error) {
    console.error('Failed to get invite codes:', error);
    throw error;
  }
}

/**
 * Create new invite codes
 */
export async function createInviteCodes(codes) {
  try {
    const batch = [];
    for (const code of codes) {
      const codeData = {
        code: code.code,
        email: code.email || null,
        created: serverTimestamp(),
        used: false,
        usedBy: null,
        usedAt: null
      };
      batch.push(setDoc(doc(db, 'inviteCodes', code.code), codeData));
    }
    
    await Promise.all(batch);
    return true;
  } catch (error) {
    console.error('Failed to create invite codes:', error);
    throw error;
  }
}

/**
 * Mark invite code as used (for individual codes) or increment usage count (for universal codes)
 */
export async function markInviteCodeUsed(code, email) {
  try {
    // First, get the code to check if it's universal
    const codeDoc = await getDoc(doc(db, 'inviteCodes', code));
    if (!codeDoc.exists()) {
      throw new Error('Invite code not found');
    }
    
    const codeData = codeDoc.data();
    
    if (codeData.isUniversal) {
      // For universal codes, increment usage count and add to users list
      // NEVER mark universal codes as 'used: true' - they should remain unlimited
      const currentUsedBy = codeData.usedBy || [];
      const currentUsageCount = codeData.usageCount || 0;
      
      await updateDoc(doc(db, 'inviteCodes', code), {
        usageCount: currentUsageCount + 1,
        usedBy: [...currentUsedBy, { email, usedAt: serverTimestamp() }],
        lastUsedAt: serverTimestamp(),
        active: true, // Ensure universal codes remain active
        used: false  // Explicitly ensure universal codes are never marked as used
      });
    } else {
      // For individual codes, mark as used (single use)
      await updateDoc(doc(db, 'inviteCodes', code), {
        used: true,
        usedBy: email,
        usedAt: serverTimestamp()
      });
    }
    
    return true;
  } catch (error) {
    console.error('Failed to mark invite code as used:', error);
    throw error;
  }
}

/**
 * Delete invite code
 */
export async function deleteInviteCode(code) {
  try {
    await deleteDoc(doc(db, 'inviteCodes', code));
    return true;
  } catch (error) {
    console.error('Failed to delete invite code:', error);
    throw error;
  }
}

/**
 * Get email whitelist
 */
export async function getEmailWhitelist() {
  try {
    const docRef = doc(db, 'config', 'emailWhitelist');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return [];
    }
    
    return docSnap.data().emails || [];
  } catch (error) {
    console.error('Failed to get email whitelist:', error);
    throw error;
  }
}

/**
 * Update email whitelist
 */
export async function updateEmailWhitelist(emails) {
  try {
    await setDoc(doc(db, 'config', 'emailWhitelist'), {
      emails: emails,
      lastUpdated: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Failed to update email whitelist:', error);
    throw error;
  }
}

/**
 * Get all announcements
 */
export async function getAnnouncements() {
  try {
    const q = query(collection(db, 'announcements'), orderBy('date', 'desc'));
    const querySnapshot = await getDocs(q);
    const announcements = [];
    querySnapshot.forEach((doc) => {
      announcements.push({ id: doc.id, ...doc.data() });
    });
    return announcements;
  } catch (error) {
    console.error('Failed to get announcements:', error);
    throw error;
  }
}

/**
 * Save announcement
 */
export async function saveAnnouncement(announcement) {
  try {
    const announcementData = {
      ...announcement,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    if (announcement.id) {
      // Update existing
      await updateDoc(doc(db, 'announcements', announcement.id), {
        ...announcement,
        updatedAt: serverTimestamp()
      });
    } else {
      // Create new
      const docRef = doc(collection(db, 'announcements'));
      await setDoc(docRef, announcementData);
    }
    
    return true;
  } catch (error) {
    console.error('Failed to save announcement:', error);
    throw error;
  }
}

/**
 * Delete announcement
 */
export async function deleteAnnouncement(id) {
  try {
    await deleteDoc(doc(db, 'announcements', id));
    return true;
  } catch (error) {
    console.error('Failed to delete announcement:', error);
    throw error;
  }
}

/**
 * Get feature flags for admin
 */
export async function getFeatureFlags() {
  try {
    const docRef = doc(db, 'config', 'featureFlags');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return {};
    }
    
    return docSnap.data();
  } catch (error) {
    console.error('Failed to get feature flags:', error);
    throw error;
  }
}

/**
 * Update a specific feature flag
 */
export async function updateFeatureFlag(key, value) {
  try {
    const docRef = doc(db, 'config', 'featureFlags');
    await updateDoc(docRef, { [key]: value });
    return true;
  } catch (error) {
    console.error('Failed to update feature flag:', error);
    throw error;
  }
}

// ============================================================================
// ANALYTICS (ANONYMOUS)
// ============================================================================

/**
 * Update anonymous analytics
 */
async function updateAnalytics(action, data = {}) {
  try {
    // Skip analytics for native apps (only track PWA usage)
    // Native apps have their own analytics through Google Play/App Store
    try {
      const { Capacitor } = await import('@capacitor/core');
      if (Capacitor.isNativePlatform()) {
        return; // Silently skip analytics for native apps
      }
    } catch {
      // Capacitor not available, continue with web analytics
    }
    
    const analyticsRef = doc(db, 'analytics', 'usage');
    
    const updates = {};
    
    switch (action) {
      case 'dataSaved':
        if (data.protocols) updates['featureUsage.protocolsCreated'] = increment(data.protocols.length || 0);
        if (data.orders) updates['featureUsage.ordersTracked'] = increment(data.orders.length || 0);
        if (data.vendors) updates['featureUsage.vendorsAdded'] = increment(data.vendors.length || 0);
        if (data.stockpile) updates['featureUsage.stockpileItems'] = increment(data.stockpile.length || 0);
        if (data.reconItems) updates['featureUsage.reconCalculations'] = increment(data.reconItems.length || 0);
        if (data.calendarNotes) updates['featureUsage.calendarEntries'] = increment(Object.keys(data.calendarNotes).length || 0);
        break;
      case 'userActive':
        updates['activeUsers'] = increment(1);
        updates['dailyActiveUsers'] = increment(1);
        break;
      case 'userLogin':
        updates['totalLogins'] = increment(1);
        updates['dailyLogins'] = increment(1);
        break;
      case 'userRegistration':
        updates['totalRegistrations'] = increment(1);
        updates['dailyRegistrations'] = increment(1);
        break;
    }
    
    if (Object.keys(updates).length > 0) {
      await updateDoc(analyticsRef, {
        ...updates,
        lastUpdated: serverTimestamp()
      });
    }
  } catch (error) {
    // Don't throw analytics errors - they shouldn't break the app
    console.error('Analytics update failed:', error);
  }
}

/**
 * Get analytics data for admin
 */
export async function getAnalytics() {
  try {
    const docRef = doc(db, 'analytics', 'usage');
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      
      // Get current user count to initialize with real data
      let currentUserCount = 0;
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        currentUserCount = usersSnapshot.size;
      } catch (userError) {
        console.warn('Could not get user count for analytics initialization:', userError.message);
      }
      
      // Create initial analytics document with realistic estimates
      const initialData = {
        totalUsers: currentUserCount,
        activeUsers: Math.max(1, Math.floor(currentUserCount * 0.4)), // Estimate 40% active
        featureUsage: {
          protocolsCreated: Math.floor(currentUserCount * 2.5), // Estimate usage based on user count
          ordersTracked: Math.floor(currentUserCount * 1.8),
          vendorsAdded: Math.floor(currentUserCount * 1.2),
          stockpileItems: Math.floor(currentUserCount * 3.1),
          reconCalculations: Math.floor(currentUserCount * 4.2),
          calendarEntries: Math.floor(currentUserCount * 2.8)
        },
        totalLogins: Math.floor(currentUserCount * 8.5), // Estimate login frequency
        dailyLogins: Math.max(1, Math.floor(currentUserCount * 0.3)),
        totalRegistrations: currentUserCount,
        dailyRegistrations: Math.max(0, Math.floor(currentUserCount * 0.1)),
        lastUpdated: serverTimestamp(),
        createdAt: serverTimestamp()
      };
      
      try {
        await setDoc(docRef, initialData);
        return initialData;
      } catch (createError) {
        console.warn('⚠️ Could not create analytics collection, returning default data:', createError.message);
        return initialData;
      }
    }
    
    return docSnap.data();
  } catch (error) {
    console.error('Failed to get analytics:', error);
    throw error;
  }
}

/**
 * Get user list for admin (basic info only)
 */
export async function getUserList() {
  try {
    const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    const users = [];
    
    // Fetch all user subscriptions in parallel
    const userIds = [];
    const userDataMap = {};
    
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      userIds.push(doc.id);
      userDataMap[doc.id] = {
        id: doc.id,
        uid: doc.id,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        createdAt: userData.createdAt,
        lastActive: userData.lastActive,
        inviteCodeUsed: userData.inviteCodeUsed,
        isActive: userData.isActive,
        deviceInfo: userData.deviceInfo,
        subscription: userData.subscription || null,
        trialEndDate: userData.trialEndDate || null,
        trialExtensionHistory: userData.trialExtensionHistory || []
      };
      });
    
    // Fetch subscriptions from userSubscriptions collection
    const subscriptionPromises = userIds.map(async (userId) => {
      try {
        const subscriptionDoc = await getDoc(doc(db, 'userSubscriptions', userId));
        if (subscriptionDoc.exists()) {
          const subData = subscriptionDoc.data();
          return { userId, subscription: subData.subscription || subData };
        }
      } catch (err) {
        console.warn(`Failed to fetch subscription for ${userId}:`, err);
      }
      return { userId, subscription: null };
    });
    
    const subscriptions = await Promise.all(subscriptionPromises);
    
    // Merge subscription data
    subscriptions.forEach(({ userId, subscription }) => {
      if (subscription && userDataMap[userId]) {
        // Merge subscription data (prioritize userSubscriptions collection)
        userDataMap[userId].subscription = subscription;
        
        // Also set trialEndDate if available in subscription
        if (subscription.currentPeriodEnd && !userDataMap[userId].trialEndDate) {
          userDataMap[userId].trialEndDate = subscription.currentPeriodEnd;
        }
      }
    });
    
    return Object.values(userDataMap);
  } catch (error) {
    console.error('Failed to get user list:', error);
    throw error;
  }
}

/**
 * Fetch comprehensive profile data for admin review, including subscription + extension history
 * @param {string} userId
 * @returns {Promise<Object>}
 */
export async function getAdminUserProfile(userId) {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const userRef = doc(db, 'users', userId);
    const subscriptionRef = doc(db, 'userSubscriptions', userId);

    const [userSnap, subscriptionSnap] = await Promise.all([
      getDoc(userRef),
      getDoc(subscriptionRef)
    ]);

    if (!userSnap.exists()) {
      throw new Error('Researcher record not found');
    }

    const userData = userSnap.data();
    const subscriptionDoc = subscriptionSnap.exists() ? subscriptionSnap.data() : {};
    const subscriptionData = subscriptionDoc.subscription || userData.subscription || null;

    const extensionHistory = [];
    if (Array.isArray(userData.trialExtensionHistory)) {
      extensionHistory.push(...userData.trialExtensionHistory);
    }
    if (Array.isArray(subscriptionDoc.trialExtensionHistory)) {
      extensionHistory.push(...subscriptionDoc.trialExtensionHistory);
    }

    // Deduplicate entries by newEnd timestamp to avoid duplicates when both collections contain the same data
    const dedupedHistoryMap = new Map();
    extensionHistory.forEach((entry) => {
      if (!entry) return;
      const key = entry.newEnd || `${entry.extendedAt || ''}-${entry.addedDays || ''}`;
      if (!dedupedHistoryMap.has(key)) {
        dedupedHistoryMap.set(key, entry);
      }
    });

    const combinedHistory = Array.from(dedupedHistoryMap.values()).sort((a, b) => {
      const aTime = new Date(a.extendedAt || a.newEnd || 0).getTime();
      const bTime = new Date(b.extendedAt || b.newEnd || 0).getTime();
      return bTime - aTime;
    });

    return {
      id: userId,
      uid: userId,
      email: userData.email,
      displayName: userData.displayName,
      createdAt: userData.createdAt,
      lastActive: userData.lastActive,
      inviteCodeUsed: userData.inviteCodeUsed,
      isActive: userData.isActive,
      subscription: subscriptionData,
      trialEndDate: userData.trialEndDate || null,
      trialExtensionHistory: combinedHistory
    };
  } catch (error) {
    console.error('❌ Failed to load admin user profile:', error);
    throw error;
  }
}

/**
 * Extend a researcher's trial access window
 * @param {string} userId
 * @param {number} additionalDays
 * @param {string} [note]
 * @param {string} [adminEmail]
 * @returns {Promise<{ newEnd: string }>} new end date ISO string
 */
export async function extendTrialForUser(userId, additionalDays, note = '', adminEmail = 'admin@thepepplanner.com') {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }

    const days = Number(additionalDays);
    if (!Number.isFinite(days) || days <= 0) {
      throw new Error('Extension days must be greater than zero');
    }

    console.log(`⏰ Calling Cloud Function to extend trial for ${userId} by ${days} days`);

    // Call the Cloud Function (uses Admin SDK to bypass client permissions)
    const functions = getFunctions();
    const extendTrialFunction = httpsCallable(functions, 'adminExtendTrialPeriod');
    
    const result = await extendTrialFunction({
      adminPassword: 'j&jm9102',
      userId,
      days,
      note,
      adminEmail
    });

    console.log('✅ Trial extended successfully via Cloud Function:', result.data);
    
    return {
      newEnd: result.data.newEndDate,
      extensionEntry: result.data.extensionEntry
    };
  } catch (error) {
    console.error('❌ Failed to extend trial access:', error);
    throw error;
  }
}

/**
 * Get a specific user by email (optimized for admin lifetime grant)
 * @param {string} email - User email to search for
 * @returns {Promise<Object|null>} User object or null if not found
 */
export async function getUserByEmail(email) {
  try {
    if (!email) {
      throw new Error('Email is required');
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    // Query Firestore for user with matching email
    const q = query(
      collection(db, 'users'), 
      where('email', '==', normalizedEmail),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    return {
      id: userDoc.id,
      uid: userDoc.id,
      email: userData.email,
      displayName: userData.displayName,
      createdAt: userData.createdAt,
      lastActive: userData.lastActive,
      inviteCodeUsed: userData.inviteCodeUsed,
      isActive: userData.isActive,
      subscription: userData.subscription
    };
  } catch (error) {
    console.error('Failed to get user by email:', error);
    throw error;
  }
}

// ============================================================================
// FEEDBACK SYSTEM
// ============================================================================

/**
 * Submit feedback from users
 * @param {Object} feedbackData - The feedback data
 * @returns {Promise<string>} - The feedback document ID
 */
export async function submitFeedback(feedbackData) {
  try {
    const feedbackRef = collection(db, 'feedback');
    const docRef = await addDoc(feedbackRef, {
      ...feedbackData,
      status: 'new',
      submittedAt: serverTimestamp(),
      adminNotes: ''
    });
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Failed to submit feedback:', error);
    throw error;
  }
}

/**
 * Get all feedback for admin view
 * @returns {Promise<Array>} - Array of feedback items
 */
export async function getAllFeedback() {
  try {
    const feedbackRef = collection(db, 'feedback');
    const q = query(feedbackRef, orderBy('submittedAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const feedback = [];
    querySnapshot.forEach((doc) => {
      feedback.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return feedback;
  } catch (error) {
    console.error('❌ Failed to get feedback:', error);
    throw error;
  }
}

/**
 * Update feedback status and admin notes
 * @param {string} feedbackId - The feedback document ID
 * @param {Object} updates - Updates to apply
 * @returns {Promise<void>}
 */
export async function updateFeedback(feedbackId, updates) {
  try {
    const feedbackRef = doc(db, 'feedback', feedbackId);
    await updateDoc(feedbackRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    
  } catch (error) {
    console.error('❌ Failed to update feedback:', error);
    throw error;
  }
}

/**
 * Delete feedback
 * @param {string} feedbackId - The feedback document ID
 * @returns {Promise<void>}
 */
export async function deleteFeedback(feedbackId) {
  try {
    const feedbackRef = doc(db, 'feedback', feedbackId);
    await deleteDoc(feedbackRef);
    
  } catch (error) {
    console.error('❌ Failed to delete feedback:', error);
    throw error;
  }
}

/**
 * Respond to feedback and notify user
 * @param {string} feedbackId - The feedback document ID
 * @param {string} responseText - Admin's response
 * @param {string} userEmail - Email of the feedback submitter
 * @returns {Promise<void>}
 */
export async function respondToFeedback(feedbackId, responseText, userEmail) {
  try {
    if (!userEmail) {
      throw new Error('User email is required to send feedback response');
    }

    // Update feedback with response
    const feedbackRef = doc(db, 'feedback', feedbackId);
    await updateDoc(feedbackRef, {
      adminResponse: responseText,
      responseDate: serverTimestamp(),
      status: 'responded'
    });

    // Create in-app notification for the user (with fallback if permissions fail)
    try {
      const notificationRef = collection(db, 'notifications');
      await addDoc(notificationRef, {
        userEmail: userEmail.toLowerCase(),
        type: 'feedback_response',
        title: 'Response to Your Feedback',
        message: responseText,
        isRead: false,
        createdAt: serverTimestamp(),
        feedbackId: feedbackId
      });
    } catch (notificationError) {
      console.warn('⚠️ Could not create notification (permissions issue):', notificationError.message);
      console.log('📧 Feedback response saved but user notification failed - consider updating Firebase rules');
    }

  } catch (error) {
    console.error('❌ Failed to send feedback response:', error);
    throw error;
  }
}

// ============================================================================
// SUPPORT TICKET SYSTEM
// ============================================================================

/**
 * Create a new support ticket
 * @param {Object} ticketData - The ticket data
 * @returns {Promise<string>} - The ticket ID
 */
export async function createSupportTicket(ticketData) {
  try {
    const functions = getFunctions();
    const createTicket = httpsCallable(functions, 'createSupportTicket');
    
    const result = await createTicket(ticketData);
    
    if (result.data.success) {
      return result.data.ticketId;
    } else {
      throw new Error(result.data.message || 'Failed to create ticket');
    }
  } catch (error) {
    console.error('❌ Failed to create support ticket:', error);
    throw error;
  }
}

/**
 * Add a message to a support ticket
 * @param {Object} messageData - The message data
 * @returns {Promise<string>} - The message ID
 */
export async function addTicketMessage(messageData) {
  try {
    const functions = getFunctions();
    const addMessage = httpsCallable(functions, 'addTicketMessage');
    
    const result = await addMessage(messageData);
    
    if (result.data.success) {
      return result.data.messageId;
    } else {
      throw new Error(result.data.message || 'Failed to add message');
    }
  } catch (error) {
    console.error('❌ Failed to add ticket message:', error);
    throw error;
  }
}

/**
 * Get all tickets for a user
 * @param {string} userEmail - User's email
 * @returns {Promise<Array>} - Array of tickets
 */
export async function getUserTickets(userEmail) {
  try {
    const ticketsRef = collection(db, 'supportTickets');
    const q = query(
      ticketsRef,
      where('userEmail', '==', userEmail.toLowerCase())
    );
    const querySnapshot = await getDocs(q);
    
    const tickets = [];
    querySnapshot.forEach((doc) => {
      tickets.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort in memory instead of requiring Firestore index
    tickets.sort((a, b) => {
      const aTime = a.lastMessageAt?.toDate?.() || a.lastMessageAt || new Date(0);
      const bTime = b.lastMessageAt?.toDate?.() || b.lastMessageAt || new Date(0);
      return bTime - aTime;
    });
    
    return tickets;
  } catch (error) {
    console.error('❌ Failed to get user tickets:', error);
    throw error;
  }
}

/**
 * Get a single ticket with messages
 * @param {string} ticketId - The ticket ID
 * @returns {Promise<Object>} - The ticket with messages
 */
export async function getTicketWithMessages(ticketId) {
  try {
    const ticketRef = doc(db, 'supportTickets', ticketId);
    const ticketDoc = await getDoc(ticketRef);
    
    if (!ticketDoc.exists) {
      throw new Error('Ticket not found');
    }
    
    const ticket = {
      id: ticketDoc.id,
      ...ticketDoc.data()
    };
    
    // Get messages
    const messagesRef = collection(ticketRef, 'messages');
    const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'));
    const messagesSnapshot = await getDocs(messagesQuery);
    
    ticket.messages = [];
    messagesSnapshot.forEach((msgDoc) => {
      ticket.messages.push({
        id: msgDoc.id,
        ...msgDoc.data()
      });
    });
    
    return ticket;
  } catch (error) {
    console.error('❌ Failed to get ticket with messages:', error);
    throw error;
  }
}

/**
 * Subscribe to ticket messages (real-time)
 * @param {string} ticketId - The ticket ID
 * @param {Function} callback - Callback function for updates
 * @returns {Function} - Unsubscribe function
 */
export function subscribeToTicketMessages(ticketId, callback) {
  const ticketRef = doc(db, 'supportTickets', ticketId);
  const messagesRef = collection(ticketRef, 'messages');
  const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'));
  
  return onSnapshot(messagesQuery, (snapshot) => {
    const messages = [];
    snapshot.forEach((doc) => {
      messages.push({
        id: doc.id,
        ...doc.data()
      });
    });
    callback(messages);
  });
}

/**
 * Get all tickets for admin view
 * @returns {Promise<Array>} - Array of tickets
 */
export async function getAllTickets() {
  try {
    const ticketsRef = collection(db, 'supportTickets');
    
    // Try to query with orderBy, but fallback to simple query if index doesn't exist
    let querySnapshot;
    try {
      const q = query(ticketsRef, orderBy('lastMessageAt', 'desc'));
      querySnapshot = await getDocs(q);
    } catch (orderByError) {
      // If orderBy fails (likely missing index), try without orderBy
      console.warn('⚠️ orderBy query failed, trying without orderBy:', orderByError.message);
      querySnapshot = await getDocs(ticketsRef);
    }
    
    const tickets = [];
    querySnapshot.forEach((doc) => {
      tickets.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort manually if we couldn't use orderBy
    if (tickets.length > 0 && !tickets[0].lastMessageAt) {
      tickets.sort((a, b) => {
        const aTime = a.lastMessageAt?.toMillis ? a.lastMessageAt.toMillis() : 
                     a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const bTime = b.lastMessageAt?.toMillis ? b.lastMessageAt.toMillis() : 
                     b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return bTime - aTime; // Descending order
      });
    }
    
    console.log('✅ Loaded tickets:', tickets.length);
    return tickets;
  } catch (error) {
    console.error('❌ Failed to get all tickets:', error);
    console.error('❌ Error details:', {
      code: error.code,
      message: error.message
    });
    throw error;
  }
}

/**
 * Update ticket status (admin only)
 * @param {string} ticketId - The ticket ID
 * @param {string} status - New status
 * @param {string} adminPassword - Admin password
 * @returns {Promise<void>}
 */
export async function updateTicketStatus(ticketId, status, adminPassword) {
  try {
    const functions = getFunctions();
    const updateStatus = httpsCallable(functions, 'updateTicketStatus');
    
    const result = await updateStatus({
      ticketId,
      status,
      adminPassword
    });
    
    if (!result.data.success) {
      throw new Error(result.data.message || 'Failed to update ticket status');
    }
  } catch (error) {
    console.error('❌ Failed to update ticket status:', error);
    throw error;
  }
}

/**
 * Mark ticket as read by user
 * @param {string} ticketId - The ticket ID
 * @returns {Promise<void>}
 */
export async function markTicketAsRead(ticketId) {
  try {
    const functions = getFunctions();
    const markAsRead = httpsCallable(functions, 'markTicketAsRead');
    
    const result = await markAsRead({ ticketId });
    
    if (!result.data.success) {
      throw new Error(result.data.message || 'Failed to mark ticket as read');
    }
  } catch (error) {
    console.error('❌ Failed to mark ticket as read:', error);
    throw error;
  }
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

/**
 * Get notifications for a user
 * @param {string} userEmail - User's email
 * @returns {Promise<Array>} - Array of notifications
 */
export async function getUserNotifications(userEmail) {
  try {
    // console.log('🔔 Firebase: Getting notifications for email:', userEmail.toLowerCase());
    // Temporarily remove orderBy to avoid index requirement
    const q = query(
      collection(db, 'notifications'),
      where('userEmail', '==', userEmail.toLowerCase()),
      limit(50)
    );
    const querySnapshot = await getDocs(q);
    const notifications = [];
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const readAt = data.readAt?.toDate ? data.readAt.toDate() : null;
      
      // Auto-delete notifications that have been read and are older than 24 hours
      if (data.isRead && readAt && readAt < twentyFourHoursAgo) {
        console.log('🔔 Auto-deleting old read notification:', doc.id);
        deleteDoc(doc.ref).catch(error => 
          console.error('Failed to delete old notification:', error)
        );
        return; // Skip adding to notifications array
      }
      
      notifications.push({
        id: doc.id,
        ...data
      });
    });
    
    // Sort notifications by createdAt (newest first) on the client side
    notifications.sort((a, b) => {
      const aTime = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return bTime - aTime; // Descending order (newest first)
    });
    
    // console.log('🔔 Firebase: Found', notifications.length, 'notifications:', notifications);
    return notifications;
  } catch (error) {
    console.error('❌ Failed to get user notifications:', error);
    return [];
  }
}

/**
 * Mark notification as read
 * @param {string} notificationId - The notification document ID
 * @returns {Promise<void>}
 */
export async function markNotificationAsRead(notificationId) {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      isRead: true,
      readAt: serverTimestamp()
    });
  } catch (error) {
    console.error('❌ Failed to mark notification as read:', error);
    throw error;
  }
}

// ============================================================================
// LIFETIME ACCESS MANAGEMENT
// ============================================================================

/**
 * Grant lifetime access to a user in Firestore
 * @param {string} userId - User ID (UID from Firebase Auth)
 * @param {string} email - User email
 * @param {string} reason - Reason for granting access
 * @param {string} grantedBy - Admin who granted access
 * @returns {Promise<boolean>}
 */
export async function grantLifetimeAccessFirestore(userId, email, reason = 'Beta tester', grantedBy = 'system') {
  try {
    console.log('🎁 Granting lifetime access to:', email, userId);
    
    const lifetimeRef = doc(db, 'lifetimeAccess', userId);
    await setDoc(lifetimeRef, {
      userId,
      email: email.toLowerCase(),
      hasLifetimeAccess: true,
      reason,
      grantedBy,
      grantedAt: serverTimestamp(),
      status: 'active',
      metadata: {
        isBetaTester: reason.toLowerCase().includes('beta'),
        isFounder: reason.toLowerCase().includes('founder'),
        isManualGrant: grantedBy !== 'system'
      }
    }, { merge: true });
    
    // Also update user document
    const userRef = doc(db, 'users', userId);
    const grantedAt = serverTimestamp();
    await setDoc(userRef, {
      subscription: {
        hasLifetimeAccess: true,
        lifetimeReason: reason,
        lifetimeGrantedAt: grantedAt,
        plan: 'lifetime',
        status: 'active'
      },
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    // CRITICAL: Also write to userSubscriptions collection (where app reads from)
    const subscriptionRef = doc(db, 'userSubscriptions', userId);
    await setDoc(subscriptionRef, {
      subscription: {
        hasLifetimeAccess: true,
        interval: 'lifetime',
        status: 'active',
        plan: 'lifetime',
        lifetimeReason: reason,
        lifetimeGrantedAt: grantedAt,
        currentPeriodEnd: null, // Lifetime has no end date
        currentPeriodStart: grantedAt,
        userId: userId,
        lastUpdated: serverTimestamp()
      }
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('❌ Failed to grant lifetime access:', error);
    throw error;
  }
}

/**
 * Check if user has lifetime access in Firestore
 * @param {string} userId - User ID
 * @returns {Promise<Object|null>}
 */
export async function checkLifetimeAccessFirestore(userId) {
  try {
    const lifetimeRef = doc(db, 'lifetimeAccess', userId);
    const lifetimeDoc = await getDoc(lifetimeRef);
    
    if (lifetimeDoc.exists() && lifetimeDoc.data().hasLifetimeAccess) {
      return {
        hasAccess: true,
        ...lifetimeDoc.data()
      };
    }
    
    // Fallback: Check user document subscription field
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists() && userDoc.data().subscription?.hasLifetimeAccess) {
      return {
        hasAccess: true,
        reason: userDoc.data().subscription.lifetimeReason || 'Unknown',
        grantedAt: userDoc.data().subscription.lifetimeGrantedAt
      };
    }
    
    return null;
  } catch (error) {
    console.error('❌ Failed to check lifetime access:', error);
    return null;
  }
}

/**
 * Get all users with lifetime access
 * @returns {Promise<Array>}
 */
export async function getAllLifetimeUsers() {
  try {
    console.log('🔍 getAllLifetimeUsers: Starting query...');
    console.log('🔑 Current Firebase user:', auth.currentUser?.email || 'NOT LOGGED IN');
    
    const users = [];

    // Active lifetime access documents (users who already exist)
    const lifetimeRef = collection(db, 'lifetimeAccess');
    const lifetimeQuery = query(lifetimeRef, where('hasLifetimeAccess', '==', true));
    
    console.log('📊 Querying lifetimeAccess collection...');
    const lifetimeSnapshot = await getDocs(lifetimeQuery);
    console.log(`✅ lifetimeAccess query complete: ${lifetimeSnapshot.size} documents found`);

    lifetimeSnapshot.forEach(docSnapshot => {
      const data = docSnapshot.data() || {};
      console.log('📄 Found lifetime user:', data.email, '(userId:', docSnapshot.id, ')');
      users.push({
        id: docSnapshot.id,
        userId: docSnapshot.id,
        email: data.email || '',
        reason: data.reason || '',
        grantedAt: data.grantedAt || data.lifetimeGrantedAt || null,
        grantedBy: data.grantedBy || 'admin',
        status: data.status || 'active',
        hasLifetimeAccess: data.hasLifetimeAccess ?? true,
        activatedAt: data.activatedAt || data.appliedAt || null,
        isPreGrant: false,
        source: 'lifetimeAccess'
      });
    });

    // Pre-grants for emails (both pending and applied)
    const preGrantRef = collection(db, 'lifetimeAccessPreGrants');
    
    console.log('📊 Querying lifetimeAccessPreGrants collection...');
    // Get ALL pre-grants (not just pending) so we can see activated ones too
    const preGrantSnapshot = await getDocs(preGrantRef);
    console.log(`✅ lifetimeAccessPreGrants query complete: ${preGrantSnapshot.size} documents found`);

    preGrantSnapshot.forEach(docSnapshot => {
      const data = docSnapshot.data() || {};
      const email = data.email || docSnapshot.id || '';
      const status = data.status || 'pending';
      console.log('📄 Found pre-grant:', email, '| Status:', status, '| Applied to:', data.appliedToUserId || 'N/A');
      
      // ⚠️ SECURITY CHECK: Flag suspicious wildcard emails
      if (email.includes('*') || email === '' || email.length < 3) {
        console.warn('🚨 SUSPICIOUS PRE-GRANT DETECTED:', {
          docId: docSnapshot.id,
          email,
          status,
          reason: data.reason
        });
      }
      
      users.push({
        id: `pregrant-${docSnapshot.id}`,
        preGrantId: docSnapshot.id,
        email: email.toLowerCase(),
        reason: data.reason || '',
        grantedAt: data.grantedAt || null,
        grantedBy: data.grantedBy || 'admin',
        status: status,
        hasLifetimeAccess: data.hasLifetimeAccess ?? true,
        activatedAt: data.appliedAt || null,
        appliedToUserId: data.appliedToUserId || null,
        isPreGrant: true,
        source: 'preGrant'
      });
    });

    // Sort by grant date (newest first)
    const getTimestampValue = (value) => {
      if (!value) return 0;
      if (typeof value.toMillis === 'function') return value.toMillis();
      if (typeof value.seconds === 'number') return value.seconds * 1000;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? 0 : date.getTime();
    };

    users.sort((a, b) => getTimestampValue(b.grantedAt) - getTimestampValue(a.grantedAt));

    console.log(`📋 TOTAL: Found ${users.length} lifetime entries (active: ${lifetimeSnapshot.size}, pending: ${preGrantSnapshot.size})`);
    if (users.length > 0) {
      console.log('📋 Sample entries:', users.slice(0, 3).map(u => ({ email: u.email, source: u.source, isPreGrant: u.isPreGrant })));
    }
    return users;
  } catch (error) {
    console.error('❌ Failed to get lifetime users:', error);
    console.error('❌ Error code:', error.code);
    console.error('❌ Error message:', error.message);
    console.error('❌ Current user:', auth.currentUser?.email || 'NOT LOGGED IN');
    
    // If permission denied, show helpful message
    if (error.code === 'permission-denied') {
      console.error('🚫 PERMISSION DENIED: You must be logged into Firebase with an admin email!');
      console.error('🚫 Admin emails: lebrockmaldonado@gmail.com, contact@thepepplanner.com');
      console.error('🚫 Current user:', auth.currentUser?.email || 'NOT LOGGED IN');
    }
    
    return [];
  }
}

/**
 * Revoke lifetime access
 * @param {string} userId - User ID
 * @param {string} revokedBy - Admin who revoked access
 * @param {string} reason - Reason for revocation
 * @returns {Promise<boolean>}
 */
export async function revokeLifetimeAccess(userId, revokedBy = 'admin', reason = 'Manual revocation') {
  try {
    const lifetimeRef = doc(db, 'lifetimeAccess', userId);
    await updateDoc(lifetimeRef, {
      hasLifetimeAccess: false,
      status: 'revoked',
      revokedAt: serverTimestamp(),
      revokedBy,
      revocationReason: reason
    });
    
    // Update user document
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      'subscription.hasLifetimeAccess': false,
      'subscription.status': 'revoked',
      updatedAt: serverTimestamp()
    });
    
    console.log('🚫 Lifetime access revoked for:', userId);
    return true;
  } catch (error) {
    console.error('❌ Failed to revoke lifetime access:', error);
    throw error;
  }
}

/**
 * Bulk import lifetime users from localStorage data
 * @param {Array} lifetimeUsers - Array of {email, uid, reason}
 * @returns {Promise<{success: number, failed: number}>}
 */
export async function bulkImportLifetimeUsers(lifetimeUsers) {
  let success = 0;
  let failed = 0;
  
  for (const user of lifetimeUsers) {
    try {
      await grantLifetimeAccessFirestore(
        user.uid || user.userId,
        user.email,
        user.reason || 'Beta tester - migrated from localStorage',
        'migration-script'
      );
      success++;
    } catch (error) {
      console.error('Failed to import user:', user.email, error);
      failed++;
    }
  }
  
  return { success, failed };
}

export async function cancelLifetimePreGrant(email) {
  try {
    if (!email) {
      throw new Error('Email is required to cancel pre-grant');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const preGrantDocRef = doc(db, 'lifetimeAccessPreGrants', normalizedEmail);
    await deleteDoc(preGrantDocRef);
    console.log('🗑️ Cancelled lifetime pre-grant for:', normalizedEmail);
    return true;
  } catch (error) {
    console.error('❌ Failed to cancel lifetime pre-grant:', error);
    throw error;
  }
}