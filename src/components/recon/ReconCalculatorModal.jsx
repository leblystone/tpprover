 import React, { useMemo, useState } from 'react'
 import Modal from '../common/Modal'
 import TextInput from '../common/inputs/TextInput'

function calculateRecon({ mg, water, dose }) {
  const mgNum = Number(mg) || 0
  const waterMl = Number(water) || 0
  const doseMcg = Number(dose) || 0
  if (mgNum <= 0 || waterMl <= 0 || doseMcg <= 0) return { unitsPerDose: 0, dosesPerVial: 0, concentration: 0 }
  const totalMcg = mgNum * 1000
  const concentration = totalMcg / waterMl // mcg/mL
  const unitsPerDose = (doseMcg / concentration) * 100 // insulin units
  const dosesPerVial = Math.floor(totalMcg / doseMcg)
  return { unitsPerDose, dosesPerVial, concentration }
}

export default function ReconCalculatorModal({ open, onClose, theme, onTransfer }) {
  const [form, setForm] = useState({ peptide: '', mg: '', water: '', dose: '' })
  const result = useMemo(() => calculateRecon(form), [form])
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Reconstitution Calculator"
      theme={theme}
      footer={(
        <>
          <button onClick={onClose} className="px-3 py-2 rounded-md border" style={{ borderColor: theme?.border }}>Close</button>
          <button onClick={() => onTransfer?.(form)} className="px-3 py-2 rounded-md" style={{ backgroundColor: theme?.primary, color: theme?.white }}>Use Values</button>
        </>
      )}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <TextInput label="Peptide" value={form.peptide} onChange={v => setForm({ ...form, peptide: v })} placeholder="BPC-157" theme={theme} />
        <TextInput label="Vial mg" value={form.mg} onChange={v => setForm({ ...form, mg: v })} placeholder="10" theme={theme} />
        <TextInput label="Bacteriostatic Water (mL)" value={form.water} onChange={v => setForm({ ...form, water: v })} placeholder="2" theme={theme} />
        <TextInput label="Dose (mcg)" value={form.dose} onChange={v => setForm({ ...form, dose: v })} placeholder="250" theme={theme} />
      </div>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div>
          <div className="font-medium">Units per dose</div>
          <div>{result.unitsPerDose.toFixed(1)} units</div>
        </div>
        <div>
          <div className="font-medium">Doses per vial</div>
          <div>{result.dosesPerVial}</div>
        </div>
        <div>
          <div className="font-medium">Concentration</div>
          <div>{result.concentration.toFixed(0)} mcg/mL</div>
        </div>
      </div>
    </Modal>
  )
}


