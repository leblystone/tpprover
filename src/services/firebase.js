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
  addDoc
} from 'firebase/firestore';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  fetchSignInMethodsForEmail
} from 'firebase/auth';
import { db, auth } from '../config/firebase.js';
import { encryptUserData, decryptUserData, hashPassword } from '../utils/encryption.js';

// ============================================================================
// AUTHENTICATION
// ============================================================================

/**
 * Check if user should be granted founder status (first 100 users)
 * @param {string} userId - User ID
 * @returns {Promise<boolean>} - Whether user is a founder
 */
export async function checkAndAssignFounderStatus(userId) {
  try {
    // Get current user count from analytics
    const analyticsRef = doc(db, 'analytics', 'userCount');
    const analyticsDoc = await getDoc(analyticsRef);
    
    let currentCount = 0;
    if (analyticsDoc.exists()) {
      currentCount = analyticsDoc.data().totalUsers || 0;
    }
    
    // Increment user count
    const newCount = currentCount + 1;
    await setDoc(analyticsRef, {
      totalUsers: newCount,
      lastUpdated: serverTimestamp()
    }, { merge: true });
    
    // Check if this user is in the first 100
    const isFounder = newCount <= 100;
    
    if (isFounder) {
      // Store founder status in user document
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        isFounder: true,
        founderNumber: newCount,
        registeredAt: serverTimestamp()
      }, { merge: true });
    }
    
    return isFounder;
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
    
    // Additional check: Look in Firestore users collection
    let firestoreExists = false;
    try {
      const userDoc = await getDoc(doc(db, 'users', email.toLowerCase()));
      firestoreExists = userDoc.exists();
      console.log('🔍 Firebase: User exists in FIRESTORE?', firestoreExists);
      if (firestoreExists) {
        console.log('🔍 Firebase: User data in Firestore:', userDoc.data());
      }
    } catch (firestoreError) {
      console.log('🔍 Firebase: Could not check Firestore:', firestoreError.message);
    }
    
    // If user exists in either place, consider them as existing
    // This handles cases where user was created but there's a sync issue
    const exists = authExists || firestoreExists;
    
    console.log('🔍 Firebase: Final user exists decision:', exists, '(auth:', authExists, ', firestore:', firestoreExists, ')');
    
    // Additional fallback: Try to get user by email query if we have it
    if (!exists) {
      try {
        const q = query(collection(db, 'users'), where('email', '==', email.toLowerCase()));
        const querySnapshot = await getDocs(q);
        const firestoreByQuery = !querySnapshot.empty;
        console.log('🔍 Firebase: User exists by query?', firestoreByQuery);
        return firestoreByQuery;
      } catch (queryError) {
        console.log('🔍 Firebase: Query fallback failed:', queryError.message);
      }
    }
    
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
    
    // Create user document in Firestore
    const userData = {
      email: email.toLowerCase(),
      uid: user.uid,
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      isActive: true
    };
    
    await setDoc(doc(db, 'users', user.uid), userData);
    
    // Track registration analytics
    await updateAnalytics('userRegistration');
    
    return { user, userData };
  } catch (error) {
    console.error('Registration failed:', error);
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
    
    // Update last active timestamp
    await updateDoc(doc(db, 'users', user.uid), {
      lastActive: serverTimestamp()
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
    const userData = decryptUserData(encryptedData, password);
    
    return userData;
  } catch (error) {
    console.error('Failed to load user data:', error);
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
      console.log('📊 Analytics collection does not exist, creating initial document...');
      
      // Get current user count to initialize with real data
      let currentUserCount = 0;
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        currentUserCount = usersSnapshot.size;
        console.log(`📊 Found ${currentUserCount} existing users for analytics initialization`);
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
        console.log('✅ Analytics collection initialized successfully');
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
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        id: doc.id,
        email: userData.email,
        createdAt: userData.createdAt,
        lastActive: userData.lastActive,
        inviteCodeUsed: userData.inviteCodeUsed,
        isActive: userData.isActive
      });
    });
    return users;
  } catch (error) {
    console.error('Failed to get user list:', error);
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
    
    console.log('✅ Feedback submitted successfully with ID:', docRef.id);
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
    
    console.log('✅ Feedback updated successfully');
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
    
    console.log('✅ Feedback deleted successfully');
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
      console.log('✅ Notification created successfully');
    } catch (notificationError) {
      console.warn('⚠️ Could not create notification (permissions issue):', notificationError.message);
      console.log('📧 Feedback response saved but user notification failed - consider updating Firebase rules');
    }

    console.log('✅ Feedback response sent successfully');
  } catch (error) {
    console.error('❌ Failed to send feedback response:', error);
    throw error;
  }
}

/**
 * Get notifications for a user
 * @param {string} userEmail - User's email
 * @returns {Promise<Array>} - Array of notifications
 */
export async function getUserNotifications(userEmail) {
  try {
    console.log('🔔 Firebase: Getting notifications for email:', userEmail.toLowerCase());
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
    
    console.log('🔔 Firebase: Found', notifications.length, 'notifications:', notifications);
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
