# Titration Back-Correction: Existing Users

## Issue
Users who previously created protocols with titration schedules and then **started** those protocols may have lost their titration data due to the `ensureTimes()` bug (line 3744-3751 in Protocols.jsx), which only spread `frequency` and didn't preserve `titration` or `dosage`.

## What Was Fixed
✅ **Root Cause (Protocols.jsx lines 3676-3685 & 3744-3751):**
- `mergedProtocol.peptides` was using a shallow merge: `finalizedProtocol.peptides || originalProtocol.peptides`
- `ensureTimes()` was mapping peptides but only spreading `...pep, frequency: { ...f, time }`, which should have preserved titration since `...pep` includes all fields.
- **The actual bug:** The merge logic at line 3682 replaced peptides entirely from the wizard, which spread `...protocol` but if the wizard's protocol object only had basic peptide shape (without titration), it overwrote the original.

✅ **New deep-merge logic (lines 3676-3695):**
```javascript
const mergedPeptides = (finalizedProtocol.peptides || originalProtocol.peptides || []).map((pep, index) => {
    const originalPep = originalProtocol.peptides?.[index];
    return {
        ...originalPep,  // Original first (includes titration, dosage, all fields)
        ...pep,          // Wizard data second (linkedItems, deliveryMethod updates)
        // Explicitly preserve critical nested data
        titration: pep.titration || originalPep?.titration,
        dosage: pep.dosage || originalPep?.dosage,
        frequency: pep.frequency || originalPep?.frequency
    };
});
```

✅ **Comment added to `ensureTimes()` (line 3750):**
```javascript
// CRITICAL: Preserve all peptide data including titration, dosage, deliveryMethod, etc.
return { ...pep, frequency: { ...f, time } };
```

## Do Existing Users Need Back-Correction?

**Analysis:**
1. **When does titration get lost?**
   - Only when users **start a protocol** using the StartProtocolWizard → onStart handler in Protocols.jsx
   - **NOT** lost during editing, creation, or management (these use ProtocolEditorModal which correctly preserves all data)

2. **Who is affected?**
   - Users who:
     1. Created a protocol with titration (Phase 1, Phase 2+, etc.)
     2. **Started** that protocol using the Start button/wizard
     3. Did this **before** today's fix (2026-02-12)

3. **What data exists now?**
   - **Protocols in Firestore (`users/{uid}/appData.protocols`)**: If user started a protocol with titration, the active protocol may have:
     - `peptides[].frequency` (preserved)
     - `peptides[].deliveryMethod`, `linkedItems` (wizard additions preserved)
     - ❌ `peptides[].titration` (may be missing if wizard didn't include it)
     - ❌ `peptides[].dosage` (may be missing if wizard didn't include it)

4. **Is there a backup?**
   - **Protocol History (`localStorage.protocolHistory`)**: This stores the protocol state **at the time of starting**, including full peptide data. If titration was present when the user edited/created the protocol (before starting), it should be in the pre-start snapshot.
   - However, `protocolHistory` is localStorage-only and not synced to Firestore in the current implementation.

## Recommendation: No Automatic Back-Correction Needed

**Why:**
1. **Data is not lost entirely**: Users can re-edit their protocols and re-enter titration data.
2. **Risk of false positives**: We can't reliably detect which users were affected vs. those who intentionally didn't use titration.
3. **Complexity**: Back-correction would require:
   - Reading all active protocols for all users
   - Determining if titration is "missing" (vs. never set)
   - Finding a source for the correct titration data (no cloud backup exists)
   - Potentially using localStorage `protocolHistory` per-user, which is unreliable and only exists on the device where the protocol was started

## Alternative: User-Initiated Re-Entry

**Suggested approach:**
1. ✅ **Fix is live** (done): New protocol starts will preserve titration.
2. 📢 **In-app notification** (optional): For beta users, show a one-time banner:
   > "We've fixed a bug where titration schedules could be lost when starting a protocol. If you notice any missing titration phases, please edit your protocol and re-enter them. Sorry for the inconvenience!"
3. 🛠️ **Support response**: If users report missing titration, guide them to:
   - Edit the protocol
   - Re-enter titration phases
   - Save changes

## Manual Back-Correction (If Required)

If you **must** back-correct for a specific user (e.g., VIP user, critical use case), follow these steps:

### Option 1: User Self-Service (Preferred)
1. User opens the protocol in "Manage" or "Edit" mode
2. User re-enters titration data
3. User saves the protocol
4. Titration is now restored and will be preserved on future starts

### Option 2: Admin Console Script (High Risk)
**Only use this if you have access to the user's original protocol data (e.g., from a backup or support ticket).**

```javascript
// WARNING: This is a direct Firestore write and bypasses all app logic.
// ONLY USE FOR MANUAL, TARGETED FIXES WITH USER PERMISSION.

async function restoreTitrationForUser(userId, protocolId, restoredTitration) {
  const db = firebase.firestore();
  const userDocRef = db.collection('users').doc(userId);
  
  // Fetch user's current protocols
  const userDoc = await userDocRef.get();
  const appData = userDoc.data()?.appData || {};
  const protocols = appData.protocols || [];
  
  // Find the protocol
  const protocolIndex = protocols.findIndex(p => p.id === protocolId);
  if (protocolIndex === -1) {
    console.error(`❌ Protocol ${protocolId} not found for user ${userId}`);
    return;
  }
  
  // Update peptides with restored titration
  const protocol = protocols[protocolIndex];
  const updatedPeptides = protocol.peptides.map((pep, index) => ({
    ...pep,
    titration: restoredTitration[index] || pep.titration // Use restored data if available
  }));
  
  protocols[protocolIndex] = {
    ...protocol,
    peptides: updatedPeptides,
    updatedAt: new Date().toISOString() // Mark as updated
  };
  
  // Write back to Firestore
  await userDocRef.update({
    'appData.protocols': protocols
  });
  
  console.log(`✅ Restored titration for protocol ${protocolId} for user ${userId}`);
}

// EXAMPLE USAGE:
// restoreTitrationForUser('user123', 'protocol456', [
//   [{ dose: '2.5', doseUnit: 'mg', durationCount: '4', durationUnit: 'weeks' }]
// ]);
```

## Conclusion

✅ **Bug is fixed** for all future protocol starts.  
⚠️ **No automatic back-correction** due to complexity and lack of reliable data source.  
📋 **Affected users can manually re-enter** titration data via the protocol editor.  
🛠️ **Admin script provided** for rare, high-priority manual fixes (use with extreme caution).
