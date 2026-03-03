import React, { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, Shield, Lock, Eye, EyeOff, Key, Mail, Smartphone, QrCode, Copy, Check } from 'lucide-react'
import { getAuth, updatePassword as firebaseUpdatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { useFirebase } from '../context/FirebaseContext'
import Modal from '../components/common/Modal'
import { generateTOTPSecret, generateQRCode, verifyTOTPCode, getTOTPUrl, isValidCodeFormat } from '../utils/totp'
import { getTwoFactorSettings, saveTwoFactorSettings, disableTwoFactor, generateBackupCodes } from '../services/twoFactorAuth'

export default function AccountSecurity() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const { firebaseUser } = useFirebase()
  
  const [security, setSecurity] = useState({ 
    twoFactorEnabled: false, 
    twoFactorMethod: 'email', 
    authSecret: ''
  })
  const [twoFAOpen, setTwoFAOpen] = useState(false)
  const [twoFAMethod, setTwoFAMethod] = useState('email')
  const [twoFASecret, setTwoFASecret] = useState('')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [backupCodes, setBackupCodes] = useState([])
  const [secretCopied, setSecretCopied] = useState(false)
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
  const [isLoading, setIsLoading] = useState(true)

  // Load 2FA settings from Firestore on mount
  useEffect(() => {
    loadTwoFactorSettings()
  }, [firebaseUser])

  const loadTwoFactorSettings = async () => {
    if (!firebaseUser?.uid) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const settings = await getTwoFactorSettings(firebaseUser.uid)
      
      if (settings) {
        setSecurity({
          twoFactorEnabled: settings.enabled || false,
          twoFactorMethod: settings.method || 'email',
          authSecret: settings.secret || ''
        })
      }
    } catch (error) {
      console.error('Error loading 2FA settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const openTwoFA = async () => {
    // Generate new secret for authenticator app
    if (twoFAMethod === 'authenticator') {
      const newSecret = generateTOTPSecret()
      setTwoFASecret(newSecret)
      
      // Generate QR code
      try {
        const qrCode = await generateQRCode(newSecret, firebaseUser?.email || 'Account')
        setQrCodeDataUrl(qrCode)
      } catch (error) {
        console.error('Error generating QR code:', error)
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Error generating QR code', type: 'error' } 
        }))
      }
    }
    
    setVerificationCode('')
    setShowBackupCodes(false)
    setBackupCodes([])
    setTwoFAOpen(true)
  }

  const handleMethodChange = async (method) => {
    setTwoFAMethod(method)
    
    if (method === 'authenticator') {
      // Generate new secret and QR code
      const newSecret = generateTOTPSecret()
      setTwoFASecret(newSecret)
      
      try {
        const qrCode = await generateQRCode(newSecret, firebaseUser?.email || 'Account')
        setQrCodeDataUrl(qrCode)
      } catch (error) {
        console.error('Error generating QR code:', error)
      }
    } else {
      setQrCodeDataUrl('')
      setTwoFASecret('')
    }
    
    setVerificationCode('')
  }

  const copySecretToClipboard = () => {
    if (twoFASecret) {
      navigator.clipboard.writeText(twoFASecret)
      setSecretCopied(true)
      setTimeout(() => setSecretCopied(false), 2000)
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Secret key copied to clipboard', type: 'success' } 
      }))
    }
  }

  const verifyAndEnable2FA = async () => {
    if (!firebaseUser?.uid) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'User not authenticated', type: 'error' } 
      }))
      return
    }

    // For email method, skip verification
    if (twoFAMethod === 'email') {
      try {
        // TODO: Implement email OTP later
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Email 2FA is not available yet. Please use the Authenticator App option.', type: 'info' } 
        }))
        return
      } catch (error) {
        console.error('Error enabling email 2FA:', error)
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Failed to enable 2FA', type: 'error' } 
        }))
        return
      }
    }

    // For authenticator app, verify code first
    if (!isValidCodeFormat(verificationCode)) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Please enter a valid 6-digit code', type: 'error' } 
      }))
      return
    }

    setIsVerifying(true)
    try {
      // Verify the TOTP code
      const isValid = verifyTOTPCode(twoFASecret, verificationCode)
      
      if (!isValid) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Invalid code. Please try again.', type: 'error' } 
        }))
        setIsVerifying(false)
        return
      }

      // Get user's password for encryption (from sessionStorage if available)
      const userPassword = sessionStorage.getItem('tpprover_user_password') || ''
      
      // Generate backup codes
      const codes = generateBackupCodes(10)
      setBackupCodes(codes)
      setShowBackupCodes(true)

      // Save to Firestore
      const settings = {
        enabled: true,
        method: twoFAMethod,
        secret: twoFASecret,
        backupCodes: codes,
        enrolledAt: new Date().toISOString()
      }

      const success = await saveTwoFactorSettings(firebaseUser.uid, settings, userPassword || null)
      
      if (success) {
        // Update local state
        setSecurity({
          twoFactorEnabled: true,
          twoFactorMethod: twoFAMethod,
          authSecret: twoFASecret
        })

        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Two-factor authentication enabled successfully!', type: 'success' } 
        }))
        
        // Don't close modal yet - show backup codes
      } else {
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Failed to save 2FA settings', type: 'error' } 
        }))
      }
    } catch (error) {
      console.error('Error enabling 2FA:', error)
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Failed to enable 2FA', type: 'error' } 
      }))
    } finally {
      setIsVerifying(false)
    }
  }

  const handleClose2FAModal = () => {
    setTwoFAOpen(false)
    setVerificationCode('')
    setShowBackupCodes(false)
    setBackupCodes([])
    setQrCodeDataUrl('')
  }

  const disableTwoFA = async () => {
    if (!firebaseUser?.uid) return

    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return
    }

    try {
      const success = await disableTwoFactor(firebaseUser.uid)
      
      if (success) {
        setSecurity({
          twoFactorEnabled: false,
          twoFactorMethod: 'email',
          authSecret: ''
        })
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Two-factor authentication disabled', type: 'success' } 
        }))
      } else {
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Failed to disable 2FA', type: 'error' } 
        }))
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error)
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Failed to disable 2FA', type: 'error' } 
      }))
    }
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
          <h1 className="text-2xl font-bold" style={{ color: theme.text }}>Security</h1>
          <p className="text-sm" style={{ color: theme.mutedText }}>Manage password and two-factor authentication</p>
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
        onClose={handleClose2FAModal}
        title={showBackupCodes ? "Save Your Backup Codes" : "Setup Two-Factor Authentication"}
        theme={theme}
      >
        {!showBackupCodes ? (
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
                    onChange={(e) => handleMethodChange(e.target.value)}
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
                    onChange={(e) => handleMethodChange(e.target.value)}
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

            {twoFAMethod === 'authenticator' && twoFASecret && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg" style={{ backgroundColor: theme.background, border: `1px solid ${theme.border}` }}>
                  <div className="text-sm font-medium mb-3" style={{ color: theme.text }}>
                    Scan QR Code or Enter Secret Key
                  </div>
                  
                  {qrCodeDataUrl && (
                    <div className="flex justify-center mb-4">
                      <img 
                        src={qrCodeDataUrl} 
                        alt="QR Code for Authenticator App"
                        className="w-48 h-48 rounded-lg"
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="text-xs font-medium" style={{ color: theme.text }}>Secret Key</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 text-xs font-mono p-2 rounded break-all" style={{ backgroundColor: theme.secondary, color: theme.text }}>
                        {twoFASecret}
                      </div>
                      <button
                        onClick={copySecretToClipboard}
                        className="p-2 rounded hover:opacity-80 transition-all"
                        style={{ backgroundColor: theme.secondary, color: theme.text }}
                        title="Copy secret key"
                      >
                        {secretCopied ? <Check size={16} /> : <Copy size={16} />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="text-xs mt-3 p-2 rounded" style={{ backgroundColor: theme.secondary, color: theme.mutedText }}>
                    <strong>Steps:</strong>
                    <ol className="list-decimal list-inside mt-1 space-y-1">
                      <li>Open your authenticator app (Google Authenticator, Authy, etc.)</li>
                      <li>Scan the QR code above or manually enter the secret key</li>
                      <li>Enter the 6-digit code shown in your app below</li>
                    </ol>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                    Enter Verification Code
                  </label>
                  <input
                    type="text"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-3 py-2 rounded-lg border text-center text-lg tracking-widest font-mono"
                    style={{ 
                      backgroundColor: theme.background, 
                      borderColor: theme.border, 
                      color: theme.text 
                    }}
                  />
                  <div className="text-xs mt-1" style={{ color: theme.mutedText }}>
                    Enter the 6-digit code from your authenticator app
                  </div>
                </div>
              </div>
            )}

            {twoFAMethod === 'email' && (
              <div className="p-4 rounded-lg" style={{ backgroundColor: theme.secondary }}>
                <div className="text-sm" style={{ color: theme.mutedText }}>
                  Email-based two-factor authentication is not available yet. Please use the Authenticator App option.
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                onClick={verifyAndEnable2FA}
                disabled={isVerifying || (twoFAMethod === 'authenticator' && (!verificationCode || verificationCode.length !== 6))}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ backgroundColor: theme.accent, color: theme.accentText }}
              >
                {isVerifying ? 'Verifying...' : 'Enable Two-Factor'}
              </button>
              <button
                onClick={handleClose2FAModal}
                className="px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: theme.secondary, color: theme.text }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: theme.secondary }}>
              <div className="text-sm font-medium mb-2" style={{ color: theme.text }}>
                ⚠️ Important: Save These Backup Codes
              </div>
              <div className="text-xs" style={{ color: theme.mutedText }}>
                Store these codes in a safe place. You can use them to access your account if you lose access to your authenticator app.
              </div>
            </div>

            <div className="p-4 rounded-lg" style={{ backgroundColor: theme.background, border: `1px solid ${theme.border}` }}>
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div 
                    key={index}
                    className="p-2 rounded text-center"
                    style={{ backgroundColor: theme.secondary, color: theme.text }}
                  >
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-xs" style={{ color: theme.mutedText }}>
              Each code can only be used once. Generate new codes if you run out.
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleClose2FAModal}
                className="flex-1 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
                style={{ backgroundColor: theme.accent, color: theme.accentText }}
              >
                I've Saved My Codes
              </button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}



