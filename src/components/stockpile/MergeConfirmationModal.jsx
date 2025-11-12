import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { AlertTriangle, Merge, Package, Beaker, ArrowRight } from 'lucide-react';

export default function MergeConfirmationModal({ 
  open, 
  onClose, 
  theme, 
  mergeData = { source: null, target: null },
  onConfirm = () => {},
  onBack = () => {}
}) {
  const [mergedName, setMergedName] = useState('');
  const [mergedUnit, setMergedUnit] = useState('mg');

  // Initialize form when modal opens
  useEffect(() => {
    if (open && mergeData.source && mergeData.target) {
      // Default to the target group's name and unit
      setMergedName(mergeData.target.name || '');
      setMergedUnit(mergeData.target.unit || 'mg');
    }
  }, [open, mergeData]);

  if (!open || !mergeData.source || !mergeData.target) return null;

  const sourceGroup = mergeData.source;
  const targetGroup = mergeData.target;

  // Get all items from both groups
  const sourceItems = Object.values(sourceGroup.variants || {}).flatMap(v => v.items || []);
  const targetItems = Object.values(targetGroup.variants || {}).flatMap(v => v.items || []);
  
  // Calculate total vials
  const sourceVials = sourceItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  const targetVials = targetItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

  const handleConfirm = () => {
    const mergeConfig = {
      sourceGroup,
      targetGroup,
      sourceItems,
      targetItems,
      mergedName: mergedName.trim() || targetGroup.name,
      mergedUnit
    };
    
    onConfirm(mergeConfig);
    onClose();
  };

  return (
    <Modal 
      open={open} 
      onClose={onClose} 
      onBack={onBack}
      theme={theme}
      title="Merge Peptide Groups"
      maxWidth="max-w-2xl"
    >
      <div className="px-4 pt-2 pb-4 space-y-3" style={{ hyphens: 'none' }}>

        {/* Peptide Comparison with Arrow */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm" style={{ color: theme.text, hyphens: 'none' }}>Peptides to Merge:</h4>
          
          <div className="flex items-center gap-2">
            {/* Source Group */}
            <div className="flex-1 p-3 rounded-lg border" style={{ borderColor: '#d4d0c5', backgroundColor: '#f0eee7' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Package size={12} style={{ color: '#8b8678' }} />
                <span className="font-semibold text-xs" style={{ color: '#6b6659' }}>From</span>
              </div>
              <div className="font-medium text-sm mb-1" style={{ color: '#4a4639' }}>{sourceGroup.name}</div>
              <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: '#6b6659' }}>
                <div className="flex items-center gap-1">
                  <Beaker size={10} />
                  {sourceGroup.totalMg} {sourceGroup.unit || 'mg'}
                </div>
                <div>{sourceVials} {sourceVials === 1 ? 'vial' : 'vials'}</div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex-shrink-0">
              <ArrowRight size={20} style={{ color: theme.primary }} />
            </div>

            {/* Target Group */}
            <div className="flex-1 p-3 rounded-lg border" style={{ borderColor: '#a8a298', backgroundColor: '#d4d0c5' }}>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Package size={12} style={{ color: '#6b6659' }} />
                <span className="font-semibold text-xs" style={{ color: '#4a4639' }}>Into</span>
              </div>
              <div className="font-medium text-sm mb-1" style={{ color: '#2d2a22' }}>{targetGroup.name}</div>
              <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: '#4a4639' }}>
                <div className="flex items-center gap-1">
                  <Beaker size={10} />
                  {targetGroup.totalMg} {targetGroup.unit || 'mg'}
                </div>
                <div>{targetVials} {targetVials === 1 ? 'vial' : 'vials'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Merge Configuration */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm" style={{ color: theme.text, hyphens: 'none' }}>Confirmed Merge Details:</h4>
          
          <div className="space-y-2">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: theme.text }}>
                Peptide Name:
              </label>
              <input
                type="text"
                value={mergedName}
                onChange={(e) => setMergedName(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border text-sm"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                placeholder="Enter merged peptide name"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: theme.text }}>
                  Amount:
                </label>
                <input
                  type="text"
                  value={sourceGroup.totalMg + targetGroup.totalMg}
                  readOnly
                  className="w-full px-2.5 py-1.5 rounded border text-sm"
                  style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text, opacity: 0.7 }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1" style={{ color: theme.text }}>
                  Unit:
                </label>
                <select
                  value={mergedUnit}
                  onChange={(e) => setMergedUnit(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border text-sm"
                  style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                >
                  <option value="mg">mg</option>
                  <option value="mcg">mcg</option>
                  <option value="g">g</option>
                  <option value="iu">IU</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="p-2 rounded-lg" style={{ backgroundColor: theme.primary + '10' }}>
          <div className="flex items-center gap-1.5 mb-0.5">
            <Merge size={14} style={{ color: theme.primary }} />
            <span className="font-semibold text-sm" style={{ color: theme.primary, hyphens: 'none' }}>Merge Summary</span>
          </div>
          <p className="text-xs" style={{ color: theme.text, hyphens: 'none', wordBreak: 'normal' }}>
            This will combine <strong>{sourceVials + targetVials} {sourceVials + targetVials === 1 ? 'vial' : 'vials'}</strong> from both groups 
            into a single peptide entry named <strong>"{mergedName || targetGroup.name}"</strong> with unit <strong>{mergedUnit}</strong>.
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t" style={{ borderColor: theme.border }}>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-sm hover:shadow-md active:scale-95"
              style={{
                background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)',
                color: '#ffffff',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
              }}
            >
              Cancel
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleConfirm}
              className="flex items-center gap-1.5 px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-md hover:shadow-lg active:scale-95"
              style={{ 
                background: `linear-gradient(135deg, ${theme?.primary} 0%, ${theme?.primaryDark || theme?.primary} 100%)`,
                color: theme?.textOnPrimary || '#ffffff',
                border: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = theme.isDark ? '0 10px 25px rgba(0, 0, 0, 0.5)' : '0 10px 25px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = theme.isDark ? '0 4px 6px rgba(0, 0, 0, 0.3)' : '0 4px 6px rgba(0, 0, 0, 0.1)';
              }}
            >
              <Merge size={14} />
              Confirm Merge
            </button>
          </div>
        </div>

        {/* Warning */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-2 p-2 rounded-lg border" 
               style={{ borderColor: '#f59e0b', backgroundColor: '#fef3c7' }}>
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0" />
            <p className="text-xs text-amber-800 font-semibold" style={{ hyphens: 'none', wordBreak: 'normal' }}>
              This action cannot be undone.
            </p>
          </div>
        </div>
      </div>
    </Modal>
  );
}
