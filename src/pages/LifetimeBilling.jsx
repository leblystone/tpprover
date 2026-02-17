import React from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import billyGooseImage from '../assets/billy-goose.png'

export default function LifetimeBilling() {
  const navigate = useNavigate()
  const { theme } = useOutletContext()

  return (
    <div className="page-bg fixed top-16 bottom-0 left-0 lg:left-24 right-0 flex items-center justify-center px-4 overflow-hidden z-40">
      <div className="text-center max-w-2xl w-full">
        <button
          onClick={() => navigate('/app/account/subscription')}
          className="absolute top-4 left-4 p-2 rounded-full hover:opacity-80 transition-all"
          style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' }}
        >
          <ArrowLeft size={20} style={{ color: theme.text }} />
        </button>
        <h1 className="text-3xl font-bold mb-3" style={{ color: theme.text }}>
          There's no billing you silly goose.
        </h1>
        <p className="text-xl font-semibold mb-1.5" style={{ color: theme.text, opacity: 0.8 }}>
          Your account has lifetime access.
        </p>
        <p className="text-sm mb-6" style={{ color: theme.text, opacity: 0.6 }}>
          Your receipt has been sent to your email.
        </p>
        <img 
          src={billyGooseImage} 
          alt="Billy Goose" 
          className="w-full max-w-md mx-auto"
          style={{ maxHeight: '40vh', objectFit: 'contain' }}
        />
      </div>
    </div>
  )
}
