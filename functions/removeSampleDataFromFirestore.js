#!/usr/bin/env node
/**
 * One-off script to delete sample/demo entries from userData documents.
 *
 * Usage: node removeSampleDataFromFirestore.js [optionalUserId]
 */

const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

const SAMPLE_MARKERS = [
  'Research Lab: Discovery Peptides',
  'Discovery Peptides',
  'KPV',
  'Semaglutide',
  'GHRP-2 / GHRP-6 Peptide Stack',
  'BPC-157',
  'Thymalin + Epithalon',
  'Tirzepatide',
  'Mock Order #001',
  'Mock Order #002',
  'ResearchLabs Pro',
  'Peptide Research Co',
  'Upcoming Founder Welcome Webinar'
];

function isSampleItem(item) {
  if (!item || typeof item !== 'object') return false;
  if (item.isMock === true) return true;

  const fieldsToCheck = [
    item.name,
    item.protocolName,
    item.peptideName,
    item.vendor,
    item.vendorName,
    item.title,
    item.label,
  ].filter(Boolean);

  return fieldsToCheck.some((value) =>
    SAMPLE_MARKERS.some((marker) =>
      String(value).toLowerCase().includes(marker.toLowerCase())
    )
  );
}

function stripSampleEntries(data) {
  if (!data || typeof data !== 'object') {
    return { cleanedData: data, removedAnything: false };
  }

  let removedAnything = false;
  const cleanedData = {};

  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      const filtered = value.filter((item) => {
        const isSample = isSampleItem(item);
        if (isSample) removedAnything = true;
        return !isSample;
      });
      cleanedData[key] = filtered;
    } else if (value && typeof value === 'object') {
      const { cleanedData: nested, removedAnything: nestedRemoved } = stripSampleEntries(value);
      if (nestedRemoved) removedAnything = true;
      cleanedData[key] = nested;
    } else {
      cleanedData[key] = value;
    }
  });

  return { cleanedData, removedAnything };
}

async function cleanUserDataDoc(doc) {
  const data = doc.data() || {};
  const { cleanedData, removedAnything } = stripSampleEntries(data);
  if (!removedAnything) {
    return false;
  }

  await doc.ref.set(cleanedData, { merge: false });
  return true;
}

async function main() {
  const targetUserId = process.argv[2];
  const collectionRef = admin.firestore().collection('userData');

  if (targetUserId) {
    const docRef = collectionRef.doc(targetUserId);
    const doc = await docRef.get();
    if (!doc.exists) {
      console.log('No app data found for this user.');
      return;
    }

    const cleaned = await cleanUserDataDoc(doc);
    console.log(cleaned ? 'Sample entries removed.' : 'No sample entries found.');
    return;
  }

  const snapshot = await collectionRef.get();
  let cleanedCount = 0;

  for (const doc of snapshot.docs) {
    const cleaned = await cleanUserDataDoc(doc);
    if (cleaned) {
      cleanedCount += 1;
      console.log(`🧹 Removed sample data from ${doc.id}`);
    }
  }

  console.log(`Done. Cleaned ${cleanedCount} document(s).`);
}

main()
  .catch((error) => {
    console.error('Failed to remove sample data:', error);
    process.exit(1);
  })
  .finally(() => {
    admin.app().delete().catch(() => {});
  });
