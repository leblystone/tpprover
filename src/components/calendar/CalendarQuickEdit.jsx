import React, { useState, useEffect } from 'react';
import { Check, X, Droplet, Pill, Syringe, Beaker } from 'lucide-react';
import { generateTaskId, toggleTaskCompletion, isTaskCompleted, getCompletionStats } from '../../utils/taskCompletion';

// Helper function to get supplement icon based on delivery method
function getSupplementIcon(delivery, size = 16) {
    switch (String(delivery || '').toLowerCase()) {
        case 'injection': return <Syringe size={size} />;
        case 'powder': return <Beaker size={size} />;
        case 'pill':
        case 'oral':
        default: return <Pill size={size} />;
    }
}

export default function CalendarQuickEdit({ date, scheduledData, theme, onClose, onTasksUpdated }) {
    const [completedTasks, setCompletedTasks] = useState({});
    const [loading, setLoading] = useState(false);

    // Load current completion status
    useEffect(() => {
        if (!scheduledData?.bySlot) return;

        const currentCompletion = {};
        
        Object.keys(scheduledData.bySlot).forEach(timeSlot => {
            const slotData = scheduledData.bySlot[timeSlot];
            currentCompletion[timeSlot] = {};

            // Check peptides
            if (slotData.peptides) {
                slotData.peptides.forEach(peptide => {
                    const task = {
                        type: 'peptide',
                        name: peptide.name,
                        dose: peptide.dose || '',
                        unit: peptide.unit || '',
                        time: timeSlot
                    };
                    const taskId = generateTaskId(task);
                    currentCompletion[timeSlot][taskId] = isTaskCompleted(taskId, date, timeSlot);
                });
            }

            // Check supplements
            if (slotData.supplements) {
                slotData.supplements.forEach(supplement => {
                    const suppData = typeof supplement === 'object' ? supplement : { name: supplement };
                    const task = {
                        type: 'supplement',
                        name: suppData.name,
                        dose: suppData.dose || '',
                        unit: '',
                        time: timeSlot
                    };
                    const taskId = generateTaskId(task);
                    currentCompletion[timeSlot][taskId] = isTaskCompleted(taskId, date, timeSlot);
                });
            }
        });

        setCompletedTasks(currentCompletion);
    }, [date, scheduledData]);

    const handleTaskToggle = async (timeSlot, taskId, currentStatus) => {
        setLoading(true);
        
        // Update local state immediately for responsive UI
        setCompletedTasks(prev => ({
            ...prev,
            [timeSlot]: {
                ...prev[timeSlot],
                [taskId]: !currentStatus
            }
        }));

        // Update unified completion system
        toggleTaskCompletion(taskId, !currentStatus, date, timeSlot);

        // Notify parent component to refresh
        onTasksUpdated?.();
        
        setLoading(false);
    };

    const handleMarkAllCompleted = (timeSlot) => {
        if (!scheduledData?.bySlot?.[timeSlot]) return;

        const slotData = scheduledData.bySlot[timeSlot];
        const taskIds = [];

        // Collect all task IDs for this slot
        if (slotData.peptides) {
            slotData.peptides.forEach(peptide => {
                const task = {
                    type: 'peptide',
                    name: peptide.name,
                    dose: peptide.dose || '',
                    unit: peptide.unit || '',
                    time: timeSlot
                };
                taskIds.push(generateTaskId(task));
            });
        }

        if (slotData.supplements) {
            slotData.supplements.forEach(supplement => {
                const suppData = typeof supplement === 'object' ? supplement : { name: supplement };
                const task = {
                    type: 'supplement',
                    name: suppData.name,
                    dose: suppData.dose || '',
                    unit: '',
                    time: timeSlot
                };
                taskIds.push(generateTaskId(task));
            });
        }

        // Mark all tasks as completed
        const newCompletedTasks = { ...completedTasks };
        if (!newCompletedTasks[timeSlot]) newCompletedTasks[timeSlot] = {};

        taskIds.forEach(taskId => {
            newCompletedTasks[timeSlot][taskId] = true;
            toggleTaskCompletion(taskId, true, date, timeSlot);
        });

        setCompletedTasks(newCompletedTasks);
        onTasksUpdated?.();
    };

    const renderTimeSlot = (timeSlot, slotData) => {
        const peptides = slotData.peptides || [];
        const supplements = slotData.supplements || [];
        const totalTasks = peptides.length + supplements.length;
        const completedCount = Object.values(completedTasks[timeSlot] || {}).filter(Boolean).length;

        if (totalTasks === 0) return null;

        return (
            <div key={timeSlot} className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-semibold" style={{ color: theme.text }}>
                        {timeSlot} ({completedCount}/{totalTasks})
                    </h4>
                    <button
                        onClick={() => handleMarkAllCompleted(timeSlot)}
                        className="px-3 py-1 text-sm rounded-md transition-colors"
                        style={{
                            backgroundColor: theme.primary,
                            color: theme.textOnPrimary
                        }}
                        disabled={loading || completedCount === totalTasks}
                    >
                        Mark All Done
                    </button>
                </div>

                <div className="space-y-2">
                    {/* Render peptides */}
                    {peptides.map((peptide, index) => {
                        const task = {
                            type: 'peptide',
                            name: peptide.name,
                            dose: peptide.dose || '',
                            unit: peptide.unit || '',
                            time: timeSlot
                        };
                        const taskId = generateTaskId(task);
                        const isCompleted = completedTasks[timeSlot]?.[taskId] || false;

                        return (
                            <div
                                key={`peptide-${index}`}
                                className="flex items-center justify-between p-3 rounded-lg border"
                                style={{
                                    backgroundColor: isCompleted ? theme.success + '10' : theme.cardBackground,
                                    borderColor: isCompleted ? theme.success : theme.border
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <Droplet size={18} style={{ color: theme.primary }} />
                                    <div>
                                        <span className={`font-medium ${isCompleted ? 'line-through' : ''}`}
                                              style={{ color: isCompleted ? theme.textLight : theme.text }}>
                                            {peptide.name}
                                        </span>
                                        {peptide.dose && (
                                            <span className="ml-2 text-sm" style={{ color: theme.textLight }}>
                                                {peptide.dose} {peptide.unit}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleTaskToggle(timeSlot, taskId, isCompleted)}
                                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all"
                                    style={{
                                        borderColor: isCompleted ? theme.success : theme.border,
                                        backgroundColor: isCompleted ? theme.success : 'transparent'
                                    }}
                                    disabled={loading}
                                >
                                    {isCompleted && <Check size={14} className="text-white" />}
                                </button>
                            </div>
                        );
                    })}

                    {/* Render supplements */}
                    {supplements.map((supplement, index) => {
                        const suppData = typeof supplement === 'object' ? supplement : { name: supplement };
                        const task = {
                            type: 'supplement',
                            name: suppData.name,
                            dose: suppData.dose || '',
                            unit: '',
                            time: timeSlot
                        };
                        const taskId = generateTaskId(task);
                        const isCompleted = completedTasks[timeSlot]?.[taskId] || false;

                        return (
                            <div
                                key={`supplement-${index}`}
                                className="flex items-center justify-between p-3 rounded-lg border"
                                style={{
                                    backgroundColor: isCompleted ? theme.success + '10' : theme.cardBackground,
                                    borderColor: isCompleted ? theme.success : theme.border
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    {getSupplementIcon(suppData.delivery, 18)}
                                    <div>
                                        <span className={`font-medium ${isCompleted ? 'line-through' : ''}`}
                                              style={{ color: isCompleted ? theme.textLight : theme.text }}>
                                            {suppData.name}
                                        </span>
                                        {suppData.dose && (
                                            <span className="ml-2 text-sm" style={{ color: theme.textLight }}>
                                                {suppData.dose}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleTaskToggle(timeSlot, taskId, isCompleted)}
                                    className="w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all"
                                    style={{
                                        borderColor: isCompleted ? theme.success : theme.border,
                                        backgroundColor: isCompleted ? theme.success : 'transparent'
                                    }}
                                    disabled={loading}
                                >
                                    {isCompleted && <Check size={14} className="text-white" />}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    if (!scheduledData?.bySlot) {
        return null;
    }

    const dateDisplay = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto m-4"
                 style={{ backgroundColor: theme.cardBackground }}>
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border }}>
                    <div>
                        <h3 className="text-xl font-bold" style={{ color: theme.text }}>
                            Quick Edit Tasks
                        </h3>
                        <p className="text-sm mt-1" style={{ color: theme.textLight }}>
                            {dateDisplay}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        style={{ color: theme.textLight }}
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {Object.keys(scheduledData.bySlot).map(timeSlot => 
                        renderTimeSlot(timeSlot, scheduledData.bySlot[timeSlot])
                    )}
                    
                    {Object.keys(scheduledData.bySlot).length === 0 && (
                        <div className="text-center py-8">
                            <p style={{ color: theme.textLight }}>
                                No scheduled tasks for this day.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

