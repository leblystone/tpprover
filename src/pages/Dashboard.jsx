import React, { useMemo, useState, useEffect } from 'react'
import { CheckSquare, Square, Droplet, Pill, Upload, Users, Zap, ShoppingCart, CheckCircle, Clock, Truck } from 'lucide-react'
import { themes, defaultThemeName } from '../theme/themes'
import LoadingSpinner from '../components/ui/LoadingSpinner'

const ViewContainer = ({ theme, children }) => (
  <div className="space-y-8 min-h-screen" style={{ backgroundColor: theme.background }}>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {children}
    </div>
  </div>
)

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

  const [todaysTasks, setTodaysTasks] = useState([])

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

  const toggleTask = (id) => setTodaysTasks(ts => ts.map(t => t.id === id ? { ...t, completed: !t.completed } : t))

  return (
    <div className="space-y-8">
      <ViewContainer theme={theme}>
        <div className="p-8 rounded-xl content-card" style={{ backgroundColor: theme.white }}>
          <h3 className="h3 mb-6 border-b pb-3" style={{ color: theme.primaryDark, borderColor: theme.border }}>Today's Research</h3>
          {todaysTasks.length > 0 ? (
            <ul className="space-y-4">
              {todaysTasks.map(task => (
                <li key={task.id} className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: task.completed ? theme.accent : theme.background }}>
                  <div className="flex items-center">
                    <button onClick={() => toggleTask(task.id)} className="mr-4">
                      {task.completed ? <CheckSquare className="h-6 w-6" style={{ color: theme.primary }} /> : <Square className="h-6 w-6" style={{ color: theme.textLight }} />}
                    </button>
                    <div className={task.completed ? 'line-through transition-all' : 'transition-all'}>
                      <span className="font-semibold">{task.name}</span>
                      <span className="text-sm ml-2" style={{ color: theme.textLight }}>{task.dose}{task.unit}</span>
                    </div>
                  </div>
                  <div className="flex items-center text-sm" style={{ color: theme.textLight }}>
                    {task.type === 'vitamin' ? <Pill className="h-4 w-4 mr-2" /> : <Droplet className="h-4 w-4 mr-2" />}
                    <span>{task.time}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p style={{ color: theme.textLight }}>No research scheduled for today.</p>
          )}
        </div>

        <UpcomingOrderCard order={incomingOrder} theme={theme} />
      </ViewContainer>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        <QuickCard icon={<ShoppingCart className="h-8 w-8 mb-3" style={{ color: theme.primary }} />} label="New Order" theme={theme} />
        <QuickCard icon={<Droplet className="h-8 w-8 mb-3" style={{ color: theme.primary }} />} label="New Reconstitution" theme={theme} />
        <QuickCard icon={<Users className="h-8 w-8 mb-3" style={{ color: theme.primary }} />} label="New Vendor" theme={theme} />
        <QuickCard icon={<Zap className="h-8 w-8 mb-3" style={{ color: theme.primary }} />} label="New Protocol" theme={theme} />
      </div>
    </div>
  )
}

function QuickCard({ icon, label, theme }) {
  return (
    <button className="flex flex-col items-center justify-center p-6 rounded-xl transition-all duration-200 hover:shadow-lg" style={{ backgroundColor: theme.white }}>
      {icon}
      <span className="font-semibold" style={{ color: theme.primaryDark }}>{label}</span>
    </button>
  )
}

function UpcomingOrderCard({ order, theme }) {
  if (!order) return (
    <div className="p-8 rounded-xl content-card w-full" style={{ backgroundColor: theme.white }}>
      <h3 className="h3 mb-6 border-b pb-3" style={{ color: theme.primaryDark, borderColor: theme.border }}>Incoming Peptides</h3>
      <p>No active orders.</p>
    </div>
  )

  const steps = [
    { status: 'received', icon: <Clock size={24} color={theme.primary} />, label: 'Order Placed' },
    { status: 'shipped', icon: <Truck size={24} color={theme.primary} />, label: 'Shipped' },
    { status: 'delivered', icon: <CheckCircle size={24} color={theme.primary} />, label: 'Delivered' },
  ]
  let current = 0
  if (order.deliveryDate) current = 2
  else if (order.shipDate) current = 1

  return (
    <div className="p-8 rounded-xl content-card w-full flex flex-col items-center" style={{ backgroundColor: theme.white }}>
      <h3 className="h3 mb-6 border-b pb-3 text-center" style={{ color: theme.primaryDark, borderColor: theme.border }}>Incoming Peptides</h3>
      <div className="w-full flex flex-col items-center mb-6">
        <div className="text-xl font-bold mb-0" style={{ color: theme.primary }}>{order.peptide} {order.mg}mg</div>
        <div className="text-base mb-2" style={{ color: theme.textLight }}>
          <span style={{ fontWeight: 500, color: theme.text }}>From:</span> {order.vendor}
        </div>
      </div>
      <div className="flex items-center justify-center gap-6 mb-6">
        {steps.map((s, idx) => (
          <div key={s.status} className="flex flex-col items-center">
            <div className={`rounded-full p-3 ${idx <= current ? 'bg-green-100' : 'bg-gray-100'}`}>{s.icon}</div>
            <span className={`text-xs mt-2 ${idx <= current ? 'text-green-700 font-semibold' : 'text-gray-400'}`}>{s.label}</span>
          </div>
        ))}
      </div>
      <div className="mb-6">
        {current === 1 && <span className="px-2 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-800">In Transit</span>}
        {current === 2 && <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Delivered</span>}
      </div>
      <button className="mt-6 px-6 py-3 rounded-lg font-semibold transition-all duration-200 w-full" style={{ backgroundColor: theme.primary, color: theme.white }}>
        View Orders
      </button>
    </div>
  )
}