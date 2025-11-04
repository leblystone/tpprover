import React, { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, Lock, Eye, EyeOff, Key, Mail, Smartphone } from 'lucide-react'
import { getAuth, updatePassword as firebaseUpdatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { useFirebase } from '../context/FirebaseContext'
import Modal from '../components/common/Modal'

// Security helpers
function loadSecurity() { 
  try { 
    return JSON.parse(localStorage.getItem('tpprover_security') || 'null') 
  } catch { 
    return null 
  } 
}

function saveSecurity(sec) { 
  try { 
    localStorage.setItem('tpprover_security', JSON.stringify(sec)) 
  } catch {} 
}

function genAuthSecret(len = 16) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let out = ''
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

export default function AccountSecurity() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const { firebaseUser } = useFirebase()
  
  const [security, setSecurity] = useState(() => 
    loadSecurity() || { 
      twoFactorEnabled: false, 
      twoFactorMethod: 'email', 
      authSecret: ''
    }
  )
  const [twoFAOpen, setTwoFAOpen] = useState(false)
  const [twoFAMethod, setTwoFAMethod] = useState('email')
  const [twoFASecret, setTwoFASecret] = useState(security.authSecret || genAuthSecret())
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  })
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [isUpdating, setIsUpdating] = useState(false)

  const openTwoFA = () => { 
    setTwoFAMethod(security.twoFactorMethod || 'email')
    setTwoFASecret(security.authSecret || genAuthSecret())
    setTwoFAOpen(true) 
  }

  const enableTwoFA = () => { 
    const next = { 
      ...security, 
      twoFactorEnabled: true, 
      twoFactorMethod: twoFAMethod, 
      authSecret: twoFAMethod === 'authenticator' ? (security.authSecret || twoFASecret) : '' 
    }
    saveSecurity(next)
    setSecurity(next)
    setTwoFAOpen(false)
    window.dispatchEvent(new CustomEvent('tpp:toast', { 
      detail: { message: 'Two-factor authentication enabled', type: 'success' } 
    }))
  }

  const disableTwoFA = () => { 
    const next = { ...security, twoFactorEnabled: false, authSecret: '' }
    saveSecurity(next)
    setSecurity(next)
    window.dispatchEvent(new CustomEvent('tpp:toast', { 
      detail: { message: 'Two-factor authentication disabled', type: 'success' } 
    }))
  }


  const handlePasswordUpdate = async () => {
    if (!passwordData.current || !passwordData.new || !passwordData.confirm) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Please fill in all fields', type: 'error' } 
      }))
      return
    }

    if (passwordData.new !== passwordData.confirm) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'New passwords do not match', type: 'error' } 
      }))
      return
    }

    if (passwordData.new.length < 6) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Password must be at least 6 characters', type: 'error' } 
      }))
      return
    }

    setIsUpdating(true)
    try {
      const auth = getAuth()
      const user = auth.currentUser
      
      // Reauthenticate user
      const credential = EmailAuthProvider.credential(user.email, passwordData.current)
      await reauthenticateWithCredential(user, credential)
      
      // Update password
      await firebaseUpdatePassword(user, passwordData.new)
      
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Password updated successfully', type: 'success' } 
      }))
      
      setPasswordModalOpen(false)
      setPasswordData({ current: '', new: '', confirm: '' })
    } catch (error) {
      console.error('Error updating password:', error)
      let message = 'Failed to update password'
      if (error.code === 'auth/wrong-password') {
        message = 'Current password is incorrect'
      } else if (error.code === 'auth/weak-password') {
        message = 'Password is too weak'
      }
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message, type: 'error' } 
      }))
    } finally {
      setIsUpdating(false)
    }
  }

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/app/account')}
          className="p-2 rounded-lg hover:opacity-80 transition-all"
          style={{ backgroundColor: theme.secondary }}
        >
          <ArrowLeft size={20} style={{ color: theme.text }} />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: theme.text }}>Security & Privacy</h1>
          <p className="text-sm" style={{ color: theme.mutedText }}>Manage authentication and privacy settings</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Password Security */}
        <div 
          className="p-4 rounded-lg space-y-3"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <h4 className="text-sm font-medium mb-2" style={{ color: theme.text }}>Password Security</h4>
          <div className="space-y-2">
            <button
              onClick={() => setPasswordModalOpen(true)}
              className="w-full flex items-center justify-between p-3 rounded-lg transition-all hover:opacity-90"
              style={{ backgroundColor: theme.secondary }}
            >
              <div className="flex items-center gap-3">
                <Lock size={20} style={{ color: theme.accent }} />
                <span className="font-medium" style={{ color: theme.text }}>Change Password</span>
              </div>
              <Key size={16} style={{ color: theme.mutedText }} />
            </button>
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <div 
          className="p-4 rounded-lg space-y-3"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <h4 className="text-sm font-medium mb-2" style={{ color: theme.text }}>Two-Factor Authentication</h4>
          <div className="space-y-2">
            <div 
              className="flex items-center justify-between p-3 rounded-lg"
              style={{ backgroundColor: theme.secondary }}
            >
              <div className="flex items-center gap-3">
                <Shield size={20} style={{ color: theme.accent }} />
                <div>
                  <div className="font-medium" style={{ color: theme.text }}>
                    {security.twoFactorEnabled ? 'Two-Factor Enabled' : 'Two-Factor Disabled'}
                  </div>
                  <div className="text-xs" style={{ color: theme.mutedText }}>
                    {security.twoFactorEnabled 
                      ? `Using ${security.twoFactorMethod === 'email' ? 'Email' : 'Authenticator App'}`
                      : 'Add an extra layer of security'
                    }
                  </div>
                </div>
              </div>
              <button
                onClick={security.twoFactorEnabled ? disableTwoFA : openTwoFA}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 ${
                  security.twoFactorEnabled ? 'text-red-600' : ''
                }`}
                style={{ 
                  backgroundColor: security.twoFactorEnabled ? '#FEE2E2' : theme.accent,
                  color: security.twoFactorEnabled ? '#DC2626' : theme.accentText
                }}
              >
                {security.twoFactorEnabled ? 'Disable' : 'Enable'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Password Update Modal */}
      <Modal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        title="Change Password"
        theme={theme}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.current ? 'text' : 'password'}
                value={passwordData.current}
                onChange={(e) => setPasswordData(prev => ({ ...prev, current: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border"
                style={{ 
                  backgroundColor: theme.background, 
                  borderColor: theme.border, 
                  color: theme.text 
                }}
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('current')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                style={{ color: theme.mutedText }}
              >
                {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={passwordData.new}
                onChange={(e) => setPasswordData(prev => ({ ...prev, new: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border"
                style={{ 
                  backgroundColor: theme.background, 
                  borderColor: theme.border, 
                  color: theme.text 
                }}
                placeholder="Enter new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('new')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                style={{ color: theme.mutedText }}
              >
                {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={passwordData.confirm}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirm: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border"
                style={{ 
                  backgroundColor: theme.background, 
                  borderColor: theme.border, 
                  color: theme.text 
                }}
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => togglePasswordVisibility('confirm')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                style={{ color: theme.mutedText }}
              >
                {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              onClick={handlePasswordUpdate}
              disabled={isUpdating}
              className="flex-1 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: theme.accent, color: theme.accentText }}
            >
              {isUpdating ? 'Updating...' : 'Update Password'}
            </button>
            <button
              onClick={() => setPasswordModalOpen(false)}
              className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: theme.secondary, color: theme.text }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>

      {/* Two-Factor Setup Modal */}
      <Modal
        open={twoFAOpen}
        onClose={() => setTwoFAOpen(false)}
        title="Setup Two-Factor Authentication"
        theme={theme}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              Authentication Method
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer" style={{ backgroundColor: theme.secondary }}>
                <input
                  type="radio"
                  name="twoFAMethod"
                  value="email"
                  checked={twoFAMethod === 'email'}
                  onChange={(e) => setTwoFAMethod(e.target.value)}
                  className="w-4 h-4"
                  style={{ accentColor: theme.accent }}
                />
                <Mail size={20} style={{ color: theme.accent }} />
                <div>
                  <div className="font-medium" style={{ color: theme.text }}>Email</div>
                  <div className="text-xs" style={{ color: theme.mutedText }}>Receive codes via email</div>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 rounded-lg cursor-pointer" style={{ backgroundColor: theme.secondary }}>
                <input
                  type="radio"
                  name="twoFAMethod"
                  value="authenticator"
                  checked={twoFAMethod === 'authenticator'}
                  onChange={(e) => setTwoFAMethod(e.target.value)}
                  className="w-4 h-4"
                  style={{ accentColor: theme.accent }}
                />
                <Smartphone size={20} style={{ color: theme.accent }} />
                <div>
                  <div className="font-medium" style={{ color: theme.text }}>Authenticator App</div>
                  <div className="text-xs" style={{ color: theme.mutedText }}>Use Google Authenticator or similar</div>
                </div>
              </label>
            </div>
          </div>

          {twoFAMethod === 'authenticator' && (
            <div className="p-4 rounded-lg" style={{ backgroundColor: theme.background }}>
              <div className="text-sm font-medium mb-2" style={{ color: theme.text }}>Secret Key</div>
              <div className="text-xs font-mono p-2 rounded" style={{ backgroundColor: theme.secondary, color: theme.text }}>
                {twoFASecret}
              </div>
              <div className="text-xs mt-2" style={{ color: theme.mutedText }}>
                Add this key to your authenticator app
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              onClick={enableTwoFA}
              className="flex-1 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: theme.accent, color: theme.accentText }}
            >
              Enable Two-Factor
            </button>
            <button
              onClick={() => setTwoFAOpen(false)}
              className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
              style={{ backgroundColor: theme.secondary, color: theme.text }}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </section>
  )
}



