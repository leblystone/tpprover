import React, { useEffect, useMemo, useState } from 'react'
 import { themes, defaultThemeName } from '../theme/themes'
 import TextInput from '../components/common/inputs/TextInput'
import { Droplet, Edit, Trash2 } from 'lucide-react'
import VendorSuggestInput from '../components/vendors/VendorSuggestInput'
import ReconCalculatorPanel from '../components/recon/ReconCalculatorPanel'

function calculateRecon({ mg, water, dose }) {
  const mgNum = Number(mg) || 0
  const waterMl = Number(water) || 0
  const doseMcg = Number(dose) || 0
  if (mgNum <= 0 || waterMl <= 0 || doseMcg <= 0) return { unitsPerDose: 0, dosesPerVial: 0, concentration: 0 }
  // Assume 1 mL = 100 insulin units
  const totalMcg = mgNum * 1000
  const concentration = totalMcg / waterMl // mcg per mL
  const unitsPerDose = (doseMcg / concentration) * 100 // convert mL to insulin units
  const dosesPerVial = Math.floor(totalMcg / doseMcg)
  return { unitsPerDose, dosesPerVial, concentration }
}

export default function Recon() {
  const [themeName] = useState(defaultThemeName)
  const theme = themes[themeName]
  const [reconList, setReconList] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [stockpile, setStockpile] = useState([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('tpprover_stockpile'); if (raw) setStockpile(JSON.parse(raw))
      const saved = localStorage.getItem('tpprover_recon'); if (saved) setReconList(JSON.parse(saved))
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('tpprover_recon', JSON.stringify(reconList)) } catch {}
  }, [reconList])

  return (
    <section className="space-y-4">
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded border bg-white p-4 content-card" style={{ borderColor: theme.border }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="h3" style={{ color: theme.primaryDark }}>Reconstitution Entries</h3>
            <button className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.white }} onClick={() => {
              const id = Date.now()
              setReconList(prev => ([{ id, peptide: '', vendor: '', mg: '', water: '', dose: '', date: new Date().toISOString().slice(0,10), dosesPerVial: '', deliveryMethod: 'syringe', penColor: '' }, ...prev]))
              setEditingId(id)
            }}>Add Entry</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-gray-500">
                  <th className="py-2 pr-3">Peptide</th>
                  <th className="py-2 pr-3">Vendor</th>
                  <th className="py-2 pr-3">mg</th>
                  <th className="py-2 pr-3">Water (mL)</th>
                  <th className="py-2 pr-3">Dose (mcg)</th>
                  <th className="py-2 pr-3">Units</th>
                  <th className="py-2 pr-3">Doses/Vial</th>
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {reconList.map(item => {
                  const calc = calculateRecon({ mg: item.mg, water: item.water, dose: item.dose })
                  // cost per dose from Orders (local)
                  let costPerDose = ''
                  try {
                    const rawOrders = localStorage.getItem('tpprover_orders')
                    const all = rawOrders ? JSON.parse(rawOrders) : []
                    const match = all.find(o => (o.peptide || '').toLowerCase() === (item.peptide || '').toLowerCase() && (o.vendor || '').toLowerCase() === (item.vendor || '').toLowerCase())
                    if (match && calc.dosesPerVial > 0 && match.cost) {
                      costPerDose = `$${(Number(match.cost) / calc.dosesPerVial).toFixed(2)}`
                    }
                  } catch {}
                  const isEditing = editingId === item.id
                  return (
                    <tr key={item.id} className="border-t" style={{ borderColor: theme.border }}>
                      <td className="py-2 pr-3">{isEditing ? (
                        <div className="relative">
                          <input className="w-full p-1 rounded border text-sm" style={{ borderColor: theme.border }} value={item.peptide} onChange={e => setReconList(prev => prev.map(r => r.id === item.id ? { ...r, peptide: e.target.value } : r))} />
                          {item.peptide && (
                            <div className="absolute z-10 bg-white border mt-1 rounded shadow w-full" style={{ borderColor: theme.border }}>
                              {stockpile.filter(s => s.name.toLowerCase().includes(item.peptide.toLowerCase())).slice(0,5).map(s => (
                                <button key={s.id} className="w-full text-left px-2 py-1 hover:bg-gray-50" onClick={() => setReconList(prev => prev.map(r => r.id === item.id ? { ...r, peptide: s.name, mg: s.mg, vendor: s.vendor } : r))}>{s.name} • {s.mg}mg</button>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : item.peptide}</td>
                       <td className="py-2 pr-3">{isEditing ? (
                         <VendorSuggestInput label="" value={item.vendor} onChange={v => setReconList(prev => prev.map(r => r.id === item.id ? { ...r, vendor: v } : r))} placeholder="Vendor" theme={theme} />
                       ) : item.vendor}</td>
                      <td className="py-2 pr-3">{isEditing ? <input type="number" className="w-full p-1 rounded border text-sm" style={{ borderColor: theme.border }} value={item.mg} onChange={e => setReconList(prev => prev.map(r => r.id === item.id ? { ...r, mg: e.target.value } : r))} /> : item.mg}</td>
                      <td className="py-2 pr-3">{isEditing ? <input type="number" className="w-full p-1 rounded border text-sm" style={{ borderColor: theme.border }} value={item.water} onChange={e => setReconList(prev => prev.map(r => r.id === item.id ? { ...r, water: e.target.value } : r))} /> : item.water}</td>
                      <td className="py-2 pr-3">{isEditing ? <input type="number" className="w-full p-1 rounded border text-sm" style={{ borderColor: theme.border }} value={item.dose} onChange={e => setReconList(prev => prev.map(r => r.id === item.id ? { ...r, dose: e.target.value } : r))} /> : item.dose}</td>
                      <td className="py-2 pr-3 text-sm">{calc.unitsPerDose ? <span className="status-info">{calc.unitsPerDose.toFixed(0)} u</span> : ''}</td>
                      <td className="py-2 pr-3 text-sm">{calc.dosesPerVial ? <span className="status-active">{calc.dosesPerVial} doses</span> : ''} {costPerDose && <span className="ml-1 status-pending">{costPerDose}</span>}</td>
                      <td className="py-2 pr-3">{isEditing ? <input type="date" className="w-full p-1 rounded border text-sm" style={{ borderColor: theme.border }} value={item.date} onChange={e => setReconList(prev => prev.map(r => r.id === item.id ? { ...r, date: e.target.value } : r))} /> : item.date}</td>
                      <td className="py-2 pr-0 text-right">
                        {isEditing ? (
                          <button className="px-3 py-1 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.white }} onClick={() => setEditingId(null)}>Save</button>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button className="p-1 rounded hover:bg-gray-100" onClick={() => setEditingId(item.id)}><Edit className="h-4 w-4" /></button>
                            <button className="p-1 rounded hover:bg-gray-100" onClick={() => setReconList(prev => prev.filter(r => r.id !== item.id))}><Trash2 className="h-4 w-4" /></button>
                            <button className="p-1 rounded hover:bg-gray-100" onClick={() => window.print()}>Print</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div>
          <ReconCalculatorPanel theme={theme} onTransfer={(data) => {
            const id = Date.now()
            // Add entry
            setReconList(prev => ([{ id, ...data, date: new Date().toISOString().slice(0,10) }, ...prev]))
            // Decrement stockpile for each peptide used
            try {
              const raw = localStorage.getItem('tpprover_stockpile')
              const stock = raw ? JSON.parse(raw) : []
              const updated = stock.map(s => ({ ...s }))
              for (const p of (data.peptides || [])) {
                const idx = updated.findIndex(s => (s.name || '').toLowerCase() === (p.peptide || '').toLowerCase() && String(s.mg) === String(p.mg))
                if (idx >= 0 && Number(updated[idx].quantity) > 0) {
                  updated[idx].quantity = (Number(updated[idx].quantity) || 0) - 1
                }
              }
              localStorage.setItem('tpprover_stockpile', JSON.stringify(updated))
            } catch {}
          }} />
        </div>
      </div>
    </section>
  )
}


