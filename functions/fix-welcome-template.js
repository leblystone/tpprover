// Quick script to remove old HTML field from welcome template
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function fixWelcomeTemplate() {
  try {
    console.log('🔧 Removing old HTML field from welcome template...');
    
    const templateRef = db.collection('emailTemplates').doc('welcome');
    
    // Delete the html field using FieldValue.delete()
    await templateRef.update({
      html: admin.firestore.FieldValue.delete()
    });
    
    console.log('✅ Successfully removed HTML field from welcome template');
    console.log('📧 Now the backend will generate HTML from your saved fields');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixWelcomeTemplate();
