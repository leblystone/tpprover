import React, { useState, useEffect, useMemo } from 'react';
import { Drop, Plus, Minus, ArrowCounterClockwise, GearSix, ChartBar, CalendarDots, ClockCounterClockwise } from '@phosphor-icons/react';
import ModernTooltip from '../../ui/ModernTooltip';
import Modal from '../../common/Modal';
import ExpandableTooltip from '../../ui/ExpandableTooltip';
import { WIDGET_TOOLTIPS } from '../../../utils/widgetTooltips';
import { getWaterDayAmount, tryHydrationGoalRewards } from '../../../utils/hydrationStreak';

/** `page` = full Bio-Metrics route; `widget` = dashboard card */
const WaterTrackerWidget = ({ widget, theme, variant = 'widget' }) => {
  const isPage = variant === 'page';
  const [waterData, setWaterData] = useState(() => {
    try {
      const saved = localStorage.getItem('tpprover_water_tracker');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [goalInputValue, setGoalInputValue] = useState('');

  // Water units configuration
  const waterUnits = {
    glasses: { label: 'Glasses', abbrev: 'glasses', defaultGoal: 8, increment: 1 },
    oz: { label: 'Fluid Ounces', abbrev: 'fl oz', defaultGoal: 64, increment: 8 },
    ml: { label: 'Milliliters', abbrev: 'ml', defaultGoal: 2000, increment: 250 },
    cups: { label: 'Cups', abbrev: 'cups', defaultGoal: 8, increment: 1 },
    liters: { label: 'Liters', abbrev: 'L', defaultGoal: 2, increment: 0.25 }
  };

  const today = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  const todayData = waterData[today] || { 
    glasses: 0, 
    goal: 8, 
    unit: 'glasses',
    lastUpdated: null 
  };

  // Reload from localStorage when cloud data arrives
  useEffect(() => {
    const reload = () => {
      try {
        const saved = localStorage.getItem('tpprover_water_tracker');
        if (saved) {
          isExternalUpdate.current = true;
          setWaterData(JSON.parse(saved));
        }
      } catch {}
    };
    window.addEventListener('tpp:cloud-data-loaded', reload);
    return () => {
      window.removeEventListener('tpp:cloud-data-loaded', reload);
    };
  }, []);

  // Save water data whenever it changes (skip the event to avoid re-triggering our own listener)
  const isExternalUpdate = React.useRef(false);
  useEffect(() => {
    if (isExternalUpdate.current) {
      isExternalUpdate.current = false;
      return;
    }
    try {
      localStorage.setItem('tpprover_water_tracker', JSON.stringify(waterData));
      window.dispatchEvent(new CustomEvent('tpp:water-tracker-updated', { detail: { waterData } }));
    } catch (error) {
      console.warn('Failed to save water data:', error);
    }
  }, [waterData]);

  const currentUnit = waterUnits[todayData.unit] || waterUnits.glasses;
  const intakeToday = getWaterDayAmount(todayData);
  const progress = todayData.goal > 0 ? Math.min(intakeToday / todayData.goal, 1) : 0;

  const updateWaterIntake = (change) => {
    setWaterData(prev => {
      const td = prev[today] || { glasses: 0, goal: 8, unit: 'glasses' };
      const unitCfg = waterUnits[td.unit] || waterUnits.glasses;
      const increment = change * unitCfg.increment;
      const cur = getWaterDayAmount(td);
      const newAmount = Math.max(0, cur + increment);
      const nextDay = {
        ...td,
        glasses: newAmount,
        amount: newAmount,
        lastUpdated: new Date().toISOString(),
      };
      const next = { ...prev, [today]: nextDay };
      queueMicrotask(() => tryHydrationGoalRewards(today, nextDay));
      return next;
    });
  };

  const updateGoal = (newGoal) => {
    setWaterData(prev => {
      const td = prev[today] || { glasses: 0, goal: 8, unit: 'glasses' };
      const cur = getWaterDayAmount(td);
      const g = Math.max(1, newGoal);
      const nextDay = {
        ...td,
        goal: g,
        glasses: cur,
        amount: cur,
        lastUpdated: new Date().toISOString(),
      };
      const next = { ...prev, [today]: nextDay };
      queueMicrotask(() => tryHydrationGoalRewards(today, nextDay));
      return next;
    });
  };

  const changeUnit = (unitKey) => {
    const newUnit = waterUnits[unitKey];
    const newGoal = newUnit.defaultGoal;
    
    setWaterData(prev => ({
      ...prev,
      [today]: {
        ...todayData,
        unit: unitKey,
        goal: newGoal,
        glasses: 0,
        amount: 0,
        lastUpdated: new Date().toISOString()
      }
    }));
    
    // Update input value to show the new unit's default goal
    if (showSettingsModal) {
      setGoalInputValue(newGoal.toString());
    }
  };

  const updateCustomGoal = (newGoal) => {
    setWaterData(prev => {
      const td = prev[today] || { glasses: 0, goal: 8, unit: 'glasses' };
      const cur = getWaterDayAmount(td);
      const g = Math.max(1, newGoal);
      const nextDay = {
        ...td,
        goal: g,
        glasses: cur,
        amount: cur,
        lastUpdated: new Date().toISOString(),
      };
      const next = { ...prev, [today]: nextDay };
      queueMicrotask(() => tryHydrationGoalRewards(today, nextDay));
      return next;
    });
  };

  // Initialize goal input value when modal opens or goal changes
  useEffect(() => {
    if (showSettingsModal) {
      setGoalInputValue(todayData.goal?.toString() || '');
    }
  }, [showSettingsModal, todayData.goal]);

  // Handle goal input change - allow empty for clearing
  const handleGoalInputChange = (e) => {
    const value = e.target.value;
    // Allow empty string, or numbers (including decimals and negative for now, we'll validate on blur)
    // This allows the user to completely clear the field
    setGoalInputValue(value);
  };

  // Handle goal input blur - save the value
  const handleGoalInputBlur = () => {
    const trimmedValue = goalInputValue.trim();
    
    // If empty, restore to current goal
    if (trimmedValue === '') {
      setGoalInputValue(todayData.goal?.toString() || '8');
      return;
    }
    
    const numValue = parseFloat(trimmedValue);
    
    // If valid positive number, save it
    if (!isNaN(numValue) && numValue > 0) {
      updateCustomGoal(numValue);
      setGoalInputValue(numValue.toString()); // Normalize the display
    } else {
      // If invalid, restore to current goal
      setGoalInputValue(todayData.goal?.toString() || '8');
    }
  };

  const resetToday = () => {
    setWaterData(prev => ({
      ...prev,
      [today]: {
        ...todayData,
        glasses: 0,
        amount: 0,
        lastUpdated: new Date().toISOString()
      }
    }));
  };

  // Process history data for analytics and history list
  const historyData = useMemo(() => {
    const entries = Object.entries(waterData)
      .filter(([date]) => {
        const entry = waterData[date];
        return entry && getWaterDayAmount(entry) > 0;
      })
      .map(([date, data]) => {
        const entryDate = new Date(date);
        const amt = getWaterDayAmount(data);
        const gl = data.goal || 8;
        return {
          date,
          dateObj: entryDate,
          amount: amt,
          goal: gl,
          unit: data.unit || 'glasses',
          progress: gl > 0 ? Math.min(amt / gl, 1) : 0
        };
      })
      .sort((a, b) => b.dateObj - a.dateObj); // Most recent first

    return entries;
  }, [waterData]);

  // Get last 30 days for graph
  const graphData = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateKey = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
      const dayData = waterData[dateKey];
      
      const amt = dayData ? getWaterDayAmount(dayData) : 0;
      if (dayData && amt > 0) {
        const gl = dayData.goal || 8;
        days.push({
          date: dateKey,
          dateObj: date,
          amount: amt,
          goal: gl,
          unit: dayData.unit || todayData.unit,
          progress: gl > 0 ? Math.min(amt / gl, 1) : 0
        });
      } else {
        days.push({
          date: dateKey,
          dateObj: date,
          amount: 0,
          goal: 0,
          unit: todayData.unit,
          progress: 0
        });
      }
    }
    return days;
  }, [waterData, todayData.unit]);

  return (
    <div className={isPage ? 'flex flex-col w-full min-h-0' : 'h-full flex flex-col'}>
      <div className={`${isPage ? 'px-4 py-4' : 'px-4 py-3'} widget-separator`} style={{ borderColor: theme.isDark ? 'transparent' : 'rgba(47, 59, 58, 0.4)' }}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold flex items-center gap-2" style={{ color: theme.text }}>
            Hydration
            <Drop size={22} weight="duotone" style={{ color: theme.isDark ? '#0080a7' : theme.primary }} />
          </h3>
          <div className="flex items-center gap-2">
            <ExpandableTooltip content={WIDGET_TOOLTIPS.water_tracker} theme={theme} />
            <ModernTooltip text="History & Analytics" position="top">
              <button 
                onClick={() => setShowHistoryModal(true)}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-all relative overflow-hidden btn-primary-inset"
                style={{ 
                  backgroundColor: theme.primary,
                  color: '#FFFFFF',
                  boxShadow: `inset 0 2px 4px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.1)`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                <ClockCounterClockwise size={15} weight="bold" color="#FFFFFF" />
              </button>
            </ModernTooltip>
          </div>
        </div>
      </div>
      
      <div className={`flex-1 flex items-center justify-center ${isPage ? 'p-4 sm:p-6 min-h-[260px]' : 'p-4'}`}>
        <div className={`w-full grid gap-4 items-center ${isPage ? 'grid-cols-1 sm:grid-cols-2 max-w-lg sm:max-w-none mx-auto' : 'grid-cols-2'}`}>
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
              <div className="text-xl lg:text-lg font-bold" style={{ color: theme.text }}>
                {currentUnit.abbrev === 'liters' ? intakeToday.toFixed(1) : Math.round(intakeToday)}
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
              className="w-12 h-12 rounded-full flex items-center justify-center transition-colors shadow-sm hover:shadow-md btn-primary-inset"
              style={{ 
                backgroundColor: theme.primary, 
                color: theme.textOnPrimary 
              }}
            >
              <Plus size={20} weight="bold" />
            </button>
            
            {/* Subtract Button */}
            <button
              onClick={() => updateWaterIntake(-1)}
              disabled={intakeToday === 0}
              className="w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-30"
              style={{ 
                backgroundColor: theme.isDark ? '#7f1d1d' : theme.error + '20', 
                color: theme.isDark ? '#fca5a5' : theme.error 
              }}
            >
              <Minus size={16} weight="bold" />
            </button>

            {/* Reset Button - Only show if has intake */}
            {intakeToday > 0 && (
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
                <ArrowCounterClockwise size={10} weight="bold" className="inline mr-1" />
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
                type="text"
                inputMode="decimal"
                value={goalInputValue}
                onChange={handleGoalInputChange}
                onBlur={handleGoalInputBlur}
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

      {/* History & Analytics Modal */}
      <Modal 
        open={showHistoryModal} 
        onClose={() => setShowHistoryModal(false)}
        title="Hydration History & Analytics"
        titleExtra={
          <ModernTooltip text="Settings" position="left">
            <button
              onClick={() => {
                setShowHistoryModal(false);
                setShowSettingsModal(true);
              }}
              className="p-1.5 rounded-lg transition-all"
              style={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                color: '#FFFFFF'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <GearSix size={18} weight="duotone" />
            </button>
          </ModernTooltip>
        }
        theme={theme}
        maxWidth="max-w-5xl"
        variant="modern"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Analytics Graph */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <ChartBar size={20} weight="duotone" style={{ color: theme.primary }} />
              <h4 className="text-base font-semibold" style={{ color: theme.text }}>
                Daily Totals (Last 30 Days)
              </h4>
            </div>
            
            {graphData.length > 0 && graphData.some(d => d.amount > 0) ? (
              <div className="relative">
                <div className="p-4 rounded-xl border" style={{ 
                  borderColor: theme.border, 
                  backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)' 
                }}>
                  <div className="h-64 relative">
                    <svg width="100%" height="100%" viewBox="0 0 400 256" className="rounded-lg">
                      {/* Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => (
                        <line
                          key={idx}
                          x1="40"
                          y1={256 * ratio}
                          x2="380"
                          y2={256 * ratio}
                          stroke={theme.border}
                          strokeWidth="0.5"
                          opacity="0.2"
                          strokeDasharray={ratio === 0 || ratio === 1 ? "0" : "2,2"}
                        />
                      ))}
                      
                      {/* Y-axis labels */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                        const maxAmount = Math.max(...graphData.map(d => d.amount), 1);
                        const value = maxAmount * (1 - ratio);
                        return (
                          <text
                            key={idx}
                            x="35"
                            y={256 * ratio + 4}
                            textAnchor="end"
                            fontSize="10"
                            fill={theme.textLight}
                            opacity="0.7"
                          >
                            {value > 0 ? (currentUnit.abbrev === 'liters' ? value.toFixed(1) : Math.round(value)) : '0'}
                          </text>
                        );
                      })}
                      
                      {/* Graph bars with gradient effect */}
                      {graphData.map((day, index) => {
                        if (day.amount === 0) return null;
                        
                        const maxAmount = Math.max(...graphData.map(d => d.amount), 1);
                        const barHeight = (day.amount / maxAmount) * 200;
                        const barWidth = 320 / graphData.length;
                        const x = 40 + (index * barWidth) + (barWidth * 0.1);
                        const y = 230 - barHeight;
                        
                        return (
                          <g key={day.date}>
                            {/* Bar with gradient */}
                            <defs>
                              <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={theme.primary} stopOpacity="0.8" />
                                <stop offset="100%" stopColor={theme.primary} stopOpacity="0.4" />
                              </linearGradient>
                            </defs>
                            <rect
                              x={x}
                              y={y}
                              width={barWidth * 0.8}
                              height={barHeight}
                              fill={`url(#gradient-${index})`}
                              rx="4"
                              style={{ transition: 'all 0.3s ease' }}
                            />
                            
                            {/* Goal line indicator */}
                            {day.goal > 0 && (
                              <line
                                x1={x}
                                y1={230 - (day.goal / maxAmount) * 200}
                                x2={x + barWidth * 0.8}
                                y2={230 - (day.goal / maxAmount) * 200}
                                stroke={theme.isDark ? '#60a5fa' : '#3b82f6'}
                                strokeWidth="1.5"
                                strokeDasharray="3,3"
                                opacity="0.6"
                              />
                            )}
                            
                            {/* Day label (every 5 days) */}
                            {index % 5 === 0 && (
                              <text
                                x={x + barWidth * 0.4}
                                y="250"
                                textAnchor="middle"
                                fontSize="9"
                                fill={theme.textLight}
                                opacity="0.6"
                              >
                                {day.dateObj.getDate()}
                              </text>
                            )}
                          </g>
                        );
                      })}
                      
                      {/* X-axis line */}
                      <line
                        x1="40"
                        y1="230"
                        x2="380"
                        y2="230"
                        stroke={theme.border}
                        strokeWidth="1.5"
                      />
                    </svg>
                  </div>
                  
                  {/* Stats summary */}
                  <div className="mt-4 grid grid-cols-3 gap-3 pt-4 border-t" style={{ borderColor: theme.border }}>
                    <div className="text-center">
                      <div className="text-xs opacity-60" style={{ color: theme.textLight }}>Avg Daily</div>
                      <div className="text-base lg:text-sm font-bold" style={{ color: theme.primary }}>
                        {graphData.filter(d => d.amount > 0).length > 0
                          ? (graphData.reduce((sum, d) => sum + d.amount, 0) / graphData.filter(d => d.amount > 0).length).toFixed(1)
                          : '0'}
                      </div>
                      <div className="text-xs opacity-60" style={{ color: theme.textLight }}>{currentUnit.abbrev}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs opacity-60" style={{ color: theme.textLight }}>Best Day</div>
                      <div className="text-base lg:text-sm font-bold" style={{ color: theme.primary }}>
                        {Math.max(...graphData.map(d => d.amount), 0).toFixed(1)}
                      </div>
                      <div className="text-xs opacity-60" style={{ color: theme.textLight }}>{currentUnit.abbrev}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs opacity-60" style={{ color: theme.textLight }}>Days Tracked</div>
                      <div className="text-base lg:text-sm font-bold" style={{ color: theme.primary }}>
                        {graphData.filter(d => d.amount > 0).length}
                      </div>
                      <div className="text-xs opacity-60" style={{ color: theme.textLight }}>of 30</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 rounded-xl border text-center" style={{ 
                borderColor: theme.border, 
                backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)' 
              }}>
                <Drop size={48} weight="duotone" className="mx-auto mb-3 opacity-30" style={{ color: theme.textLight }} />
                <p className="text-sm" style={{ color: theme.textLight }}>
                  No hydration data yet. Start tracking to see your analytics!
                </p>
              </div>
            )}
          </div>

          {/* Right Column: History List */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDots size={20} weight="duotone" style={{ color: theme.primary }} />
              <h4 className="text-base font-semibold" style={{ color: theme.text }}>
                Daily History
              </h4>
            </div>
            
            {historyData.length > 0 ? (
              <div className="space-y-1.5 max-h-[28rem] overflow-y-auto pr-2" style={{
                scrollbarWidth: 'thin',
                scrollbarColor: `${theme.border} transparent`
              }}>
                {historyData.map((entry, index) => {
                  const isToday = entry.date === today;
                  const unit = waterUnits[entry.unit] || waterUnits.glasses;
                  const displayAmount = unit.abbrev === 'liters' 
                    ? entry.amount.toFixed(1) 
                    : Math.round(entry.amount);
                  
                  return (
                    <div
                      key={entry.date}
                      className="p-2.5 rounded-lg border transition-all hover:shadow-sm"
                      style={{
                        borderColor: isToday ? theme.primary : theme.border,
                        backgroundColor: isToday 
                          ? theme.primary + '10' 
                          : theme.isDark 
                            ? 'rgba(0, 0, 0, 0.2)' 
                            : theme.cardBackground,
                        boxShadow: isToday 
                          ? `0 1px 4px ${theme.primary}20` 
                          : 'none'
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <div 
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: theme.primary }}
                          />
                          <span className="text-xs font-medium truncate" style={{ color: theme.text }}>
                            {entry.dateObj.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric' 
                            })}
                          </span>
                          {isToday && (
                            <span 
                              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0"
                              style={{ 
                                backgroundColor: theme.primary + '20',
                                color: theme.primary
                              }}
                            >
                              Today
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="text-right">
                            <div className="text-sm font-bold" style={{ color: theme.text }}>
                              {displayAmount} <span className="text-xs font-normal opacity-70">{unit.abbrev}</span>
                            </div>
                            {entry.goal > 0 && (
                              <div className="text-[10px] leading-tight" style={{ color: theme.textLight }}>
                                {Math.round(entry.progress * 100)}% of {entry.goal}
                              </div>
                            )}
                          </div>
                          {entry.progress >= 1 && entry.goal > 0 && (
                            <span className="text-xs" style={{ color: theme.primary }}>
                              ✓
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Compact progress bar */}
                      {entry.goal > 0 && (
                        <div className="mt-1.5">
                          <div className="h-1 rounded-full overflow-hidden" style={{ backgroundColor: theme.border + '30' }}>
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${Math.min(entry.progress * 100, 100)}%`,
                                background: `linear-gradient(90deg, ${theme.primary}, ${theme.primary}dd)`
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 rounded-xl border text-center" style={{ 
                borderColor: theme.border, 
                backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)' 
              }}>
                <CalendarDots size={48} weight="duotone" className="mx-auto mb-3 opacity-30" style={{ color: theme.textLight }} />
                <p className="text-sm" style={{ color: theme.textLight }}>
                  No history yet. Start tracking your hydration to build your history!
                </p>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default WaterTrackerWidget;