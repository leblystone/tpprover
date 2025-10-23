import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { AlertTriangle, Merge, Package, Beaker } from 'lucide-react';

export default function MergeConfirmationModal({ 
  open, 
  onClose, 
  theme, 
  mergeData = { source: null, target: null },
  onConfirm = () => {}
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
      theme={theme}
      title="Merge Peptide Groups"
    >
      <div className="p-6 space-y-6">
        {/* Warning */}
        <div className="flex items-start gap-3 p-4 rounded-lg border-2" 
             style={{ borderColor: '#f59e0b', backgroundColor: '#fef3c7' }}>
          <AlertTriangle size={20} className="text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-800 mb-1">This action cannot be undone</h4>
            <p className="text-sm text-amber-700">
              Merging will combine all inventory items from both groups into a single peptide entry. 
              All quantities, vendors, and documentation will be preserved.
            </p>
          </div>
        </div>

        {/* Peptide Comparison */}
        <div className="space-y-4">
          <h4 className="font-semibold" style={{ color: theme.text }}>Peptides to Merge:</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Source Group */}
            <div className="p-4 rounded-lg border-2" style={{ borderColor: '#ef4444', backgroundColor: '#fef2f2' }}>
              <div className="flex items-center gap-2 mb-2">
                <Package size={16} className="text-red-600" />
                <span className="font-semibold text-red-800">From: {sourceGroup.name}</span>
              </div>
              <div className="text-sm text-red-700 space-y-1">
                <div className="flex items-center gap-2">
                  <Beaker size={14} />
                  {sourceGroup.totalMg} {sourceGroup.unit || 'mg'}
                </div>
                <div>{Object.keys(sourceGroup.variants || {}).length} variant{Object.keys(sourceGroup.variants || {}).length !== 1 ? 's' : ''}</div>
                <div>{sourceItems.length} inventory item{sourceItems.length !== 1 ? 's' : ''}</div>
              </div>
            </div>

            {/* Target Group */}
            <div className="p-4 rounded-lg border-2" style={{ borderColor: '#10b981', backgroundColor: '#f0fdf4' }}>
              <div className="flex items-center gap-2 mb-2">
                <Package size={16} className="text-green-600" />
                <span className="font-semibold text-green-800">Into: {targetGroup.name}</span>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <div className="flex items-center gap-2">
                  <Beaker size={14} />
                  {targetGroup.totalMg} {targetGroup.unit || 'mg'}
                </div>
                <div>{Object.keys(targetGroup.variants || {}).length} variant{Object.keys(targetGroup.variants || {}).length !== 1 ? 's' : ''}</div>
                <div>{targetItems.length} inventory item{targetItems.length !== 1 ? 's' : ''}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Merge Configuration */}
        <div className="space-y-4">
          <h4 className="font-semibold" style={{ color: theme.text }}>Merged Peptide Details:</h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                Peptide Name:
              </label>
              <input
                type="text"
                value={mergedName}
                onChange={(e) => setMergedName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border"
                style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
                placeholder="Enter merged peptide name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
                Unit:
              </label>
              <select
                value={mergedUnit}
                onChange={(e) => setMergedUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border"
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

        {/* Summary */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: theme.primary + '10' }}>
          <div className="flex items-center gap-2 mb-2">
            <Merge size={16} style={{ color: theme.primary }} />
            <span className="font-semibold" style={{ color: theme.primary }}>Merge Summary</span>
          </div>
          <p className="text-sm" style={{ color: theme.text }}>
            This will combine <strong>{sourceItems.length + targetItems.length} inventory items</strong> from both groups 
            into a single peptide entry named <strong>"{mergedName || targetGroup.name}"</strong> with unit <strong>{mergedUnit}</strong>.
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t" style={{ borderColor: theme.border }}>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg border hover:opacity-90 transition-all"
            style={{ borderColor: theme.border, color: theme.text }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="flex items-center gap-2 px-6 py-2 rounded-lg hover:opacity-90 transition-all"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
          >
            <Merge size={16} />
            Confirm Merge
          </button>
        </div>
      </div>
    </Modal>
  );
}
