import React, { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Calendar, Mail, Edit3, Save, X, Send } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { useFirebase } from '../context/FirebaseContext'
import { getAuth, updateEmail, verifyBeforeUpdateEmail } from 'firebase/auth'
import { getFunctions, httpsCallable } from 'firebase/functions'

// Helper function to generate user initials
function getUserInitials(email) {
  if (!email) return 'U'
  const parts = email.split('@')[0].split('.')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return email.substring(0, 2).toUpperCase()
}

export default function AccountProfile() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const { user } = useAppContext()
  const { firebaseUser } = useFirebase()
  
  const [editingEmail, setEditingEmail] = useState(false)
  const [emailDraft, setEmailDraft] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [isSendingVerification, setIsSendingVerification] = useState(false)
  const [emailVerified, setEmailVerified] = useState(false)

  // Initialize emailVerified state from firebaseUser
  useEffect(() => {
    setEmailVerified(firebaseUser?.emailVerified || false)
  }, [firebaseUser?.emailVerified])

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

  const handleEmailUpdate = async () => {
    if (!emailDraft || emailDraft === user?.email) {
      setEditingEmail(false)
      return
    }

    setIsUpdating(true)
    try {
      const auth = getAuth()
      await verifyBeforeUpdateEmail(auth.currentUser, emailDraft)
      
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Verification email sent to new address', type: 'success' } 
      }))
      
      setEditingEmail(false)
    } catch (error) {
      console.error('Error updating email:', error)
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Failed to update email', type: 'error' } 
      }))
    } finally {
      setIsUpdating(false)
    }
  }

  const cancelEmailEdit = () => {
    setEmailDraft(user?.email || '')
    setEditingEmail(false)
  }

  const handleSendVerificationEmail = async () => {
    if (!firebaseUser || firebaseUser.emailVerified) return

    setIsSendingVerification(true)
    try {
      const functions = getFunctions()
      const sendCustomVerificationEmail = httpsCallable(functions, 'sendCustomVerificationEmail')
      
      const result = await sendCustomVerificationEmail()
      
      if (result.data.success) {
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: '📧 Verification email sent! Check your inbox.', type: 'success' }
        }))
      } else {
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: 'Failed to send verification email. Please try again.', type: 'error' }
        }))
      }
    } catch (error) {
      console.error('Error sending verification email:', error)
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Failed to send verification email. Please try again.', type: 'error' }
        }))
    } finally {
      setIsSendingVerification(false)
    }
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
          <h1 className="text-2xl font-bold" style={{ color: theme.text }}>Profile</h1>
          <p className="text-sm" style={{ color: theme.mutedText }}>Manage account information and settings</p>
        </div>
      </div>

      {user ? (
        <div className="space-y-6">
          {/* Profile Header */}
          <div 
            className="p-6 rounded-lg"
            style={{ backgroundColor: theme.cardBackground }}
          >
            <div className="flex items-center gap-4">
              {/* User Avatar */}
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-lg" style={{ 
                background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark || theme.primary} 100%)` 
              }}>
                {getUserInitials(user.email)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-sm mb-1" style={{ color: theme.mutedText }}>Email</div>
                    {editingEmail ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="email"
                          value={emailDraft}
                          onChange={(e) => setEmailDraft(e.target.value)}
                          className="px-3 py-1 rounded border text-sm"
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
                          className="p-1 rounded hover:opacity-80"
                          style={{ color: theme.primary }}
                        >
                          <Save size={16} />
                        </button>
                        <button
                          onClick={cancelEmailEdit}
                          className="p-1 rounded hover:opacity-80"
                          style={{ color: theme.mutedText }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="font-medium text-lg" style={{ color: theme.text }}>
                        {user.email}
                      </div>
                    )}
                  </div>
                  {!editingEmail && (
                    <button 
                      className="text-sm font-medium hover:underline px-2 py-1 rounded hover:opacity-80" 
                      style={{ color: theme.primary }} 
                      onClick={() => { setEditingEmail(true); setEmailDraft(user.email || '') }}
                    >
                      <Edit3 size={16} className="inline mr-1" />
                      Edit
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div 
            className="p-4 rounded-lg space-y-3"
            style={{ backgroundColor: theme.cardBackground }}
          >
            <h4 className="text-sm font-medium mb-2" style={{ color: theme.text }}>Account Information</h4>
            <div className="space-y-3">
              <InfoCard
                icon={Calendar}
                label="Member Since"
                value={user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Unknown'}
                theme={theme}
              />
              <EmailStatusCard
                isVerified={emailVerified || firebaseUser?.emailVerified}
                theme={theme}
                onSendVerification={handleSendVerificationEmail}
                isSending={isSendingVerification}
              />
            </div>
          </div>
        </div>
      ) : (
        <div 
          className="p-8 rounded-lg text-center"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <User size={48} className="mx-auto mb-4" style={{ color: theme.mutedText }} />
          <h3 className="text-lg font-medium mb-2" style={{ color: theme.text }}>No Profile Data</h3>
          <p className="text-sm" style={{ color: theme.mutedText }}>
            Please log in to view your profile information
          </p>
        </div>
      )}
    </section>
  )
}

const InfoCard = ({ icon: Icon, label, value, theme, status }) => (
  <div 
    className="flex items-center justify-between p-3 rounded-lg"
    style={{ backgroundColor: theme.secondary }}
  >
    <div className="flex items-center gap-3">
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: theme.accent + '20' }}
      >
        <Icon size={16} style={{ color: theme.accent }} />
      </div>
      <div>
        <div className="text-sm font-medium" style={{ color: theme.text }}>{label}</div>
        <div 
          className="text-xs" 
          style={{ 
            color: status === 'success' ? '#10B981' : 
                   status === 'warning' ? '#F59E0B' : 
                   theme.mutedText 
          }}
        >
          {value}
        </div>
      </div>
    </div>
  </div>
)

const EmailStatusCard = ({ isVerified, theme, onSendVerification, isSending }) => (
  <div 
    className="p-3 rounded-lg space-y-2"
    style={{ backgroundColor: theme.secondary }}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ backgroundColor: theme.accent + '20' }}
        >
          <Mail size={16} style={{ color: theme.accent }} />
        </div>
        <div>
          <div className="text-sm font-medium" style={{ color: theme.text }}>Email Status</div>
          <div 
            className="text-xs" 
            style={{ 
              color: isVerified ? '#10B981' : '#F59E0B'
            }}
          >
            {isVerified ? 'Verified' : 'Unverified'}
          </div>
        </div>
      </div>
      {!isVerified && (
        <button
          onClick={onSendVerification}
          disabled={isSending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
          style={{ 
            backgroundColor: theme.primary,
            color: theme.primaryText || '#ffffff'
          }}
        >
          <Send size={12} />
          {isSending ? 'Sending...' : 'Verify Email'}
        </button>
      )}
    </div>
    {!isVerified && (
      <div 
        className="text-xs pl-11 leading-relaxed"
        style={{ color: theme.mutedText }}
      >
        Email verification is required to ensure the security of your research account and enable important features like password recovery and account notifications.
      </div>
    )}
  </div>
)


