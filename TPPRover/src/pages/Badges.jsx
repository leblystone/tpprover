import React from 'react'
import { useOutletContext, useNavigate } from 'react-router-dom'

export default function Badges() {
  const { theme } = useOutletContext()
  const navigate = useNavigate()

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold" style={{ color: theme.primaryDark }}>Your Badges</h1>
        <button onClick={() => navigate(-1)} className="px-3 py-2 rounded-md border text-sm" style={{ borderColor: theme.border, color: theme.text }}>Back</button>
      </div>
      <div className="rounded-lg border p-6 content-card shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <p className="text-sm" style={{ color: theme.textLight }}>Badge details and achievements will appear here.</p>
      </div>
    </section>
  )
}


