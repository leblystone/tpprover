import React, { useState, useEffect } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText, Calendar, Check, ExternalLink } from 'lucide-react'
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
          <h1 className="text-2xl font-bold" style={{ color: theme.text }}>Legal & Agreements</h1>
          <p className="text-sm" style={{ color: theme.mutedText }}>View agreement history and legal documents</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Legal Documents */}
        <div 
          className="p-4 rounded-lg space-y-3"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <h4 className="text-sm font-medium mb-2" style={{ color: theme.text }}>Legal Documents</h4>
          <div className="space-y-3">
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

        {/* Agreement History */}
        <div 
          className="p-4 rounded-lg space-y-3"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <h4 className="text-sm font-medium mb-2" style={{ color: theme.text }}>Agreement History</h4>
          <div className="space-y-2">
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
            {!agreementData.termsAgreement && !agreementData.privacyAgreement && (
              <div 
                className="p-4 rounded-lg text-center"
                style={{ backgroundColor: theme.secondary }}
              >
                <FileText size={32} className="mx-auto mb-2" style={{ color: theme.mutedText }} />
                <p className="text-sm" style={{ color: theme.mutedText }}>
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
    className="flex items-center justify-between p-3 rounded-lg"
    style={{ backgroundColor: theme.secondary }}
  >
    <div className="flex-1 pr-4">
      <div className="text-sm font-medium mb-1" style={{ color: theme.text }}>{title}</div>
      {agreement ? (
        <div className="text-xs" style={{ color: theme.mutedText }}>
          Agreed on {new Date(agreement.timestamp).toLocaleDateString()}
        </div>
      ) : (
        <div className="text-xs text-red-500">Agreement required - please review and agree</div>
      )}
    </div>
    <button 
      onClick={onAction}
      className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
      style={{ backgroundColor: theme.accent, color: theme.accentText }}
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

const AgreementHistoryCard = ({ title, version, date, type, theme }) => (
  <div 
    className="flex items-center justify-between p-3 rounded-lg"
    style={{ backgroundColor: theme.secondary }}
  >
    <div className="flex items-center gap-3">
      <div 
        className="w-8 h-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: theme.accent + '20' }}
      >
        <Check size={16} style={{ color: theme.accent }} />
      </div>
      <div>
        <div className="text-sm font-medium" style={{ color: theme.text }}>{title}</div>
        <div className="text-xs" style={{ color: theme.mutedText }}>
          Version {version} • {new Date(date).toLocaleDateString()}
        </div>
      </div>
    </div>
    <div 
      className="px-2 py-1 rounded text-xs font-medium"
      style={{ backgroundColor: '#10B981', color: 'white' }}
    >
      Agreed
    </div>
  </div>
)
