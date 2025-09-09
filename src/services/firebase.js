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
  increment
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
    const signInMethods = await fetchSignInMethodsForEmail(auth, email);
    return signInMethods.length > 0;
  } catch (error) {
    console.error('Error checking user existence:', error);
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
      inviteCodeUsed: inviteCode,
      lastActive: serverTimestamp(),
      isActive: true
    };
    
    await setDoc(doc(db, 'users', user.uid), userData);
    
    // Mark invite code as used
    if (inviteCode) {
      await markInviteCodeUsed(inviteCode, email);
    }
    
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
 * Mark invite code as used
 */
export async function markInviteCodeUsed(code, email) {
  try {
    await updateDoc(doc(db, 'inviteCodes', code), {
      used: true,
      usedBy: email,
      usedAt: serverTimestamp()
    });
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
        break;
      case 'userActive':
        updates['activeUsers'] = increment(1);
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
      return {
        totalUsers: 0,
        activeUsers: 0,
        featureUsage: {
          protocolsCreated: 0,
          ordersTracked: 0,
          vendorsAdded: 0,
          stockpileItems: 0
        }
      };
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
