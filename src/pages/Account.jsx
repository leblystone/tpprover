 import React from 'react'
 import { themes, defaultThemeName } from '../theme/themes'

export default function Account() {
  const [themeName] = React.useState(defaultThemeName)
  const theme = themes[themeName]
  const [user, setUser] = React.useState(() => {
    try { return JSON.parse(localStorage.getItem('tpprover_user') || 'null') } catch { return null }
  })

  const handleLogout = () => {
    localStorage.removeItem('tpprover_user')
    setUser(null)
  }

  return (
    <section className="space-y-4">
      <div className="rounded border bg-white p-4 content-card" style={{ borderColor: theme.border }}>
        {user ? (
          <div className="space-y-2">
            <div><span className="text-sm text-gray-500">Email:</span> <span className="font-medium">{user.email}</span></div>
            <div><span className="text-sm text-gray-500">Name:</span> <span className="font-medium">{user.name || '-'}</span></div>
            <button className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.white }} onClick={handleLogout}>Log out</button>
          </div>
        ) : (
          <div className="text-sm text-gray-500">You are not signed in. Go to Login.</div>
        )}
      </div>
    </section>
  )
}


