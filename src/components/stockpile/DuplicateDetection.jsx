import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle, AlertCircle, HelpCircle, Merge, Eye, EyeOff } from 'lucide-react';
import { findPotentialDuplicates, getConfidenceColor, getConfidenceIcon } from '../../utils/fuzzyMatch';

const DuplicateDetection = ({ 
  groups, 
  theme, 
  onMergeRequest, 
  onDismissSuggestion 
}) => {
  const [duplicates, setDuplicates] = useState([]);
  const [dismissedSuggestions, setDismissedSuggestions] = useState(new Set());

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
    !dismissedSuggestions.has(`${dup.group1.groupKey}-${dup.group2.groupKey}`) &&
    (dup.confidence === 'high' || dup.confidence === 'medium')
  );

  const handleMergeRequest = (duplicate) => {
    onMergeRequest?.(duplicate.group1, duplicate.group2);
  };

  const handleDismissSuggestion = (duplicate) => {
    const key = `${duplicate.group1.groupKey}-${duplicate.group2.groupKey}`;
    setDismissedSuggestions(prev => new Set([...prev, key]));
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

  return (
    <div className="mb-6 p-4 rounded-lg border" style={{ 
      backgroundColor: theme.cardBackground,
      borderColor: theme.border 
    }}>
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={20} style={{ color: theme.primary }} />
        <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
          Potential Duplicates Detected
        </h3>
      </div>

      {/* Duplicate suggestions */}
      <div className="space-y-3">
        {filteredDuplicates.map((duplicate, index) => (
          <div
            key={`${duplicate.group1.groupKey}-${duplicate.group2.groupKey}`}
            className="p-4 rounded-lg border-2 transition-all hover:shadow-md"
            style={{
              borderColor: getConfidenceColor(duplicate.confidence).split(' ')[2],
              backgroundColor: getConfidenceColor(duplicate.confidence).split(' ')[1]
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                {getConfidenceIcon(duplicate.confidence)}
                <span className="font-medium text-sm">
                  {getConfidenceText(duplicate.confidence)}
                </span>
                <span className="text-xs text-gray-500">
                  ({Math.round(duplicate.similarity * 100)}% match)
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleMergeRequest(duplicate)}
                  className="flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: theme.primary }}
                >
                  <Merge size={14} />
                  Merge
                </button>
                
                <button
                  onClick={() => handleDismissSuggestion(duplicate)}
                  className="px-3 py-1 rounded-md text-sm font-medium transition-colors hover:opacity-90"
                  style={{
                    backgroundColor: theme.border,
                    color: theme.text
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
            
            {/* Peptide comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded-md border" style={{ borderColor: theme.border }}>
                <div className="font-medium text-sm mb-1" style={{ color: theme.text }}>
                  {duplicate.group1.name}
                </div>
                <div className="text-xs text-gray-500">
                  {duplicate.group1.totalMg} {duplicate.group1.unit} • {Object.keys(duplicate.group1.variants).length} variant{Object.keys(duplicate.group1.variants).length !== 1 ? 's' : ''}
                </div>
              </div>
              
              <div className="p-3 rounded-md border" style={{ borderColor: theme.border }}>
                <div className="font-medium text-sm mb-1" style={{ color: theme.text }}>
                  {duplicate.group2.name}
                </div>
                <div className="text-xs text-gray-500">
                  {duplicate.group2.totalMg} {duplicate.group2.unit} • {Object.keys(duplicate.group2.variants).length} variant{Object.keys(duplicate.group2.variants).length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
            
            {/* Similarity explanation */}
            <div className="mt-3 text-xs text-gray-500">
              <strong>Why this might be a duplicate:</strong> The names are very similar and both contain the same unit type ({duplicate.group1.unit}).
              {duplicate.confidence === 'high' && ' This is likely the same peptide with different spelling or formatting.'}
              {duplicate.confidence === 'medium' && ' This could be the same peptide, but please verify before merging.'}
              {duplicate.confidence === 'low' && ' This might be the same peptide, but the names are quite different. Please review carefully.'}
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer info */}
      <div className="mt-4 p-3 rounded-md text-xs" style={{ backgroundColor: theme.primary + '10' }}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} style={{ color: theme.primary }} />
          <span style={{ color: theme.text }}>
            <strong>Smart Detection:</strong> This feature uses fuzzy matching to identify potential duplicates. 
            Always verify peptide names and dosages before merging to ensure accuracy.
          </span>
        </div>
      </div>
    </div>
  );
};

export default DuplicateDetection;
