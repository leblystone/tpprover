import React, { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { 
  ArrowLeft, 
  Mail, 
  Calendar, 
  Lock, 
  Shield,
  Edit3,
  Save,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  ShieldCheck,
  BadgeCheck,
  Smartphone,
  Key,
  Info,
  Copy,
  Check,
  Send,
  ChevronRight,
  Fingerprint
} from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { useFirebase } from '../context/FirebaseContext'
import Modal from '../components/common/Modal'
import { getTwoFactorSettings, disableTwoFactor, saveTwoFactorSettings } from '../services/twoFactorAuth'

export default function AccountProfile() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const { user } = useAppContext()
  const { firebaseUser } = useFirebase()
  
  // State for email editing
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailDraft, setEmailDraft] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  
  // State for password modal
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [isSendingReset, setIsSendingReset] = useState(false)
  const [resetEmailSent, setResetEmailSent] = useState(false)
  
  // State for email verification
  const [emailVerified, setEmailVerified] = useState(false)
  const [isSendingVerification, setIsSendingVerification] = useState(false)
  const [verificationCooldown, setVerificationCooldown] = useState(0)
  
  // State for 2FA
  const [security, setSecurity] = useState({ twoFactorEnabled: false })
  const [twoFAOpen, setTwoFAOpen] = useState(false)
  const [manage2FAOpen, setManage2FAOpen] = useState(false)
  const [isDisabling2FA, setIsDisabling2FA] = useState(false)
  const [twoFAMethod, setTwoFAMethod] = useState('authenticator') // 'email', 'authenticator', 'biometrics'
  
  // Get member since date from Firebase metadata or user object
  const getMemberSinceDate = () => {
    // First try Firebase metadata (most accurate)
    if (firebaseUser?.metadata?.creationTime) {
      return new Date(firebaseUser.metadata.creationTime).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    }
    // Fallback to user.createdAt
    if (user?.createdAt) {
      return new Date(user.createdAt).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      })
    }
    return 'Unknown'
  }
  
  const memberSinceDisplay = getMemberSinceDate()
  
  // Get user initials
  const getUserInitials = (email) => {
    if (!email) return '?'
    const parts = email.split('@')[0].split('.')
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return email.substring(0, 2).toUpperCase()
  }
  
  // Load security settings (2FA status)
  useEffect(() => {
    const loadSecurity = async () => {
      if (!firebaseUser) return
      try {
        const settings = await getTwoFactorSettings(firebaseUser.uid)
        if (settings) {
          setSecurity({ 
            twoFactorEnabled: settings.enabled || false,
            method: settings.method,
            enrolledAt: settings.enrolledAt
          })
        }
      } catch (error) {
        console.error('Failed to load 2FA settings:', error)
      }
    }
    loadSecurity()
  }, [firebaseUser])
  
  // Check email verification status
  useEffect(() => {
    if (firebaseUser) {
      setEmailVerified(firebaseUser.emailVerified)
    }
  }, [firebaseUser])
  
  // Handle email update
  const handleEmailUpdate = async () => {
    if (!emailDraft || emailDraft === user?.email) {
      setEditingEmail(false)
      return
    }
    
    setIsUpdating(true)
    try {
      // TODO: Implement email update
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Email update coming soon!', type: 'info' }
      }))
    } catch (error) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Failed to update email', type: 'error' }
      }))
    } finally {
      setIsUpdating(false)
      setEditingEmail(false)
    }
  }
  
  const cancelEmailEdit = () => {
    setEditingEmail(false)
    setEmailDraft(user?.email || '')
  }
  
  // Handle password reset
  const handlePasswordReset = async () => {
    if (!user?.email) return
    
    setIsSendingReset(true)
    try {
      const { sendPasswordResetEmail } = await import('firebase/auth')
      const { auth } = await import('../config/firebase')
      await sendPasswordResetEmail(auth, user.email)
      
      setResetEmailSent(true)
      setTimeout(() => setResetEmailSent(false), 5000) // Hide after 5 seconds
    } catch (error) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Failed to send reset email', type: 'error' }
      }))
    } finally {
      setIsSendingReset(false)
    }
  }
  
  // Handle password update
  const handlePasswordUpdate = async () => {
    if (newPassword !== confirmPassword) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Passwords do not match', type: 'error' }
      }))
      return
    }
    
    if (newPassword.length < 6) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Password must be at least 6 characters', type: 'error' }
      }))
      return
    }
    
    setIsUpdatingPassword(true)
    try {
      const { updatePassword, EmailAuthProvider, reauthenticateWithCredential } = await import('firebase/auth')
      
      // Reauthenticate user first
      const credential = EmailAuthProvider.credential(
        firebaseUser.email,
        currentPassword
      )
      await reauthenticateWithCredential(firebaseUser, credential)
      
      // Update password
      await updatePassword(firebaseUser, newPassword)
      
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Password updated successfully!', type: 'success' }
      }))
      setPasswordModalOpen(false)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      console.error('Password update error:', error)
      let errorMsg = 'Failed to update password'
      if (error.code === 'auth/wrong-password') {
        errorMsg = 'Current password is incorrect'
      } else if (error.code === 'auth/weak-password') {
        errorMsg = 'Password is too weak'
      } else if (error.code === 'auth/requires-recent-login') {
        errorMsg = 'Please sign out and sign back in, then try again'
      }
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: errorMsg, type: 'error' }
      }))
    } finally {
      setIsUpdatingPassword(false)
    }
  }
  
  // Handle toggle 2FA
  const handleToggle2FA = async (enabled) => {
    if (!firebaseUser) return
    
    if (!enabled) {
      // Disable 2FA directly (no confirmation)
      setIsDisabling2FA(true)
      try {
        const success = await disableTwoFactor(firebaseUser.uid)
        if (success) {
          setSecurity({ twoFactorEnabled: false })
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: 'Two-Factor Auth has been disabled', type: 'success' }
          }))
        } else {
          throw new Error('Failed to disable 2FA')
        }
      } catch (error) {
        console.error('Failed to disable 2FA:', error)
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: 'Failed to disable Two-Factor Auth', type: 'error' }
        }))
      } finally {
        setIsDisabling2FA(false)
      }
    } else {
      // Enable 2FA
      setIsDisabling2FA(true)
      try {
        const success = await saveTwoFactorSettings(firebaseUser.uid, {
          enabled: true,
          method: twoFAMethod || 'authenticator'
        })
        if (success) {
          setSecurity({ 
            twoFactorEnabled: true,
            method: twoFAMethod || 'authenticator'
          })
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: 'Two-Factor Auth has been enabled', type: 'success' }
          }))
        } else {
          throw new Error('Failed to enable 2FA')
        }
      } catch (error) {
        console.error('Failed to enable 2FA:', error)
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: 'Failed to enable Two-Factor Auth', type: 'error' }
        }))
      } finally {
        setIsDisabling2FA(false)
      }
    }
  }
  
  // Handle send verification email
  const handleSendVerificationEmail = async () => {
    if (!firebaseUser || isSendingVerification || verificationCooldown > 0) return
    
    setIsSendingVerification(true)
    try {
      const { sendEmailVerification } = await import('firebase/auth')
      await sendEmailVerification(firebaseUser)
      
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          message: 'Verification email sent! Check your inbox.', 
          type: 'success' 
        }
      }))
      
      // Start cooldown
      setVerificationCooldown(60)
      const interval = setInterval(() => {
        setVerificationCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (error) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Failed to send verification email', type: 'error' }
      }))
    } finally {
      setIsSendingVerification(false)
    }
  }

  return (
    <section className="max-w-xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/app/account')}
          className="group p-2 rounded-xl transition-all active:scale-95 border shadow-sm shrink-0"
          style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
        >
          <ArrowLeft size={18} style={{ color: theme.text }} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-black tracking-wide" style={{ color: theme.text }}>Profile</h1>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
              Email and Account Details
            </span>
          </div>
        </div>
      </div>

      {user ? (
        <div className="space-y-6">
          {/* Profile Header Card */}
          <div 
            className="p-4 rounded-[2rem] border-2 transition-all overflow-hidden"
            style={{ 
              backgroundColor: theme.cardBackground,
              borderColor: 'transparent',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
            }}
          >
            <div className="flex items-center gap-5">
              {/* User Avatar */}
              <div 
                className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-black shadow-sm" 
                style={{ 
                  backgroundColor: theme.primary + '15',
                  color: theme.primary
                }}
              >
                {getUserInitials(user.email)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <h4 className="text-[11px] font-bold uppercase tracking-widest opacity-60" style={{ color: theme.textLight }}>
                        Registered Email
                      </h4>
                      {emailVerified && <BadgeCheck size={12} className="text-blue-500" />}
                    </div>
                    
                    {editingEmail ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="email"
                          value={emailDraft}
                          onChange={(e) => setEmailDraft(e.target.value)}
                          className="px-3 py-1.5 rounded-xl border text-sm w-full max-w-[200px]"
                          style={{ 
                            backgroundColor: theme.background, 
                            borderColor: theme.border, 
                            color: theme.text 
                          }}
                          autoFocus
                        />
                        <button
                          onClick={handleEmailUpdate}
                          disabled={isUpdating}
                          className="p-2 rounded-xl hover:bg-black/5 transition-colors"
                          style={{ color: theme.primary }}
                        >
                          <Save size={18} />
                        </button>
                        <button
                          onClick={cancelEmailEdit}
                          className="p-2 rounded-xl hover:bg-black/5 transition-colors"
                          style={{ color: theme.mutedText }}
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="text-lg font-black tracking-wide truncate" style={{ color: theme.text }}>
                        {user.email}
                      </div>
                    )}
                  </div>

                  {!editingEmail && (
                    <button 
                      className="p-2 rounded-xl hover:bg-black/5 transition-all opacity-40 hover:opacity-100" 
                      style={{ color: theme.text }} 
                      onClick={() => { setEditingEmail(true); setEmailDraft(user.email || '') }}
                    >
                      <Edit3 size={18} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Details Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <Shield size={14} style={{ color: theme.primary }} />
              <h4 className="text-[11px] font-bold uppercase tracking-widest opacity-60" style={{ color: theme.textLight }}>
                Account Details
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <InfoCard
                icon={Calendar}
                label="Pep Planner Member Since"
                value={memberSinceDisplay}
                theme={theme}
              />
              
              <EmailStatusCard
                isVerified={emailVerified || firebaseUser?.emailVerified}
                theme={theme}
                onSendVerification={handleSendVerificationEmail}
                isSending={isSendingVerification}
                cooldown={verificationCooldown}
              />
            </div>
          </div>

          {/* Security Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 px-1">
              <ShieldCheck size={14} style={{ color: theme.primary }} />
              <h4 className="text-[11px] font-bold uppercase tracking-widest opacity-60" style={{ color: theme.textLight }}>
                Security
              </h4>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {/* Password Card */}
              <div 
                className="flex items-center justify-between p-4 rounded-[2rem] border-2 transition-all shadow-sm"
                style={{ backgroundColor: theme.cardBackground, borderColor: 'transparent' }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primary + '10' }}>
                    <Lock size={18} style={{ color: theme.primary }} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
                      Password
                    </div>
                    <div className="text-base font-black tracking-wide" style={{ color: theme.text }}>
                      ••••••••••••
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setPasswordModalOpen(true)}
                  className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all hover:bg-black/5 active:scale-95 border"
                  style={{ borderColor: theme.border, color: theme.text }}
                >
                  Update
                </button>
              </div>

              {/* Two-Factor Card */}
              <div 
                className="flex items-center justify-between p-4 rounded-[2rem] border-2 transition-all shadow-sm"
                style={{ backgroundColor: theme.cardBackground, borderColor: 'transparent' }}
              >
                <div className="flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center" 
                    style={{ backgroundColor: security.twoFactorEnabled ? theme.primary + '15' : '#c87a5c15' }}
                  >
                    <Smartphone size={18} style={{ color: security.twoFactorEnabled ? theme.primary : '#c87a5c' }} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
                      Two-Factor Auth
                    </div>
                    <div 
                      className="text-base font-black tracking-wide" 
                      style={{ color: security.twoFactorEnabled ? theme.primary : '#c87a5c' }}
                    >
                      {security.twoFactorEnabled ? 'Active' : 'Not Enabled'}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setManage2FAOpen(true)}
                  className="px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 border"
                  style={{ 
                    borderColor: theme.border, 
                    color: theme.text,
                    backgroundColor: security.twoFactorEnabled ? 'transparent' : '#c87a5c10'
                  }}
                >
                  {security.twoFactorEnabled ? 'Manage' : 'Enable'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw size={32} style={{ color: theme.mutedText }} className="animate-spin" />
            <p className="text-sm font-medium opacity-50" style={{ color: theme.text }}>
              Loading profile...
            </p>
          </div>
        </div>
      )}

      {/* Update Password Modal */}
      <Modal
        open={passwordModalOpen}
        onClose={() => {
          setPasswordModalOpen(false)
          setResetEmailSent(false)
        }}
        title="Update Password"
        theme={theme}
      >
        <div className="space-y-4">
          <div className="space-y-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest opacity-40 mb-2" style={{ color: theme.text }}>
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-2xl border text-sm font-medium"
                  style={{ 
                    backgroundColor: theme.background, 
                    borderColor: theme.border, 
                    color: theme.text 
                  }}
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-black/5 transition-colors"
                  style={{ color: theme.mutedText }}
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              
              {/* Forgot Password Link */}
              {!resetEmailSent ? (
                <button
                  onClick={handlePasswordReset}
                  disabled={isSendingReset}
                  className="mt-2 text-xs font-medium hover:underline disabled:opacity-50 w-full text-center"
                  style={{ color: theme.primary }}
                >
                  {isSendingReset ? 'Sending...' : 'Forgot password?'}
                </button>
              ) : (
                <div className="mt-2 flex items-center justify-center gap-2 text-xs font-medium" style={{ color: theme.primary }}>
                  <Check size={14} className="shrink-0" />
                  <span>Reset Link Sent via Email</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest opacity-40 mb-2" style={{ color: theme.text }}>
                New Password
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-2xl border text-sm font-medium"
                  style={{ 
                    backgroundColor: theme.background, 
                    borderColor: theme.border, 
                    color: theme.text 
                  }}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-black/5 transition-colors"
                  style={{ color: theme.mutedText }}
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-widest opacity-40 mb-2" style={{ color: theme.text }}>
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 rounded-2xl border text-sm font-medium"
                  style={{ 
                    backgroundColor: theme.background, 
                    borderColor: theme.border, 
                    color: theme.text 
                  }}
                  placeholder="Confirm new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-black/5 transition-colors"
                  style={{ color: theme.mutedText }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              onClick={handlePasswordUpdate}
              disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="w-full px-6 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-md active:scale-95 disabled:opacity-50"
              style={{ backgroundColor: theme.primary, color: '#ffffff' }}
            >
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Manage 2FA Modal */}
      <Modal
        open={manage2FAOpen}
        onClose={() => setManage2FAOpen(false)}
        title="Manage Two-Factor Auth"
        theme={theme}
      >
        <div className="space-y-6">
          {/* Toggle Section */}
          <div className="flex items-center justify-between p-5 rounded-2xl border-2" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primary + '10' }}>
                <ShieldCheck size={18} style={{ color: theme.primary }} />
              </div>
              <div>
                <div className="text-sm font-black tracking-wide" style={{ color: theme.text }}>Two-Factor Auth</div>
                <div className="text-xs opacity-50" style={{ color: theme.text }}>
                  {security.twoFactorEnabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
            </div>
            <button
              onClick={() => handleToggle2FA(!security.twoFactorEnabled)}
              disabled={isDisabling2FA}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 disabled:opacity-50 ${
                security.twoFactorEnabled ? 'opacity-100' : 'opacity-50'
              }`}
              style={{ 
                backgroundColor: security.twoFactorEnabled ? theme.primary : theme.border
              }}
            >
              <div
                className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full transition-all duration-300 ${
                  security.twoFactorEnabled ? 'translate-x-7' : 'translate-x-0'
                }`}
                style={{ backgroundColor: '#ffffff' }}
              />
            </button>
          </div>

          {/* Prompt when disabled */}
          {!security.twoFactorEnabled && (
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/50">
              <div className="flex items-start gap-3">
                <Info size={18} className="text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-blue-700/70 leading-relaxed">
                    Enable Two-Factor Auth to add an extra layer of security to your account. Protect your research data and protocols.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Method Options (only show when enabled) */}
          {security.twoFactorEnabled && (
            <div className="space-y-3">
              <h4 className="text-[11px] font-bold uppercase tracking-widest opacity-60 px-1" style={{ color: theme.text }}>
                Authentication Method
              </h4>
              
              {/* Email Verification */}
              <button
                onClick={() => setTwoFAMethod('email')}
                className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
                  twoFAMethod === 'email' ? 'shadow-md' : ''
                }`}
                style={{ 
                  backgroundColor: twoFAMethod === 'email' ? theme.primary + '10' : theme.cardBackground,
                  borderColor: twoFAMethod === 'email' ? theme.primary : theme.border
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primary + '10' }}>
                    <Mail size={18} style={{ color: theme.primary }} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black tracking-wide" style={{ color: theme.text }}>Email Verification</div>
                    <div className="text-xs opacity-50" style={{ color: theme.text }}>Receive codes via email</div>
                  </div>
                </div>
                {twoFAMethod === 'email' && <Check size={18} style={{ color: theme.primary }} />}
              </button>

              {/* Authenticator App */}
              <button
                onClick={() => setTwoFAMethod('authenticator')}
                className={`w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all ${
                  twoFAMethod === 'authenticator' ? 'shadow-md' : ''
                }`}
                style={{ 
                  backgroundColor: twoFAMethod === 'authenticator' ? theme.primary + '10' : theme.cardBackground,
                  borderColor: twoFAMethod === 'authenticator' ? theme.primary : theme.border
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primary + '10' }}>
                    <Smartphone size={18} style={{ color: theme.primary }} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black tracking-wide" style={{ color: theme.text }}>Authenticator App</div>
                    <div className="text-xs opacity-50" style={{ color: theme.text }}>Use an authenticator app</div>
                  </div>
                </div>
                {twoFAMethod === 'authenticator' && <Check size={18} style={{ color: theme.primary }} />}
              </button>

              {/* Biometrics (Coming Soon) */}
              <button
                disabled
                className="w-full flex items-center justify-between p-5 rounded-2xl border-2 transition-all opacity-50 cursor-not-allowed"
                style={{ 
                  backgroundColor: theme.cardBackground,
                  borderColor: theme.border
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.border }}>
                    <Fingerprint size={18} style={{ color: theme.mutedText }} />
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-black tracking-wide" style={{ color: theme.text }}>Biometrics</div>
                    <div className="text-xs opacity-50" style={{ color: theme.text }}>Coming soon</div>
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
      </Modal>

      {/* Enable 2FA Modal (Placeholder) */}
      <Modal
        open={twoFAOpen}
        onClose={() => setTwoFAOpen(false)}
        title="Enable Two-Factor Auth"
        theme={theme}
      >
        <div className="p-6 text-center">
          <ShieldCheck size={48} style={{ color: theme.primary }} className="mx-auto mb-4" />
          <p className="text-sm opacity-70 mb-4" style={{ color: theme.text }}>
            Two-factor authentication setup is being enhanced.
          </p>
          <p className="text-xs opacity-50" style={{ color: theme.text }}>
            You can enable Two-Factor Auth during login for enhanced security.
          </p>
        </div>
      </Modal>
    </section>
  )
}

const InfoCard = ({ icon: Icon, label, value, theme }) => (
  <div 
    className="flex items-center justify-between p-4 rounded-[2rem] border-2 transition-all shadow-sm"
    style={{ 
      backgroundColor: theme.cardBackground,
      borderColor: 'transparent'
    }}
  >
    <div className="flex items-center gap-4">
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: theme.primary + '10' }}
      >
        <Icon size={18} style={{ color: theme.primary }} />
      </div>
      <div>
        <div className="text-[11px] font-bold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
          {label}
        </div>
        <div className="text-base font-black tracking-wide" style={{ color: theme.text }}>
          {value}
        </div>
      </div>
    </div>
  </div>
)

const EmailStatusCard = ({ isVerified, theme, onSendVerification, isSending, cooldown = 0 }) => {
  const isDisabled = isSending || cooldown > 0
  
  return (
    <div 
      className="p-4 rounded-[2rem] border-2 transition-all shadow-sm overflow-hidden"
      style={{ 
        backgroundColor: theme.cardBackground,
        borderColor: 'transparent'
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ 
              backgroundColor: isVerified ? theme.primary + '15' : '#c87a5c15'
            }}
          >
            <Mail size={18} style={{ color: isVerified ? theme.primary : '#c87a5c' }} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
              Email Verification
            </div>
            <div 
              className="text-base font-black tracking-wide" 
              style={{ color: isVerified ? theme.primary : '#c87a5c' }}
            >
              {isVerified ? 'Verified' : 'Unverified'}
            </div>
          </div>
        </div>
        
        {!isVerified && (
          <button
            onClick={onSendVerification}
            disabled={isDisabled}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 hover:shadow-md active:scale-95"
            style={{ 
              backgroundColor: theme.primary,
              color: '#ffffff'
            }}
          >
            {isSending ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
            <span>{isSending ? 'Sending' : cooldown > 0 ? `${cooldown}s` : 'Verify'}</span>
          </button>
        )}
      </div>

      {!isVerified && (
        <div className="mt-4 pt-4 border-t border-dashed" style={{ borderColor: theme.border }}>
          <div className="flex gap-2 text-[11px] leading-relaxed opacity-70" style={{ color: theme.text }}>
            <ShieldCheck size={14} className="shrink-0 mt-0.5" style={{ color: '#c87a5c' }} />
            <p>Verification enables secure password recovery and account protection.</p>
          </div>
        </div>
      )}
    </div>
  )
}

)

const EmailStatusCard = ({ isVerified, theme, onSendVerification, isSending, cooldown = 0 }) => {
  const isDisabled = isSending || cooldown > 0
  
  return (
    <div 
      className="p-4 rounded-[2rem] border-2 transition-all shadow-sm overflow-hidden"
      style={{ 
        backgroundColor: theme.cardBackground,
        borderColor: 'transparent'
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ 
              backgroundColor: isVerified ? theme.primary + '15' : '#c87a5c15'
            }}
          >
            <Mail size={18} style={{ color: isVerified ? theme.primary : '#c87a5c' }} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
              Email Verification
            </div>
            <div 
              className="text-base font-black tracking-wide" 
              style={{ color: isVerified ? theme.primary : '#c87a5c' }}
            >
              {isVerified ? 'Verified' : 'Unverified'}
            </div>
          </div>
        </div>
        
        {!isVerified && (
          <button
            onClick={onSendVerification}
            disabled={isDisabled}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 hover:shadow-md active:scale-95"
            style={{ 
              backgroundColor: theme.primary,
              color: '#ffffff'
            }}
          >
            {isSending ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
            <span>{isSending ? 'Sending' : cooldown > 0 ? `${cooldown}s` : 'Verify'}</span>
          </button>
        )}
      </div>

      {!isVerified && (
        <div className="mt-4 pt-4 border-t border-dashed" style={{ borderColor: theme.border }}>
          <div className="flex gap-2 text-[11px] leading-relaxed opacity-70" style={{ color: theme.text }}>
            <ShieldCheck size={14} className="shrink-0 mt-0.5" style={{ color: '#c87a5c' }} />
            <p>Verification enables secure password recovery and account protection.</p>
          </div>
        </div>
      )}
    </div>
  )
}

)

const EmailStatusCard = ({ isVerified, theme, onSendVerification, isSending, cooldown = 0 }) => {
  const isDisabled = isSending || cooldown > 0
  
  return (
    <div 
      className="p-4 rounded-[2rem] border-2 transition-all shadow-sm overflow-hidden"
      style={{ 
        backgroundColor: theme.cardBackground,
        borderColor: 'transparent'
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ 
              backgroundColor: isVerified ? theme.primary + '15' : '#c87a5c15'
            }}
          >
            <Mail size={18} style={{ color: isVerified ? theme.primary : '#c87a5c' }} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
              Email Verification
            </div>
            <div 
              className="text-base font-black tracking-wide" 
              style={{ color: isVerified ? theme.primary : '#c87a5c' }}
            >
              {isVerified ? 'Verified' : 'Unverified'}
            </div>
          </div>
        </div>
        
        {!isVerified && (
          <button
            onClick={onSendVerification}
            disabled={isDisabled}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 hover:shadow-md active:scale-95"
            style={{ 
              backgroundColor: theme.primary,
              color: '#ffffff'
            }}
          >
            {isSending ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
            <span>{isSending ? 'Sending' : cooldown > 0 ? `${cooldown}s` : 'Verify'}</span>
          </button>
        )}
      </div>

      {!isVerified && (
        <div className="mt-4 pt-4 border-t border-dashed" style={{ borderColor: theme.border }}>
          <div className="flex gap-2 text-[11px] leading-relaxed opacity-70" style={{ color: theme.text }}>
            <ShieldCheck size={14} className="shrink-0 mt-0.5" style={{ color: '#c87a5c' }} />
            <p>Verification enables secure password recovery and account protection.</p>
          </div>
        </div>
      )}
    </div>
  )
}

)

const EmailStatusCard = ({ isVerified, theme, onSendVerification, isSending, cooldown = 0 }) => {
  const isDisabled = isSending || cooldown > 0
  
  return (
    <div 
      className="p-4 rounded-[2rem] border-2 transition-all shadow-sm overflow-hidden"
      style={{ 
        backgroundColor: theme.cardBackground,
        borderColor: 'transparent'
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ 
              backgroundColor: isVerified ? theme.primary + '15' : '#c87a5c15'
            }}
          >
            <Mail size={18} style={{ color: isVerified ? theme.primary : '#c87a5c' }} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
              Email Verification
            </div>
            <div 
              className="text-base font-black tracking-wide" 
              style={{ color: isVerified ? theme.primary : '#c87a5c' }}
            >
              {isVerified ? 'Verified' : 'Unverified'}
            </div>
          </div>
        </div>
        
        {!isVerified && (
          <button
            onClick={onSendVerification}
            disabled={isDisabled}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 hover:shadow-md active:scale-95"
            style={{ 
              backgroundColor: theme.primary,
              color: '#ffffff'
            }}
          >
            {isSending ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
            <span>{isSending ? 'Sending' : cooldown > 0 ? `${cooldown}s` : 'Verify'}</span>
          </button>
        )}
      </div>

      {!isVerified && (
        <div className="mt-4 pt-4 border-t border-dashed" style={{ borderColor: theme.border }}>
          <div className="flex gap-2 text-[11px] leading-relaxed opacity-70" style={{ color: theme.text }}>
            <ShieldCheck size={14} className="shrink-0 mt-0.5" style={{ color: '#c87a5c' }} />
            <p>Verification enables secure password recovery and account protection.</p>
          </div>
        </div>
      )}
    </div>
  )
}

)

const EmailStatusCard = ({ isVerified, theme, onSendVerification, isSending, cooldown = 0 }) => {
  const isDisabled = isSending || cooldown > 0
  
  return (
    <div 
      className="p-4 rounded-[2rem] border-2 transition-all shadow-sm overflow-hidden"
      style={{ 
        backgroundColor: theme.cardBackground,
        borderColor: 'transparent'
      }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ 
              backgroundColor: isVerified ? theme.primary + '15' : '#c87a5c15'
            }}
          >
            <Mail size={18} style={{ color: isVerified ? theme.primary : '#c87a5c' }} />
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
              Email Verification
            </div>
            <div 
              className="text-base font-black tracking-wide" 
              style={{ color: isVerified ? theme.primary : '#c87a5c' }}
            >
              {isVerified ? 'Verified' : 'Unverified'}
            </div>
          </div>
        </div>
        
        {!isVerified && (
          <button
            onClick={onSendVerification}
            disabled={isDisabled}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 hover:shadow-md active:scale-95"
            style={{ 
              backgroundColor: theme.primary,
              color: '#ffffff'
            }}
          >
            {isSending ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
            <span>{isSending ? 'Sending' : cooldown > 0 ? `${cooldown}s` : 'Verify'}</span>
          </button>
        )}
      </div>

      {!isVerified && (
        <div className="mt-4 pt-4 border-t border-dashed" style={{ borderColor: theme.border }}>
          <div className="flex gap-2 text-[11px] leading-relaxed opacity-70" style={{ color: theme.text }}>
            <ShieldCheck size={14} className="shrink-0 mt-0.5" style={{ color: '#c87a5c' }} />
            <p>Verification enables secure password recovery and account protection.</p>
          </div>
        </div>
      )}
    </div>
  )
}
