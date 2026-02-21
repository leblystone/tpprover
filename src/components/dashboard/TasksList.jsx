import React, { useState, useRef } from 'react';
import { Pill, Check, Info, PenTool, Beaker, Pipette, SprayCan, Hand, Sun, Moon } from 'lucide-react';
import InjectionSiteSelector from '../common/InjectionSiteSelector';
import { getChromeGradient, isColorDark } from '../../utils/recon';
import { penColors } from '../../utils/penColors';
import { isInjectionSiteTrackingEnabled } from '../../utils/injectionSiteSettings';

const colorMap = penColors.reduce((acc, c) => ({ ...acc, [c.hex.toLowerCase()]: c.name }), {});

/** Darken a hex color by blending with black (ratio 0–1, e.g. 0.15 = 15% darker) */
function darkenHex(hex, ratio = 0.15) {
    if (!hex || typeof hex !== 'string') return hex;
    const clean = hex.replace(/^#/, '');
    if (clean.length !== 6 && clean.length !== 8) return hex;
    const r = Math.max(0, Math.round(parseInt(clean.slice(0, 2), 16) * (1 - ratio)));
    const g = Math.max(0, Math.round(parseInt(clean.slice(2, 4), 16) * (1 - ratio)));
    const b = Math.max(0, Math.round(parseInt(clean.slice(4, 6), 16) * (1 - ratio)));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
// Preferred display names to match Reconstitution UI exactly
const penLabelOverrides = {
    '#f59e0b': 'Gold', // Amber -> Gold
    '#ffd700': 'Gold',
    '#d4af37': 'Gold',
};
// Name → Hex mapping to harmonize with Recon page constants
const penNameToHex = {
    Gold: '#B8860B',
    Silver: '#C0C0C0',
    Black: '#000000',
    Purple: '#800080',
    'Hot Pink': '#FF69B4',
    'Light Pink': '#FFB6C1',
    'Dark Blue': '#00008B',
    'Light Blue': '#ADD8E6',
    Teal: '#0080B0',
    'Lime Green': '#32CD32',
    Yellow: '#FFFF00',
    White: '#FFFFFF',
    Brown: '#8B4513',
    Burgundy: '#800020',
};

const TaskIcon = ({ type, delivery, theme }) => {
    if (type === 'peptide') {
        return <Pipette size={14} className="sm:w-[18px] sm:h-[18px]" style={{ color: theme.text }} />;
    }
    if (type === 'supplement') {
        const deliveryLower = String(delivery || '').toLowerCase();
        switch (deliveryLower) {
            case 'injection':
            case 'syringe':
                return <Pipette size={14} className="sm:w-[18px] sm:h-[18px]" style={{ color: theme.text }} />;
            case 'powder':
                return <Beaker size={14} className="sm:w-[18px] sm:h-[18px]" style={{ color: theme.text }} />;
            case 'oral':
            case 'pill':
            default:
                return <Pill size={14} className="sm:w-[18px] sm:h-[18px]" style={{ color: theme.text }} />;
        }
    }
    return <div className="w-3.5 h-3.5 sm:w-4 sm:h-4" />;
};


export default function TasksList({ tasks, theme, onToggle, setInjectionTask }) {
    if (!tasks || tasks.length === 0) {
        return <p className="text-[10px] sm:text-xs text-center py-2 sm:py-3 px-2" style={{ color: theme.textLight }}>No research scheduled for today.</p>;
    }

    const amTasks = tasks.filter(t => t.time === 'AM');
    const pmTasks = tasks.filter(t => t.time === 'PM');
    const otherTasks = tasks.filter(t => t.time !== 'AM' && t.time !== 'PM');

    // Time-based ordering logic
    // 2:00 AM to 1:59 PM: Show AM first
    // 2:00 PM to 1:59 AM: Show PM first
    const now = new Date();
    const currentHour = now.getHours();
    const showPMFirst = currentHour >= 14 || currentHour < 2; // 2 PM (14:00) to 1:59 AM
    

    const renderTimeSection = (tasks, timeLabel, isSecondSection) => {
        if (tasks.length === 0) return null;
        return (
            <div>
                {isSecondSection && (
                    <div className="widget-separator" style={{ marginBottom: '0.5rem', paddingBottom: '0.25rem' }}></div>
                )}
                <TaskListSection tasks={tasks} theme={theme} onToggle={onToggle} setInjectionTask={setInjectionTask} timeSlot={timeLabel} />
            </div>
        );
    };

    return (
        <div className="space-y-1.5 sm:space-y-2 relative">
            {otherTasks.length > 0 && (
                <TaskListSection tasks={otherTasks} theme={theme} onToggle={onToggle} setInjectionTask={setInjectionTask} timeSlot={null} />
            )}
            
            {showPMFirst ? (
                // PM first (2:00 PM to 1:59 AM)
                <>
                    {renderTimeSection(pmTasks, 'PM', false)}
                    {renderTimeSection(amTasks, 'AM', pmTasks.length > 0)}
                </>
            ) : (
                // AM first (2:00 AM to 1:59 PM)
                <>
                    {renderTimeSection(amTasks, 'AM', false)}
                    {renderTimeSection(pmTasks, 'PM', amTasks.length > 0)}
                </>
            )}
        </div>
    );
}

const TaskListSection = ({ tasks, theme, onToggle, setInjectionTask, timeSlot }) => {
    const clickTimers = useRef({});

    if (!tasks || tasks.length === 0) return null;
    return (
        <div>
            <ul className="space-y-1.5">
                {tasks.map((task, index) => (
                    <li 
                        key={task.id} 
                        className="flex items-center justify-between gap-2 py-2.5 sm:py-3 px-3 min-w-0 transition-all duration-200" 
                        style={{ 
                            backgroundColor: 'transparent',
                            borderLeft: timeSlot === 'PM'
                                ? `3px solid ${theme.isDark ? 'rgba(160, 180, 153, 0.5)' : theme.primaryDark || 'rgba(75, 95, 88, 0.5)'}`
                                : `3px solid ${theme.isDark ? 'rgba(160, 180, 153, 0.2)' : theme.primary + '40'}`,
                            boxShadow: index < tasks.length - 1 
                                ? `0 1px 0 ${theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(127, 158, 149, 0.08)'}` 
                                : 'none'
                        }}
                    >
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 overflow-hidden">
                            <div className="flex-1 min-w-0 overflow-hidden">
                                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                    <div className={`font-semibold text-xs sm:text-sm truncate ${task.completed ? 'line-through decoration-2' : ''}`} style={{ color: task.completed ? (theme.isDark ? 'rgba(255,255,255,0.35)' : '#9ca3af') : theme.text }}>
                                        {task.name}
                                    </div>
                                    {/* Time chip - PM chip darker to match PM row differentiation */}
                                    {task.time && (
                                        <div 
                                            className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs text-white whitespace-nowrap flex-shrink-0"
                                            style={{ 
                                                backgroundColor: task.completed 
                                                    ? (theme.isDark ? 'rgba(255,255,255,0.35)' : '#9ca3af') 
                                                    : (task.time === 'PM' 
                                                        ? (theme.isDark ? 'rgba(160, 180, 153, 0.85)' : theme.primaryDark) 
                                                        : (theme.isDark ? 'rgba(107, 127, 101, 0.7)' : `${theme.primary}B0`)),
                                                color: (task.time === 'PM' && theme.isDark && !task.completed) ? '#1a2020' : '#ffffff',
                                                opacity: task.completed ? 0.6 : 1
                                            }}
                                        >
                                            {task.time}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className={`text-right flex items-center gap-1 sm:gap-2 flex-shrink-0 ${task.completed ? 'line-through decoration-2' : ''}`} style={{ color: task.completed ? (theme.isDark ? 'rgba(255,255,255,0.35)' : '#9ca3af') : undefined }}>
                            <div className="text-right">
                                <div className="font-medium text-xs sm:text-sm whitespace-nowrap" style={{ color: task.completed ? (theme.isDark ? 'rgba(255,255,255,0.35)' : '#9ca3af') : theme.text }}>
                                    {task.dose}{task.unit ? ` ${task.unit}` : ''}
                                </div>
                            </div>
                            {/* Show pen color and type if penColor is set, regardless of delivery method */}
                            {/* This matches Calendar behavior where pen color is shown when available */}
                            {task.penColor && (
                                <div className="flex items-center gap-0.5 sm:gap-1">
                                    <div 
                                        className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full shadow-sm flex-shrink-0" 
                                        style={{ 
                                            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)'}`,
                                            background: task.completed ? (theme.isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db') : getChromeGradient(getResolvedPenColor(task.penColor)),
                                            opacity: task.completed ? 0.5 : 1
                                        }}
                                        title={`Pen Color: ${task.penColor || 'Default'}`}
                                    />
                                    {task.penType && (
                                        <span className="text-[10px] sm:text-xs font-medium hidden xs:inline" style={{ color: task.completed ? (theme.isDark ? 'rgba(255,255,255,0.35)' : '#9ca3af') : theme.textLight }}>
                                            {task.penType.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                            )}
                            <div className="flex-shrink-0" style={{ opacity: task.completed ? 0.5 : 1 }}>
                                <DeliveryIcon task={task} theme={theme} />
                            </div>
                            
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    // Prevent blur events on mobile
                                    e.preventDefault();
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    // Prevent rapid-fire clicks (debounce)
                                    const taskKey = `${task.id}-${Date.now()}`;
                                    const lastClick = clickTimers.current[task.id];
                                    const now = Date.now();
                                    
                                    if (lastClick && (now - lastClick) < 300) {
                                        return; // Ignore clicks within 300ms
                                    }
                                    clickTimers.current[task.id] = now;
                                    
                                    // Check if this is an injection task that's not completed
                                    const deliveryMethod = task.deliveryMethod || task.delivery;
                                    const isInjection = deliveryMethod === 'syringe' || deliveryMethod === 'pipette' || deliveryMethod === 'pen' || deliveryMethod === 'injection';
                                    
                                    // Only show injection site selector if tracking is enabled AND it's an injection task
                                    if (isInjection && !task.completed && isInjectionSiteTrackingEnabled()) {
                                        setInjectionTask(task);
                                    } else {
                                        onToggle(task);
                                    }
                                }}
                                className={`w-5 h-5 sm:w-6 sm:h-6 rounded-sm border-2 relative flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 cursor-pointer touch-manipulation`}
                                style={{
                                    borderColor: task.completed 
                                        ? (timeSlot === 'PM' 
                                            ? (theme.isDark ? '#a0b499' : (theme.primaryDark || '#3d5a4c')) 
                                            : (theme.isDark ? '#6b7f65' : theme.primary)) 
                                        : `${theme.primaryLight}60`,
                                    backgroundColor: task.completed 
                                        ? (timeSlot === 'PM' 
                                            ? (theme.isDark ? '#a0b499' : (theme.primaryDark || '#3d5a4c')) 
                                            : (theme.isDark ? '#6b7f65' : theme.primary)) 
                                        : 'transparent',
                                    borderRadius: '4px',
                                    minWidth: '20px',
                                    minHeight: '20px',
                                    WebkitTapHighlightColor: 'transparent',
                                    boxShadow: theme.isDark 
                                        ? 'inset 0 2px 4px rgba(0, 0, 0, 0.35)' 
                                        : 'inset 0 2px 4px rgba(0, 0, 0, 0.12)'
                                }}
                                title={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                            >
                                {task.completed && (
                                    <Check 
                                        size={14} 
                                        className="sm:w-[18px] sm:h-[18px] absolute text-white" 
                                        style={{ 
                                            strokeWidth: 2.5,
                                            top: '-3px',
                                            right: '-3px'
                                        }}
                                    />
                                )}
                            </button>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    )
};

const DeliveryIcon = ({ task, theme }) => {
    // Handle peptide delivery methods
    if (task.type === 'peptide') {
        // If penColor is set, show pen icon (matches Calendar behavior)
        // This handles cases where deliveryMethod is 'pipette' but penColor is set
        if (task.penColor || task.deliveryMethod === 'pen') {
            return <PenTool size={12} className="sm:w-3.5 sm:h-3.5" style={{ color: theme.textLight }} />;
        }
        if (task.deliveryMethod === 'syringe' || task.deliveryMethod === 'pipette') {
            return <Pipette size={12} className="sm:w-3.5 sm:h-3.5" style={{ color: theme.textLight }} />;
        }
        if (task.deliveryMethod === 'nasal') {
            return <SprayCan size={12} className="sm:w-3.5 sm:h-3.5" style={{ color: theme.textLight }} />;
        }
        if (task.deliveryMethod === 'topical') {
            return <Hand size={12} className="sm:w-3.5 sm:h-3.5" style={{ color: theme.textLight }} />;
        }
    }
    
    // Handle supplement delivery methods
    if (task.type === 'supplement') {
        const delivery = String(task.delivery || task.deliveryMethod || '').toLowerCase();
        if (delivery === 'injection' || delivery === 'syringe') {
            return <Pipette size={12} className="sm:w-3.5 sm:h-3.5" style={{ color: theme.textLight }} />;
        }
        if (delivery === 'powder') {
            return <Beaker size={12} className="sm:w-3.5 sm:h-3.5" style={{ color: theme.textLight }} />;
        }
        if (delivery === 'pill' || delivery === 'oral') {
            return <Pill size={12} className="sm:w-3.5 sm:h-3.5" style={{ color: theme.textLight }} />;
        }
    }
    
    return null;
}

const getResolvedPenColor = (penColor) => {
    if (!penColor) return '#9ca3af';
    const raw = String(penColor || '').trim();
    // Type safety: ensure raw is a string before calling startsWith
    if (typeof raw !== 'string' || !raw) return '#9ca3af';
    const isHex = raw.startsWith('#');
    if (isHex) return raw;
    
    // Find color by name in penColors array
    const foundColor = penColors.find(color => 
        color.name.toLowerCase() === raw.toLowerCase()
    );
    
    return foundColor ? foundColor.hex : '#9ca3af';
}


