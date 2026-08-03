import React, { useState } from 'react'
import { Shield, Smartphone, Key } from 'lucide-react'
import Modal from '../common/Modal'

export default function TwoFactorModal({ open, onClose, onVerify, theme, method = 'authenticator' }) {
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [useBackupCode, setUseBackupCode] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (useBackupCode) {
      const trimmed = code.trim().toUpperCase()
      if (!trimmed || trimmed.length < 6) {
        setError('Please enter a valid backup code')
        return
      }
      setIsVerifying(true)
      try {
        await onVerify(trimmed)
        setCode('')
        setError('')
      } catch (err) {
        setError(err.message || 'Invalid backup code. Please try again.')
      } finally {
        setIsVerifying(false)
      }
      return
    }

    if (!code || code.length !== 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setIsVerifying(true)
    try {
      await onVerify(code)
      setCode('')
      setError('')
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.')
    } finally {
      setIsVerifying(false)
    }
  }

  const handleCodeChange = (e) => {
    if (useBackupCode) {
      // Allow alphanumeric for backup codes, uppercase, max 8 chars
      const value = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8)
      setCode(value)
    } else {
      // Digits only for TOTP
      const value = e.target.value.replace(/\D/g, '').slice(0, 6)
      setCode(value)
    }
    setError('')
  }

  const toggleMode = () => {
    setUseBackupCode((prev) => !prev)
    setCode('')
    setError('')
  }

  const isSubmitDisabled = isVerifying || (useBackupCode ? code.trim().length < 6 : code.length !== 6)

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
              {useBackupCode
                ? 'Enter one of your saved backup codes'
                : method === 'authenticator'
                ? 'Enter the code from your authenticator app'
                : 'Enter the code sent to your email'}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
              {useBackupCode ? 'Backup Code' : 'Verification Code'}
            </label>
            <input
              key={useBackupCode ? 'backup' : 'totp'}
              type="text"
              value={code}
              onChange={handleCodeChange}
              placeholder={useBackupCode ? 'A3BF29KL' : '000000'}
              maxLength={useBackupCode ? 8 : 6}
              autoFocus
              autoComplete="one-time-code"
              className="w-full px-4 py-3 rounded-lg border text-center text-2xl tracking-widest font-mono"
              style={{
                backgroundColor: theme.background,
                borderColor: error ? theme.error || '#EF4444' : theme.border,
                color: theme.text,
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
              disabled={isSubmitDisabled}
              className="flex-1 px-4 py-3 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: theme.accent, color: theme.accentText }}
            >
              {isVerifying ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </div>
        </form>

        {/* Backup code / authenticator toggle */}
        <button
          type="button"
          onClick={toggleMode}
          className="w-full flex items-center justify-center gap-2 text-sm py-2 rounded-lg transition-all hover:opacity-80"
          style={{ color: theme.mutedText }}
        >
          {useBackupCode ? (
            <>
              <Smartphone size={14} />
              Use authenticator app instead
            </>
          ) : (
            <>
              <Key size={14} />
              Use a backup code instead
            </>
          )}
        </button>

        {!useBackupCode && method === 'authenticator' && (
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
