import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, collection, addDoc, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useFirebase } from '../../context/FirebaseContext';
import { Smartphone, Save, RefreshCw, AlertTriangle, CheckCircle, History, Clock, Siren, Code } from 'lucide-react';
import { APP_VERSION } from '../../utils/appVersion';

export default function VersionManager({ theme }) {
  const { firebaseUser } = useFirebase();
  const [config, setConfig] = useState({
    latestVersion: '1.0.4',
    minimumVersion: '1.0.0',
    releaseNotes: '',
    storeUrls: {
      android: 'https://play.google.com/store/apps/details?id=com.thepepplanner.app',
      ios: ''
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [versionHistory, setVersionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showAllHistory, setShowAllHistory] = useState(false);

  useEffect(() => {
    loadVersionConfig();
    loadVersionHistory();
  }, []);

  useEffect(() => {
    loadVersionHistory();
  }, [showAllHistory]);

  const loadVersionConfig = async () => {
    try {
      setLoading(true);
      const versionDoc = await getDoc(doc(db, 'appConfig', 'version'));
      
      if (versionDoc.exists()) {
        setConfig(versionDoc.data());
      }
    } catch (error) {
      console.error('Error loading version config:', error);
      setMessage({ type: 'error', text: 'Failed to load version config' });
    } finally {
      setLoading(false);
    }
  };

  const loadVersionHistory = async () => {
    try {
      setLoadingHistory(true);
      const historyQuery = query(
        collection(db, 'versionUpdateHistory'),
        orderBy('createdAt', 'desc'),
        limit(showAllHistory ? 100 : 20) // Show last 20 or 100 updates
      );
      const snapshot = await getDocs(historyQuery);
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(doc.data().createdAt)
      }));
      setVersionHistory(history);
    } catch (error) {
      console.error('Error loading version history:', error);
      setMessage({ type: 'error', text: 'Failed to load version history' });
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validate version format
      const versionRegex = /^\d+\.\d+\.\d+$/;
      if (!versionRegex.test(config.latestVersion)) {
        setMessage({ type: 'error', text: 'Invalid version format. Use X.Y.Z (e.g., 1.0.4)' });
        return;
      }
      
      if (config.minimumVersion && !versionRegex.test(config.minimumVersion)) {
        setMessage({ type: 'error', text: 'Invalid minimum version format. Use X.Y.Z' });
        return;
      }
      
      // Save to Firestore
      await setDoc(doc(db, 'appConfig', 'version'), {
        ...config,
        updatedAt: new Date().toISOString()
      });
      
      // Log to version update history
      try {
        const adminEmail = firebaseUser?.email || 'unknown@admin.com';
        await addDoc(collection(db, 'versionUpdateHistory'), {
          latestVersion: config.latestVersion,
          minimumVersion: config.minimumVersion || null,
          releaseNotes: config.releaseNotes || '',
          storeUrls: config.storeUrls || {},
          createdBy: adminEmail,
          createdAt: Timestamp.now(),
          updatedAt: new Date().toISOString()
        });
        
        // Reload history to show the new entry
        await loadVersionHistory();
      } catch (historyError) {
        console.error('Error logging version update history:', historyError);
        // Don't fail the save if history logging fails
      }
      
      setMessage({ type: 'success', text: 'Version config saved successfully!' });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error saving version config:', error);
      setMessage({ type: 'error', text: 'Failed to save version config' });
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field, value) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStoreUrlChange = (platform, value) => {
    setConfig(prev => ({
      ...prev,
      storeUrls: {
        ...prev.storeUrls,
        [platform]: value
      }
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="animate-spin" size={24} style={{ color: theme.primary }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: theme.text }}>
            App Version Manager
          </h2>
          <p className="text-sm mt-1" style={{ color: theme.textLight }}>
            Control app update prompts for mobile users
          </p>
        </div>
        <Smartphone size={32} style={{ color: theme.primary }} />
      </div>

      {/* Current Deployed Version Banner */}
      <div
        className="rounded-lg p-4 flex items-center justify-between"
        style={{
          background: theme.cardBackground,
          border: `2px solid ${theme.primary}`,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="p-2 rounded-lg"
            style={{ background: theme.primary + '20' }}
          >
            <Code size={24} style={{ color: theme.primary }} />
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: theme.textLight }}>
              Current Code Version (package.json)
            </p>
            <p className="text-2xl font-bold" style={{ color: theme.primary }}>
              v{APP_VERSION}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs" style={{ color: theme.textLight }}>
            This is what users have after they update
          </p>
          <p className="text-xs font-medium" style={{ color: theme.text }}>
            Auto-synced from package.json ✨
          </p>
        </div>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className="rounded-lg p-4 flex items-start gap-3"
          style={{
            background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
            border: `1px solid ${message.type === 'success' ? '#10b981' : '#ef4444'}`
          }}
        >
          {message.type === 'success' ? (
            <CheckCircle size={20} style={{ color: '#10b981' }} />
          ) : (
            <AlertTriangle size={20} style={{ color: '#ef4444' }} />
          )}
          <span
            className="text-sm font-medium"
            style={{ color: message.type === 'success' ? '#065f46' : '#991b1b' }}
          >
            {message.text}
          </span>
        </div>
      )}

      {/* Form */}
      <div
        className="rounded-lg p-6 space-y-6"
        style={{
          background: theme.cardBackground,
          border: `1px solid ${theme.border}`
        }}
      >
        {/* Latest Version */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
            Latest Version <span style={{ color: '#ef4444' }}>*</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={config.latestVersion}
              onChange={(e) => handleInputChange('latestVersion', e.target.value)}
              placeholder="1.0.4"
              className="flex-1 px-4 py-2 rounded-lg text-sm"
              style={{
                background: theme.background,
                color: theme.text,
                border: `1px solid ${theme.border}`
              }}
            />
            <button
              onClick={() => handleInputChange('latestVersion', APP_VERSION)}
              className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
              style={{
                background: theme.primary + '20',
                color: theme.primary,
                border: `1px solid ${theme.primary}`
              }}
              title="Use current code version"
            >
              Use v{APP_VERSION}
            </button>
          </div>
          <p className="text-xs mt-1" style={{ color: theme.textLight }}>
            Format: X.Y.Z (e.g., 1.0.4). Users below this version will see "Update Available"
          </p>
        </div>

        {/* Minimum Version */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
            Minimum Version (Optional)
          </label>
          <input
            type="text"
            value={config.minimumVersion}
            onChange={(e) => handleInputChange('minimumVersion', e.target.value)}
            placeholder="1.0.0"
            className="w-full px-4 py-2 rounded-lg text-sm"
            style={{
              background: theme.background,
              color: theme.text,
              border: `1px solid ${theme.border}`
            }}
          />
          <p className="text-xs mt-1" style={{ color: theme.textLight }}>
            Users below this version will be <strong>REQUIRED</strong> to update (can't dismiss)
          </p>
        </div>

        {/* Release Notes */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
            Release Notes
          </label>
          <textarea
            value={config.releaseNotes}
            onChange={(e) => handleInputChange('releaseNotes', e.target.value)}
            placeholder="Bug fixes and improvements&#10;New feature: X&#10;Fixed: Y"
            rows={4}
            className="w-full px-4 py-2 rounded-lg text-sm"
            style={{
              background: theme.background,
              color: theme.text,
              border: `1px solid ${theme.border}`
            }}
          />
          <p className="text-xs mt-1" style={{ color: theme.textLight }}>
            One item per line. Will be displayed as bullet points to users.
          </p>
        </div>

        {/* Store URLs */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
            Store URLs
          </h3>
          
          {/* Android URL */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              Google Play Store URL
            </label>
            <input
              type="url"
              value={config.storeUrls?.android || ''}
              onChange={(e) => handleStoreUrlChange('android', e.target.value)}
              placeholder="https://play.google.com/store/apps/details?id=com.thepepplanner.app"
              className="w-full px-4 py-2 rounded-lg text-sm"
              style={{
                background: theme.background,
                color: theme.text,
                border: `1px solid ${theme.border}`
              }}
            />
          </div>

          {/* iOS URL */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              Apple App Store URL (Optional)
            </label>
            <input
              type="url"
              value={config.storeUrls?.ios || ''}
              onChange={(e) => handleStoreUrlChange('ios', e.target.value)}
              placeholder="https://apps.apple.com/app/the-pep-planner/idXXXXXXXXXX"
              className="w-full px-4 py-2 rounded-lg text-sm"
              style={{
                background: theme.background,
                color: theme.text,
                border: `1px solid ${theme.border}`
              }}
            />
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 rounded-lg font-semibold text-sm shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center gap-2"
            style={{
              background: theme.primary,
              color: theme.textOnPrimary,
              opacity: saving ? 0.7 : 1
            }}
          >
            {saving ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </div>

      {/* Current Status Preview */}
      <div
        className="rounded-lg p-4"
        style={{
          background: theme.background,
          border: `2px dashed ${theme.border}`
        }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: theme.text }}>
          Preview - What Users Will See:
        </h3>
        <div className="space-y-2 text-sm" style={{ color: theme.textLight }}>
          <p>
            <strong>Version {config.latestVersion || '1.0.4'}:</strong> {config.releaseNotes || 'No release notes set'}
          </p>
          {config.minimumVersion && (
            <p className="flex items-center gap-1" style={{ color: '#ef4444' }}>
              <Siren size={16} style={{ color: '#ef4444' }} />
              Users on version {config.minimumVersion} or below will be REQUIRED to update
            </p>
          )}
        </div>
      </div>

      {/* Version Update History */}
      <div
        className="rounded-lg p-6"
        style={{
          background: theme.cardBackground,
          border: `1px solid ${theme.border}`
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History size={20} style={{ color: theme.primary }} />
            <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
              Version Configuration History
            </h3>
            {versionHistory.length > 0 && (
              <span 
                className="text-xs px-2 py-1 rounded-full font-medium"
                style={{ 
                  background: theme.primary + '20',
                  color: theme.primary 
                }}
              >
                {versionHistory.length} {versionHistory.length === 1 ? 'entry' : 'entries'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAllHistory(!showAllHistory)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium hover:opacity-80 transition-opacity"
              style={{
                background: theme.background,
                color: theme.text,
                border: `1px solid ${theme.border}`
              }}
            >
              {showAllHistory ? 'Show Recent (20)' : 'Show All'}
            </button>
            <button
              onClick={loadVersionHistory}
              disabled={loadingHistory}
              className="p-1.5 rounded-lg hover:opacity-80 transition-opacity"
              style={{
                background: theme.background,
                color: theme.primary,
                border: `1px solid ${theme.border}`
              }}
              title="Refresh history"
            >
              <RefreshCw size={16} className={loadingHistory ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
        
        {loadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="animate-spin" size={20} style={{ color: theme.primary }} />
            <span className="ml-2 text-sm" style={{ color: theme.textLight }}>Loading history...</span>
          </div>
        ) : versionHistory.length === 0 ? (
          <div className="text-center py-8">
            <History size={48} className="mx-auto mb-3 opacity-30" style={{ color: theme.textLight }} />
            <p className="text-sm font-medium mb-1" style={{ color: theme.text }}>
              No version configuration history yet
            </p>
            <p className="text-xs" style={{ color: theme.textLight }}>
              History will appear here after you save version configurations
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {versionHistory.map((entry, index) => (
              <div
                key={entry.id}
                className="rounded-lg p-4 hover:shadow-md transition-shadow"
                style={{
                  background: theme.background,
                  border: `1px solid ${theme.border}`,
                  borderLeft: `4px solid ${theme.primary}`
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base font-bold" style={{ color: theme.primary }}>
                      v{entry.latestVersion}
                    </span>
                    {entry.minimumVersion && (
                      <span className="text-xs px-2 py-1 rounded font-medium" style={{ 
                        background: '#fee2e2', 
                        color: '#991b1b',
                        border: '1px solid #fecaca'
                      }}>
                        Min: v{entry.minimumVersion}
                      </span>
                    )}
                    {index === 0 && (
                      <span className="text-xs px-2 py-1 rounded font-medium" style={{ 
                        background: '#d1fae5', 
                        color: '#065f46',
                        border: '1px solid #a7f3d0'
                      }}>
                        Latest
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs" style={{ color: theme.textLight }}>
                    <Clock size={14} />
                    <span>
                      {entry.createdAt?.toLocaleString ? 
                        entry.createdAt.toLocaleString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 
                        new Date(entry.createdAt).toLocaleString('en-US', { 
                          year: 'numeric', 
                          month: 'short', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                    </span>
                  </div>
                </div>
                
                {entry.releaseNotes && (
                  <div className="mb-3 p-3 rounded" style={{ background: theme.cardBackground }}>
                    <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: theme.textLight }}>
                      Release Notes:
                    </p>
                    <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: theme.text }}>
                      {entry.releaseNotes}
                    </p>
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-3" style={{ borderTop: `1px solid ${theme.border}` }}>
                  <div className="flex items-center gap-4 text-xs" style={{ color: theme.textLight }}>
                    <span>
                      <strong>Updated by:</strong> {entry.createdBy || 'Unknown'}
                    </span>
                    {entry.storeUrls?.android && (
                      <a
                        href={entry.storeUrls.android}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline font-medium"
                        style={{ color: theme.primary }}
                      >
                        View on Play Store →
                      </a>
                    )}
                    {entry.storeUrls?.ios && (
                      <a
                        href={entry.storeUrls.ios}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline font-medium"
                        style={{ color: theme.primary }}
                      >
                        View on App Store →
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

