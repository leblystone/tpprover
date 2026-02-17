import React from 'react'
import Modal from '../common/Modal'
import { Clock, AlertTriangle, Calendar, ClipboardList, Lightbulb } from 'lucide-react'

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
      <div className="p-5 max-w-md mx-auto">
        {/* Compact Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" 
               style={{ backgroundColor: hasImpact ? theme.warning + '15' : theme.primary + '15' }}>
            {hasImpact ? (
              <AlertTriangle size={16} style={{ color: theme.warning }} />
            ) : (
              <Clock size={16} style={{ color: theme.primary }} />
            )}
          </div>
          <h2 className="text-lg font-semibold" style={{ color: theme.text }}>
            Change Time Zone
          </h2>
        </div>

        {/* Compact Timezone Info */}
        <div className="space-y-1.5 mb-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-60" style={{ color: theme.text }}>From:</span>
            <span className="font-mono font-medium" style={{ color: theme.text }}>
              {oldTimezone}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs opacity-60" style={{ color: theme.text }}>To:</span>
            <span className="font-mono font-medium" style={{ color: theme.text }}>
              {newTimezone}
            </span>
          </div>
        </div>

        {/* Compact Impact Warning */}
        {hasImpact && (
          <div className="px-3 py-2.5 rounded-xl mb-3" 
               style={{ backgroundColor: theme.warning + '10', border: `1px solid ${theme.warning}20` }}>
            <div className="flex items-start gap-2">
              <Calendar size={14} className="mt-0.5 flex-shrink-0" style={{ color: theme.warning }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold mb-1 flex items-center gap-1" style={{ color: theme.warning }}>
                  <ClipboardList size={12} /> Protocol Schedule Impact
                </p>
                <p className="text-xs leading-relaxed" style={{ color: theme.text }}>
                  This timezone change will shift your schedule by <strong>{hoursDifference} hours</strong>.
                </p>
                <p className="text-xs mt-1.5 opacity-80" style={{ color: theme.text }}>
                  <strong>{affectedProtocols}</strong> active protocol{affectedProtocols !== 1 ? 's' : ''} will be affected:
                </p>
                <ul className="text-xs mt-1 ml-3 space-y-0.5" style={{ color: theme.text }}>
                  {protocolNames?.map((name, index) => (
                    <li key={index} className="opacity-70">
                      • {name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Compact Action Buttons */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[0.98] active:scale-95"
            style={{ 
              borderColor: theme.border,
              border: `1.5px solid ${theme.border}`,
              color: theme.text,
              backgroundColor: theme.secondary
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-3 py-2.5 rounded-xl font-semibold text-sm transition-all hover:scale-[0.98] active:scale-95"
            style={{ 
              backgroundColor: hasImpact ? theme.warning : theme.primary, 
              color: 'white'
            }}
          >
            Change Anyway
          </button>
        </div>

        {/* Compact Tip */}
        {hasImpact && (
          <p className="text-[10px] text-center opacity-60 flex items-center justify-center gap-1" style={{ color: theme.text }}>
            <Lightbulb size={10} /> Tip: You may want to review your protocol schedules after changing timezones.
          </p>
        )}
      </div>
    </Modal>
  )
}
