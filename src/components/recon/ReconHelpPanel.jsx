import React, { useState } from 'react';
import { HelpCircle, X, ChevronDown, Beaker, Calculator, Droplet, Syringe, Package, Clock } from 'lucide-react';

const ReconHelpPanel = ({ theme }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('reconHelpDismissed') === 'true';
  });

  const handleDismiss = () => {
    localStorage.setItem('reconHelpDismissed', 'true');
    setIsDismissed(true);
  };

  if (isDismissed) {
    return null;
  }

  if (!isExpanded) {
    return (
      <div className="mb-6 px-4">
        <div className="flex justify-center">
          <div className="flex items-center gap-2 max-w-sm w-full">
            <button
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-full border-2 text-xs font-medium transition-all hover:shadow-md hover:scale-105 flex-1 min-w-0"
              style={{
                borderColor: theme.primary + '40',
                color: theme.primary,
                backgroundColor: theme.primary + '08'
              }}
            >
              <HelpCircle size={16} className="flex-shrink-0" />
              <span className="truncate">How reconstitution works?</span>
              <ChevronDown size={14} className="flex-shrink-0" />
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors flex-shrink-0"
              style={{ color: theme.textLight }}
              title="Dismiss permanently"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 flex justify-center">
      <div className="w-full max-w-4xl rounded-xl border-2 p-4 md:p-6 shadow-lg" style={{ backgroundColor: theme.cardBackground, borderColor: theme.primary + '20' }}>
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="p-1.5 md:p-2 rounded-lg" style={{ backgroundColor: theme.primary + '15' }}>
              <Beaker size={20} className="md:w-6 md:h-6" style={{ color: theme.primary }} />
            </div>
            <h3 className="text-base md:text-lg font-bold" style={{ color: theme.text }}>
              How Reconstitution Works
            </h3>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 md:p-2 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: theme.textLight }}
              title="Collapse"
            >
              <ChevronDown size={18} className="md:w-5 md:h-5 rotate-180" />
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 md:p-2 rounded-lg hover:bg-gray-100 transition-colors"
              style={{ color: theme.textLight }}
              title="Dismiss permanently"
            >
              <X size={18} className="md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6 mb-4 md:mb-6">
          <div className="space-y-2 md:space-y-4">
            <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:shadow-md transition-shadow" style={{ backgroundColor: theme.primary + '05' }}>
              <div className="p-1.5 md:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: theme.primary + '15' }}>
                <Calculator size={16} className="md:w-5 md:h-5" style={{ color: theme.primary }} />
              </div>
              <div>
                <div className="font-semibold mb-0.5 md:mb-1 text-sm md:text-base" style={{ color: theme.text }}>1. Calculate Dosage</div>
                <div className="text-xs md:text-sm" style={{ color: theme.textLight }}>
                  Use the calculator to determine water volume based on peptide mg and desired dose
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:shadow-md transition-shadow" style={{ backgroundColor: theme.info + '05' }}>
              <div className="p-1.5 md:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: theme.info + '15' }}>
                <Droplet size={16} className="md:w-5 md:h-5" style={{ color: theme.info }} />
              </div>
              <div>
                <div className="font-semibold mb-0.5 md:mb-1 text-sm md:text-base" style={{ color: theme.text }}>2. Add Bacteriostatic Water</div>
                <div className="text-xs md:text-sm" style={{ color: theme.textLight }}>
                  Draw calculated amount of bac water and add to peptide vial
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:shadow-md transition-shadow" style={{ backgroundColor: theme.warning + '05' }}>
              <div className="p-1.5 md:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: theme.warning + '15' }}>
                <Syringe size={16} className="md:w-5 md:h-5" style={{ color: theme.warning }} />
              </div>
              <div>
                <div className="font-semibold mb-0.5 md:mb-1 text-sm md:text-base" style={{ color: theme.text }}>3. Choose Delivery Method</div>
                <div className="text-xs md:text-sm" style={{ color: theme.textLight }}>
                  Select syringe, pen, or nasal spray and track with color-coded labels
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 md:space-y-4">
            <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:shadow-md transition-shadow" style={{ backgroundColor: theme.accent + '05' }}>
              <div className="p-1.5 md:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: theme.accent + '15' }}>
                <Package size={16} className="md:w-5 md:h-5" style={{ color: theme.accent }} />
              </div>
              <div>
                <div className="font-semibold mb-0.5 md:mb-1 text-sm md:text-base" style={{ color: theme.text }}>4. Track On Hand Vials</div>
                <div className="text-xs md:text-sm" style={{ color: theme.textLight }}>
                  Monitor current vials with dosing info, vendor, and pen colors
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:shadow-md transition-shadow" style={{ backgroundColor: theme.success + '05' }}>
              <div className="p-1.5 md:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: theme.success + '15' }}>
                <Clock size={16} className="md:w-5 md:h-5" style={{ color: theme.success }} />
              </div>
              <div>
                <div className="font-semibold mb-0.5 md:mb-1 text-sm md:text-base" style={{ color: theme.text }}>5. Mark as Used</div>
                <div className="text-xs md:text-sm" style={{ color: theme.textLight }}>
                  Move finished vials to history for tracking usage patterns
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:shadow-md transition-shadow" style={{ backgroundColor: theme.primary + '05' }}>
              <div className="p-1.5 md:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: theme.primary + '15' }}>
                <Beaker size={16} className="md:w-5 md:h-5" style={{ color: theme.primary }} />
              </div>
              <div>
                <div className="font-semibold mb-0.5 md:mb-1 text-sm md:text-base" style={{ color: theme.text }}>6. View History</div>
                <div className="text-xs md:text-sm" style={{ color: theme.textLight }}>
                  Review past reconstitutions and analyze vendor performance
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t" style={{ borderColor: theme.border }}>
          <div className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme.text }}>
            <span className="text-lg">💡</span>
            Reconstitution Features
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Dosage calculator', color: theme.primary },
              { label: 'Multi-peptide mixing', color: theme.info },
              { label: 'Pen color tracking', color: theme.accent },
              { label: 'Delivery methods', color: theme.warning },
              { label: 'Vial inventory', color: theme.success },
              { label: 'Usage history', color: theme.textLight }
            ].map((item, index) => (
              <span
                key={index}
                className="px-2 py-1 rounded-full text-xs font-medium border transition-all hover:shadow-md"
                style={{ 
                  borderColor: item.color + '40',
                  color: item.color,
                  backgroundColor: item.color + '10'
                }}
              >
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReconHelpPanel;

