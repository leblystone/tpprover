 import React from 'react'

export default function PendingVendorsView({ vendors, theme, onViewAll, onComplete }) {
  if (!vendors || vendors.length === 0) return (
    <div className="p-4 rounded-xl content-card w-full" style={{ backgroundColor: theme.white }}>
      <h3 className="text-base font-semibold mb-3 border-b pb-2" style={{ color: theme.primaryDark, borderColor: theme.border }}>Pending Vendors</h3>
      <p className="text-sm">No pending vendors to complete.</p>
    </div>
  )

  return (
    <div className="p-4 rounded-xl content-card w-full" style={{ backgroundColor: theme.white }}>
      <h3 className="text-base font-semibold mb-3 border-b pb-2" style={{ color: theme.primaryDark, borderColor: theme.border }}>Pending Vendors</h3>
      <div className="space-y-2">
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
              style={{ backgroundColor: theme.primary, color: theme.white }}
            >
              Complete
            </button>
          </div>
        ))}
      </div>
      <button 
        onClick={onViewAll}
        className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 w-full btn-hover"
        style={{ backgroundColor: theme.primary, color: theme.white }}
      >
        View All Vendors
      </button>
    </div>
  )
}


