import React, { useState } from 'react';
import { Pill, Check, Info, PenTool, Beaker, Pipette } from 'lucide-react';
import InjectionSiteSelector from '../common/InjectionSiteSelector';
import { getChromeGradient, isColorDark } from '../../utils/recon';
import { penColors } from '../../utils/penColors';

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


export default function TasksList({ tasks, theme, onToggle }) {
  const [injectionTask, setInjectionTask] = useState(null);
    if (!tasks || tasks.length === 0) {
        return <p className="text-xs text-center py-3" style={{ color: theme.textLight }}>No research scheduled for today.</p>;
    }


    const amTasks = tasks.filter(t => t.time === 'AM');
    const pmTasks = tasks.filter(t => t.time === 'PM');
    const otherTasks = tasks.filter(t => t.time !== 'AM' && t.time !== 'PM');

    return (
        <div className="space-y-2 relative">
            {otherTasks.length > 0 && (
                <TaskListSection tasks={otherTasks} theme={theme} onToggle={onToggle} />
            )}
            
            {amTasks.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-gray-500">AM</span>
                        <div className="flex-1 h-px bg-gray-200"></div>
                    </div>
                    <TaskListSection tasks={amTasks} theme={theme} onToggle={onToggle} />
                </div>
            )}
            
            {pmTasks.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-gray-500">PM</span>
                        <div className="flex-1 h-px bg-gray-200"></div>
                    </div>
                    <TaskListSection tasks={pmTasks} theme={theme} onToggle={onToggle} />
                </div>
            )}
            
            <InjectionSiteSelector
              taskName={injectionTask?.name}
              task={injectionTask}
              onConfirm={(injectionSite) => {
                onToggle(injectionTask);
                setInjectionTask(null);
              }}
              onCancel={() => setInjectionTask(null)}
              theme={theme}
              isVisible={!!injectionTask}
            />
        </div>
    );
}

const TaskListSection = ({ tasks, theme, onToggle }) => {
    if (!tasks || tasks.length === 0) return null;
    return (
        <div>
            <ul className="space-y-1.5">
                {tasks.map(task => (
                    <li key={task.id} className="flex items-center justify-between p-3 rounded-lg border" style={{ backgroundColor: theme.secondary, borderColor: theme.border }}>
                        <div className="flex items-center gap-3 flex-1">
                            <div className="flex-1">
                                <div className={`font-semibold text-sm ${task.completed ? 'line-through decoration-2 text-gray-400' : ''}`} style={{ color: task.completed ? '#9ca3af' : theme.text }}>
                                    {task.name}
                                </div>
                            </div>
                        </div>
                        
                        <div className={`text-right flex items-center gap-2 ${task.completed ? 'line-through decoration-2 text-gray-400' : ''}`}>
                            <div className="text-right">
                                <div className="font-semibold text-sm" style={{ color: task.completed ? '#9ca3af' : theme.text }}>
                                    {task.dose}{task.unit ? ` ${task.unit}` : ''}
                                </div>
                            </div>
                            {task.deliveryMethod === 'pen' && (
                                <div className="flex items-center gap-1">
                                    {/* Debug info available via devLog if needed */}
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
                                onClick={() => {
                                  // Check if this is an injection task that's not completed
                                  const deliveryMethod = task.deliveryMethod || task.delivery;
                                  const isInjection = deliveryMethod === 'syringe' || deliveryMethod === 'pipette' || deliveryMethod === 'pen' || deliveryMethod === 'injection';
                                  
                                  if (isInjection && !task.completed) {
                                    setInjectionTask(task);
                                  } else {
                                    onToggle(task);
                                  }
                                }}
                                className={`w-6 h-6 rounded-sm border-2 relative flex items-center justify-center flex-shrink-0 transition-all hover:scale-110 cursor-pointer`}
                                style={{
                                    borderColor: task.completed ? theme.primary : theme.border,
                                    backgroundColor: task.completed ? theme.primary : 'transparent',
                                    borderRadius: '4px',
                                    minWidth: '24px',
                                    minHeight: '24px'
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
        if (task.deliveryMethod === 'pen') {
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
    const raw = String(penColor).trim();
    const isHex = raw.startsWith('#');
    if (isHex) return raw;
    
    // Find color by name in penColors array
    const foundColor = penColors.find(color => 
        color.name.toLowerCase() === raw.toLowerCase()
    );
    
    console.log('🎨 Pen color resolution:', {
        input: penColor,
        raw: raw,
        foundColor: foundColor,
        result: foundColor ? foundColor.hex : '#9ca3af'
    });
    
    return foundColor ? foundColor.hex : '#9ca3af';
}


