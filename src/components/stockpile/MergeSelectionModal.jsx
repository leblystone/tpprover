import React, { useState } from 'react';
import Modal from '../common/Modal';
import { Merge, Package, Beaker } from 'lucide-react';

export default function MergeSelectionModal({ 
  open, 
  onClose, 
  theme, 
  sourceGroup,
  availableGroups = [],
  onSelectGroup = () => {}
}) {
  const [selectedGroup, setSelectedGroup] = useState(null);

  if (!open || !sourceGroup) return null;

  const handleConfirm = () => {
    if (selectedGroup) {
      onSelectGroup(sourceGroup, selectedGroup);
      onClose();
    }
  };

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      theme={theme}
      title="Merging Stockpile"
      maxWidth="max-w-xl"
    >
      <div className="p-4 space-y-4">
        {/* Source Group Info */}
        <div className="p-2 rounded-lg border" style={{ borderColor: theme.primary, backgroundColor: theme.primary + '10' }}>
          <div className="flex items-center gap-2">
            <Package size={14} style={{ color: theme.primary }} />
            <span className="font-medium text-sm" style={{ color: theme.text }}>
              {sourceGroup.name}
            </span>
            <span className="text-xs" style={{ color: theme.textLight }}>
              ({sourceGroup.totalMg} {sourceGroup.unit || 'mg'} • {sourceGroup.totalVials} vials)
            </span>
          </div>
        </div>

        {/* Available Groups */}
        <div className="space-y-2">
          {availableGroups.length === 0 ? (
            <div className="p-3 rounded-lg text-center" style={{ backgroundColor: theme.border + '20' }}>
              <p className="text-xs" style={{ color: theme.textLight }}>
                No other groups available to merge with.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {availableGroups.map((group) => (
                <button
                  key={group.groupKey}
                  onClick={() => setSelectedGroup(group)}
                  className={`w-full p-2 rounded border text-left transition-all ${
                    selectedGroup?.groupKey === group.groupKey 
                      ? 'ring-1 ring-offset-1' 
                      : 'hover:shadow-sm'
                  }`}
                  style={{
                    borderColor: selectedGroup?.groupKey === group.groupKey 
                      ? theme.primary 
                      : theme.border,
                    backgroundColor: selectedGroup?.groupKey === group.groupKey 
                      ? theme.primary + '10' 
                      : theme.cardBackground,
                    ringColor: theme.primary
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Package size={12} style={{ color: theme.primary }} />
                        <span className="font-medium text-sm truncate" style={{ color: theme.text }}>
                          {group.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs mt-0.5" style={{ color: theme.textLight }}>
                        <span>{group.totalMg} {group.unit || 'mg'}</span>
                        <span>{group.totalVials} vials</span>
                      </div>
                    </div>
                    {selectedGroup?.groupKey === group.groupKey && (
                      <div className="ml-2 flex-shrink-0">
                        <div 
                          className="w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ backgroundColor: theme.primary }}
                        >
                          <span className="text-white text-[10px]">✓</span>
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 justify-end pt-3 border-t" style={{ borderColor: theme.border }}>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-sm hover:opacity-90 transition-all"
            style={{ borderColor: theme.border, color: theme.text, border: `1px solid ${theme.border}` }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedGroup}
            className="px-4 py-1.5 rounded text-sm hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: selectedGroup ? theme.primary : theme.border, 
              color: selectedGroup ? theme.textOnPrimary : theme.text 
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </Modal>
  );
}

