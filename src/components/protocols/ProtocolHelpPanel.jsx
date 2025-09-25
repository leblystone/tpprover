import React, { useState } from 'react';
import { HelpCircle, X, Calendar, CheckSquare, BarChart3, Clock } from 'lucide-react';

const ProtocolHelpPanel = ({ theme }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isExpanded) {
    return (
      <div className="mb-4">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors hover:bg-gray-50"
          style={{ borderColor: theme.border, color: theme.text }}
        >
          <HelpCircle size={16} />
          <span>How do protocols schedule your research?</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4" style={{ backgroundColor: theme.info + '10', borderColor: theme.info + '40' }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <HelpCircle size={18} style={{ color: theme.info }} />
          <h3 className="font-semibold text-sm" style={{ color: theme.text }}>
            🧬 How Protocols Work
          </h3>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="p-1 rounded hover:bg-white hover:bg-opacity-50"
          style={{ color: theme.textLight }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <CheckSquare size={16} className="mt-0.5 flex-shrink-0" style={{ color: theme.success }} />
            <div>
              <div className="font-medium" style={{ color: theme.text }}>1. Create Your Protocol</div>
              <div className="text-xs" style={{ color: theme.textLight }}>
                Set peptides, dosages, and frequency (daily, weekly, or cycling)
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Calendar size={16} className="mt-0.5 flex-shrink-0" style={{ color: theme.primary }} />
            <div>
              <div className="font-medium" style={{ color: theme.text }}>2. Start Protocol</div>
              <div className="text-xs" style={{ color: theme.textLight }}>
                Choose start date and link to your stockpile vials
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-2">
            <Clock size={16} className="mt-0.5 flex-shrink-0" style={{ color: theme.warning }} />
            <div>
              <div className="font-medium" style={{ color: theme.text }}>3. Auto-Scheduling</div>
              <div className="text-xs" style={{ color: theme.textLight }}>
                Tasks appear daily on your Dashboard and Calendar automatically
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <BarChart3 size={16} className="mt-0.5 flex-shrink-0" style={{ color: theme.accent }} />
            <div>
              <div className="font-medium" style={{ color: theme.text }}>4. Track Progress</div>
              <div className="text-xs" style={{ color: theme.textLight }}>
                Mark tasks complete and monitor your protocol adherence
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t" style={{ borderColor: theme.border }}>
        <div className="text-xs font-medium mb-2" style={{ color: theme.text }}>
          💡 Key Benefits:
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {[
            'Never miss a dose',
            'Automatic scheduling',
            'Progress tracking',
            'Calendar integration',
            'Flexible frequencies'
          ].map((benefit, index) => (
            <span
              key={index}
              className="px-2 py-1 rounded-full bg-white border"
              style={{ borderColor: theme.border, color: theme.textLight }}
            >
              {benefit}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProtocolHelpPanel;

