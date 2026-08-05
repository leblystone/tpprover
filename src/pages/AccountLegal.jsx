import React, { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { IconContext, ArrowLeft, FileText, CalendarDots, Check, CaretRight, Scales } from '@phosphor-icons/react'
import { useFirebase } from '../context/FirebaseContext'
import { getLatestAgreement, getLatestAgreementsFromFirebase, recordAgreement, AGREEMENT_TYPES, AGREEMENT_VERSIONS } from '../services/agreementTracking'
import TermsOfServiceModal from '../components/legal/TermsOfServiceModal'
import LandingPrivacyModal from '../components/legal/LandingPrivacyModal'

export default function AccountLegal() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()
  const { firebaseUser } = useFirebase()

  const [showTerms, setShowTerms] = useState(false)
  const [showPrivacy, setShowPrivacy] = useState(false)

  // Agreement tracking state
  const [agreementData, setAgreementData] = useState({
    termsAgreement: null,
    privacyAgreement: null
  })

  // Load agreement data (from Firebase when logged in for cross-device; else local)
  useEffect(() => {
    const loadAgreementData = async () => {
      try {
        if (firebaseUser?.email) {
          const { termsAgreement: fromFirebaseTerms, privacyAgreement: fromFirebasePrivacy } = await getLatestAgreementsFromFirebase(firebaseUser.email)
          if (fromFirebaseTerms || fromFirebasePrivacy) {
            setAgreementData({
              termsAgreement: fromFirebaseTerms ?? null,
              privacyAgreement: fromFirebasePrivacy ?? null
            })
            return
          }
        }
        const termsSignup = getLatestAgreement(AGREEMENT_TYPES.SIGNUP_TERMS)
        const termsUpdate = getLatestAgreement(AGREEMENT_TYPES.TERMS_UPDATE)
        const privacySignup = getLatestAgreement(AGREEMENT_TYPES.SIGNUP_PRIVACY)
        const privacyUpdate = getLatestAgreement(AGREEMENT_TYPES.PRIVACY_UPDATE)
        setAgreementData({
          termsAgreement: termsUpdate || termsSignup,
          privacyAgreement: privacyUpdate || privacySignup
        })
      } catch (error) {
        console.error('Error loading agreement data:', error)
      }
    }
    loadAgreementData()
  }, [firebaseUser?.email])

  // Agreement handlers
  const handleTermsAgree = async () => {
    try {
      const currentVersion = AGREEMENT_VERSIONS.TERMS_OF_SERVICE
      
      await recordAgreement(
        AGREEMENT_TYPES.TERMS_UPDATE,
        currentVersion,
        { 
          updatedFromSettings: true,
          contentUpdateDate: currentVersion.split('-')[1] + '-' + currentVersion.split('-')[2]
        },
        firebaseUser?.email
      )
      
      const termsAgreement = getLatestAgreement(AGREEMENT_TYPES.SIGNUP_TERMS) || getLatestAgreement(AGREEMENT_TYPES.TERMS_UPDATE)
      setAgreementData(prev => ({ ...prev, termsAgreement }))
      
      setShowTerms(false)
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: `Terms of Service agreement updated (${currentVersion})`, type: 'success' } 
      }))
    } catch (error) {
      console.error('Error recording terms agreement:', error)
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Error updating agreement', type: 'error' } 
      }))
    }
  }
  
  const handlePrivacyAgree = async () => {
    try {
      const currentVersion = AGREEMENT_VERSIONS.PRIVACY_POLICY
      
      await recordAgreement(
        AGREEMENT_TYPES.PRIVACY_UPDATE,
        currentVersion,
        { 
          updatedFromSettings: true,
          contentUpdateDate: currentVersion.split('-')[1] + '-' + currentVersion.split('-')[2]
        },
        firebaseUser?.email
      )
      
      const privacyAgreement = getLatestAgreement(AGREEMENT_TYPES.SIGNUP_PRIVACY) || getLatestAgreement(AGREEMENT_TYPES.PRIVACY_UPDATE)
      setAgreementData(prev => ({ ...prev, privacyAgreement }))
      
      setShowPrivacy(false)
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: `Privacy Policy agreement updated (${currentVersion})`, type: 'success' } 
      }))
    } catch (error) {
      console.error('Error recording privacy agreement:', error)
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Error updating agreement', type: 'error' } 
      }))
    }
  }

  return (
    <IconContext.Provider value={{ weight: 'duotone' }}>
    <section className="page-bg max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/app/settings')}
            className="p-2 rounded-full hover:opacity-80 transition-all"
            style={{ backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)' }}
          >
            <ArrowLeft size={20} style={{ color: theme.text }} />
          </button>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: theme.text }}>Legal & Agreements</h1>
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                Terms, Privacy & History
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="h-px w-full mb-6 opacity-10" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}></div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1 w-full min-w-0">
          <FileText size={14} className="opacity-40 shrink-0" style={{ color: theme.text }} />
          <h2 className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0" style={{ color: theme.text }}>
            Legal Documents
          </h2>
          <div
            className="flex-1 h-px min-w-0"
            style={{
              background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
            }}
          />
        </div>
        {/* Legal Documents */}
        <LegalDocumentCard
          title="Terms of Service"
          description={agreementData.termsAgreement ? `Agreed on ${new Date(agreementData.termsAgreement.timestamp).toLocaleDateString()}` : 'Review and agree to terms'}
          agreement={agreementData.termsAgreement}
          onAction={() => setShowTerms(true)}
          actionText={agreementData.termsAgreement ? 'View' : 'Agree'}
          icon={FileText}
          theme={theme}
        />
        <LegalDocumentCard
          title="Privacy Policy"
          description={agreementData.privacyAgreement ? `Agreed on ${new Date(agreementData.privacyAgreement.timestamp).toLocaleDateString()}` : 'Review our privacy policy'}
          agreement={agreementData.privacyAgreement}
          onAction={() => setShowPrivacy(true)}
          actionText={agreementData.privacyAgreement ? 'View' : 'Agree'}
          icon={Scales}
          theme={theme}
        />
      </div>

      {/* Agreement History */}
      {(agreementData.termsAgreement || agreementData.privacyAgreement) && (
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2 px-1 w-full min-w-0">
            <CalendarDots size={14} className="opacity-40 shrink-0" style={{ color: theme.text }} />
            <h2 className="text-xs font-semibold uppercase tracking-wider opacity-40 shrink-0" style={{ color: theme.text }}>
              Agreement History
            </h2>
            <div
              className="flex-1 h-px min-w-0"
              style={{
                background: `linear-gradient(to right, ${theme.primary}55 0%, ${theme.primary}22 45%, transparent 100%)`,
              }}
            />
          </div>
          <div className="space-y-3">
            {agreementData.termsAgreement && (
              <AgreementHistoryCard
                title="Terms of Service"
                version={agreementData.termsAgreement.version}
                date={agreementData.termsAgreement.timestamp}
                type="terms"
                theme={theme}
              />
            )}
            {agreementData.privacyAgreement && (
              <AgreementHistoryCard
                title="Privacy Policy"
                version={agreementData.privacyAgreement.version}
                date={agreementData.privacyAgreement.timestamp}
                type="privacy"
                theme={theme}
              />
            )}
          </div>
        </div>
      )}

      <TermsOfServiceModal 
        open={showTerms} 
        onClose={() => setShowTerms(false)} 
        onAgree={agreementData.termsAgreement ? null : handleTermsAgree} 
        theme={theme} 
      />
      <LandingPrivacyModal 
        open={showPrivacy} 
        onClose={() => setShowPrivacy(false)} 
        onAgree={agreementData.privacyAgreement ? null : handlePrivacyAgree}
        theme={theme}
      />
    </section>
    </IconContext.Provider>
  )
}

const LegalDocumentCard = ({ title, description, agreement, onAction, actionText, icon: Icon, theme }) => (
  <button
    onClick={onAction}
    className="content-section group w-full p-4 rounded-2xl transition-all hover:opacity-80 text-left"
    style={{ 
      border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
    }}
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div 
          className="p-2 rounded-xl"
          style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
        >
          <Icon size={18} style={{ color: theme.text, opacity: 0.6 }} />
        </div>
        <div>
          <h3 className="text-sm font-semibold mb-0.5" style={{ color: theme.text }}>{title}</h3>
          <p className="text-xs" style={{ color: agreement ? theme.textLight : theme.error }}>
            {description}
          </p>
        </div>
      </div>
      <CaretRight 
        size={18} 
        className="opacity-20 group-hover:opacity-100 group-hover:translate-x-1 transition-all" 
        style={{ color: theme.text }} 
      />
    </div>
  </button>
)

const AgreementHistoryCard = ({ title, version, date, type, theme }) => (
  <div 
    className="content-section flex items-center justify-between p-3 rounded-2xl"
    style={{ 
      border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}`
    }}
  >
    <div className="flex items-center gap-3">
      <div 
        className="w-8 h-8 rounded-xl flex items-center justify-center"
        style={{ backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)' }}
      >
        <Check size={16} style={{ color: '#10B981' }} />
      </div>
      <div>
        <div className="text-sm font-semibold mb-0.5" style={{ color: theme.text }}>{title}</div>
        <div className="text-xs opacity-60" style={{ color: theme.text }}>
          Version {version} • {new Date(date).toLocaleDateString()}
        </div>
      </div>
    </div>
    <div 
      className="px-2.5 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wide"
      style={{ 
        backgroundColor: theme.isDark ? 'rgba(16, 185, 129, 0.15)' : 'rgba(16, 185, 129, 0.1)',
        color: '#10B981'
      }}
    >
      Agreed
    </div>
  </div>
)
