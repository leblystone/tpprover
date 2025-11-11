#!/usr/bin/env node
/**
 * One-off recovery script to migrate snake_case userData fields (e.g., scheduled_buys)
 * back to their camelCase equivalents (scheduledBuys).
 *
 * Usage:
 *   node repairSnakeCaseAppData.js <optionalUserId>
 *
 * Requirements:
 *   - Set GOOGLE_APPLICATION_CREDENTIALS to a service account JSON with Firestore access
 *   - Run from the functions directory (`cd functions`)
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const { FieldValue } = admin.firestore;

const FIELD_MAPPING = {
  scheduled_buys: 'scheduledBuys',
  recon_items: 'reconItems',
  recon_history: 'reconHistory',
  calendar_notes: 'calendarNotes'
};

function hasMeaningfulData(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }

  if (value && typeof value === 'object') {
    return Object.keys(value).length > 0;
  }

  return Boolean(value);
}

async function migrateDocument(doc) {
  const data = doc.data() || {};
  const updates = {};
  let hasUpdates = false;

  Object.entries(FIELD_MAPPING).forEach(([snakeKey, camelKey]) => {
    if (!(snakeKey in data)) {
      return;
    }

    const oldValue = data[snakeKey];
    const newValue = data[camelKey];

    const shouldCopy = hasMeaningfulData(oldValue) && !hasMeaningfulData(newValue);

    if (shouldCopy) {
      updates[camelKey] = oldValue;
    }

    updates[snakeKey] = FieldValue.delete();
    hasUpdates = true;
  });

  if (!hasUpdates) {
    return null;
  }

  await doc.ref.update(updates);
  return updates;
}

async function main() {
  const targetUserId = process.argv[2];

  if (targetUserId) {
    console.log(`🔍 Migrating data for user: ${targetUserId}`);
    const docRef = db.collection('userData').doc(targetUserId);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.log('⚠️ No userData document found for that user.');
      return;
    }

    const result = await migrateDocument(docSnap);

    if (result) {
      console.log('✅ Migration complete for user.', result);
    } else {
      console.log('ℹ️ No snake_case fields found to migrate for this user.');
    }

    return;
  }

  console.log('🔍 Migrating all userData documents...');
  const snapshot = await db.collection('userData').get();
  let migratedCount = 0;

  for (const doc of snapshot.docs) {
    const result = await migrateDocument(doc);
    if (result) {
      migratedCount += 1;
      console.log(`✅ Migrated ${doc.id}:`, result);
    }
  }

  console.log(`🎉 Migration complete. Updated ${migratedCount} document(s).`);
}

main()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(() => {
    admin.app().delete().catch(() => {});
  });

