import React, { useState, useEffect, useMemo } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Calendar, Mail, Edit3, Save, X, Send, Lock, Shield, ChevronRight, Eye, EyeOff, Smartphone, Copy, Check, Info, AlertCircle, AlertTriangle, Lightbulb } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { useFirebase } from '../context/FirebaseContext'
import { getAuth, updateEmail, verifyBeforeUpdateEmail, updatePassword as firebaseUpdatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'
import { getApp } from 'firebase/app'
import { getFirestore, doc, getDoc } from 'firebase/firestore'
import Modal from '../components/common/Modal'
import BottomSheet from '../components/common/BottomSheet'
import { generateTOTPSecret, generateQRCode, verifyTOTPCode } from '../utils/totp'
import { getTwoFactorSettings, saveTwoFactorSettings, disableTwoFactor, generateBackupCodes } from '../services/twoFactorAuth'

// Helper function to generate user initials
function getUserInitials(email) {
  if (!email) return 'U'
  const parts = email.split('@')[0].split('.')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return email.substring(0, 2).toUpperCase()
}

function coerceToDate(value) {
  if (!value) return null

  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value
  }

  if (typeof value === 'number') {
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  }

  if (typeof value === 'string') {
    const date = new Date(value)
    return isNaN(date.getTime()) ? null : date
  }

  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      try {
        const date = value.toDate()
        return coerceToDate(date)
      } catch (error) {
        console.error('Failed to convert value with toDate() to Date:', error)
      }
    }

    if (typeof value.toMillis === 'function') {
      try {
        const millis = value.toMillis()
        return coerceToDate(millis)
      } catch (error) {
        console.error('Failed to convert value with toMillis() to Date:', error)
      }
    }

    if (typeof value.seconds === 'number') {
      return coerceToDate(value.seconds * 1000)
    }

    if (typeof value._seconds === 'number') {
      return coerceToDate(value._seconds * 1000)
    }

    if (value.creationTime) {
      return coerceToDate(value.creationTime)
    }

    if (value.createdAt) {
      return coerceToDate(value.createdAt)
    }
  }

  return null
}

export default function AccountProfile() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const { user } = useAppContext()
  const { firebaseUser } = useFirebase()
  
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailDraft, setEmailDraft] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  
  // Password re-authentication for email change
  const [passwordConfirmOpen, setPasswordConfirmOpen] = useState(false)
  const [passwordForEmailChange, setPasswordForEmailChange] = useState('')
  const [showPasswordForEmailChange, setShowPasswordForEmailChange] = useState(false)
  const [isReauthenticating, setIsReauthenticating] = useState(false)
  const [isSendingVerification, setIsSendingVerification] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)
  const [verificationCooldown, setVerificationCooldown] = useState(0)
  const [cloudCreatedAt, setCloudCreatedAt] = useState(null)
  
  // Password Reset States
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
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  
  // 2FA States
  const [twoFactorSettings, setTwoFactorSettings] = useState({ 
    twoFactorEnabled: false, 
    twoFactorMethod: 'email', 
    authSecret: ''
  })
  const [twoFAOpen, setTwoFAOpen] = useState(false)
  const [twoFAMethod, setTwoFAMethod] = useState('authenticator')
  const [twoFASecret, setTwoFASecret] = useState('')
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [backupCodes, setBackupCodes] = useState([])
  const [secretCopied, setSecretCopied] = useState(false)
  const [isLoading2FA, setIsLoading2FA] = useState(true)

  const memberSinceDate = useMemo(() => {
    const candidates = [
      cloudCreatedAt,
      user?.createdAt,
      firebaseUser?.metadata?.creationTime,
      firebaseUser?.metadata,
      firebaseUser?.providerData?.[0]?.creationTime
    ]

    for (const candidate of candidates) {
      const parsed = coerceToDate(candidate)
      if (parsed) {
        return parsed
      }
    }

    return null
  }, [cloudCreatedAt, user?.createdAt, firebaseUser])

  const memberSinceDisplay = useMemo(() => {
    if (!memberSinceDate) return 'Unknown'

    try {
      return memberSinceDate.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch (error) {
      console.error('Failed to format member since date:', error)
      return 'Unknown'
    }
  }, [memberSinceDate])

  // Initialize emailVerified state from firebaseUser
  useEffect(() => {
    setEmailVerified(firebaseUser?.emailVerified || false)
  }, [firebaseUser?.emailVerified])
  
  // Load 2FA settings from Firestore on mount
  useEffect(() => {
    loadTwoFactorSettings()
  }, [firebaseUser])
  
  const loadTwoFactorSettings = async () => {
    if (!firebaseUser?.uid) {
      setIsLoading2FA(false)
      return
    }

    try {
      setIsLoading2FA(true)
      const settings = await getTwoFactorSettings(firebaseUser.uid)
      
      if (settings) {
        setTwoFactorSettings({
          twoFactorEnabled: settings.enabled || false,
          twoFactorMethod: settings.method || 'email',
          authSecret: settings.secret || ''
        })
      }
    } catch (error) {
      console.error('Error loading 2FA settings:', error)
    } finally {
      setIsLoading2FA(false)
    }
  }

  // Reload Firebase Auth user periodically to check for verification status updates
  useEffect(() => {
    const checkVerificationStatus = async () => {
      if (firebaseUser) {
        try {
          const auth = getAuth()
          if (auth.currentUser) {
            await auth.currentUser.reload()
            setEmailVerified(auth.currentUser.emailVerified)
          }
        } catch (error) {
          console.error('Error checking verification status:', error)
        }
      }
    }

    // Check immediately
    checkVerificationStatus()

    // Check every 5 seconds when on the account page (helps catch verification while user is on the page)
    const interval = setInterval(checkVerificationStatus, 5000)

    return () => clearInterval(interval)
  }, [firebaseUser])

  useEffect(() => {
    let isMounted = true

    const fetchCloudCreatedAt = async () => {
      if (cloudCreatedAt || memberSinceDate || !firebaseUser?.uid) {
        return
      }

      try {
        const db = getFirestore()
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))

        if (!isMounted) {
          return
        }

        if (userDoc.exists()) {
          const data = userDoc.data() || {}
          const createdAtValue = data.createdAt || data.created_at || data.creationTime
          const parsed = coerceToDate(createdAtValue)
          if (parsed) {
            setCloudCreatedAt(parsed)
          }
        }
      } catch (error) {
        console.error('Failed to load member since date from Firestore:', error)
      }
    }

    fetchCloudCreatedAt()

    return () => {
      isMounted = false
    }
  }, [cloudCreatedAt, memberSinceDate, firebaseUser])

  const handleEmailUpdate = async () => {
    if (!emailDraft || emailDraft === user?.email) {
      setEditingEmail(false)
      return
    }

    // Require password confirmation before email change
    setPasswordConfirmOpen(true)
  }

  const cancelEmailEdit = () => {
    setEmailDraft(user?.email || '')
    setEditingEmail(false)
    setPasswordConfirmOpen(false)
    setPasswordForEmailChange('')
  }

  // Handle password confirmation for email change
  const handlePasswordConfirm = async () => {
    if (!passwordForEmailChange) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Please enter your password', type: 'error' } 
      }))
      return
    }

    setIsReauthenticating(true)
    try {
      const auth = getAuth()
      const userAuth = auth.currentUser
      
      // Re-authenticate user with password
      const credential = EmailAuthProvider.credential(userAuth.email, passwordForEmailChange)
      await reauthenticateWithCredential(userAuth, credential)
      
      // Password confirmed, proceed with email update
      setPasswordConfirmOpen(false)
      setPasswordForEmailChange('')
      await proceedWithEmailUpdate()
    } catch (error) {
      console.error('Error re-authenticating:', error)
      let message = 'Password is incorrect'
      if (error.code === 'auth/wrong-password') {
        message = 'Incorrect password. Please try again.'
      } else if (error.code === 'auth/too-many-requests') {
        message = 'Too many attempts. Please try again later.'
      } else if (error.message) {
        message = error.message
      }
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message, type: 'error' } 
      }))
    } finally {
      setIsReauthenticating(false)
    }
  }

  // Proceed with email update after password confirmation
  const proceedWithEmailUpdate = async () => {
    if (!emailDraft || emailDraft === user?.email) {
      setEditingEmail(false)
      return
    }

    setIsUpdating(true)
    const oldEmail = user?.email || firebaseUser?.email
    
    try {
      const auth = getAuth()
      
      // If email is changing, set verification status to false immediately
      if (emailDraft !== user?.email) {
        setEmailVerified(false)
      }
      
      // This sends Firebase's native verification email to the new address
      console.log('🔐 Sending Firebase verification email to:', emailDraft)
      await verifyBeforeUpdateEmail(auth.currentUser, emailDraft)
      console.log('✅ Firebase verification email sent')
      
      // Send security notification to old email
      try {
        const functions = getFunctions(getApp(), 'us-central1')
        const sendEmailChangeNotification = httpsCallable(functions, 'sendEmailChangeNotification')
        await sendEmailChangeNotification({
          oldEmail: oldEmail,
          newEmail: emailDraft,
          timestamp: new Date().toISOString()
        })
        console.log('✅ Security notification sent to old email')
      } catch (notificationError) {
        // Don't fail the email change if notification fails, but log it
        console.warn('Failed to send security notification:', notificationError)
      }
      
      // Send custom verification notification to new email
      try {
        const functions = getFunctions(getApp(), 'us-central1')
        const sendEmailChangeVerificationNotification = httpsCallable(functions, 'sendEmailChangeVerificationNotification')
        await sendEmailChangeVerificationNotification({
          newEmail: emailDraft,
          oldEmail: oldEmail
        })
        console.log('✅ Instructional email sent to new email')
      } catch (verificationError) {
        // Don't fail the email change if verification notification fails, but log it
        console.warn('Failed to send verification notification:', verificationError)
      }
      
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { 
          message: `📧 Verification email sent to ${emailDraft}. Please check your inbox (and spam folder) and click the verification link to complete the change.`, 
          type: 'success',
          duration: 8000 // Longer duration for important message
        } 
      }))
      
      setEditingEmail(false)
    } catch (error) {
      console.error('Error updating email:', error)
      // Revert verification status if update failed
      setEmailVerified(firebaseUser?.emailVerified || false)
      
      // Provide more specific error messages
      let errorMessage = 'Failed to update email'
      if (error.code === 'auth/requires-recent-login') {
        errorMessage = 'For security, please sign out and sign in again before changing your email.'
      } else if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email address is already in use by another account.'
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'The email address is invalid. Please check and try again.'
      } else if (error.code === 'auth/operation-not-allowed') {
        errorMessage = 'Email change is not allowed. Please contact support.'
      } else if (error.message) {
        errorMessage = error.message
      }
      
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: errorMessage, type: 'error', duration: 6000 } 
      }))
    } finally {
      setIsUpdating(false)
    }
  }

  const handleSendVerificationEmail = async () => {
    if (!firebaseUser || firebaseUser.emailVerified) return
    if (isSendingVerification || verificationCooldown > 0) return

    setIsSendingVerification(true)
    try {
      const functions = getFunctions(getApp(), 'us-central1')
      const sendCustomVerificationEmail = httpsCallable(functions, 'sendCustomVerificationEmail')
      
      const result = await sendCustomVerificationEmail()
      
      if (result.data?.success) {
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: '📧 Verification email sent! Check your inbox.', type: 'success' }
        }))
        
        // Set cooldown to prevent spam (30 seconds)
        setVerificationCooldown(30)
        const cooldownInterval = setInterval(() => {
          setVerificationCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(cooldownInterval)
              return 0
            }
            return prev - 1
          })
        }, 1000)
      } else {
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: 'Failed to send verification email. Please try again.', type: 'error' }
        }))
      }
    } catch (error) {
      console.error('Error sending verification email:', error)
      
      let errorMessage = 'Failed to send verification email. '
      if (error.code === 'unauthenticated') {
        errorMessage = 'You must be logged in to request a verification email.'
      } else if (error.message) {
        errorMessage += error.message
      } else {
        errorMessage += 'Please try again.'
      }
      
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: errorMessage, type: 'error' }
      }))
    } finally {
      // Always reset sending state immediately
      setIsSendingVerification(false)
    }
  }
  
  // Password Reset Handler
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

    setIsUpdatingPassword(true)
    try {
      const auth = getAuth()
      const userAuth = auth.currentUser
      
      // Reauthenticate user
      const credential = EmailAuthProvider.credential(userAuth.email, passwordData.current)
      await reauthenticateWithCredential(userAuth, credential)
      
      // Update password
      await firebaseUpdatePassword(userAuth, passwordData.new)
      
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
      setIsUpdatingPassword(false)
    }
  }

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
  }
  
  // 2FA Handlers
  const openTwoFA = async () => {
    const newSecret = generateTOTPSecret()
    setTwoFASecret(newSecret)
    
    try {
      const qrCode = await generateQRCode(newSecret, firebaseUser?.email || 'Account')
      setQrCodeDataUrl(qrCode)
    } catch (error) {
      console.error('Error generating QR code:', error)
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Error generating QR code', type: 'error' } 
      }))
    }
    
    setVerificationCode('')
    setShowBackupCodes(false)
    setBackupCodes([])
    setTwoFAOpen(true)
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

    if (!verificationCode || verificationCode.length !== 6) {
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Please enter a valid 6-digit code', type: 'error' } 
      }))
      return
    }

    setIsVerifying(true)
    try {
      const isValid = verifyTOTPCode(twoFASecret, verificationCode)
      
      if (!isValid) {
        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Invalid code. Please try again.', type: 'error' } 
        }))
        setIsVerifying(false)
        return
      }

      const userPassword = sessionStorage.getItem('tpprover_user_password') || ''
      const codes = generateBackupCodes(10)
      setBackupCodes(codes)
      setShowBackupCodes(true)

      const settings = {
        enabled: true,
        method: 'authenticator',
        secret: twoFASecret,
        backupCodes: codes,
        enrolledAt: new Date().toISOString()
      }

      const success = await saveTwoFactorSettings(firebaseUser.uid, settings, userPassword || null)
      
      if (success) {
        setTwoFactorSettings({
          twoFactorEnabled: true,
          twoFactorMethod: 'authenticator',
          authSecret: twoFASecret
        })

        window.dispatchEvent(new CustomEvent('tpp:toast', { 
          detail: { message: 'Two-factor authentication enabled successfully!', type: 'success' } 
        }))
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

  const handleDisableTwoFA = async () => {
    if (!firebaseUser?.uid) return

    if (!confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return
    }

    try {
      const success = await disableTwoFactor(firebaseUser.uid)
      
      if (success) {
        setTwoFactorSettings({
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

  return (
    <section className="page-bg max-w-xl mx-auto space-y-6 pb-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => navigate('/app/account')}
          className="group p-2 rounded-full hover:opacity-80 transition-all active:scale-95 shrink-0"
          style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
        >
          <ArrowLeft size={18} style={{ color: theme.text }} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="flex flex-col gap-0.5">
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: theme.text }}>Profile</h1>
          <div className="flex items-center gap-2">
            <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
              Account Information & Security
            </span>
          </div>
        </div>
      </div>
      <div className="h-px w-full mb-4 opacity-10" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}></div>

      {user ? (
        <div className="space-y-6">
          {/* Email Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Mail size={16} style={{ color: theme.primary }} />
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
                Email Address
              </h4>
            </div>
            
            <div 
              className="content-section p-4 rounded-[2rem] border-2 transition-all"
              style={{
                borderColor: 'transparent',
                boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
              }}
            >
              <div className="flex items-center gap-4">
                {/* User Avatar */}
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg" style={{ 
                  background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark || theme.primary} 100%)` 
                }}>
                  {getUserInitials(user.email)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-40" style={{ color: theme.text }}>Email</div>
                      <div 
                        className="font-semibold tracking-tight whitespace-nowrap"
                        style={{ 
                          color: theme.text,
                          fontSize: user.email 
                            ? `${Math.max(12, Math.min(18, 18 - (user.email.length - 20) * 0.4))}px`
                            : '1.125rem'
                        }}
                      >
                        {user.email}
                      </div>
                    </div>
                    <button 
                      className="text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg hover:opacity-80 transition-all shrink-0" 
                      style={{ color: theme.primary, backgroundColor: theme.primary + '10' }} 
                      onClick={() => { setEditingEmail(true); setEmailDraft(user.email || '') }}
                    >
                      <Edit3 size={12} className="inline mr-1" />
                      Edit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Info size={16} style={{ color: theme.primary }} />
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
                Account Information
              </h4>
            </div>
            
            <div className="space-y-3">
              <div 
                className="content-section p-3 rounded-[2rem] border-2 transition-all"
                style={{
                  borderColor: 'transparent',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}
              >
                <InfoCard
                  icon={Calendar}
                  label="Pep Planner Member Since"
                  value={memberSinceDisplay}
                  theme={theme}
                />
              </div>
              
              <div 
                className="content-section p-3 rounded-[2rem] border-2 transition-all"
                style={{
                  borderColor: 'transparent',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}
              >
                <EmailStatusCard
                  isVerified={emailVerified || firebaseUser?.emailVerified}
                  theme={theme}
                  onSendVerification={handleSendVerificationEmail}
                  isSending={isSendingVerification}
                  cooldown={verificationCooldown}
                />
              </div>
            </div>
          </div>

          {/* Password & Security */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <Shield size={16} style={{ color: theme.primary }} />
              <h4 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
                Password & Security
              </h4>
            </div>
            
            <div className="space-y-3">
              {/* Password Reset Button */}
              <button
                onClick={() => setPasswordModalOpen(true)}
                className="content-section group w-full p-4 rounded-[2rem] transition-all border-2 text-left overflow-hidden relative"
                style={{
                  borderColor: 'transparent',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-2xl flex items-center justify-center"
                      style={{ backgroundColor: theme.primary + '10' }}
                    >
                      <Lock size={22} style={{ color: theme.primary }} />
                    </div>
                    <div className="px-1">
                      <div className="font-semibold text-lg tracking-tight mb-1" style={{ color: theme.text }}>
                        Change Password
                      </div>
                      <div className="text-xs leading-relaxed opacity-50" style={{ color: theme.text }}>
                        Update your account password
                      </div>
                    </div>
                  </div>
                  <div className="opacity-30 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                    <ChevronRight size={20} style={{ color: theme.text }} />
                  </div>
                </div>
                {/* Subtle Gradient Overlay on Hover */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none bg-gradient-to-br from-white/20 to-transparent dark:from-white/5" />
              </button>

              {/* 2FA Button - Coming Soon */}
              <div>
                <div
                  className="content-section w-full p-4 rounded-[2rem] transition-all border-2 text-left overflow-hidden relative opacity-40 cursor-not-allowed"
                  style={{
                    borderColor: 'transparent',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ backgroundColor: theme.mutedText + '10' }}
                      >
                        <Shield size={22} style={{ color: theme.mutedText }} />
                      </div>
                      <div className="px-1">
                        <div className="font-semibold text-lg tracking-tight mb-1" style={{ color: theme.text }}>
                          Two-Factor Authentication
                        </div>
                        <div className="text-xs leading-relaxed opacity-50" style={{ color: theme.text }}>
                          Add an extra layer of security
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-[10px] leading-relaxed opacity-40 italic mt-2 text-center" style={{ color: theme.text }}>
                  Coming soon
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div 
          className="content-section p-6 rounded-lg text-center"
        >
          <User size={48} className="mx-auto mb-4" style={{ color: theme.mutedText }} />
          <h3 className="text-lg font-medium mb-2" style={{ color: theme.text }}>No Profile Data</h3>
          <p className="text-sm" style={{ color: theme.mutedText }}>
            Please log in to view your profile information
          </p>
        </div>
      )}

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
              disabled={isUpdatingPassword}
              className="flex-1 px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: theme.accent, color: theme.accentText }}
            >
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
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
            <div className="space-y-4">
              <div className="content-section p-4 rounded-lg" style={{ border: `1px solid ${theme.border}` }}>
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

            <div className="flex gap-3 pt-4">
              <button
                onClick={verifyAndEnable2FA}
                disabled={isVerifying || !verificationCode || verificationCode.length !== 6}
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
              <div className="flex items-center gap-2 text-sm font-medium mb-2" style={{ color: theme.text }}>
                <AlertTriangle size={16} className="shrink-0" style={{ color: '#F59E0B' }} />
                Important: Save These Backup Codes
              </div>
              <div className="text-xs" style={{ color: theme.mutedText }}>
                Store these codes in a safe place. You can use them to access your account if you lose access to your authenticator app.
              </div>
            </div>

            <div className="content-section p-4 rounded-lg" style={{ border: `1px solid ${theme.border}` }}>
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

      {/* Email Edit Bottom Sheet */}
      <BottomSheet
        open={editingEmail}
        onClose={cancelEmailEdit}
        title="Edit Email Address"
        theme={theme}
        footer={
          <div className="flex gap-3 w-full">
            <button
              onClick={cancelEmailEdit}
              disabled={isUpdating}
              className="flex-1 px-4 py-3 rounded-xl font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{ 
                backgroundColor: theme.secondary, 
                color: theme.text,
                border: `1px solid ${theme.border}`
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleEmailUpdate}
              disabled={isUpdating || !emailDraft || emailDraft === user?.email}
              className="flex-1 px-4 py-3 rounded-xl font-semibold transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: emailDraft && emailDraft !== user?.email ? theme.primary : theme.mutedText, 
                color: theme.primaryText || '#FFFFFF'
              }}
            >
              {isUpdating ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Email Input */}
          <div className="space-y-2">
            <label className="block text-sm font-semibold" style={{ color: theme.text }}>
              New Email Address
            </label>
            <input
              type="email"
              value={emailDraft}
              onChange={(e) => setEmailDraft(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border-2 text-base transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
              style={{ 
                backgroundColor: theme.background, 
                borderColor: emailDraft && emailDraft !== user?.email ? theme.primary : theme.border, 
                color: theme.text,
                boxShadow: emailDraft && emailDraft !== user?.email 
                  ? `0 0 0 3px ${theme.primary}15` 
                  : '0 2px 8px rgba(0,0,0,0.05)'
              }}
              placeholder="Enter your new email address"
              autoFocus
            />
            {emailDraft && emailDraft !== user?.email && (
              <div className="text-xs opacity-60" style={{ color: theme.text }}>
                Current: {user?.email}
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <div 
            className="p-3 rounded-xl flex items-start gap-2"
            style={{ 
              backgroundColor: theme.primary + '10',
              borderColor: theme.primary + '30'
            }}
          >
            <AlertCircle size={16} className="shrink-0 mt-0.5" style={{ color: theme.primary }} />
            <div className="text-xs leading-relaxed opacity-80" style={{ color: theme.text }}>
              You'll need to verify your new email address. A verification email will be sent after you save.
            </div>
          </div>
        </div>
      </BottomSheet>

      {/* Password Confirmation Modal for Email Change */}
      <Modal
        open={passwordConfirmOpen}
        onClose={() => {
          setPasswordConfirmOpen(false)
          setPasswordForEmailChange('')
        }}
        title="Confirm Password"
        theme={theme}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: theme.text }}>
              Current Password
            </label>
            <div className="relative">
              <input
                type={showPasswordForEmailChange ? 'text' : 'password'}
                value={passwordForEmailChange}
                onChange={(e) => setPasswordForEmailChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border-2 text-base transition-all focus:outline-none focus:ring-2 focus:ring-offset-2"
                style={{ 
                  backgroundColor: theme.background, 
                  borderColor: theme.border, 
                  color: theme.text,
                  focusRingColor: theme.primary
                }}
                placeholder="Enter your password"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && passwordForEmailChange) {
                    handlePasswordConfirm()
                  }
                }}
              />
              <button
                type="button"
                onClick={() => setShowPasswordForEmailChange(!showPasswordForEmailChange)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                style={{ color: theme.mutedText }}
              >
                {showPasswordForEmailChange ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            <div className="text-xs opacity-80 mt-2" style={{ color: theme.text }}>
              For your security, please enter your password to confirm this email change.
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={() => {
                setPasswordConfirmOpen(false)
                setPasswordForEmailChange('')
              }}
              disabled={isReauthenticating}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 active:scale-95 disabled:opacity-50"
              style={{ 
                backgroundColor: theme.secondary, 
                color: theme.text,
                border: `1px solid ${theme.border}`
              }}
            >
              Cancel
            </button>
            <button
              onClick={handlePasswordConfirm}
              disabled={isReauthenticating || !passwordForEmailChange}
              className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundColor: passwordForEmailChange && !isReauthenticating ? theme.primary : theme.mutedText, 
                color: theme.primaryText || '#FFFFFF'
              }}
            >
              {isReauthenticating ? 'Verifying...' : 'Confirm & Continue'}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  )
}

const InfoCard = ({ icon: Icon, label, value, theme, status }) => (
  <div className="flex items-center gap-4 px-1">
    <div 
      className="w-12 h-12 rounded-2xl flex items-center justify-center"
      style={{ backgroundColor: theme.primary + '15' }}
    >
      <Icon size={22} style={{ color: theme.primary }} />
    </div>
    <div>
      <div className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-40" style={{ color: theme.text }}>{label}</div>
      <div 
        className="font-semibold text-lg tracking-tight" 
        style={{ 
          color: status === 'success' ? theme.primary : 
                 status === 'warning' ? '#F59E0B' : 
                 theme.text 
        }}
      >
        {value}
      </div>
    </div>
  </div>
)

const EmailStatusCard = ({ isVerified, theme, onSendVerification, isSending, cooldown = 0 }) => {
  const isDisabled = isSending || cooldown > 0
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 px-1">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: (isVerified ? theme.primary : '#F59E0B') + '15' }}
          >
            <Mail size={22} style={{ color: isVerified ? theme.primary : '#F59E0B' }} />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider mb-1 opacity-40" style={{ color: theme.text }}>Email Status</div>
            <div 
              className="font-semibold text-lg tracking-tight" 
              style={{ 
                color: isVerified ? theme.primary : '#F59E0B'
              }}
            >
              {isVerified ? 'Verified' : 'Unverified'}
            </div>
          </div>
        </div>
        {!isVerified && (
          <button
            onClick={onSendVerification}
            disabled={isDisabled}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
            style={{ 
              backgroundColor: isDisabled ? theme.mutedText : theme.primary,
              color: theme.primaryText || '#ffffff',
              cursor: isDisabled ? 'not-allowed' : 'pointer',
              pointerEvents: isDisabled ? 'none' : 'auto'
            }}
          >
            <Send size={12} />
            {isSending ? 'Sending...' : cooldown > 0 ? `Resend in ${cooldown}s` : 'Verify'}
          </button>
        )}
      </div>
      {!isVerified && (
        <div 
          className="text-xs pl-1 leading-relaxed space-y-2"
        >
          <div style={{ color: theme.text, opacity: 0.5 }}>
            Email verification is required to ensure the security of your research account and enable important features like password recovery and account notifications.
          </div>
          <div 
            className="p-2 rounded-lg text-xs"
            style={{ 
              backgroundColor: theme.secondary, 
              color: theme.text,
              opacity: 0.8
            }}
          >
            <span className="inline-flex items-center gap-1"><Lightbulb size={12} className="shrink-0 inline" style={{ color: theme.primary }} /><strong>Tip:</strong></span> Can't find the verification email? Check your spam/junk folder. 
            Add <span className="font-mono">noreply@thepepplanner.com</span> to your contacts to ensure future emails arrive in your inbox.
          </div>
        </div>
      )}
    </div>
  )
}


