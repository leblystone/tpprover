import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import billyGooseImage from '../assets/billy-goose.png'

export default function LifetimeBilling() {
  const navigate = useNavigate()

  return (
    <div className="fixed top-16 bottom-0 left-0 lg:left-24 right-0 flex items-center justify-center bg-[#E8E4DC] px-4 overflow-hidden z-40">
      <div className="text-center max-w-2xl w-full">
        <button
          onClick={() => navigate('/app/account/subscription')}
          className="absolute top-4 left-4 p-2 rounded-full hover:opacity-80 transition-all"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}
        >
          <ArrowLeft size={20} className="text-gray-800" />
        </button>
        <h1 className="text-3xl font-bold mb-3 text-gray-800">
          There's no billing you silly goose.
        </h1>
        <p className="text-xl font-semibold mb-1.5 text-gray-700">
          Your account has lifetime access.
        </p>
        <p className="text-sm text-gray-600 mb-6">
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
