/**
 * One-Time Fix Script for Corrupted Protocol Data
 * Run this in browser console to clean up protocols stuck in inconsistent states
 */

// 1. Check current protocol states
const checkProtocols = () => {
  const localProtocols = JSON.parse(localStorage.getItem('tpprover_protocols') || '[]');
  console.log('📋 Local protocols:', localProtocols.length);
  
  // Find any protocols that might be in a bad state
  const suspicious = localProtocols.filter(p => 
    !p.id || 
    !p.updatedAt || 
    (p.active === false && !p.endDate) ||
    (p.endDate && p.active === true)
  );
  
  console.log('⚠️ Suspicious protocols:', suspicious);
  return { localProtocols, suspicious };
};

// 2. Fix the specific adamax protocol
const fixAdamaxProtocol = () => {
  const protocols = JSON.parse(localStorage.getItem('tpprover_protocols') || '[]');
  
  // Find adamax (or any protocol with similar name)
  const adamaxIndex = protocols.findIndex(p => 
    p.name?.toLowerCase().includes('adamax') ||
    p.name?.toLowerCase().includes('adam')
  );
  
  if (adamaxIndex === -1) {
    console.log('❌ Adamax protocol not found');
    return false;
  }
  
  const adamax = protocols[adamaxIndex];
  console.log('🔍 Found adamax:', adamax);
  
  // Force it to ended state with proper timestamp
  adamax.active = false;
  adamax.endDate = adamax.endDate || new Date().toISOString().split('T')[0];
  adamax.endType = adamax.endType || 'manual';
  adamax.updatedAt = new Date().toISOString();
  
  protocols[adamaxIndex] = adamax;
  localStorage.setItem('tpprover_protocols', JSON.stringify(protocols));
  
  console.log('✅ Fixed adamax protocol:', adamax);
  console.log('🔄 Refresh the page to sync to cloud');
  
  return true;
};

// 3. Nuclear option: Force re-sync from Firestore
const forceSyncFromCloud = () => {
  console.log('⚠️ This will reload data from Firestore (cloud version wins)');
  console.log('💡 Refresh the page after running this');
  
  // Clear the protection timestamps to allow fresh sync
  localStorage.removeItem('tpprover_protocols_lastUpdate');
  sessionStorage.removeItem('tpprover_protocols_lastUpdate_session');
  
  console.log('✅ Protection cleared - refresh page to re-sync from cloud');
};

// Instructions
console.log(`
🛠️ PROTOCOL FIX SCRIPT LOADED

Run one of these commands:

1. CHECK PROTOCOLS:
   checkProtocols()
   
2. FIX ADAMAX SPECIFICALLY:
   fixAdamaxProtocol()
   
3. FORCE RE-SYNC FROM CLOUD (nuclear option):
   forceSyncFromCloud()
   
After fixing, refresh BOTH browsers to sync the fix.
`);
