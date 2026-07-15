/**
 * Local fleet audit: find users stuck like Meagan
 * (empty / legacy-only Firestore userData while still active or paid).
 *
 * Read-only. Writes a JSON report next to this script.
 *
 * Usage:
 *   node functions/scripts/auditStaleUserData.js
 *
 * Auth: application-default credentials (firebase login / gcloud ADC)
 *       or GOOGLE_APPLICATION_CREDENTIALS pointing at a service account.
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');
const { runStaleUserDataAudit } = require('../auditStaleUserData');

admin.initializeApp({
  projectId: 'tpp-splendide',
});

async function main() {
  console.log('🔍 Running stale userData fleet audit (read-only)...');
  const findings = await runStaleUserDataAudit(admin.firestore());

  const outPath = path.join(__dirname, `stale-userdata-audit-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(findings, null, 2));

  console.log('\n========== SUMMARY ==========');
  console.log(`Users scanned:              ${findings.totals.scanned}`);
  console.log(`userData docs:              ${findings.totals.userDataDocs}`);
  console.log(`userdata (lowercase) docs:  ${findings.totals.userdataDocs}`);
  console.log(`Legacy-only userData:       ${findings.counts.legacyOnlyUserData}`);
  console.log(`Empty modern userData:      ${findings.counts.emptyModernUserData}`);
  console.log(`Missing userData:           ${findings.counts.missingUserData}`);
  console.log(`At-risk total:              ${findings.atRisk.length}`);
  console.log(`  high:   ${findings.counts.highPriority}`);
  console.log(`  medium: ${findings.counts.mediumPriority}`);
  console.log(`  low:    ${findings.counts.lowPriority}`);
  console.log(`Paid at risk:               ${findings.counts.paidAtRisk}`);
  console.log(`Recently active at risk:    ${findings.counts.recentlyActiveAtRisk}`);
  console.log(`\nReport written to:\n  ${outPath}`);

  const top = findings.atRisk.filter((u) => u.priority === 'high').slice(0, 40);
  if (top.length) {
    console.log('\n========== HIGH PRIORITY (up to 40) ==========');
    for (const u of top) {
      console.log(
        `- ${u.email} | ${u.userId}` +
        `\n    lastActive: ${u.lastActiveDaysAgo ?? '?'}d ago | cloudAge: ${u.cloudAgeDays ?? '?'}d` +
        `\n    reasons: ${u.reasons.join(', ')}` +
        `\n    sub: ${u.subscription.status}/${u.subscription.interval || '-'} lifetime=${u.subscription.hasLifetime}`
      );
    }
  } else {
    console.log('\nNo HIGH priority users found.');
  }

  // Explicit Meagan check so we know the detector still matches her pattern
  const meagan = findings.atRisk.find((u) => u.userId === '0KjSi27gmLZYQViNRiwYtJ1wXcD2')
    || findings.atRisk.find((u) => (u.email || '').toLowerCase() === 'meagan.mallery@gmail.com');
  if (meagan) {
    console.log('\n✅ Detector matched Meagan (known case) in at-risk list:', meagan.priority, meagan.reasons);
  } else {
    console.log('\nℹ️ Meagan not in at-risk list (expected if her cloud was repaired after restore).');
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Audit failed:', err?.message || err);
    if (String(err?.message || err).includes('Could not load the default credentials')) {
      console.error(
        '\nAuth tip: run `gcloud auth application-default login` ' +
        'or set GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON.'
      );
    }
    process.exit(1);
  });
