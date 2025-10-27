import React from 'react'
import Modal from '../common/Modal'
import { Clock, AlertTriangle, Calendar } from 'lucide-react'

export default function TimezoneChangeModal({ 
  open, 
  onClose, 
  onConfirm, 
  oldTimezone, 
  newTimezone, 
  impactData = {}, 
  theme 
}) {
  const { hasImpact, hoursDifference, affectedProtocols, protocolNames } = impactData

  return (
    <Modal open={open} onClose={onClose} theme={theme}>
      <div className="p-6 max-w-md mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 rounded-lg" style={{ backgroundColor: hasImpact ? theme.warning + '20' : theme.accent + '20' }}>
            {hasImpact ? (
              <AlertTriangle size={20} style={{ color: theme.warning }} />
            ) : (
              <Clock size={20} style={{ color: theme.accent }} />
            )}
          </div>
          <h2 className="text-xl font-semibold" style={{ color: theme.text }}>
            Change Time Zone
          </h2>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span style={{ color: theme.textLight }}>From:</span>
            <span style={{ color: theme.text }} className="font-mono text-sm">
              {oldTimezone}
            </span>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <span style={{ color: theme.textLight }}>To:</span>
            <span style={{ color: theme.text }} className="font-mono text-sm">
              {newTimezone}
            </span>
          </div>

          {hasImpact && (
            <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: theme.warning + '10', border: `1px solid ${theme.warning}30` }}>
              <div className="flex items-center gap-2 mb-2">
                <Calendar size={16} style={{ color: theme.warning }} />
                <span className="font-medium" style={{ color: theme.warning }}>
                  Protocol Schedule Impact
                </span>
              </div>
              <p className="text-sm" style={{ color: theme.text }}>
                This timezone change will shift your schedule by <strong>{hoursDifference} hours</strong>.
              </p>
              <p className="text-sm mt-2" style={{ color: theme.textLight }}>
                <strong>{affectedProtocols}</strong> active protocol{affectedProtocols !== 1 ? 's' : ''} will be affected:
              </p>
              <ul className="text-sm mt-2 ml-4" style={{ color: theme.textLight }}>
                {protocolNames?.map((name, index) => (
                  <li key={index} className="list-disc">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {!hasImpact && (
            <div className="p-3 rounded-lg mb-4" style={{ backgroundColor: theme.success + '10', border: `1px solid ${theme.success}30` }}>
              <p className="text-sm" style={{ color: theme.text }}>
                ✅ No active protocols will be affected by this change.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded-lg border transition-colors"
            style={{ 
              borderColor: theme.border, 
              color: theme.text,
              backgroundColor: theme.secondary
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 rounded-lg transition-colors"
            style={{ 
              backgroundColor: hasImpact ? theme.warning : theme.primary, 
              color: 'white'
            }}
          >
            {hasImpact ? 'Change Anyway' : 'Confirm Change'}
          </button>
        </div>

        {hasImpact && (
          <p className="text-xs mt-3 text-center" style={{ color: theme.textLight }}>
            💡 Tip: You may want to review your protocol schedules after changing timezones.
          </p>
        )}
      </div>
    </Modal>
  )
}
