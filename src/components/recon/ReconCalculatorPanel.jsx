import React, { useMemo, useState } from 'react'
import TextInput from '../common/inputs/TextInput'

export default function ReconCalculatorPanel({ theme, vendorList = [], onTransfer }) {
  const [calc, setCalc] = useState({ vendor: '', water: '2', deliveryMethod: 'syringe', penColor: '' })
  const [peptides, setPeptides] = useState([{ id: 1, name: '', mg: '10', dose: '250' }])
  const [vendorQuery, setVendorQuery] = useState('')

  const vendorSuggestions = useMemo(() => {
    const q = vendorQuery.toLowerCase()
    if (!q) return []
    return Array.from(new Set(vendorList)).filter(v => v.toLowerCase().includes(q)).slice(0, 5)
  }, [vendorQuery, vendorList])

  const result = useMemo(() => {
    const totalMg = peptides.reduce((sum, p) => sum + (Number(p.mg) || 0), 0)
    const water = Number(calc.water) || 0
    const totalDose = peptides.reduce((sum, p) => sum + (Number(p.dose) || 0), 0)
    if (!totalMg || !water || !totalDose) return { units: 0, dosesPerVial: 0, concentration: 0, totalDose: 0 }
    const totalMcg = totalMg * 1000
    const concentration = totalMcg / water
    const units = Math.round((totalDose / concentration) * 100)
    const dosesPerVial = Math.floor(totalMcg / totalDose)
    return { units, dosesPerVial, concentration, totalDose }
  }, [peptides, calc.water])

  const addPeptide = () => setPeptides(prev => [...prev, { id: Math.max(...prev.map(x => x.id), 0) + 1, name: '', mg: '10', dose: '250' }])
  const removePeptide = (id) => setPeptides(prev => prev.length > 1 ? prev.filter(p => p.id !== id) : prev)

  const save = () => {
    onTransfer?.({
      vendor: calc.vendor,
      water: calc.water,
      deliveryMethod: calc.deliveryMethod,
      penColor: calc.penColor,
      units: result.units,
      dosesPerVial: result.dosesPerVial,
      concentration: result.concentration,
      totalDose: result.totalDose,
      peptides: peptides.map(p => ({ peptide: p.name, mg: p.mg, dose: p.dose }))
    })
  }

  return (
    <div className="p-6 rounded-2xl content-card border" style={{ background: `linear-gradient(180deg, ${theme.accent}22, ${theme.white})`, borderColor: theme.border }}>
      <h3 className="h3 mb-4 text-center" style={{ color: theme.primaryDark }}>Peptide Calculator</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
        <div className="relative">
          <TextInput label="Vendor" value={calc.vendor || ''} onChange={v => { setCalc({ ...calc, vendor: v }); setVendorQuery(v) }} placeholder="Vendor" theme={theme} />
          {vendorSuggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white rounded-md border shadow" style={{ borderColor: theme.border }}>
              {vendorSuggestions.map(v => (
                <button key={v} type="button" className="w-full text-left px-3 py-2 hover:bg-gray-50" onClick={() => { setCalc({ ...calc, vendor: v }); setVendorQuery(v) }}>
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>
        <TextInput label="Water (mL)" value={calc.water} onChange={v => setCalc({ ...calc, water: v })} placeholder="2" theme={theme} />
      </div>

      <div className="space-y-3 mb-4">
        {peptides.map((p, idx) => (
          <div key={p.id} className="border rounded-lg p-3" style={{ borderColor: theme.border }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
              <TextInput label={`Peptide ${idx + 1}`} value={p.name} onChange={v => setPeptides(prev => prev.map(x => x.id === p.id ? { ...x, name: v } : x))} placeholder="BPC-157" theme={theme} />
              <TextInput label="mg" value={p.mg} onChange={v => setPeptides(prev => prev.map(x => x.id === p.id ? { ...x, mg: v } : x))} placeholder="10" theme={theme} />
              <TextInput label="Dose (mcg)" value={p.dose} onChange={v => setPeptides(prev => prev.map(x => x.id === p.id ? { ...x, dose: v } : x))} placeholder="250" theme={theme} />
            </div>
            {peptides.length > 1 && (
              <div className="mt-2 text-right">
                <button className="px-2 py-1 rounded text-xs" style={{ backgroundColor: theme.accent, color: theme.accentText }} onClick={() => removePeptide(p.id)}>Remove</button>
              </div>
            )}
          </div>
        ))}
        <button className="px-3 py-2 rounded-md text-sm font-semibold border-dashed border" style={{ borderColor: theme.primary, color: theme.primary }} onClick={addPeptide}>+ Add Another Peptide</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm mb-4">
        <div className="p-3 rounded-lg" style={{ backgroundColor: '#E7F6EC' }}><div className="font-medium">Units per dose</div><div className="text-lg font-bold">{result.units}</div></div>
        <div className="p-3 rounded-lg" style={{ backgroundColor: '#FEF3C7' }}><div className="font-medium">Doses per vial</div><div className="text-lg font-bold">{result.dosesPerVial}</div></div>
        <div className="p-3 rounded-lg" style={{ backgroundColor: '#E0F2FE' }}><div className="font-medium">Concentration</div><div className="text-lg font-bold">{Math.round(result.concentration)} mcg/mL</div></div>
      </div>

      <div className="mb-4">
        <label className="block text-sm font-semibold mb-2" style={{ color: theme.text }}>Delivery Method</label>
        <div className="flex items-center gap-2">
          <button onClick={() => setCalc({ ...calc, deliveryMethod: 'syringe' })} className={`px-3 py-2 rounded-md text-sm font-semibold ${calc.deliveryMethod === 'syringe' ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`} style={calc.deliveryMethod === 'syringe' ? { backgroundColor: theme.primary } : {}}>Syringe</button>
          <button onClick={() => setCalc({ ...calc, deliveryMethod: 'pen' })} className={`px-3 py-2 rounded-md text-sm font-semibold ${calc.deliveryMethod === 'pen' ? 'text-white' : 'text-gray-700 hover:bg-gray-100'}`} style={calc.deliveryMethod === 'pen' ? { backgroundColor: theme.primary } : {}}>Pen</button>
          {calc.deliveryMethod === 'pen' && (
            <div className="flex items-center gap-1 ml-2">
              {['Red','Blue','Green','Purple','Orange','Pink','Yellow','Black'].map(c => (
                <button key={c} title={c} onClick={() => setCalc({ ...calc, penColor: c })} className={`w-5 h-5 rounded-full border ${calc.penColor === c ? 'ring-2 ring-offset-1' : ''}`} style={{ backgroundColor: colorToHex(c), borderColor: '#e5e7eb' }} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button onClick={save} className="px-3 py-2 rounded-md text-sm font-semibold" style={{ backgroundColor: theme.primary, color: theme.white }}>Add to List</button>
      </div>
    </div>
  )
}

function colorToHex(name) {
  const map = { Red: '#ef4444', Blue: '#3b82f6', Green: '#10b981', Purple: '#8b5cf6', Orange: '#f97316', Pink: '#ec4899', Yellow: '#f59e0b', Black: '#000000' }
  return map[name] || '#e5e7eb'
}


