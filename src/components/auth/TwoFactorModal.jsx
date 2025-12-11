import React, { useState } from 'react'
import { Shield, Smartphone } from 'lucide-react'
import Modal from '../common/Modal'

export default function TwoFactorModal({ open, onClose, onVerify, theme, method = 'authenticator' }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setIsVerifying(true)
    try {
      await onVerify(code)
      // Reset form on success
      setCode('')
      setError('')
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
    setError('') // Clear error when user types
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Two-Factor Authentication"
      theme={theme}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 rounded-lg" style={{ backgroundColor: theme.secondary }}>
          <Shield size={24} style={{ color: theme.accent }} />
          <div>
            <div className="font-medium" style={{ color: theme.text }}>
              Verify Your Identity
            </div>
            <div className="text-sm" style={{ color: theme.mutedText }}>
              {method === 'authenticator' 
                ? 'Enter the code from your authenticator app'
                : 'Enter the code sent to your email'}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              Verification Code
            </label>
            <input
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder="000000"
              maxLength={6}
              autoFocus
              className="w-full px-4 py-3 rounded-lg border text-center text-2xl tracking-widest font-mono"
              style={{ 
                backgroundColor: theme.background, 
                borderColor: error ? theme.error || '#EF4444' : theme.border, 
                color: theme.text 
              }}
            />
            {error && (
              <div className="text-sm mt-2" style={{ color: theme.error || '#EF4444' }}>
                {error}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={isVerifying || code.length !== 6}
              className="flex-1 px-4 py-3 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: theme.accent, color: theme.accentText }}
            >
              {isVerifying ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </div>
        </form>

        {method === 'authenticator' && (
          <div className="text-xs p-3 rounded-lg" style={{ backgroundColor: theme.secondary, color: theme.mutedText }}>
            <div className="flex items-center gap-2 mb-1">
              <Smartphone size={14} />
              <span className="font-medium">Using Authenticator App</span>
            </div>
            <div>Open your authenticator app (Google Authenticator, Authy, etc.) and enter the 6-digit code shown.</div>
          </div>
        )}
      </div>
    </Modal>
  )
}







