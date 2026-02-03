import React, { useState, useEffect } from 'react';
import { Check, X, Clock } from 'lucide-react';
import { recordInjectionSite, getInjectionSiteSuggestions } from '../../utils/injectionTracking';
import { isInjectionSiteTrackingEnabled } from '../../utils/injectionSiteSettings';

/** Title-case a string for display (e.g. "right abdomen" → "Right Abdomen"). */
function toTitleCase(str) {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

/** Format last-used date as human-readable (e.g. "Today", "Yesterday", "2 days ago", "Jan 31"). */
function formatLastUsed(lastUsed) {
  if (!lastUsed) return '';
  const d = new Date(lastUsed);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const then = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysDiff = Math.floor((today - then) / (24 * 60 * 60 * 1000));
  if (daysDiff === 0) return 'Today';
  if (daysDiff === 1) return 'Yesterday';
  if (daysDiff < 7) return `${daysDiff} days ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function InjectionSiteSelector({ 
  taskName, 
  task, // Add task object for recording injection data
  onConfirm, 
  onCancel, 
  theme, 
  isVisible 
}) {
  const [selectedSite, setSelectedSite] = useState('');
  const [selectedSide, setSelectedSide] = useState('');
  const [customSite, setCustomSite] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [hasCheckedTracking, setHasCheckedTracking] = useState(false);

  // Check if injection site tracking is enabled (only once when modal opens)
  useEffect(() => {
    if (isVisible && !hasCheckedTracking && !isInjectionSiteTrackingEnabled()) {
      // If tracking is disabled, automatically complete the task without site selection
      setHasCheckedTracking(true);
      onConfirm(''); // Pass empty string to indicate no site was recorded
      return;
    }
    if (isVisible && !hasCheckedTracking) {
      setHasCheckedTracking(true);
    }
    if (!isVisible) {
      setHasCheckedTracking(false);
    }
  }, [isVisible, hasCheckedTracking]);

  // Load suggestions when component becomes visible (only if tracking is enabled)
  useEffect(() => {
    if (isVisible && taskName && isInjectionSiteTrackingEnabled()) {
      const siteSuggestions = getInjectionSiteSuggestions(taskName);
      setSuggestions(siteSuggestions);
    }
  }, [isVisible, taskName]);

  if (!isVisible) return null;

  const handleConfirm = () => {
    let injectionSite = '';
    
    if (selectedSite === 'other') {
      injectionSite = customSite.trim();
    } else if (selectedSite && selectedSide) {
      injectionSite = `${selectedSide} ${selectedSite}`;
    } else if (selectedSite) {
      injectionSite = selectedSite;
    }
    
    // Record the injection site if we have a task object and a site was provided
    if (task && injectionSite && injectionSite.trim()) {
      recordInjectionSite(task, injectionSite, new Date(), task.time);
    }
    
    onConfirm(injectionSite);
  };

  const handleSkip = () => {
    // Skip means complete the task without recording injection site
    setSelectedSite('');
    setSelectedSide('');
    setCustomSite('');
    onConfirm(''); // Pass empty string to indicate skipped
  };

  const handleCancel = () => {
    setSelectedSite('');
    setSelectedSide('');
    setCustomSite('');
    onCancel(); // This should NOT complete the task
  };

  const isFormValid = () => {
    if (selectedSite === 'other') {
      return customSite.trim().length > 0;
    } else if (selectedSite === 'abdomen' || selectedSite === 'arm' || selectedSite === 'thigh') {
      return selectedSide.length > 0;
    }
    return false;
  };

  const showSideSelection = selectedSite === 'abdomen' || selectedSite === 'arm' || selectedSite === 'thigh';
  const showCustomInput = selectedSite === 'other';

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4"
      style={{ zIndex: 9999 }}
      onClick={handleCancel}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-sm w-full mx-4 flex flex-col max-h-[85vh] overflow-hidden"
        style={{ backgroundColor: theme.cardBackground }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between flex-shrink-0 p-4 pb-2 border-b" style={{ borderColor: theme.border }}>
          <h4 className="font-semibold text-sm" style={{ color: theme.text }}>
            Injection site for {taskName}?
          </h4>
          <button
            onClick={handleCancel}
            className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            title="Cancel (don't complete task)"
          >
            <X size={16} style={{ color: theme.textLight }} />
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-4 pt-2 space-y-3">
          {/* Site Selection */}
          <div>
            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'abdomen', label: 'Abdomen' },
                { value: 'arm', label: 'Arm' },
                { value: 'thigh', label: 'Thigh' },
                { value: 'other', label: 'Other' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setSelectedSite(option.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedSite === option.value 
                      ? 'text-white' 
                      : 'border'
                  }`}
                  style={{
                    backgroundColor: selectedSite === option.value ? theme.primary : 'transparent',
                    borderColor: selectedSite === option.value ? theme.primary : theme.border,
                    color: selectedSite === option.value ? theme.textOnPrimary : theme.text
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Recent Injection Sites Suggestions — shows last write; click rotates left/right */}
          {suggestions.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-2 flex items-center gap-1" style={{ color: theme.text }}>
                <Clock size={12} />
                Most Recent Site
              </label>
              <div className="flex gap-1 flex-wrap">
                {suggestions.map((suggestion, index) => {
                  const lastUsedLabel = formatLastUsed(suggestion.lastUsed);
                  const site = suggestion.site.toLowerCase();
                  const hasSide = site.includes('left') || site.includes('right');
                  const parts = hasSide ? site.split(/\s+/) : [];
                  const currentSide = parts[0] === 'left' || parts[0] === 'right' ? parts[0] : null;
                  const bodyPart = parts.length >= 2 ? parts.slice(1).join(' ') : (hasSide ? null : null);
                  const rotateToSide = currentSide === 'left' ? 'right' : currentSide === 'right' ? 'left' : null;

                  return (
                    <button
                      key={index}
                      onClick={() => {
                        if (hasSide && parts.length >= 2) {
                          setSelectedSite(bodyPart);
                          setSelectedSide(rotateToSide || currentSide);
                        } else {
                          setCustomSite(suggestion.site);
                          setSelectedSite('other');
                        }
                      }}
                      className="px-2 py-1 rounded text-xs font-medium border transition-all hover:opacity-80"
                      style={{
                        borderColor: theme.border,
                        color: theme.text,
                        backgroundColor: theme.secondary + '40'
                      }}
                      title={lastUsedLabel ? `Last used ${lastUsedLabel}. Click to rotate to ${rotateToSide ? toTitleCase(rotateToSide) : 'other'} side.` : 'Click to rotate left/right'}
                    >
                      {toTitleCase(suggestion.site)}{lastUsedLabel ? ` (${lastUsedLabel})` : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Side Selection */}
          {showSideSelection && (
            <div>
              <div className="flex gap-2">
                {['Left', 'Right'].map((side) => (
                  <button
                    key={side.toLowerCase()}
                    onClick={() => setSelectedSide(side.toLowerCase())}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedSide === side 
                        ? 'text-white' 
                        : 'border'
                    }`}
                    style={{
                      backgroundColor: selectedSide === side.toLowerCase() ? theme.primary : 'transparent',
                      borderColor: selectedSide === side.toLowerCase() ? theme.primary : theme.border,
                      color: selectedSide === side.toLowerCase() ? theme.textOnPrimary : theme.text
                    }}
                  >
                    {side}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Input */}
          {showCustomInput && (
            <div>
              <input
                type="text"
                value={customSite}
                onChange={(e) => setCustomSite(e.target.value)}
                placeholder="Enter site..."
                className="w-full p-2 rounded border text-xs"
                style={{ 
                  borderColor: theme.border, 
                  backgroundColor: theme.background,
                  color: theme.text 
                }}
                autoFocus
              />
            </div>
          )}

        </div>

        {/* Sticky footer: action buttons always visible */}
        <div className="flex-shrink-0 flex gap-2 p-4 pt-2 border-t" style={{ borderColor: theme.border }}>
          <button
            onClick={handleSkip}
            className="flex-1 px-3 py-2 rounded text-xs font-medium border transition-all hover:opacity-80"
            style={{ 
              borderColor: theme.border, 
              color: theme.textLight 
            }}
            title="Complete task without recording injection site"
          >
            Skip & Complete
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isFormValid()}
            className="flex-1 px-3 py-2 rounded text-xs font-medium transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: theme.primary, 
              color: theme.textOnPrimary 
            }}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
