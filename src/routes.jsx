import React, { lazy } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import NotFound from './pages/NotFound.jsx'
import Rover from './pages/Rover.jsx'
import ProtectedRoute from './components/common/ProtectedRoute.jsx'

const Home = lazy(() => import('./pages/Home.jsx'))
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'))
const Orders = lazy(() => import('./pages/Orders.jsx'))
const Protocols = lazy(() => import('./pages/Protocols.jsx'))
const Vendors = lazy(() => import('./pages/Vendors.jsx'))
const Calendar = lazy(() => import('./pages/Calendar.jsx'))
const Day = lazy(() => import('./pages/Day.jsx'))
const Stockpile = lazy(() => import('./pages/Stockpile.jsx'))
const Recon = lazy(() => import('./pages/Recon.jsx'))
const Announcements = lazy(() => import('./pages/Announcements.jsx'))
const Settings = lazy(() => import('./pages/Settings.jsx'))
const Account = lazy(() => import('./pages/Account.jsx'))
const Login = lazy(() => import('./pages/Login.jsx'))
const Imports = lazy(() => import('./pages/Imports.jsx'))

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
    errorElement: <NotFound />,
  },
  {
    path: '/rover/:type/share/:encodedData',
    element: <Rover />,
    errorElement: <NotFound />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    errorElement: <NotFound />,
    children: [
      {
        path: '/',
        element: <App />,
        errorElement: <NotFound />,
        children: [
          { index: true, element: <Home /> },
          { path: 'dashboard', element: <Dashboard /> },
          { path: 'orders', element: <Orders /> },
          { path: 'protocols', element: <Protocols /> },
          { path: 'vendors', element: <Vendors /> },
          { path: 'calendar', element: <Calendar /> },
          { path: 'calendar/day', element: <Day /> },
          { path: 'recon', element: <Recon /> },
          { path: 'stockpile', element: <Stockpile /> },
          { path: 'announcements', element: <Announcements /> },
          { path: 'settings', element: <Settings /> },
          { path: 'account', element: <Account /> },
          { path: 'imports', element: <Imports /> },
        ]
      }
    ]
  }
], {
  future: {
    v7_startTransition: true
  }
})