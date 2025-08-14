 import React, { useState } from 'react'
 import { themes, defaultThemeName } from '../theme/themes'

export default function Login() {
  const [themeName] = useState(defaultThemeName)
  const theme = themes[themeName]
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email || !password) { setError('Email and password required'); return }
    const user = { email, name: email.split('@')[0] }
    localStorage.setItem('tpprover_user', JSON.stringify(user))
    window.location.href = '/account'
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <form className="w-full max-w-sm p-6 rounded-xl border content-card" style={{ backgroundColor: theme.white, borderColor: theme.border }} onSubmit={handleSubmit}>
        <h3 className="h3 mb-4" style={{ color: theme.primaryDark }}>{mode === 'login' ? 'Login' : 'Create Account'}</h3>
        <div className="space-y-3">
          <input type="email" className="w-full p-3 rounded border" style={{ borderColor: theme.border }} placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
          <input type="password" className="w-full p-3 rounded border" style={{ borderColor: theme.border }} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
          {error && <div className="text-sm text-red-600">{error}</div>}
          <button type="submit" className="w-full px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.white }}>{mode === 'login' ? 'Login' : 'Sign up'}</button>
          <button type="button" className="w-full text-sm text-gray-600" onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Create an account' : 'Have an account? Login'}
          </button>
        </div>
      </form>
    </div>
  )
}


