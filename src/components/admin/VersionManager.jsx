import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Smartphone, Save, RefreshCw, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export default function VersionManager({ theme }) {
  const [config, setConfig] = useState({
    latestVersion: '1.0.3',
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

  useEffect(() => {
    loadVersionConfig();
  }, []);

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

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validate version format
      const versionRegex = /^\d+\.\d+\.\d+$/;
      if (!versionRegex.test(config.latestVersion)) {
        setMessage({ type: 'error', text: 'Invalid version format. Use X.Y.Z (e.g., 1.0.3)' });
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

      {/* Info Box */}
      <div
        className="rounded-lg p-4"
        style={{
          background: theme.cardBackground,
          border: `1px solid ${theme.border}`
        }}
      >
        <div className="flex items-start gap-3">
          <Info size={20} style={{ color: theme.info, marginTop: '2px' }} />
          <div className="flex-1">
            <p className="text-sm font-medium" style={{ color: theme.text }}>
              How it works:
            </p>
            <ul className="text-sm mt-2 space-y-1" style={{ color: theme.textLight }}>
              <li>• <strong>Latest Version:</strong> Users below this will see update prompts</li>
              <li>• <strong>Minimum Version:</strong> Users below this get REQUIRED update (blocks app)</li>
              <li>• <strong>Release Notes:</strong> Shown to users (one item per line)</li>
              <li>• <strong>Store URLs:</strong> Direct links to Play Store / App Store</li>
            </ul>
          </div>
        </div>
      </div>

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
          <input
            type="text"
            value={config.latestVersion}
            onChange={(e) => handleInputChange('latestVersion', e.target.value)}
            placeholder="1.0.3"
            className="w-full px-4 py-2 rounded-lg text-sm"
            style={{
              background: theme.background,
              color: theme.text,
              border: `1px solid ${theme.border}`
            }}
          />
          <p className="text-xs mt-1" style={{ color: theme.textLight }}>
            Format: X.Y.Z (e.g., 1.0.3). Users below this version will see "Update Available"
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
            <strong>Version {config.latestVersion || '1.0.3'}:</strong> {config.releaseNotes || 'No release notes set'}
          </p>
          {config.minimumVersion && (
            <p style={{ color: '#ef4444' }}>
              ⚠️ Users on version {config.minimumVersion} or below will be REQUIRED to update
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

