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
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
            Water Intake
          </h3>
          <div className="flex items-center gap-2">
            <ModernTooltip text="Settings" position="top">
              <button 
                onClick={() => setShowSettingsModal(true)}
                className="p-1 rounded hover:bg-gray-100 transition-colors"
                style={{ color: theme.textLight }}
              >
                <Settings size={16} />
              </button>
            </ModernTooltip>
            <Droplets size={20} style={{ color: theme.primary }} />
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-4 flex flex-col justify-center space-y-4">
        {/* Progress Circle - Compact */}
        <div className="flex items-center justify-center">
          <div className="relative w-16 h-16">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
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
        </div>

        {/* Current Intake */}
        <div className="text-center">
          <div className="text-xl font-bold" style={{ color: theme.text }}>
            {currentUnit.abbrev === 'liters' ? todayData.glasses.toFixed(1) : Math.round(todayData.glasses)}
          </div>
          <div className="text-sm" style={{ color: theme.textLight }}>
            {currentUnit.abbrev} of {todayData.goal}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => updateWaterIntake(-1)}
            disabled={todayData.glasses === 0}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50"
            style={{ 
              backgroundColor: theme.error + '15', 
              color: theme.error 
            }}
          >
            <Minus size={14} />
          </button>
          
          <button
            onClick={() => updateWaterIntake(1)}
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={{ 
              backgroundColor: theme.primary + '15', 
              color: theme.primary 
            }}
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Reset Button - Only show if has intake */}
        {todayData.glasses > 0 && (
          <div className="flex justify-center">
            <button
              onClick={resetToday}
              className="px-3 py-1 text-xs rounded-full border transition-colors hover:bg-gray-50"
              style={{ borderColor: theme.border, color: theme.textLight }}
            >
              <RotateCcw size={10} className="inline mr-1" />
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      <Modal 
        open={showSettingsModal} 
        onClose={() => setShowSettingsModal(false)}
        title="Water Intake Settings"
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
              Daily Goal
            </h4>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                step={currentUnit.increment}
                value={todayData.goal}
                onChange={(e) => updateCustomGoal(parseFloat(e.target.value) || 1)}
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
              Set your daily water intake goal. Current: {todayData.goal} {currentUnit.abbrev}
            </p>
          </div>
          
          <div className="pt-4 border-t" style={{ borderColor: theme.border }}>
            <p className="text-xs" style={{ color: theme.textLight }}>
              Note: Changing units will reset your daily intake to start fresh.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WaterTrackerWidget;