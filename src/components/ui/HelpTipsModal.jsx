import React from 'react'
import Modal from '../common/Modal'

const tips = {
  dashboard: [
    'Use the widgets to quickly create orders, vendors, protocols, and open the recon calculator.',
    'Click Incoming Peptides → View Orders to jump to the Orders panel.',
  ],
  orders: [
    'Use New Order to add an order. Mark Shipped/Delivered in the order modal to update status and lead-time.',
    'Delivered orders increment Stockpile automatically (match by peptide, mg, vendor).',
  ],
  stockpile: [
    'Track peptide inventory; set low-stock thresholds per item.',
    'Import/export CSV to bulk manage stock.',
  ],
  protocols: [
    'Toggle Active, set date ranges and time slots. Start/Complete adjusts calendar indicators.',
    'Slots/day render into the weekly calendar; click to mark completions.',
  ],
  calendar: [
    'Month shows indicators; Week supports hourly view and per-slot toggles.',
    'Click a day to add notes or open the Day view for full editing.',
  ],
  research: [
    'Add supplements with schedules; compliance shows over the last 7 days.',
    'Analytics widgets summarize delivered orders, protocols, and spend.',
  ],
  vendors: [
    'Vendor KPIs show spend and lead-time; reliability badge reflects performance.',
  ],
  imports: [
    'Review parsed rows, edit fields, and Accept/Reject per row or in bulk.',
  ],
  settings: [
    'Switch theme, backup/export, import backups. PWA install appears when supported.',
  ],
}

export default function HelpTipsModal({ open, onClose, seg, theme }) {
  const list = tips[seg] || ['Explore this panel.']
  return (
    <Modal open={open} onClose={onClose} title="Quick Help" theme={theme} footer={(<button className="px-3 py-2 rounded-md" style={{ backgroundColor: theme?.primary, color: theme?.white }} onClick={onClose}>Got it</button>)}>
      <ul className="list-disc pl-5 space-y-2 text-sm" style={{ color: theme?.text }}>
        {list.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </Modal>
  )
}


