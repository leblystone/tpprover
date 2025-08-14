import React, { useMemo, useState, useEffect } from 'react'
import { Users, Plus, ShoppingCart, Droplet } from 'lucide-react'
import { themes, defaultThemeName } from '../theme/themes'
import ViewContainer from '../components/ui/ViewContainer'
import TasksList from '../components/dashboard/TasksList'
import UpcomingOrderCard from '../components/dashboard/UpcomingOrderCard'
import ReconCalculatorModal from '../components/recon/ReconCalculatorModal'
import UpcomingBuys from '../components/dashboard/UpcomingBuys'
import AddBuyModal from '../components/buys/AddBuyModal'
import { ToastContainer, Toast } from '../components/ui/Toast'
import OCRImportModal from '../components/import/OCRImportModal'
import PendingVendorsView from '../components/dashboard/PendingVendorsView'
import OrderDetailsModal from '../components/orders/OrderDetailsModal'
import ProtocolEditorModal from '../components/protocols/ProtocolEditorModal'
import VendorDetailsModal from '../components/vendors/VendorDetailsModal'

export default function Dashboard() {
  const [themeName] = useState(defaultThemeName)
  const theme = themes[themeName]

  // Mock minimal data to render the dashboard without external deps
  const [vitamins, setVitamins] = useState([
    { id: 1, name: 'Vitamin D3', dose: '5000 IU', schedule: 'AM' },
    { id: 2, name: 'Magnesium', dose: '200 mg', schedule: 'PM' },
  ])

  const peptideLog = useMemo(() => ({
    '2025-8-week-2': {
      monday: [{ id: 'p1', peptide: 'BPC-157', dosage: '250 mcg' }],
    }
  }), [])

  const incomingOrder = useMemo(() => ({
    peptide: 'BPC-157',
    mg: 10,
    vendor: 'Acme Research',
    shipDate: new Date().toISOString(),
  }), [])

  const pendingVendors = useMemo(() => ([
    { id: 1001, name: 'Vendor X', notes: 'Auto-created from reconstitution' },
    { id: 1002, name: 'Vendor Y', notes: 'Auto-created from orders' },
  ]), [])

  const [todaysTasks, setTodaysTasks] = useState([])
  const [showRecon, setShowRecon] = useState(false)
  const [upcomingBuys, setUpcomingBuys] = useState([])
  const [showAddBuy, setShowAddBuy] = useState(false)
  const [toasts, setToasts] = useState([])
  const [showImport, setShowImport] = useState(false)
  const [editingVendor, setEditingVendor] = useState(null)
  const [showNewOrder, setShowNewOrder] = useState(false)
  const [showNewProtocol, setShowNewProtocol] = useState(false)
  const [vendorNames, setVendorNames] = useState(() => { try { return JSON.parse(localStorage.getItem('tpprover_vendors')||'[]') } catch { return [] } })

  const addToast = (message, type = 'success') => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }

  useEffect(() => {
    const today = new Date()
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
    const getWeekOfMonth = (date) => {
      const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay()
      return Math.ceil((date.getDate() + firstDay) / 7)
    }
    const weekId = `${today.getFullYear()}-${today.getMonth() + 1}-week-${getWeekOfMonth(today)}`

    const todaysPeptides = (peptideLog[weekId] && peptideLog[weekId][dayName]) || []

    const peptideTasks = todaysPeptides.map(p => {
      const dosageMatch = p.dosage.match(/(\d+)\s*(\w+)/)
      const dose = dosageMatch ? dosageMatch[1] : p.dosage
      const unit = dosageMatch ? dosageMatch[2] : ''
      return {
        id: p.id,
        type: 'peptide',
        name: p.peptide,
        dose,
        unit,
        time: 'N/A',
        completed: false,
      }
    })

    const vitaminTasks = vitamins.map(v => ({
      id: `vit-${v.id}`,
      type: 'vitamin',
      name: v.name,
      dose: v.dose,
      unit: '',
      time: v.schedule,
      completed: false,
    }))

    const combined = [...peptideTasks, ...vitaminTasks]
    combined.sort((a, b) => {
      if (a.type === 'peptide' && b.type !== 'peptide') return -1
      if (a.type !== 'peptide' && b.type === 'peptide') return 1
      return a.name.localeCompare(b.name)
    })

    setTodaysTasks(combined)
  }, [peptideLog, vitamins])

  useEffect(() => {
    const handler = () => setShowImport(true)
    window.addEventListener('tpp:openImport', handler)
    return () => window.removeEventListener('tpp:openImport', handler)
  }, [])

  const toggleTask = (id) => setTodaysTasks(ts => ts.map(t => t.id === id ? { ...t, completed: !t.completed } : t))

  return (
    <div className="space-y-8">
      <ViewContainer theme={theme} transparent noMinHeight>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-0 items-stretch">
          <div className="p-8 rounded-xl content-card h-full flex flex-col" style={{ backgroundColor: theme.white }}>
            <h3 className="h3 mb-4 border-b pb-2" style={{ color: theme.primaryDark, borderColor: theme.border }}>Today's Research</h3>
            <TasksList tasks={todaysTasks} theme={theme} onToggle={toggleTask} />
          </div>
          <UpcomingOrderCard order={incomingOrder} theme={theme} />
        </div>
      </ViewContainer>

      <div className="mt-6">
        <PendingVendorsView
          vendors={pendingVendors}
          theme={theme}
          onViewAll={() => { window.history.pushState({}, '', '/vendors'); window.dispatchEvent(new PopStateEvent('popstate')) }}
          onComplete={(v) => setEditingVendor({ id: Date.now(), name: v.name, notes: v.notes })}
        />
      </div>

      {/* Subtle Badges summary card */}
      <div className="grid grid-cols-1 gap-4">
        <div className="p-4 rounded-xl border content-card" style={{ backgroundColor: theme.white, borderColor: theme.border }}>
          <div className="flex items-center justify-between mb-1">
            <div className="font-semibold" style={{ color: theme.primaryDark }}>Badges</div>
            <button className="text-xs underline" onClick={() => { window.history.pushState({}, '', '/research'); window.dispatchEvent(new PopStateEvent('popstate')) }}>View all</button>
          </div>
          <BadgesInline theme={theme} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <QuickCard onClick={() => { addToast('Opening New Order', 'success'); setShowNewOrder(true) }} icon={<ShoppingCart className="h-8 w-8 mb-3" style={{ color: theme.primary }} />} label="New Order" theme={theme} />
        <QuickCard onClick={() => { addToast('Opening Recon Calculator', 'success'); setShowRecon(true) }} icon={<Droplet className="h-8 w-8 mb-3" style={{ color: theme.primary }} />} label="Recon Calculator" theme={theme} />
        <QuickCard onClick={() => { addToast('Opening New Vendor', 'success'); setEditingVendor({ id: Date.now(), name: '', notes: '' }) }} icon={<Users className="h-8 w-8 mb-3" style={{ color: theme.primary }} />} label="New Vendor" theme={theme} />
        <QuickCard onClick={() => { addToast('Opening New Protocol', 'success'); setShowNewProtocol(true) }} icon={<Plus className="h-8 w-8 mb-3" style={{ color: theme.primary }} />} label="New Protocol" theme={theme} />
      </div>

      <UpcomingBuys items={upcomingBuys} theme={theme} onAdd={() => setShowAddBuy(true)} />

      

      <AddBuyModal
        open={showAddBuy}
        onClose={() => setShowAddBuy(false)}
        theme={theme}
        onSave={(buy) => {
          setUpcomingBuys(prev => ([{ id: Date.now(), ...buy }, ...prev]))
          addToast('Upcoming buy scheduled', 'success')
          setShowAddBuy(false)
        }}
      />

      <ToastContainer toasts={toasts} removeToast={(id) => setToasts(prev => prev.filter(t => t.id !== id))} />
      <OCRImportModal open={showImport} onClose={() => setShowImport(false)} theme={theme} onImport={() => addToast('Import saved', 'success')} />

      <VendorDetailsModal
        open={!!editingVendor}
        onClose={() => setEditingVendor(null)}
        theme={theme}
        vendor={editingVendor}
        onSave={(v) => {
          // Save vendor name for suggestions
          try {
            const set = new Set([...(JSON.parse(localStorage.getItem('tpprover_vendors')||'[]')||[]), v.name].filter(Boolean))
            const arr = Array.from(set)
            localStorage.setItem('tpprover_vendors', JSON.stringify(arr))
            setVendorNames(arr)
          } catch {}
          setEditingVendor(null)
          window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Vendor saved', type: 'success' } }))
        }}
      />

      <OrderDetailsModal
        open={!!showNewOrder}
        onClose={() => setShowNewOrder(false)}
        order={{}}
        theme={theme}
        vendorList={vendorNames}
        onSave={(o) => {
          try {
            const raw = localStorage.getItem('tpprover_orders')
            const all = raw ? JSON.parse(raw) : []
            const id = o.id || Date.now()
            all.unshift({ ...o, id })
            localStorage.setItem('tpprover_orders', JSON.stringify(all))
            // add vendor name
            if (o.vendor) {
              const set = new Set([...(JSON.parse(localStorage.getItem('tpprover_vendors')||'[]')||[]), o.vendor])
              const arr = Array.from(set)
              localStorage.setItem('tpprover_vendors', JSON.stringify(arr))
              setVendorNames(arr)
            }
          } catch {}
          setShowNewOrder(false)
          window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Order added', type: 'success' } }))
        }}
        onDelete={() => setShowNewOrder(false)}
      />

      <ProtocolEditorModal
        open={!!showNewProtocol}
        onClose={() => setShowNewProtocol(false)}
        theme={theme}
        onSave={(data) => {
          try {
            const raw = localStorage.getItem('tpprover_protocols')
            const arr = raw ? JSON.parse(raw) : []
            arr.unshift({ id: Date.now(), ...data })
            localStorage.setItem('tpprover_protocols', JSON.stringify(arr))
            // bump calendar
            const now = String(Date.now())
            localStorage.setItem('tpprover_calendar_bump', now)
            window.dispatchEvent(new StorageEvent('storage', { key: 'tpprover_calendar_bump', newValue: now }))
          } catch {}
          setShowNewProtocol(false)
          window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Protocol created', type: 'success' } }))
        }}
      />

      <ReconCalculatorModal open={showRecon} onClose={() => setShowRecon(false)} theme={theme} onTransfer={(data) => { setShowRecon(false); /* could route to /recon with prefilled state */ }} />
    </div>
  )
}

function QuickCard({ icon, label, theme, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center justify-center p-6 rounded-xl transition-all duration-200 hover:shadow-lg" style={{ backgroundColor: theme.white }}>
      {icon}
      <span className="font-semibold" style={{ color: theme.primaryDark }}>{label}</span>
    </button>
  )
}

function BadgesInline({ theme }) {
  const [earned, setEarned] = React.useState([])
  React.useEffect(() => {
    try {
      const protocols = JSON.parse(localStorage.getItem('tpprover_protocols') || '[]')
      const orders = JSON.parse(localStorage.getItem('tpprover_orders') || '[]')
      const stockpile = JSON.parse(localStorage.getItem('tpprover_stockpile') || '[]')
      const supplements = JSON.parse(localStorage.getItem('tpprover_supplements') || '[]')
      const delivered = orders.filter(o => o.status === 'Delivered').length
      const activeProtocols = protocols.filter(p => p.active !== false).length
      const lowStock = stockpile.filter(s => Number(s.quantity) <= 1).length
      const supplementCount = supplements.length
      const totalSpend = orders.reduce((acc, o) => acc + (Number(String(o.cost).replace(/[^0-9.]/g,'')) || 0), 0)
      const out = []
      if (delivered >= 1) out.push('First Delivery')
      if (activeProtocols >= 3) out.push('Protocol Planner')
      if (lowStock === 0 && stockpile.length > 0) out.push('Well Stocked')
      if (supplementCount >= 5) out.push('Supplement Scholar')
      if (totalSpend >= 5000) out.push('The Homeostat')
      if (totalSpend >= 10000) out.push('The Investor')
      setEarned(out)
    } catch {}
  }, [])
  if (earned.length === 0) return <div className="text-xs" style={{ color: theme.textLight }}>No badges yet.</div>
  return (
    <div className="flex flex-wrap gap-2">
      {earned.slice(0,6).map(n => (
        <span key={n} className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: theme.accent, color: theme.accentText }}>{n}</span>
      ))}
    </div>
  )
}