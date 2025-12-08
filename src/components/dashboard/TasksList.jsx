import React, { useState } from 'react';
import { Pill, Check, Info, PenTool, Beaker, Pipette } from 'lucide-react';
import InjectionSiteSelector from '../common/InjectionSiteSelector';
import { getChromeGradient, isColorDark } from '../../utils/recon';
import { penColors } from '../../utils/penColors';
import { isInjectionSiteTrackingEnabled } from '../../utils/injectionSiteSettings';

const colorMap = penColors.reduce((acc, c) => ({ ...acc, [c.hex.toLowerCase()]: c.name }), {});
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
        return <Pipette size={18} style={{ color: theme.text }} />;
    }
    if (type === 'supplement') {
        const deliveryLower = String(delivery || '').toLowerCase();
        switch (deliveryLower) {
            case 'injection':
            case 'syringe':
                return <Pipette size={18} style={{ color: theme.text }} />;
            case 'powder':
                return <Beaker size={18} style={{ color: theme.text }} />;
            case 'oral':
            case 'pill':
            default:
                return <Pill size={18} style={{ color: theme.text }} />;
        }
    }
    return <div className="w-4 h-4" />;
};


export default function TasksList({ tasks, theme, onToggle, setInjectionTask }) {
    if (!tasks || tasks.length === 0) {
        return <p className="text-xs text-center py-3" style={{ color: theme.textLight }}>No research scheduled for today.</p>;
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
    

    const renderTimeSection = (tasks, timeLabel) => {
        if (tasks.length === 0) return null;
        return (
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-medium text-gray-500">{timeLabel}</span>
                    <div className="flex-1 h-px bg-gray-200"></div>
                </div>
                <TaskListSection tasks={tasks} theme={theme} onToggle={onToggle} setInjectionTask={setInjectionTask} />
            </div>
        );
    };

    return (
        <div className="space-y-2 relative">
            {otherTasks.length > 0 && (
                <TaskListSection tasks={otherTasks} theme={theme} onToggle={onToggle} setInjectionTask={setInjectionTask} />
            )}
            
            {showPMFirst ? (
                // PM first (2:00 PM to 1:59 AM)
                <>
                    {renderTimeSection(pmTasks, 'PM')}
                    {renderTimeSection(amTasks, 'AM')}
                </>
            ) : (
                // AM first (2:00 AM to 1:59 PM)
                <>
                    {renderTimeSection(amTasks, 'AM')}
                    {renderTimeSection(pmTasks, 'PM')}
                </>
            )}
        </div>
    );
}

const TaskListSection = ({ tasks, theme, onToggle, setInjectionTask }) => {
    if (!tasks || tasks.length === 0) return null;
    return (
        <div>
            <ul className="space-y-1.5">
                {tasks.map(task => (
                    <li key={task.id} className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: theme.isDark ? '#1f2937' : theme.secondary }}>
                        <div className="flex items-center gap-3 flex-1">
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <div className={`font-semibold text-sm ${task.completed ? 'line-through decoration-2 text-gray-400' : ''}`} style={{ color: task.completed ? '#9ca3af' : theme.text }}>
                                        {task.name}
                                    </div>
                                    {/* Time chip - moved to right of task name */}
                                    {task.time && (
                                        <div 
                                            className="px-2 py-1 rounded-md text-xs text-white"
                                            style={{ 
                                                backgroundColor: task.completed ? '#9ca3af' : `${theme.primary}40`,
                                                opacity: task.completed ? 0.6 : 0.8
                                            }}
                                        >
                                            {task.time}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        <div className={`text-right flex items-center gap-2 ${task.completed ? 'line-through decoration-2 text-gray-400' : ''}`}>
                            <div className="text-right">
                                <div className="font-semibold text-sm" style={{ color: task.completed ? '#9ca3af' : theme.text }}>
                                    {task.dose}{task.unit ? ` ${task.unit}` : ''}
                                </div>
                            </div>
                            {/* Show pen color and type if penColor is set, regardless of delivery method */}
                            {/* This matches Calendar behavior where pen color is shown when available */}
                            {task.penColor && (
                                <div className="flex items-center gap-1">
                                    <div 
                                        className="w-3 h-3 rounded-full border border-gray-300 shadow-sm flex-shrink-0" 
                                        style={{ 
                                            background: task.completed ? '#d1d5db' : getChromeGradient(getResolvedPenColor(task.penColor)),
                                            opacity: task.completed ? 0.5 : 1
                                        }}
                                        title={`Pen Color: ${task.penColor || 'Default'}`}
                                    />
                                    {task.penType && (
                                        <span className="text-xs font-medium" style={{ color: task.completed ? '#9ca3af' : theme.textLight }}>
                                            {task.penType.toUpperCase()}
                                        </span>
                                    )}
                                </div>
                            )}
                            <div style={{ opacity: task.completed ? 0.5 : 1 }}>
                                <DeliveryIcon task={task} theme={theme} />
                            </div>
                            
                            <button
                                type="button"
                                onMouseDown={(e) => {
                                    // Prevent blur events on mobile
                                    e.preventDefault();
                                }}
                                onTouchStart={(e) => {
                                    // Prevent blur events on touch devices
                                    e.preventDefault();
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    // Check if this is an injection task that's not completed
                                    const deliveryMethod = task.deliveryMethod || task.delivery;
                                    const isInjection = deliveryMethod === 'syringe' || deliveryMethod === 'pipette' || deliveryMethod === 'pen' || deliveryMethod === 'injection';
                                    
                                    // Only show injection site selector if tracking is enabled AND it's an injection task
                                    if (isInjection && !task.completed && isInjectionSiteTrackingEnabled()) {
                                        setInjectionTask(task);
                                    } else {
                                        onToggle(task.id);
                                    }
                                }}
                                className={`w-6 h-6 rounded-sm border-2 relative flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 cursor-pointer touch-manipulation`}
                                style={{
                                    borderColor: task.completed ? theme.primary : theme.border,
                                    backgroundColor: task.completed ? theme.primary : 'transparent',
                                    borderRadius: '4px',
                                    minWidth: '24px',
                                    minHeight: '24px',
                                    WebkitTapHighlightColor: 'transparent'
                                }}
                                title={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
                            >
                                {task.completed && (
                                    <Check 
                                        size={18} 
                                        className="absolute text-white" 
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
            return <PenTool size={14} style={{ color: theme.textLight }} />;
        }
        if (task.deliveryMethod === 'syringe' || task.deliveryMethod === 'pipette') {
            return <Pipette size={14} style={{ color: theme.textLight }} />;
        }
        if (task.deliveryMethod === 'nasal') {
            return <Pipette size={14} style={{ color: theme.textLight }} />;
        }
    }
    
    // Handle supplement delivery methods
    if (task.type === 'supplement') {
        const delivery = String(task.delivery || task.deliveryMethod || '').toLowerCase();
        if (delivery === 'injection' || delivery === 'syringe') {
            return <Pipette size={14} style={{ color: theme.textLight }} />;
        }
        if (delivery === 'powder') {
            return <Beaker size={14} style={{ color: theme.textLight }} />;
        }
        if (delivery === 'pill' || delivery === 'oral') {
            return <Pill size={14} style={{ color: theme.textLight }} />;
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


