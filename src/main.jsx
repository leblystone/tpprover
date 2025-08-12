import React, { Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import './index.css'
import { router } from './routes.jsx'

const root = createRoot(document.getElementById('root'))
root.render(
  <Suspense fallback={<div className="p-6">Loading...</div>}>
    <RouterProvider router={router} />
  </Suspense>
)