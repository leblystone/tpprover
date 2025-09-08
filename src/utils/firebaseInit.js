import { doc, setDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase.js';

/**
 * Initialize Firebase with basic data for testing
 */
export async function initializeFirebaseData() {
  try {
    // Add a test email to whitelist
    await setDoc(doc(db, 'config', 'emailWhitelist'), {
      emails: [
        'test@example.com',
        'admin@tpp-splendide.com',
        // Add your email here for testing
      ],
      lastUpdated: new Date()
    });

    // Add a test invite code
    const testCode = 'BETA-TEST123';
    await setDoc(doc(db, 'inviteCodes', testCode), {
      code: testCode,
      email: null, // Can be used by any whitelisted email
      created: new Date(),
      used: false,
      usedBy: null,
      usedAt: null
    });

    // Initialize analytics
    await setDoc(doc(db, 'analytics', 'usage'), {
      totalUsers: 0,
      activeUsers: 0,
      featureUsage: {
        protocolsCreated: 0,
        ordersTracked: 0,
        vendorsAdded: 0,
        stockpileItems: 0
      },
      lastUpdated: new Date()
    });

    console.log('Firebase initialized with test data');
    return true;
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    return false;
  }
}

/**
 * Add your email to the whitelist for testing
 */
export async function addEmailToWhitelist(email) {
  try {
    const docRef = doc(db, 'config', 'emailWhitelist');
    const currentEmails = ['test@example.com', 'admin@tpp-splendide.com'];
    
    if (!currentEmails.includes(email.toLowerCase())) {
      currentEmails.push(email.toLowerCase());
    }
    
    await setDoc(docRef, {
      emails: currentEmails,
      lastUpdated: new Date()
    });
    
    console.log(`Added ${email} to whitelist`);
    return true;
  } catch (error) {
    console.error('Failed to add email to whitelist:', error);
    return false;
  }
}
