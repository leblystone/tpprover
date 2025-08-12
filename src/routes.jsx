import React, { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import NotFound from './pages/NotFound.jsx'

const Home = lazy(() => import('./pages/Home.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Orders = lazy(() => import('./pages/Orders.jsx'))
const Protocols = lazy(() => import('./pages/Protocols.jsx'))
const Research = lazy(() => import('./pages/Research.jsx'))

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: 'dashboard', element: <Dashboard /> },
      { path: 'orders', element: <Orders /> },
      { path: 'protocols', element: <Protocols /> },
      { path: 'research', element: <Research /> },
    ]
  }
])