import React, { useState, useEffect } from 'react';
import { Check, X, Clock } from 'lucide-react';
import { recordInjectionSite, getInjectionSiteSuggestions } from '../../utils/injectionTracking';

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

  // Load suggestions when component becomes visible
  useEffect(() => {
    if (isVisible && taskName) {
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
      className="absolute inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center"
      style={{ zIndex: 9999 }}
      onClick={handleCancel}
    >
      <div 
        className="bg-white rounded-lg shadow-xl p-4 max-w-sm w-full mx-4"
        style={{ backgroundColor: theme.cardBackground }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
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

        <div className="space-y-3">
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

          {/* Recent Injection Sites Suggestions */}
          {suggestions.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-2 flex items-center gap-1" style={{ color: theme.text }}>
                <Clock size={12} />
                Recent sites for this task:
              </label>
              <div className="flex gap-1 flex-wrap">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      // Parse the suggestion site to set appropriate fields
                      const site = suggestion.site.toLowerCase();
                      if (site.includes('left') || site.includes('right')) {
                        const parts = site.split(' ');
                        if (parts.length >= 2) {
                          setSelectedSide(parts[0]);
                          setSelectedSite(parts[1]);
                        }
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
                    title={`Used ${suggestion.count} times`}
                  >
                    {suggestion.site} ({suggestion.count})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Side Selection */}
          {showSideSelection && (
            <div>
              <div className="flex gap-2">
                {['left', 'right'].map((side) => (
                  <button
                    key={side}
                    onClick={() => setSelectedSide(side)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize ${
                      selectedSide === side 
                        ? 'text-white' 
                        : 'border'
                    }`}
                    style={{
                      backgroundColor: selectedSide === side ? theme.primary : 'transparent',
                      borderColor: selectedSide === side ? theme.primary : theme.border,
                      color: selectedSide === side ? theme.textOnPrimary : theme.text
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

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
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
    </div>
  );
}
