import React, { useState } from 'react';
import { HelpCircle, X, ChevronDown, FileText, Play, Calendar, TrendingUp, CheckCircle, BarChart } from 'lucide-react';

const ProtocolsHelpPanel = ({ theme }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(() => {
    return localStorage.getItem('protocolsHelpDismissed') === 'true';
  });

  const handleDismiss = () => {
    localStorage.setItem('protocolsHelpDismissed', 'true');
    setIsDismissed(true);
  };

  if (isDismissed) {
    return null;
  }

  if (!isExpanded) {
    return (
      <div className="mb-6 flex justify-center">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm font-medium transition-all hover:shadow-md hover:scale-105"
            style={{ 
              borderColor: theme.primary + '40', 
              color: theme.primary,
              backgroundColor: theme.primary + '08'
            }}
          >
            <HelpCircle size={18} />
            <span>How do protocols work?</span>
            <ChevronDown size={16} />
          </button>
          <button
            onClick={handleDismiss}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            style={{ color: theme.textLight }}
            title="Dismiss permanently"
          >
            <X size={18} />
          </button>
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
              <FileText size={20} className="md:w-6 md:h-6" style={{ color: theme.primary }} />
            </div>
            <h3 className="text-base md:text-lg font-bold" style={{ color: theme.text }}>
              How Protocols Work
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
                <FileText size={16} className="md:w-5 md:h-5" style={{ color: theme.primary }} />
              </div>
              <div>
                <div className="font-semibold mb-0.5 md:mb-1 text-sm md:text-base" style={{ color: theme.text }}>1. Create Protocol</div>
                <div className="text-xs md:text-sm" style={{ color: theme.textLight }}>
                  Define your supplement schedule, dosing cycles, and timing patterns
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:shadow-md transition-shadow" style={{ backgroundColor: theme.info + '05' }}>
              <div className="p-1.5 md:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: theme.info + '15' }}>
                <Play size={16} className="md:w-5 md:h-5" style={{ color: theme.info }} />
              </div>
              <div>
                <div className="font-semibold mb-0.5 md:mb-1 text-sm md:text-base" style={{ color: theme.text }}>2. Start Protocol</div>
                <div className="text-xs md:text-sm" style={{ color: theme.textLight }}>
                  Activate your protocol to begin tracking adherence and progress
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:shadow-md transition-shadow" style={{ backgroundColor: theme.warning + '05' }}>
              <div className="p-1.5 md:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: theme.warning + '15' }}>
                <Calendar size={16} className="md:w-5 md:h-5" style={{ color: theme.warning }} />
              </div>
              <div>
                <div className="font-semibold mb-0.5 md:mb-1 text-sm md:text-base" style={{ color: theme.text }}>3. Track Schedule</div>
                <div className="text-xs md:text-sm" style={{ color: theme.textLight }}>
                  Monitor daily dosing schedules, cycle timing, and rest periods
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2 md:space-y-4">
            <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:shadow-md transition-shadow" style={{ backgroundColor: theme.accent + '05' }}>
              <div className="p-1.5 md:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: theme.accent + '15' }}>
                <CheckCircle size={16} className="md:w-5 md:h-5" style={{ color: theme.accent }} />
              </div>
              <div>
                <div className="font-semibold mb-0.5 md:mb-1 text-sm md:text-base" style={{ color: theme.text }}>4. Log Adherence</div>
                <div className="text-xs md:text-sm" style={{ color: theme.textLight }}>
                  Track when doses are taken and maintain consistency records
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:shadow-md transition-shadow" style={{ backgroundColor: theme.success + '05' }}>
              <div className="p-1.5 md:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: theme.success + '15' }}>
                <TrendingUp size={16} className="md:w-5 md:h-5" style={{ color: theme.success }} />
              </div>
              <div>
                <div className="font-semibold mb-0.5 md:mb-1 text-sm md:text-base" style={{ color: theme.text }}>5. Monitor Progress</div>
                <div className="text-xs md:text-sm" style={{ color: theme.textLight }}>
                  Review completion rates and identify patterns over time
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2 md:gap-3 p-2 md:p-3 rounded-lg hover:shadow-md transition-shadow" style={{ backgroundColor: theme.primary + '05' }}>
              <div className="p-1.5 md:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: theme.primary + '15' }}>
                <BarChart size={16} className="md:w-5 md:h-5" style={{ color: theme.primary }} />
              </div>
              <div>
                <div className="font-semibold mb-0.5 md:mb-1 text-sm md:text-base" style={{ color: theme.text }}>6. View History</div>
                <div className="text-xs md:text-sm" style={{ color: theme.textLight }}>
                  Access past cycles and analyze your research approach
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t" style={{ borderColor: theme.border }}>
          <div className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme.text }}>
            <span className="text-lg">💡</span>
            Protocol Features
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { label: 'Dosing schedules', color: theme.primary },
              { label: 'Cycle tracking', color: theme.info },
              { label: 'Rest periods', color: theme.accent },
              { label: 'Adherence logging', color: theme.warning },
              { label: 'Progress monitoring', color: theme.success },
              { label: 'History analysis', color: theme.textLight }
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

export default ProtocolsHelpPanel;

