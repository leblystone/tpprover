import React, { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Calendar, Check, ExternalLink, ShieldCheck, ChevronRight, History } from 'lucide-react'
import { useFirebase } from '../context/FirebaseContext'
import { getLatestAgreement, recordAgreement, AGREEMENT_TYPES, AGREEMENT_VERSIONS } from '../services/agreementTracking'
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

  // Load agreement data
  useEffect(() => {
    const loadAgreementData = () => {
      try {
        const termsSignup = getLatestAgreement(AGREEMENT_TYPES.SIGNUP_TERMS)
        const termsUpdate = getLatestAgreement(AGREEMENT_TYPES.TERMS_UPDATE)
        const privacySignup = getLatestAgreement(AGREEMENT_TYPES.SIGNUP_PRIVACY)
        const privacyUpdate = getLatestAgreement(AGREEMENT_TYPES.PRIVACY_UPDATE)
        
        const termsAgreement = termsUpdate || termsSignup
        const privacyAgreement = privacyUpdate || privacySignup
        
        setAgreementData({
          termsAgreement,
          privacyAgreement
        })
      } catch (error) {
        console.error('Error loading agreement data:', error)
      }
    }
    
    loadAgreementData()
  }, [])

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
    <section className="max-w-xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <button
          onClick={() => navigate('/app/account')}
          className="group p-2 rounded-xl transition-all active:scale-95 border shadow-sm shrink-0"
          style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
        >
          <ArrowLeft size={18} style={{ color: theme.text }} className="group-hover:-translate-x-1 transition-transform" />
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl" style={{ backgroundColor: theme.primary + '15' }}>
            <FileText size={24} style={{ color: theme.primary }} />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-2xl font-black tracking-tight" style={{ color: theme.text }}>Legal</h1>
            <div className="flex items-center gap-2">
              <div className="h-0.5 w-4 rounded-full" style={{ backgroundColor: theme.primary }}></div>
              <span className="text-[11px] font-bold uppercase tracking-[0.15em] opacity-40" style={{ color: theme.text }}>
                Policies & Agreements
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="h-px w-full mb-6 opacity-10" style={{ backgroundColor: theme.isDark ? '#4B5563' : '#9CA3AF' }}></div>

      <div className="space-y-8">
        {/* Legal Documents Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <ShieldCheck size={14} style={{ color: theme.primary }} />
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Documents
            </h4>
          </div>

          <div className="grid grid-cols-1 gap-4">
            <LegalDocumentCard
              title="Terms of Service"
              agreement={agreementData.termsAgreement}
              onAction={() => setShowTerms(true)}
              actionText={agreementData.termsAgreement ? 'View' : 'Agree'}
              theme={theme}
            />
            <LegalDocumentCard
              title="Privacy Policy"
              agreement={agreementData.privacyAgreement}
              onAction={() => setShowPrivacy(true)}
              actionText={agreementData.privacyAgreement ? 'View' : 'Agree'}
              theme={theme}
            />
          </div>
        </div>

        {/* Agreement History Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <History size={14} style={{ color: theme.primary }} />
            <h4 className="text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: theme.textLight }}>
              Agreement History
            </h4>
          </div>

          <div className="space-y-3">
            {agreementData.termsAgreement && (
              <AgreementHistoryCard
                title="Terms of Service"
                version={agreementData.termsAgreement.version}
                date={agreementData.termsAgreement.timestamp}
                theme={theme}
              />
            )}
            {agreementData.privacyAgreement && (
              <AgreementHistoryCard
                title="Privacy Policy"
                version={agreementData.privacyAgreement.version}
                date={agreementData.privacyAgreement.timestamp}
                theme={theme}
              />
            )}
            {!agreementData.termsAgreement && !agreementData.privacyAgreement && (
              <div 
                className="p-10 rounded-[2rem] text-center border-2 border-dashed transition-all"
                style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
              >
                <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center mx-auto mb-3">
                  <FileText size={24} style={{ color: theme.mutedText }} />
                </div>
                <p className="text-xs opacity-50" style={{ color: theme.text }}>
                  No agreement history found
                </p>
              </div>
            )}
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

const LegalDocumentCard = ({ title, agreement, onAction, actionText, theme }) => (
  <div 
    className="flex items-center justify-between p-5 rounded-[2rem] border-2 transition-all shadow-sm"
    style={{ 
      backgroundColor: theme.cardBackground,
      borderColor: 'transparent'
    }}
  >
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: theme.primary + '10' }}>
        <FileText size={18} style={{ color: theme.primary }} />
      </div>
      <div>
        <div className="text-sm font-black tracking-tight" style={{ color: theme.text }}>{title}</div>
        {agreement ? (
          <div className="text-[10px] font-bold uppercase tracking-wider opacity-40" style={{ color: theme.text }}>
            Accepted {new Date(agreement.timestamp).toLocaleDateString()}
          </div>
        ) : (
          <div className="text-[10px] font-black uppercase tracking-wider text-[#991B1B]">Action Required</div>
        )}
      </div>
    </div>
    <button 
      onClick={onAction}
      className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all hover:bg-black/5 active:scale-95 border"
      style={{ borderColor: theme.border, color: theme.text }}
    >
      {actionText}
    </button>
  </div>
)

const AgreementHistoryCard = ({ title, version, date, theme }) => (
  <div 
    className="flex items-center justify-between p-4 rounded-[1.5rem] border transition-all"
    style={{ 
      backgroundColor: theme.cardBackground + '50',
      borderColor: theme.border
    }}
  >
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: theme.primary + '15' }}>
        <Check size={14} style={{ color: theme.primary }} />
      </div>
      <div>
        <div className="text-xs font-black tracking-tight" style={{ color: theme.text }}>{title}</div>
        <div className="text-[10px] opacity-50 font-medium" style={{ color: theme.text }}>
          v{version} • {new Date(date).toLocaleDateString()}
        </div>
      </div>
    </div>
    <div 
      className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest"
      style={{ backgroundColor: theme.primary + '15', color: theme.primary }}
    >
      Agreed
    </div>
  </div>
)
