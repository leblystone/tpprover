import React, { useState, useEffect } from 'react';
import { Droplets, Plus, Minus, RotateCcw, Settings } from 'lucide-react';
import ModernTooltip from '../../ui/ModernTooltip';
import Modal from '../../common/Modal';

const WaterTrackerWidget = ({ widget, theme }) => {
  const [waterData, setWaterData] = useState(() => {
    try {
      const saved = localStorage.getItem('tpprover_water_tracker');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Water units configuration
  const waterUnits = {
    glasses: { label: 'Glasses', abbrev: 'glasses', defaultGoal: 8, increment: 1 },
    oz: { label: 'Fluid Ounces', abbrev: 'fl oz', defaultGoal: 64, increment: 8 },
    ml: { label: 'Milliliters', abbrev: 'ml', defaultGoal: 2000, increment: 250 },
    cups: { label: 'Cups', abbrev: 'cups', defaultGoal: 8, increment: 1 },
    liters: { label: 'Liters', abbrev: 'L', defaultGoal: 2, increment: 0.25 }
  };

  const today = new Date().toISOString().split('T')[0];
  const todayData = waterData[today] || { 
    glasses: 0, 
    goal: 8, 
    unit: 'glasses',
    lastUpdated: null 
  };

  // Save water data whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('tpprover_water_tracker', JSON.stringify(waterData));
    } catch (error) {
      console.warn('Failed to save water data:', error);
    }
  }, [waterData]);

  const currentUnit = waterUnits[todayData.unit] || waterUnits.glasses;
  const progress = Math.min(todayData.glasses / todayData.goal, 1);

  const updateWaterIntake = (change) => {
    const increment = change * currentUnit.increment;
    const newAmount = Math.max(0, todayData.glasses + increment);
    setWaterData(prev => ({
      ...prev,
      [today]: {
        ...todayData,
        glasses: newAmount,
        lastUpdated: new Date().toISOString()
      }
    }));
  };

  const updateGoal = (newGoal) => {
    setWaterData(prev => ({
      ...prev,
      [today]: {
        ...todayData,
        goal: Math.max(1, newGoal)
      }
    }));
  };

  const changeUnit = (unitKey) => {
    const newUnit = waterUnits[unitKey];
    setWaterData(prev => ({
      ...prev,
      [today]: {
        ...todayData,
        unit: unitKey,
        goal: newUnit.defaultGoal,
        glasses: 0 // Reset intake when changing units
      }
    }));
  };

  const updateCustomGoal = (newGoal) => {
    setWaterData(prev => ({
      ...prev,
      [today]: {
        ...todayData,
        goal: Math.max(1, newGoal)
      }
    }));
  };

  const resetToday = () => {
    setWaterData(prev => ({
      ...prev,
      [today]: {
        ...todayData,
        glasses: 0,
        lastUpdated: new Date().toISOString()
      }
    }));
  };

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold" style={{ color: theme.text }}>
            Hydration
          </h3>
          <div className="flex items-center gap-2">
            <ModernTooltip text="Settings" position="top">
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="p-1 rounded transition-all"
                style={{ color: theme.textLight }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.border + '40';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Settings size={20} />
              </button>
            </ModernTooltip>
            <Droplets size={20} style={{ color: theme.isDark ? '#0080a7' : theme.primary }} />
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 flex items-center justify-center">
        <div className="w-full grid grid-cols-2 gap-4 items-center">
          {/* Left Column: Progress Circle and Stats */}
          <div className="flex flex-col items-center space-y-2">
            {/* Progress Circle - Compact */}
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  stroke={theme.border}
                  strokeWidth="6"
                  fill="none"
                  opacity="0.3"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="35"
                  stroke={theme.primary}
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 35}`}
                  strokeDashoffset={`${2 * Math.PI * 35 * (1 - progress)}`}
                  strokeLinecap="round"
                  className="transition-all duration-300 ease-in-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold" style={{ color: theme.text }}>
                  {Math.round(progress * 100)}%
                </span>
              </div>
            </div>

            {/* Current Intake */}
            <div className="text-center">
              <div className="text-2xl font-bold" style={{ color: theme.text }}>
                {currentUnit.abbrev === 'liters' ? todayData.glasses.toFixed(1) : Math.round(todayData.glasses)}
              </div>
              <div className="text-xs" style={{ color: theme.textLight }}>
                of {todayData.goal} {currentUnit.abbrev}
              </div>
            </div>
          </div>

          {/* Right Column: Controls */}
          <div className="flex flex-col items-center space-y-3">
            {/* Add Button */}
            <button
              onClick={() => updateWaterIntake(1)}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-sm hover:shadow-md"
              style={{ 
                backgroundColor: theme.primary, 
                color: theme.textOnPrimary 
              }}
            >
              <Plus size={20} />
            </button>
            
            {/* Subtract Button */}
            <button
              onClick={() => updateWaterIntake(-1)}
              disabled={todayData.glasses === 0}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-30"
              style={{ 
                backgroundColor: theme.isDark ? '#7f1d1d' : theme.error + '20', 
                color: theme.isDark ? '#fca5a5' : theme.error 
              }}
            >
              <Minus size={16} />
            </button>

            {/* Reset Button - Only show if has intake */}
            {todayData.glasses > 0 && (
              <button
                onClick={resetToday}
                className="px-2 py-1 text-xs rounded-full border transition-all"
                style={{ borderColor: theme.border, color: theme.textLight }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : theme.border + '30';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <RotateCcw size={10} className="inline mr-1" />
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <Modal 
        open={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)}
        title="Hydration Tracking Settings"
        theme={theme}
        maxWidth="max-w-md"
        variant="modern"
      >
        <div className="space-y-6">
          {/* Unit Selection */}
          <div>
            <h4 className="text-sm font-medium mb-3" style={{ color: theme.text }}>
              Choose Unit
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(waterUnits).map(([key, unit]) => (
                <button
                  key={key}
                  onClick={() => changeUnit(key)}
                  className={`p-3 text-sm rounded-lg border transition-colors ${
                    todayData.unit === key ? 'font-semibold' : ''
                  }`}
                  style={{
                    borderColor: todayData.unit === key ? theme.primary : theme.border,
                    backgroundColor: todayData.unit === key ? theme.primary + '15' : 'transparent',
                    color: todayData.unit === key ? theme.primary : theme.text
                  }}
                >
                  {unit.label}
                  <div className="text-xs opacity-75">
                    Default: {unit.defaultGoal} {unit.abbrev}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Goal Setting */}
          <div>
            <h4 className="text-sm font-medium mb-3" style={{ color: theme.text }}>
              Research Target
            </h4>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                step={currentUnit.increment}
                value={todayData.goal}
                onChange={(e) => updateCustomGoal(parseFloat(e.target.value) || 1)}
                placeholder="Enter goal..."
                className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-opacity-50 transition-all"
                style={{
                  borderColor: theme.border,
                  backgroundColor: theme.cardBackground,
                  color: theme.text,
                  focusRingColor: theme.primary
                }}
              />
              <span className="text-sm font-medium" style={{ color: theme.textLight }}>
                {currentUnit.abbrev}
              </span>
            </div>
            <p className="text-xs mt-2" style={{ color: theme.textLight }}>
              Set hydration tracking target for research purposes. Current: {todayData.goal} {currentUnit.abbrev}
            </p>
          </div>
          
          <div className="pt-4 border-t" style={{ borderColor: theme.border }}>
            <p className="text-xs" style={{ color: theme.textLight }}>
              Note: Changing units will reset the tracking data to start fresh.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WaterTrackerWidget;