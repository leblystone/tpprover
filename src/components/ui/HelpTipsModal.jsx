import React from 'react'
import Modal from '../common/Modal'

const tips = {
  dashboard: [
    'This is your central hub. View "Today\'s Research" for a list of your scheduled peptides and supplements for the day.',
    'Keep an eye on "Incoming Peptides" to track your orders that are in transit.',
    'Use the quick action buttons ("New Order", "Recon Calculator", etc.) to jump directly to key tasks.',
    'Your earned "Badges" and "Upcoming Buys" are displayed at the bottom for quick reference.',
  ],
  orders: [
    'Track all your orders from placement to delivery, including domestic, international, and group buys.',
    'Add multiple peptides to a single order, each with its own price and quantity.',
    'When you mark an order as "Delivered", its items are automatically added to your Stockpile for seamless inventory management.',
    'Attach files like receipts or lab results directly to an order for your records.',
  ],
  stockpile: [
    'Manage your entire inventory, organized by peptide and vendor.',
    'Items from delivered orders automatically appear here.',
    'Use the 💧 icon to mark a specific batch as "in use" for reconstitution.',
    'Click the 💧 icon next to a peptide name to send its details directly to the Peptide Calculator.',
  ],
  protocols: [
    'Define detailed plans for your research, including single peptides or complex stacks with multiple peptides.',
    'Set specific dosages, frequencies (daily, weekly, cycle), and durations for each peptide in a protocol.',
    'Use the "Start Protocol" button to activate a protocol and schedule all its doses on your calendar automatically.',
    'Protocols can be shared with others as an image or a direct link via the share icon.',
  ],
  calendar: [
    'Visualize your entire research schedule. Doses from your active protocols and scheduled group buys appear automatically.',
    'Switch between Month and Week views for different levels of detail.',
    'In the Week view, click on a scheduled dose to mark it as complete.',
    'Add personal notes to any day by clicking the notes icon.',
  ],
  research: [
    'Log your daily supplements, including dosage, schedule (AM/PM), and delivery method.',
    'Set and track your research goals to stay focused on your objectives.',
    'Record your body metrics, including weight, body fat, and subjective measures like sleep, energy, and mood.',
    'Use the "Analytics" tab to visualize your spending, protocol compliance, and other key data points.',
    'Earn badges for your achievements and contributions within the app.',
  ],
  vendors: [
    'Build a personal directory of your vendors and suppliers.',
    'Store contact information, payment methods they accept, and personal notes.',
    'Label vendors with qualities (e.g., "Good Communication", "Fast Shipping") to track your experiences.',
    'Share your trusted sources with those you trust!',
  ],
  imports: [
    'Review parsed rows, edit fields, and Accept/Reject per row or in bulk.',
  ],
  settings: [
    'Customize your experience by switching between different color themes.',
    'Use the "Backup & Export" options to save all your data to a file on your device.',
    'The "Import Backup" feature allows you to restore your data from a previously saved backup file.',
    '"Clear App Data" provides tools to reset specific parts of your data or the entire application for a fresh start.',
  ],
  recon: [
    'Calculate dosages for one or more peptides in a single reconstitution.',
    'Supports both standard insulin syringes (U-100, 1mL) and dosage pens.',
    'You can select a color for your pens to help with organization.',
    'Use the "Save Calculation" button to add the reconstituted vial to a persistent list for tracking.',
    'Click the 💧 icon on a stockpile item to pre-fill the calculator with that peptide\'s details.',
  ],
  announcements: [
    'Stay informed with the latest news, feature updates, and messages from The Pep Planner team.',
    'Use the filters to sort through different categories of announcements.',
  ],
  account: [
    'Manage your profile and security settings.',
    'View your current subscription plan and upgrade if you choose.',
    'Access your billing history and manage payment methods.',
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


