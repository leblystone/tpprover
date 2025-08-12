import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="text-center py-24">
      <h2 className="text-2xl font-semibold mb-2">Page not found</h2>
      <p className="text-gray-600 mb-6">The page you are looking for does not exist.</p>
      <Link className="inline-flex items-center px-4 py-2 rounded bg-gray-900 text-white" to="/">Go home</Link>
    </div>
  )
}