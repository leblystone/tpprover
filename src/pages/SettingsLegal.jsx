import React, { useEffect, useState } from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import TermsOfServiceModal from '../components/legal/TermsOfServiceModal'
import LandingPrivacyModal from '../components/legal/LandingPrivacyModal'
import { useFirebase } from '../context/FirebaseContext'
import { getLatestAgreement, recordAgreement, AGREEMENT_TYPES, AGREEMENT_VERSIONS } from '../services/agreementTracking'

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
    <section className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/app/settings')}
          className="p-2 rounded-lg hover:opacity-80 transition-all"
          style={{ backgroundColor: theme.secondary }}
        >
          <ArrowLeft size={20} style={{ color: theme.text }} />
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: theme.text }}>Legal & Privacy</h1>
          <p className="text-sm" style={{ color: theme.mutedText }}>Terms of Service, Privacy Policy, and other legal documents</p>
        </div>
      </div>

      {/* Legal Settings */}
      <div className="space-y-3">
        <div 
          className="flex items-center justify-between p-4 rounded-lg"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <div>
            <div className="text-sm font-medium" style={{ color: theme.text }}>Terms of Service</div>
            {agreementData.termsAgreement ? (
              <div className="text-xs" style={{ color: theme.mutedText }}>
                Agreed on {new Date(agreementData.termsAgreement.timestamp).toLocaleDateString()}
              </div>
            ) : (
              <div className="text-xs text-red-500">Agreement required - please review and agree</div>
            )}
          </div>
          <button 
            onClick={() => setShowTerms(true)} 
            className="px-3 py-2 rounded-md text-sm font-semibold" 
            style={{ backgroundColor: theme.accent, color: theme.accentText }}
          >
            {agreementData.termsAgreement ? 'View' : 'Agree'}
          </button>
        </div>

        <div 
          className="flex items-center justify-between p-4 rounded-lg"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <div>
            <div className="text-sm font-medium" style={{ color: theme.text }}>Privacy Policy</div>
            {agreementData.privacyAgreement ? (
              <div className="text-xs" style={{ color: theme.mutedText }}>
                Agreed on {new Date(agreementData.privacyAgreement.timestamp).toLocaleDateString()}
              </div>
            ) : (
              <div className="text-xs text-red-500">Agreement required - please review and agree</div>
            )}
          </div>
          <button 
            onClick={() => setShowPrivacy(true)} 
            className="px-3 py-2 rounded-md text-sm font-semibold" 
            style={{ backgroundColor: theme.accent, color: theme.accentText }}
          >
            {agreementData.privacyAgreement ? 'View' : 'Agree'}
          </button>
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


