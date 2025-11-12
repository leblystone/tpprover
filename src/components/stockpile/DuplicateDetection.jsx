import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, AlertCircle, HelpCircle, Merge, Package, Beaker, ArrowRight, BookAlert, X } from 'lucide-react';
import { findPotentialDuplicates, getConfidenceColor, getConfidenceIcon } from '../../utils/fuzzyMatch';

const DuplicateDetection = ({ 
  groups, 
  theme, 
  onMergeRequest, 
  onDismissSuggestion,
  dismissedDuplicates = new Set()
}) => {
  const [duplicates, setDuplicates] = useState([]);

  // Find duplicates when groups change
  useEffect(() => {
    if (!groups || groups.length < 2) {
      setDuplicates([]);
      return;
    }

    const foundDuplicates = findPotentialDuplicates(groups, 0.7);
    setDuplicates(foundDuplicates);
  }, [groups]);

  // Filter out dismissed suggestions and show only high/medium confidence
  const filteredDuplicates = duplicates.filter(dup => 
    !dismissedDuplicates.has(`${dup.group1.groupKey}-${dup.group2.groupKey}`) &&
    (dup.confidence === 'high' || dup.confidence === 'medium')
  );

  const handleMergeRequest = (duplicate) => {
    onMergeRequest?.(duplicate.group1, duplicate.group2);
  };

  const handleDismissSuggestion = (duplicate) => {
    onDismissSuggestion?.(duplicate);
  };

  const getConfidenceIcon = (confidence) => {
    switch (confidence) {
      case 'high': return <CheckCircle size={16} className="text-green-600" />;
      case 'medium': return <AlertTriangle size={16} className="text-yellow-600" />;
      case 'low': return <AlertCircle size={16} className="text-orange-600" />;
      case 'very-low': return <XCircle size={16} className="text-red-600" />;
      default: return <HelpCircle size={16} className="text-gray-600" />;
    }
  };

  const getConfidenceText = (confidence) => {
    switch (confidence) {
      case 'high': return 'High Confidence';
      case 'medium': return 'Medium Confidence';
      case 'low': return 'Low Confidence';
      case 'very-low': return 'Very Low Confidence';
      default: return 'Unknown';
    }
  };

  if (filteredDuplicates.length === 0) {
    return null;
  }

  // Calculate vials for each group
  const getGroupVials = (group) => {
    return Object.values(group.variants || {}).reduce((sum, v) => sum + (v.totalVials || 0), 0);
  };

  return (
    <div className="mb-4 space-y-3">
      {filteredDuplicates.map((duplicate) => {
        const group1Vials = getGroupVials(duplicate.group1);
        const group2Vials = getGroupVials(duplicate.group2);
        
        return (
          <div
            key={`${duplicate.group1.groupKey}-${duplicate.group2.groupKey}`}
            className="p-3 rounded-lg border-2 relative shadow-lg"
            style={{ 
              backgroundColor: theme.isDark ? '#1f2937' : '#fef3c7',
              borderColor: theme.primary,
              boxShadow: `0 4px 12px ${theme.primary}40`
            }}
          >
            {/* Dismiss button - upper right */}
            <button
              onClick={() => handleDismissSuggestion(duplicate)}
              className="absolute top-2 right-2 p-1 rounded transition-all hover:opacity-90"
              style={{
                background: 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)',
                color: '#ffffff'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #b5684a 0%, #a35a3f 100%)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #c87a5c 0%, #b5684a 100%)';
              }}
            >
              <X size={14} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-2 mb-2 pr-6">
              <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
                Potential Duplicates Found:
              </h3>
              <BookAlert size={16} className="animate-bounce" style={{ color: theme.primary }} />
            </div>

            {/* Peptide comparison with arrow */}
            <div className="flex items-center gap-2 mb-3">
              {/* Source Group */}
              <div className="flex-1 p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Package size={12} style={{ color: theme.textLight }} />
                  <span className="font-semibold text-xs" style={{ color: theme.text }}>From</span>
                </div>
                <div className="font-medium text-sm mb-1" style={{ color: theme.text }}>{duplicate.group1.name}</div>
                <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: theme.textLight }}>
                  <div className="flex items-center gap-1">
                    <Beaker size={10} />
                    {duplicate.group1.totalMg} {duplicate.group1.unit || 'mg'}
                  </div>
                  <div>{group1Vials} {group1Vials === 1 ? 'vial' : 'vials'}</div>
                </div>
              </div>

              {/* Arrow */}
              <div className="flex-shrink-0">
                <ArrowRight size={20} style={{ color: theme.primary }} />
              </div>

              {/* Target Group */}
              <div className="flex-1 p-3 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Package size={12} style={{ color: theme.textLight }} />
                  <span className="font-semibold text-xs" style={{ color: theme.text }}>Into</span>
                </div>
                <div className="font-medium text-sm mb-1" style={{ color: theme.text }}>{duplicate.group2.name}</div>
                <div className="grid grid-cols-2 gap-2 text-xs" style={{ color: theme.textLight }}>
                  <div className="flex items-center gap-1">
                    <Beaker size={10} />
                    {duplicate.group2.totalMg} {duplicate.group2.unit || 'mg'}
                  </div>
                  <div>{group2Vials} {group2Vials === 1 ? 'vial' : 'vials'}</div>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => handleMergeRequest(duplicate)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors hover:opacity-90"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                <Merge size={12} />
                Merge
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DuplicateDetection;
