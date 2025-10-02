import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, XCircle, AlertTriangle, RefreshCw, Users, Database } from 'lucide-react';
import { getLocalStorageLifetimeUsers } from '../../utils/betaAccess';
import { getUserList, bulkImportLifetimeUsers } from '../../services/firebase';

/**
 * Migration utility for moving localStorage lifetime access to Firestore
 */
export default function LifetimeMigration({ theme, onComplete }) {
  const [localStorageUsers, setLocalStorageUsers] = useState([]);
  const [firestoreUsers, setFirestoreUsers] = useState([]);
  const [migrationStatus, setMigrationStatus] = useState('idle'); // idle, scanning, migrating, complete
  const [progress, setProgress] = useState({ success: 0, failed: 0, total: 0 });
  const [error, setError] = useState(null);

  useEffect(() => {
    scanLocalStorage();
  }, []);

  const scanLocalStorage = () => {
    try {
      const users = getLocalStorageLifetimeUsers();
      setLocalStorageUsers(users);
      console.log('📊 Found', users.length, 'users in localStorage');
    } catch (error) {
      console.error('Error scanning localStorage:', error);
      setError('Failed to scan localStorage: ' + error.message);
    }
  };

  const matchUsersWithFirebase = async () => {
    setMigrationStatus('scanning');
    try {
      // Get all users from Firebase
      const allUsers = await getUserList();
      console.log('👥 Total Firebase users:', allUsers.length);

      // Match localStorage emails with Firebase UIDs
      const matched = [];
      localStorageUsers.forEach(lsUser => {
        const fbUser = allUsers.find(u => u.email?.toLowerCase() === lsUser.email?.toLowerCase());
        if (fbUser) {
          matched.push({
            email: lsUser.email,
            uid: fbUser.uid || fbUser.id,
            reason: lsUser.reason,
            matched: true
          });
        } else {
          matched.push({
            email: lsUser.email,
            reason: lsUser.reason,
            matched: false
          });
        }
      });

      setFirestoreUsers(matched);
      setProgress({ success: 0, failed: 0, total: matched.filter(u => u.matched).length });
      setMigrationStatus('ready');
      console.log('✅ Matched', matched.filter(u => u.matched).length, 'users');
    } catch (error) {
      console.error('Error matching users:', error);
      setError('Failed to match users: ' + error.message);
      setMigrationStatus('idle');
    }
  };

  const startMigration = async () => {
    setMigrationStatus('migrating');
    setError(null);

    const usersToMigrate = firestoreUsers.filter(u => u.matched);
    
    try {
      const result = await bulkImportLifetimeUsers(usersToMigrate);
      setProgress({
        success: result.success,
        failed: result.failed,
        total: usersToMigrate.length
      });
      setMigrationStatus('complete');
      
      if (onComplete) {
        onComplete(result);
      }
    } catch (error) {
      console.error('Migration failed:', error);
      setError('Migration failed: ' + error.message);
      setMigrationStatus('ready');
    }
  };

  return (
    <div style={{
      padding: window.innerWidth < 768 ? '16px' : '24px',
      backgroundColor: theme.cardBackground,
      borderRadius: '12px',
      border: `1px solid ${theme.border}`
    }}>
      <div style={{ marginBottom: window.innerWidth < 768 ? '16px' : '24px' }}>
        <h3 style={{
          fontSize: window.innerWidth < 768 ? '18px' : '20px',
          fontWeight: 'bold',
          color: theme.text,
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <Database size={window.innerWidth < 768 ? 20 : 24} style={{ color: theme.primary }} />
          <span>Lifetime Access Migration Tool</span>
        </h3>
        <p style={{ color: theme.textLight, fontSize: window.innerWidth < 768 ? '13px' : '14px' }}>
          Migrate beta tester lifetime access from localStorage to Firestore for permanent, cross-device access.
        </p>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fee',
          border: '1px solid #fcc',
          borderRadius: '8px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <XCircle size={20} color="#c00" />
          <span style={{ color: '#c00', fontSize: '14px' }}>{error}</span>
        </div>
      )}

      {/* Step 1: Scan localStorage */}
      <div style={{
        padding: '16px',
        backgroundColor: theme.background,
        borderRadius: '8px',
        marginBottom: '16px',
        border: `1px solid ${theme.border}`
      }}>
        <div style={{
          display: 'flex',
          flexDirection: window.innerWidth < 768 ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: window.innerWidth < 768 ? 'flex-start' : 'center',
          marginBottom: '12px',
          gap: '12px'
        }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: window.innerWidth < 768 ? '14px' : '16px', fontWeight: '600', color: theme.text, marginBottom: '4px' }}>
              Step 1: Scan localStorage
            </h4>
            <p style={{ fontSize: window.innerWidth < 768 ? '12px' : '14px', color: theme.textLight }}>
              Found {localStorageUsers.length} users with lifetime access in localStorage
            </p>
          </div>
          <button
            onClick={scanLocalStorage}
            style={{
              padding: window.innerWidth < 768 ? '6px 12px' : '8px 16px',
              backgroundColor: theme.primary,
              color: theme.textOnPrimary,
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: window.innerWidth < 768 ? '12px' : '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            <RefreshCw size={window.innerWidth < 768 ? 14 : 16} />
            Rescan
          </button>
        </div>

        {localStorageUsers.length > 0 && (
          <div style={{
            maxHeight: '150px',
            overflowY: 'auto',
            fontSize: '12px',
            color: theme.textLight
          }}>
            {localStorageUsers.map((user, idx) => (
              <div key={idx} style={{ padding: '4px 0', borderBottom: `1px solid ${theme.border}` }}>
                📧 {user.email} - <em>{user.reason}</em>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Match with Firebase */}
      <div style={{
        padding: '16px',
        backgroundColor: theme.background,
        borderRadius: '8px',
        marginBottom: '16px',
        border: `1px solid ${theme.border}`
      }}>
        <div style={{
          display: 'flex',
          flexDirection: window.innerWidth < 768 ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: window.innerWidth < 768 ? 'flex-start' : 'center',
          marginBottom: '12px',
          gap: '12px'
        }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: window.innerWidth < 768 ? '14px' : '16px', fontWeight: '600', color: theme.text, marginBottom: '4px' }}>
              Step 2: Match with Firebase Users
            </h4>
            <p style={{ fontSize: window.innerWidth < 768 ? '12px' : '14px', color: theme.textLight }}>
              {firestoreUsers.length === 0 ? 'Click "Match Users" to find Firebase UIDs' : 
               `Matched ${firestoreUsers.filter(u => u.matched).length} of ${firestoreUsers.length} users`}
            </p>
          </div>
          <button
            onClick={matchUsersWithFirebase}
            disabled={migrationStatus === 'scanning' || localStorageUsers.length === 0}
            style={{
              padding: window.innerWidth < 768 ? '6px 12px' : '8px 16px',
              backgroundColor: migrationStatus === 'scanning' ? theme.textLight : theme.primary,
              color: theme.textOnPrimary,
              border: 'none',
              borderRadius: '6px',
              cursor: migrationStatus === 'scanning' || localStorageUsers.length === 0 ? 'not-allowed' : 'pointer',
              fontSize: window.innerWidth < 768 ? '12px' : '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: localStorageUsers.length === 0 ? 0.5 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            <Users size={window.innerWidth < 768 ? 14 : 16} />
            {migrationStatus === 'scanning' ? 'Matching...' : 'Match Users'}
          </button>
        </div>

        {firestoreUsers.length > 0 && (
          <div style={{
            maxHeight: '150px',
            overflowY: 'auto',
            fontSize: '12px'
          }}>
            {firestoreUsers.map((user, idx) => (
              <div key={idx} style={{
                padding: '6px 8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: `1px solid ${theme.border}`
              }}>
                <span style={{ color: theme.text }}>
                  {user.email}
                </span>
                {user.matched ? (
                  <span style={{ color: theme.success, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle size={14} /> Ready
                  </span>
                ) : (
                  <span style={{ color: theme.warning, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertTriangle size={14} /> No Firebase account
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 3: Migrate to Firestore */}
      <div style={{
        padding: '16px',
        backgroundColor: theme.background,
        borderRadius: '8px',
        border: `1px solid ${theme.border}`
      }}>
        <div style={{
          display: 'flex',
          flexDirection: window.innerWidth < 768 ? 'column' : 'row',
          justifyContent: 'space-between',
          alignItems: window.innerWidth < 768 ? 'flex-start' : 'center',
          marginBottom: '12px',
          gap: '12px'
        }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ fontSize: window.innerWidth < 768 ? '14px' : '16px', fontWeight: '600', color: theme.text, marginBottom: '4px' }}>
              Step 3: Migrate to Firestore
            </h4>
            <p style={{ fontSize: window.innerWidth < 768 ? '12px' : '14px', color: theme.textLight }}>
              {migrationStatus === 'complete' 
                ? `Migration complete: ${progress.success} succeeded, ${progress.failed} failed`
                : migrationStatus === 'migrating'
                ? 'Migration in progress...'
                : `Ready to migrate ${progress.total} users`}
            </p>
          </div>
          <button
            onClick={startMigration}
            disabled={migrationStatus !== 'ready' || progress.total === 0}
            style={{
              padding: window.innerWidth < 768 ? '6px 12px' : '8px 16px',
              backgroundColor: migrationStatus === 'complete' ? theme.success : 
                            migrationStatus === 'migrating' ? theme.textLight : 
                            theme.primary,
              color: theme.textOnPrimary,
              border: 'none',
              borderRadius: '6px',
              cursor: migrationStatus !== 'ready' || progress.total === 0 ? 'not-allowed' : 'pointer',
              fontSize: window.innerWidth < 768 ? '12px' : '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              opacity: migrationStatus !== 'ready' || progress.total === 0 ? 0.5 : 1,
              whiteSpace: 'nowrap'
            }}
          >
            {migrationStatus === 'complete' ? (
              <>
                <CheckCircle size={window.innerWidth < 768 ? 14 : 16} /> Complete
              </>
            ) : migrationStatus === 'migrating' ? (
              <>
                <RefreshCw size={window.innerWidth < 768 ? 14 : 16} style={{ animation: 'spin 1s linear infinite' }} /> Migrating...
              </>
            ) : (
              <>
                <Upload size={window.innerWidth < 768 ? 14 : 16} /> Start Migration
              </>
            )}
          </button>
        </div>

        {migrationStatus === 'complete' && (
          <div style={{
            padding: '12px',
            backgroundColor: theme.successBg,
            borderRadius: '6px',
            marginTop: '12px'
          }}>
            <p style={{ fontSize: '14px', color: theme.success, fontWeight: '600', marginBottom: '4px' }}>
              ✅ Migration Complete!
            </p>
            <p style={{ fontSize: '12px', color: theme.success }}>
              {progress.success} users now have permanent Firestore-backed lifetime access.
              {progress.failed > 0 && ` ${progress.failed} users failed to migrate.`}
            </p>
          </div>
        )}
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

