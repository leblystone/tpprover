import React, { useState, useRef, useEffect } from 'react'
import { Key, Smartphone } from 'lucide-react'
import Modal from '../common/Modal'

const CODE_LENGTH = 6

export default function TwoFactorModal({ open, onClose, onVerify, theme, method = 'authenticator' }) {
  const [digits, setDigits] = useState(() => Array(CODE_LENGTH).fill(''))
  const [backupCode, setBackupCode] = useState('')
  const [error, setError] = useState('')
  const [isVerifying, setIsVerifying] = useState(false)
  const [useBackupCode, setUseBackupCode] = useState(false)
  const inputRefs = useRef([])

  const code = digits.join('')

  useEffect(() => {
    if (open && !useBackupCode) {
      const t = setTimeout(() => inputRefs.current[0]?.focus(), 50)
      return () => clearTimeout(t)
    }
  }, [open, useBackupCode])

  const resetFields = () => {
    setDigits(Array(CODE_LENGTH).fill(''))
    setBackupCode('')
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (useBackupCode) {
      const trimmed = backupCode.trim().toUpperCase()
      if (!trimmed || trimmed.length < 6) {
        setError('Please enter a valid backup code')
        return
      }
      setIsVerifying(true)
      try {
        await onVerify(trimmed)
        resetFields()
      } catch (err) {
        setError(err.message || 'Invalid backup code. Please try again.')
      } finally {
        setIsVerifying(false)
      }
      return
    }

    if (code.length !== CODE_LENGTH) {
      setError('Please enter a valid 6-digit code')
      return
    }

    setIsVerifying(true)
    try {
      await onVerify(code)
      resetFields()
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.')
      setDigits(Array(CODE_LENGTH).fill(''))
      inputRefs.current[0]?.focus()
    } finally {
      setIsVerifying(false)
    }
  }

  const applyDigits = (next) => {
    setDigits(next)
    setError('')
  }

  const handleDigitChange = (index, value) => {
    const cleaned = value.replace(/\D/g, '')
    if (!cleaned) {
      const next = [...digits]
      next[index] = ''
      applyDigits(next)
      return
    }

    // Paste or multi-digit into one box → fill from this index
    if (cleaned.length > 1) {
      const next = [...digits]
      const chars = cleaned.slice(0, CODE_LENGTH - index).split('')
      chars.forEach((ch, i) => {
        next[index + i] = ch
      })
      applyDigits(next)
      const focusAt = Math.min(index + chars.length, CODE_LENGTH - 1)
      inputRefs.current[focusAt]?.focus()
      return
    }

    const next = [...digits]
    next[index] = cleaned
    applyDigits(next)
    if (index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
    }
  }

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits]
        next[index] = ''
        applyDigits(next)
      } else if (index > 0) {
        const next = [...digits]
        next[index - 1] = ''
        applyDigits(next)
        inputRefs.current[index - 1]?.focus()
      }
      e.preventDefault()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus()
      e.preventDefault()
    } else if (e.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus()
      e.preventDefault()
    }
  }

  const handlePaste = (e) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, CODE_LENGTH)
    if (!pasted) return
    const next = Array(CODE_LENGTH).fill('')
    pasted.split('').forEach((ch, i) => {
      next[i] = ch
    })
    applyDigits(next)
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus()
  }

  const handleBackupChange = (e) => {
    setBackupCode(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 8))
    setError('')
  }

  const toggleMode = () => {
    setUseBackupCode((prev) => !prev)
    resetFields()
  }

  const isSubmitDisabled = isVerifying || (useBackupCode ? backupCode.trim().length < 6 : code.length !== CODE_LENGTH)

  const subtitle = useBackupCode
    ? 'Enter one of your saved backup codes'
    : method === 'authenticator'
    ? 'Enter the 6-digit code from your authenticator app'
    : 'Enter the 6-digit code sent to your email'

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Two-Factor Authentication"
      theme={theme}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-center" style={{ color: theme.mutedText || theme.textLight }}>
          {subtitle}
        </p>

        {useBackupCode ? (
          <input
            type="text"
            value={backupCode}
            onChange={handleBackupChange}
            placeholder="A3BF29KL"
            maxLength={8}
            autoFocus
            autoComplete="one-time-code"
            className="w-full px-4 py-3 rounded-lg border text-center text-xl tracking-widest font-mono"
            style={{
              backgroundColor: theme.background,
              borderColor: error ? theme.error || '#EF4444' : theme.border,
              color: theme.text,
            }}
          />
        ) : (
          <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el }}
                type="text"
                inputMode="numeric"
                autoComplete={index === 0 ? 'one-time-code' : 'off'}
                maxLength={CODE_LENGTH}
                value={digit}
                onChange={(e) => handleDigitChange(index, e.target.value)}
                onKeyDown={(e) => handleDigitKeyDown(index, e)}
                aria-label={`Digit ${index + 1}`}
                className="w-10 h-12 sm:w-11 sm:h-12 text-center text-xl font-semibold rounded-lg border outline-none"
                style={{
                  backgroundColor: theme.background,
                  borderColor: error ? theme.error || '#EF4444' : theme.border,
                  color: theme.text,
                }}
                onFocus={(e) => {
                  e.target.select()
                  e.target.style.borderColor = theme.primary || theme.accent || '#7f9e95'
                  e.target.style.boxShadow = `0 0 0 2px ${(theme.primary || theme.accent || '#7f9e95')}33`
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = error ? theme.error || '#EF4444' : theme.border
                  e.target.style.boxShadow = 'none'
                }}
              />
            ))}
          </div>
        )}

        {error && (
          <div className="text-sm text-center" style={{ color: theme.error || '#EF4444' }}>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitDisabled}
          className="w-full px-4 py-3 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: theme.primaryDark || theme.accent, color: '#fff' }}
        >
          {isVerifying ? 'Verifying...' : 'Verify'}
        </button>

        <button
          type="button"
          onClick={toggleMode}
          className="w-full flex items-center justify-center gap-2 text-sm py-1 transition-all hover:opacity-80"
          style={{ color: theme.mutedText || theme.textLight }}
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
      </form>
    </Modal>
  )
}
