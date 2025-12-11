 import React from 'react'
import ExpandableTooltip from '../ui/ExpandableTooltip'
import { WIDGET_TOOLTIPS } from '../../utils/widgetTooltips'

export default function PendingVendorsView({ vendors, theme, onViewAll, onComplete }) {
  if (!vendors || vendors.length === 0) return (
    <div className="p-4 rounded-xl content-card w-full" style={{ backgroundColor: theme.white }}>
      <h3 className="text-base font-semibold mb-3 border-b pb-2 flex items-center justify-between" style={{ color: theme.primaryDark, borderColor: theme.border }}>
        <span>Pending Vendors</span>
        <ExpandableTooltip content={WIDGET_TOOLTIPS.pending_vendors} theme={theme} position="left" />
      </h3>
      <p className="text-sm">No pending vendors to complete.</p>
    </div>
  )

  return (
    <div className="h-full flex flex-col p-4 rounded-xl content-card w-full" style={{ backgroundColor: theme.white }}>
      <h3 className="text-base font-semibold mb-3 border-b pb-2 flex-shrink-0 flex items-center justify-between" style={{ color: theme.primaryDark, borderColor: theme.border }}>
        <span>Pending Vendors</span>
        <ExpandableTooltip content={WIDGET_TOOLTIPS.pending_vendors} theme={theme} position="left" />
      </h3>
      <div className="flex-1 overflow-y-auto min-h-0 space-y-2">
        {vendors.map((vendor, index) => (
          <div key={vendor.id || `vendor-${index}`} className="flex items-center justify-between p-2 rounded-lg border" style={{ borderColor: theme.border }}>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <div>
                <div className="font-semibold text-sm" style={{ color: theme.text }}>{vendor.name}</div>
                <div className="text-xs" style={{ color: theme.textLight }}>
                  Auto-created from {vendor.notes?.replace('Auto-created from ', '') || 'unknown source'}
                </div>
              </div>
            </div>
            <button 
              onClick={() => onComplete?.(vendor)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
              style={{ backgroundColor: theme.primary, color: '#ffffff' }}
            >
              Complete
            </button>
          </div>
        ))}
      </div>
      <button 
        onClick={onViewAll}
        className="mt-3 text-sm text-center hover:underline transition-all duration-200 flex-shrink-0 cursor-pointer"
        style={{ color: theme.primary }}
      >
        View All Vendors
      </button>
    </div>
  )
}


