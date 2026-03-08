/**
 * One-time migration: merge all split tickets per user into a single thread.
 * Run with: node functions/scripts/mergeAllSplitTickets.js
 */

const admin = require('firebase-admin');
const serviceAccount = require('../../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

async function mergeTicketsForUser(userEmail, tickets) {
  // Sort oldest first — primary is oldest
  tickets.sort((a, b) => {
    const ta = a.createdAt?.toMillis?.() ?? 0;
    const tb = b.createdAt?.toMillis?.() ?? 0;
    return ta - tb;
  });

  const primary = tickets[0];
  const secondaries = tickets.slice(1);
  const primaryRef = db.collection('supportTickets').doc(primary.id);

  console.log(`  → Primary: #${primary.ticketNumber} | Merging in: ${secondaries.map(s => '#' + s.ticketNumber).join(', ')}`);

  const allRequestNumbers = [...(primary.requestNumbers || [primary.ticketNumber])];

  for (const secondary of secondaries) {
    const secondaryRef = db.collection('supportTickets').doc(secondary.id);

    // Copy all messages from secondary → primary
    const msgsSnap = await secondaryRef.collection('messages').orderBy('createdAt', 'asc').get();
    for (const msgDoc of msgsSnap.docs) {
      const msgData = msgDoc.data();
      const newMsgRef = primaryRef.collection('messages').doc();
      await newMsgRef.set({
        ...msgData,
        messageId: newMsgRef.id,
        ticketId: primary.id,
        mergedFromTicket: secondary.ticketNumber || secondary.id,
      });
    }

    // Collect request numbers
    if (Array.isArray(secondary.requestNumbers)) {
      allRequestNumbers.push(...secondary.requestNumbers);
    } else if (secondary.ticketNumber) {
      allRequestNumbers.push(secondary.ticketNumber);
    }

    // Mark secondary as merged/closed
    await secondaryRef.update({
      status: 'closed',
      mergedInto: primary.id,
      mergedIntoTicketNumber: primary.ticketNumber,
      mergedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Close work queue logs for secondary
    const logsSnap = await db.collection('ai_worker_logs')
      .where('ticketId', '==', secondary.id)
      .where('markedFixed', '==', false)
      .get();
    for (const logDoc of logsSnap.docs) {
      await logDoc.ref.update({
        markedFixed: true,
        markedFixedAt: FieldValue.serverTimestamp(),
        adminNotes: `Merged into #${primary.ticketNumber}`,
      });
    }

    console.log(`     ✅ Merged #${secondary.ticketNumber} (${msgsSnap.size} msgs)`);
  }

  // Update primary with all request numbers
  const deduped = [...new Set(allRequestNumbers)];
  await primaryRef.update({
    requestNumbers: deduped,
    status: 'open',
    updatedAt: FieldValue.serverTimestamp(),
    lastMessageAt: FieldValue.serverTimestamp(),
  });

  // Ensure primary has one live work queue log
  const existingLog = await db.collection('ai_worker_logs')
    .where('ticketId', '==', primary.id)
    .where('markedFixed', '==', false)
    .limit(1)
    .get();

  if (existingLog.empty) {
    await db.collection('ai_worker_logs').add({
      ticketId: primary.id,
      ticketNumber: primary.ticketNumber,
      ticketType: primary.type || 'support',
      subject: primary.subject || 'Support Request',
      userName: primary.userName || primary.userEmail?.split('@')[0] || 'Unknown',
      userEmail: primary.userEmail,
      originalMessage: primary.subject || '',
      timestamp: FieldValue.serverTimestamp(),
      route: 'manual',
      confidence: 100,
      reasoning: `Merged ${secondaries.length} tickets into this thread`,
      urgency: 'medium',
      keywords: [],
      executionModel: 'manual',
      executionCost: 0,
      triageCost: 0,
      totalCost: 0,
      responseGenerated: false,
      responsePosted: false,
      responseContent: null,
      markedFixed: false,
      humanOverride: true,
      addedManually: true,
      autoQueued: false,
    });
  }
}

async function run() {
  console.log('🔍 Scanning for users with multiple open tickets...\n');

  // Get all open/pending tickets
  const snap = await db.collection('supportTickets')
    .where('status', 'in', ['new', 'in-progress', 'open'])
    .get();

  // Group by userEmail
  const byEmail = new Map();
  snap.forEach(doc => {
    const data = doc.data();
    const email = data.userEmail?.toLowerCase().trim();
    if (!email) return;
    if (!byEmail.has(email)) byEmail.set(email, []);
    byEmail.get(email).push({ id: doc.id, ...data });
  });

  // Only process users with 2+ tickets
  const toMerge = [...byEmail.entries()].filter(([, tickets]) => tickets.length > 1);

  if (toMerge.length === 0) {
    console.log('✅ No users with multiple open tickets found. Nothing to merge.');
    process.exit(0);
  }

  console.log(`Found ${toMerge.length} user(s) with split tickets:\n`);
  for (const [email, tickets] of toMerge) {
    console.log(`📧 ${email} — ${tickets.length} tickets`);
  }

  console.log('\nStarting merge...\n');

  let mergedUsers = 0;
  for (const [email, tickets] of toMerge) {
    console.log(`\n📧 ${email}`);
    try {
      await mergeTicketsForUser(email, tickets);
      mergedUsers++;
    } catch (err) {
      console.error(`  ❌ Failed: ${err.message}`);
    }
  }

  console.log(`\n✅ Done. Merged tickets for ${mergedUsers}/${toMerge.length} users.`);
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
