import React, { useEffect, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Shield, ChevronRight } from 'lucide-react'
import TermsOfServiceModal from '../components/legal/TermsOfServiceModal'
import LandingPrivacyModal from '../components/legal/LandingPrivacyModal'
import { useFirebase } from '../context/FirebaseContext'
import { getLatestAgreement, getLatestAgreementsFromFirebase, recordAgreement, AGREEMENT_TYPES, AGREEMENT_VERSIONS } from '../services/agreementTracking'

export default function SettingsLegal() {
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
    <section className="page-bg max-w-xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col gap-1 mb-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/app/settings')}
            className="group p-2 rounded-xl transition-all active:scale-95 glass-button-nav"
          >
            <ArrowLeft size={18} style={{ color: theme.text }} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex items-center gap-2">
            <FileText size={20} style={{ color: theme.primary }} />
            <h1 className="text-2xl font-semibold tracking-tight" style={{ color: theme.text }}>Legal</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-14">
          <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
            Policies & Agreements
          </span>
        </div>
      </div>
      <div className="h-px w-full mb-6 opacity-10" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}></div>

      {/* Legal Settings */}
      <div className="space-y-6">
        {/* Legal Documents */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <FileText size={14} style={{ color: theme.primary }} />
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Research Agreements
            </h4>
          </div>

          <div 
            className="content-section px-6 rounded-[2rem] border-2 transition-all shadow-sm"
            style={{ borderColor: 'transparent' }}
          >
            <LegalDocumentCard
              title="Terms of Service"
              agreement={agreementData.termsAgreement}
              onAction={() => setShowTerms(true)}
              actionText={agreementData.termsAgreement ? 'Review' : 'Agree'}
              theme={theme}
              icon={FileText}
            />
            <LegalDocumentCard
              title="Privacy Policy"
              agreement={agreementData.privacyAgreement}
              onAction={() => setShowPrivacy(true)}
              actionText={agreementData.privacyAgreement ? 'Review' : 'Agree'}
              theme={theme}
              icon={Shield}
              isLast={true}
            />
          </div>
        </div>
      </div>

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
      />
    </section>
  )
}

const LegalDocumentCard = ({ title, agreement, onAction, actionText, theme, icon: Icon, isLast }) => (
  <div className={`flex items-center justify-between py-6 ${!isLast ? 'border-b border-dashed' : ''}`} style={{ borderColor: theme.border + '40' }}>
    <div className="flex items-center gap-4">
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors"
        style={{ backgroundColor: theme.primary + '15' }}
      >
        <Icon size={18} style={{ color: theme.primary }} />
      </div>
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
          {title}
        </div>
        <div className="text-sm font-black tracking-tight" style={{ color: theme.text }}>
          {agreement ? 'Agreed' : 'Pending'}
        </div>
        {agreement && (
          <div className="text-[10px] opacity-50" style={{ color: theme.text }}>
            Signed {new Date(agreement.timestamp).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
    <button
      onClick={onAction}
      className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 border"
      style={{ 
        backgroundColor: theme.primary + '15',
        borderColor: theme.primary + '30',
        color: theme.primary
      }}
    >
      {actionText}
    </button>
  </div>
)

const LegalDocumentLink = ({ title, description, onAction, theme }) => (
  <div 
    className="flex items-center justify-between p-3 rounded-lg cursor-pointer hover:opacity-80 transition-all"
    style={{ backgroundColor: theme.secondary }}
    onClick={onAction}
  >
    <div className="flex-1 pr-4">
      <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>{title}</div>
      <div className="text-xs" style={{ color: theme.mutedText }}>
        {description}
      </div>
    </div>
    <button 
      onClick={(e) => {
        e.stopPropagation()
        onAction()
      }}
      className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
      style={{ backgroundColor: theme.accent, color: theme.accentText }}
    >
      View
    </button>
  </div>
)


