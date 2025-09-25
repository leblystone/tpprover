import React, { useState, useEffect } from 'react';
import { Droplets, Plus, Minus, RotateCcw } from 'lucide-react';
import ModernTooltip from '../../ui/ModernTooltip';

const WaterTrackerWidget = ({ widget, theme }) => {
  const [waterData, setWaterData] = useState(() => {
    try {
      const saved = localStorage.getItem('tpprover_water_tracker');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const today = new Date().toISOString().split('T')[0];
  const todayData = waterData[today] || { glasses: 0, goal: 8, lastUpdated: null };

  // Save water data whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('tpprover_water_tracker', JSON.stringify(waterData));
    } catch (error) {
      console.warn('Failed to save water data:', error);
    }
  }, [waterData]);

  const updateWaterIntake = (change) => {
    const newGlasses = Math.max(0, todayData.glasses + change);
    setWaterData(prev => ({
      ...prev,
      [today]: {
        ...todayData,
        glasses: newGlasses,
        lastUpdated: new Date().toISOString()
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

  const updateGoal = (newGoal) => {
    setWaterData(prev => ({
      ...prev,
      [today]: {
        ...todayData,
        goal: Math.max(1, newGoal)
      }
    }));
  };

  const progressPercentage = Math.min((todayData.glasses / todayData.goal) * 100, 100);
  const isGoalReached = todayData.glasses >= todayData.goal;

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 py-3 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold" style={{ color: theme.text }}>
            Water Intake
          </h3>
          <Droplets size={20} style={{ color: theme.primary }} />
        </div>
      </div>
      
      <div className="flex-1 p-4 space-y-4">
        {/* Progress Circle */}
        <div className="flex items-center justify-center">
          <div className="relative w-24 h-24">
            <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
              {/* Background circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke={theme.border}
                strokeWidth="8"
                fill="none"
              />
              {/* Progress circle */}
              <circle
                cx="50"
                cy="50"
                r="40"
                stroke={isGoalReached ? theme.success : theme.primary}
                strokeWidth="8"
                fill="none"
                strokeDasharray={`${progressPercentage * 2.51} 251`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-lg font-bold" style={{ color: theme.text }}>
                  {todayData.glasses}
                </div>
                <div className="text-xs" style={{ color: theme.textLight }}>
                  of {todayData.goal}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="text-center">
          {isGoalReached ? (
            <p className="text-sm font-medium" style={{ color: theme.success }}>
              🎉 Goal reached!
            </p>
          ) : (
            <p className="text-sm" style={{ color: theme.textLight }}>
              {todayData.goal - todayData.glasses} glasses to go
            </p>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-3">
          <ModernTooltip text="Remove" position="top">
            <button
              onClick={() => updateWaterIntake(-1)}
              disabled={todayData.glasses === 0}
              className="p-2 rounded-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
              style={{ borderColor: theme.border }}
            >
              <Minus size={16} style={{ color: theme.text }} />
            </button>
          </ModernTooltip>
          
          <div className="px-4 py-2 rounded-lg border text-center min-w-[80px]" style={{ borderColor: theme.border }}>
            <span className="font-medium" style={{ color: theme.text }}>
              {todayData.glasses} glasses
            </span>
          </div>
          
          <ModernTooltip text="Add" position="top">
            <button
              onClick={() => updateWaterIntake(1)}
              className="p-2 rounded-full border transition-colors hover:bg-gray-50"
              style={{ borderColor: theme.border }}
            >
              <Plus size={16} style={{ color: theme.text }} />
            </button>
          </ModernTooltip>
        </div>

        {/* Goal Setting */}
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: theme.textLight }}>Daily Goal:</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateGoal(todayData.goal - 1)}
              disabled={todayData.goal <= 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Minus size={12} style={{ color: theme.textLight }} />
            </button>
            <span className="font-medium min-w-[30px] text-center" style={{ color: theme.text }}>
              {todayData.goal}
            </span>
            <button
              onClick={() => updateGoal(todayData.goal + 1)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <Plus size={12} style={{ color: theme.textLight }} />
            </button>
          </div>
        </div>

        {/* Reset Button */}
        {todayData.glasses > 0 && (
          <div className="pt-2 border-t" style={{ borderColor: theme.border }}>
            <button
              onClick={resetToday}
              className="w-full p-2 text-sm rounded border transition-colors hover:bg-gray-50"
              style={{ borderColor: theme.border, color: theme.textLight }}
            >
              <div className="flex items-center justify-center gap-2">
                <RotateCcw size={14} />
                <span>Reset Today</span>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WaterTrackerWidget;
