import React from 'react';
import { Pill, Syringe, Check, Info, PenTool, Droplet, Beaker } from 'lucide-react';
import { getChromeGradient, isColorDark } from '../../utils/recon';
import { penColors } from '../recon/ReconCalculatorPanel';

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
        return <Droplet size={18} style={{ color: theme.text }} />;
    }
    if (type === 'supplement') {
        switch (String(delivery || '').toLowerCase()) {
            case 'injection': return <Syringe size={18} style={{ color: theme.text }} />;
            case 'powder': return <Beaker size={18} style={{ color: theme.text }} />;
            case 'pill':
            default: return <Pill size={18} style={{ color: theme.text }} />;
        }
    }
    return <div className="w-4 h-4" />;
};


export default function TasksList({ tasks, theme, onToggle }) {
    if (!tasks || tasks.length === 0) {
        return <p className="text-sm text-center py-4" style={{ color: theme.textLight }}>No research scheduled for today.</p>;
    }

    const amTasks = tasks.filter(t => t.time === 'AM');
    const pmTasks = tasks.filter(t => t.time === 'PM');
    const otherTasks = tasks.filter(t => t.time !== 'AM' && t.time !== 'PM');

    return (
        <div className="space-y-4">
            {otherTasks.length > 0 && (
                <TaskListSection tasks={otherTasks} theme={theme} onToggle={onToggle} />
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 md:gap-x-4">
                <TaskListSection title="AM" tasks={amTasks} theme={theme} onToggle={onToggle} />
                <div className="mt-4 border-t pt-4 md:mt-0 md:border-t-0 md:border-l md:pl-4" style={{ borderColor: theme.border }}>
                     <TaskListSection title="PM" tasks={pmTasks} theme={theme} onToggle={onToggle} />
                </div>
            </div>
        </div>
    );
}

const TaskListSection = ({ title, tasks, theme, onToggle }) => {
    if (!tasks || tasks.length === 0) return null;
    return (
        <div>
            <h4 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: theme.textLight }}>{title}</h4>
            <ul className="space-y-2">
                {tasks.map(task => (
                    <li key={task.id} className="flex items-center justify-between p-3 rounded-md border" style={{ backgroundColor: theme.secondary, borderColor: theme.border }}>
                         <div className="flex items-center gap-3 flex-1">
                            <button
                                onClick={() => onToggle(task.id)}
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all`}
                                style={{
                                    borderColor: task.completed ? theme.primary : theme.border,
                                    backgroundColor: task.completed ? theme.primary : 'transparent'
                                }}
                            >
                                {task.completed && <Check size={12} className="text-white" />}
                            </button>
                            <TaskIcon type={task.type} delivery={task.delivery} theme={theme} />
                            <div className={`flex-1 ${task.completed ? 'line-through text-gray-400' : ''}`}>
                                <span className="font-semibold">{task.name}</span>
                                <span className="text-sm ml-2">{task.dose} {task.unit}</span>
                            </div>
                        </div>
                        
                        {task.type === 'peptide' && task.deliveryMethod && (
                            <DeliveryChip task={task} />
                        )}
                    </li>
                ))}
            </ul>
        </div>
    )
};

const DeliveryChip = ({ task }) => {
    if (task.deliveryMethod === 'pen') {
        const raw = String(task.penColor || '').trim();
        const isHex = raw.startsWith('#');
        const resolvedHex = isHex ? raw : (Object.entries(penColors).find(([name, hex]) => name.toLowerCase() === raw.toLowerCase())?.[1] || '#9ca3af');
        const lowerHex = resolvedHex.toLowerCase();
        const override = penLabelOverrides[lowerHex];
        const mappedName = colorMap[lowerHex];
        const nameFromHex = override || mappedName;
        const colorName = isHex ? (nameFromHex || raw) : raw;
        const textColor = isColorDark(resolvedHex) ? 'white' : '#1f2937'; // white or dark gray
        return (
            <div 
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ml-2 shadow-md" 
                style={{ background: getChromeGradient(resolvedHex), color: textColor }}
            >
                <PenTool size={14} style={{ color: textColor }} />
                <span>{colorName ? `${colorName} Pen` : 'Pen'}</span>
            </div>
        );
    }

    if (task.deliveryMethod === 'syringe') {
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold text-gray-700 ml-2" style={{backgroundColor: '#e5e7eb'}}>
                <Syringe size={14} />
                <span>Syringe</span>
            </div>
        );
    }

    return null;
}


