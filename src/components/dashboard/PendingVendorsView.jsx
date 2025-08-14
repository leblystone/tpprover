 import React from 'react'

export default function PendingVendorsView({ vendors, theme, onViewAll, onComplete }) {
  if (!vendors || vendors.length === 0) return (
    <div className="p-8 rounded-xl content-card w-full" style={{ backgroundColor: theme.white }}>
      <h3 className="h3 mb-6 border-b pb-3" style={{ color: theme.primaryDark, borderColor: theme.border }}>Pending Vendors</h3>
      <p>No pending vendors to complete.</p>
    </div>
  )

  return (
    <div className="p-8 rounded-xl content-card w-full" style={{ backgroundColor: theme.white }}>
      <h3 className="h3 mb-6 border-b pb-3" style={{ color: theme.primaryDark, borderColor: theme.border }}>Pending Vendors</h3>
      <div className="space-y-4">
        {vendors.map((vendor) => (
          <div key={vendor.id} className="flex items-center justify-between p-4 rounded-lg border" style={{ borderColor: theme.border }}>
            <div className="flex items-center space-x-3">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div>
                <div className="font-semibold" style={{ color: theme.text }}>{vendor.name}</div>
                <div className="text-sm" style={{ color: theme.textLight }}>
                  Auto-created from {vendor.notes?.replace('Auto-created from ', '') || 'unknown source'}
                </div>
              </div>
            </div>
            <button 
              onClick={() => onComplete?.(vendor)}
              className="px-4 py-2 rounded-md text-sm font-semibold transition-colors"
              style={{ backgroundColor: theme.primary, color: theme.white }}
            >
              Complete
            </button>
          </div>
        ))}
      </div>
      <button 
        onClick={onViewAll}
        className="mt-6 px-6 py-3 rounded-lg font-semibold transition-all duration-200 w-full btn-hover"
        style={{ backgroundColor: theme.primary, color: theme.white }}
      >
        View All Vendors
      </button>
    </div>
  )
}


