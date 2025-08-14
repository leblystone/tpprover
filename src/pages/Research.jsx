import React, { useState } from 'react'
import { formatMMDDYYYY } from '../utils/date'
import { themes, defaultThemeName } from '../theme/themes'
import HelpTooltip from '../components/ui/HelpTooltip'
import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard'
import Tabs from '../components/common/Tabs'
import AddSupplementModal from '../components/research/AddSupplementModal'
import BodyMetricsModal from '../components/research/BodyMetricsModal'
import { Pill, Target, PlusCircle, Edit, Trash2, Award } from 'lucide-react'
import GoalModal from '../components/research/GoalModal'

export default function Research() {
  const [themeName] = useState(defaultThemeName)
  const theme = themes[themeName]
  const [activeTab, setActiveTab] = useState('research')
  const [vitamins, setVitamins] = useState([])
  const [goals, setGoals] = useState([])
  const [metrics, setMetrics] = useState([])
  // Persist supplements to feed calendar indicators
  React.useEffect(() => {
    try { const raw = localStorage.getItem('tpprover_supplements'); if (raw) setVitamins(JSON.parse(raw)) } catch {}
  }, [])
  React.useEffect(() => {
    try { localStorage.setItem('tpprover_supplements', JSON.stringify(vitamins)) } catch {}
  }, [vitamins])
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState(null)
  const [showMetrics, setShowMetrics] = useState(false)
  const [editingMetric, setEditingMetric] = useState(null)
  const [showGoal, setShowGoal] = useState(false)
  const [editingGoal, setEditingGoal] = useState(null)
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-end">
        <Tabs theme={theme} value={activeTab} onChange={setActiveTab} compact options={[
          { value: 'research', label: 'Research' },
          { value: 'analytics', label: 'Analytics' },
          { value: 'badges', label: 'Badges' },
        ]} />
      </div>

      {activeTab === 'research' && (
      <div className="rounded border bg-white p-4 content-card" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Pill className="h-5 w-5" /><span className="font-semibold">Supplements</span></div>
          <button onClick={() => { setEditing(null); setShowAdd(true) }} className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.white }}><PlusCircle className="h-4 w-4 inline mr-1"/>Add</button>
        </div>
        {vitamins.length === 0 ? (
          <p className="text-sm" style={{ color: theme.textLight }}>No supplements yet.</p>
        ) : (
          <ul className="space-y-2">
            {vitamins.map(v => (
              <li key={v.id} className="flex items-center justify-between p-3 rounded border" style={{ borderColor: theme.border }}>
                <div>
                  <div className="font-medium">{v.name}</div>
                  <div className="text-xs" style={{ color: theme.textLight }}>{v.dose} • {v.schedule} • {v.form}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1 rounded hover:bg-gray-100" onClick={() => { setEditing(v); setShowAdd(true) }}><Edit className="h-4 w-4" /></button>
                  <button className="p-1 rounded hover:bg-gray-100" onClick={() => setVitamins(prev => prev.filter(x => x.id !== v.id))}><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      )}

      {activeTab === 'research' && (
      <div className="rounded border bg-white p-4 content-card" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2"><Target className="h-5 w-5" /><span className="font-semibold">Goals</span></div>
          <button onClick={() => { setEditingGoal(null); setShowGoal(true) }} className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.white }}><PlusCircle className="h-4 w-4 inline mr-1"/>Add</button>
        </div>
        {goals.length === 0 ? <p className="text-sm" style={{ color: theme.textLight }}>No goals yet.</p> : (
          <ul className="space-y-2">
            {goals.map(g => (
              <li key={g.id} className="flex items-center justify-between p-3 rounded border" style={{ borderColor: theme.border }}>
                <div className={g.completed ? 'line-through text-gray-400' : ''}>
                  <div className="font-medium">{g.text}</div>
                  <div className="text-xs" style={{ color: theme.textLight }}>Goal Date: {g.dueDate || '-'}</div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-1 rounded hover:bg-gray-100" onClick={() => setGoals(prev => prev.map(x => x.id === g.id ? { ...x, completed: !x.completed } : x))}>{g.completed ? 'Undo' : 'Done'}</button>
                  <button className="p-1 rounded hover:bg-gray-100" onClick={() => { setEditingGoal(g); setShowGoal(true) }}><Edit className="h-4 w-4" /></button>
                  <button className="p-1 rounded hover:bg-gray-100" onClick={() => setGoals(prev => prev.filter(x => x.id !== g.id))}><Trash2 className="h-4 w-4" /></button>
                </div>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 text-xs flex items-center gap-2" style={{ color: theme.textLight }}>
          <Award className="h-4 w-4" />
          <span>Badges: {goals.length >= 5 && <span className="status-active">Goal Setter</span>} {goals.filter(g=>g.completed).length >= 5 && <span className="status-active">Goal Finisher</span>}</span>
        </div>
      </div>

      )}

      {activeTab === 'research' && (
      <div className="rounded border bg-white p-4 content-card" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between mb-3">
          <div className="font-semibold">Body Metrics</div>
          <button onClick={() => { setEditingMetric(null); setShowMetrics(true) }} className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.white }}><PlusCircle className="h-4 w-4 inline mr-1"/>Add</button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            {metrics.length === 0 ? <p className="text-sm" style={{ color: theme.textLight }}>No entries yet.</p> : (
              <table className="w-full text-left">
                <thead>
                  <tr className="text-xs text-gray-500">
                    <th className="py-2 pr-3">Date</th>
                    <th className="py-2 pr-3">Weight</th>
                    <th className="py-2 pr-3">Body Fat %</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map(m => (
                    <tr key={m.id} className="border-t" style={{ borderColor: theme.border }}>
                      <td className="py-2 pr-3">{formatMMDDYYYY(m.date)}</td>
                      <td className="py-2 pr-3"><span className="px-2 py-1 rounded bg-blue-50 text-blue-700 font-semibold text-xs">{m.weight || '-'}</span></td>
                      <td className="py-2 pr-3"><span className="px-2 py-1 rounded bg-purple-50 text-purple-700 font-semibold text-xs">{m.bodyfat || '-'}</span></td>
                      <td className="py-2 pr-3 text-right"><button className="px-2 py-1 rounded border text-xs" style={{ borderColor: theme.border }} onClick={() => { setEditingMetric(m); setShowMetrics(true) }}>Edit</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div>
            <div className="text-xs mb-1" style={{ color: theme.textLight }}>Weight trend</div>
            <MiniLineChart theme={theme} data={metrics.filter(m => !!m.weight).sort((a,b) => a.date.localeCompare(b.date)).map(m => ({ x: m.date, y: parseFloat(String(m.weight).replace(/[^0-9.]/g,'')) }))} color="#3B82F6" />
            <div className="text-xs mb-1 mt-4" style={{ color: theme.textLight }}>Body fat % trend</div>
            <MiniLineChart theme={theme} data={metrics.filter(m => !!m.bodyfat).sort((a,b) => a.date.localeCompare(b.date)).map(m => ({ x: m.date, y: parseFloat(String(m.bodyfat).replace(/[^0-9.]/g,'')) }))} color="#8B5CF6" />
          </div>
        </div>
      </div>
      )}

      {activeTab === 'analytics' && (
        <div className="rounded border bg-white p-4 content-card" style={{ borderColor: theme.border }}>
          <AnalyticsDashboard theme={theme} />
        </div>
      )}

      {activeTab === 'badges' && (
        <>
          <BadgesPanel theme={theme} />
          <div className="rounded border bg-white p-4 content-card" style={{ borderColor: theme.border }}>
            <div className="font-semibold mb-2" style={{ color: theme.primaryDark }}>Badges (Reference)</div>
            <ul className="text-sm space-y-1">
              {[
                { name: 'First Delivery', rule: 'Complete your first order (Delivered).'},
                { name: 'Protocol Planner', rule: 'Maintain 3+ active protocols.'},
                { name: 'Well Stocked', rule: 'No inventory items at/below threshold.'},
                { name: 'The Homeostat', rule: 'Reach $5,000 in total orders.'},
                { name: 'The Investor', rule: 'Reach $10,000 in total orders.'},
                { name: 'Supplement Scholar', rule: 'Track 5+ supplements.'},
                { name: 'Streak I – The Apprentice', rule: '3‑day streak of daily check‑ins/completions.'},
                { name: 'Streak II – The Vector', rule: '7‑day streak.'},
                { name: 'Streak III – The Artisan', rule: '14‑day streak.'},
                { name: 'Streak IV – The Progenitor', rule: '30‑day streak.'},
                { name: 'Streak V – The Axiom', rule: '60‑day streak.'},
              ].map(b => (
                <li key={b.name} className="flex items-start gap-2">
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ backgroundColor: theme.accent, color: theme.accentText }}>{b.name}</span>
                  <span className="text-gray-600">{b.rule}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
      <BodyMetricsModal
        open={showMetrics}
        onClose={() => setShowMetrics(false)}
        theme={theme}
        metric={editingMetric}
        onSave={(data) => {
          setMetrics(prev => {
            if (data.id) return prev.map(x => x.id === data.id ? { ...x, ...data } : x)
            return [{ id: Date.now(), ...data }, ...prev]
          })
          setShowMetrics(false)
          setEditingMetric(null)
        }}
      />
      <GoalModal
        open={showGoal}
        onClose={() => setShowGoal(false)}
        theme={theme}
        goal={editingGoal}
        onSave={(form) => {
          setGoals(prev => {
            if (form.id) return prev.map(g => g.id === form.id ? { ...g, text: form.text, dueDate: form.dueDate } : g)
            return [{ id: Date.now(), text: form.text, dueDate: form.dueDate, completed: false }, ...prev]
          })
          setShowGoal(false)
          setEditingGoal(null)
        }}
        onDelete={(form) => { setGoals(prev => prev.filter(g => g.id !== form.id)); setShowGoal(false); setEditingGoal(null) }}
      />
      <AddSupplementModal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        theme={theme}
        supplement={editing}
        onSave={(data) => {
          if (editing) {
            setVitamins(prev => prev.map(v => v.id === editing.id ? { ...editing, ...data } : v))
          } else {
            setVitamins(prev => [{ id: Date.now(), ...data }, ...prev])
          }
          setShowAdd(false)
          setEditing(null)
        }}
      />
    </section>
  )
}

function MiniLineChart({ data = [], color = '#3B82F6', theme }) {
  if (!data || data.length === 0) return <div className="text-xs text-gray-500">No data</div>
  const vw = 600; const vh = 180; const padding = 12
  const ys = data.map(d => d.y).filter(n => typeof n === 'number' && !isNaN(n))
  const minY = Math.min(...ys); const maxY = Math.max(...ys)
  const yRange = maxY - minY || 1
  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1)) * (vw - padding*2)
    const y = padding + (1 - (d.y - minY) / yRange) * (vh - padding*2)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width="100%" height={vh} viewBox={`0 0 ${vw} ${vh}`} className="rounded border bg-white" style={{ borderColor: theme?.border }}>
      <polyline fill="none" stroke={color} strokeWidth="2" points={points} />
    </svg>
  )
}

function BadgesPanel({ theme }) {
  const [badges, setBadges] = React.useState([])
  const [programBadges, setProgramBadges] = React.useState([])
  React.useEffect(() => {
    try {
      const protocols = JSON.parse(localStorage.getItem('tpprover_protocols') || '[]')
      const orders = JSON.parse(localStorage.getItem('tpprover_orders') || '[]')
      const stockpile = JSON.parse(localStorage.getItem('tpprover_stockpile') || '[]')
      const supplements = JSON.parse(localStorage.getItem('tpprover_supplements') || '[]')
      const isTester = (() => { try { const v = localStorage.getItem('tpprover_is_tester'); return v === '1' || v === 'true' } catch { return false } })()
      const delivered = orders.filter(o => o.status === 'Delivered').length
      const activeProtocols = protocols.filter(p => p.active !== false).length
      const lowStock = stockpile.filter(s => Number(s.quantity) <= 1).length
      const supplementCount = supplements.length
      const totalSpend = orders.reduce((acc, o) => acc + (Number(String(o.cost).replace(/[^0-9.]/g,'')) || 0), 0)
      const out = []
      if (delivered >= 1) out.push({ name: 'First Delivery' })
      if (activeProtocols >= 3) out.push({ name: 'Protocol Planner' })
      if (lowStock === 0 && stockpile.length > 0) out.push({ name: 'Well Stocked' })
      if (supplementCount >= 5) out.push({ name: 'Supplement Scholar' })
      if (totalSpend >= 5000) out.push({ name: 'The Homeostat' })
      if (totalSpend >= 10000) out.push({ name: 'The Investor' })
      setBadges(out)

      const prog = []
      if (isTester) prog.push({ name: 'The Catalyst' })
      setProgramBadges(prog)
    } catch {}
  }, [])
  return (
    <div className="rounded border bg-white p-4 content-card" style={{ borderColor: theme.border }}>
      <div className="font-semibold mb-2" style={{ color: theme.primaryDark }}>Badges</div>
      {badges.length === 0 ? (
        <div className="text-sm text-gray-500">No badges yet. Keep using the app to earn badges.</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {badges.map(b => (
            <div key={b.name} className="px-3 py-2 rounded-full text-xs font-semibold" style={{ backgroundColor: theme.accent, color: theme.accentText }}>{b.name}</div>
          ))}
        </div>
      )}
      <div className="mt-4">
        <div className="font-semibold mb-2" style={{ color: theme.primaryDark }}>Program Badges</div>
        {programBadges.length === 0 ? (
          <div className="text-sm text-gray-500">No program badges. (Tester-only)</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {programBadges.map(b => (
              <div key={b.name} className="px-3 py-2 rounded-full text-xs font-semibold" style={{ backgroundColor: theme.accent, color: theme.accentText }}>{b.name}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}