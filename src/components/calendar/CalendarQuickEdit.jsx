import React, { useState, useEffect } from 'react';
import { Check, X, Droplet, Pill, Syringe, Beaker } from 'lucide-react';
import { generateTaskId, toggleTaskCompletion, isTaskCompleted, getCompletionStats } from '../../utils/taskCompletion';
import TaskDisplay from './TaskDisplay';

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

    // Convert date string to Date object if needed
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Debug: Log the scheduled data structure
    console.log('🔍 CalendarQuickEdit received data:', {
        date,
        scheduledData,
        bySlot: scheduledData?.bySlot,
        amSlot: scheduledData?.bySlot?.AM,
        pmSlot: scheduledData?.bySlot?.PM,
        morningSlot: scheduledData?.bySlot?.Morning,
        eveningSlot: scheduledData?.bySlot?.Evening
    });

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
            <div key={timeSlot} className="space-y-3">
                <div className="flex items-center justify-between sticky top-0 py-3 px-4 -mx-4 rounded-xl" 
                     style={{ 
                         backgroundColor: theme.secondary,
                         zIndex: 10
                     }}>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" 
                             style={{ backgroundColor: theme.primary + '20' }}>
                            <span className="text-sm font-bold" style={{ color: theme.primary }}>
                                {timeSlot}
                            </span>
                        </div>
                        <div>
                            <h4 className="text-base font-semibold" style={{ color: theme.text }}>
                                {timeSlot === 'AM' ? 'Morning' : 'Evening'}
                            </h4>
                            <p className="text-xs" style={{ color: theme.textLight }}>
                                {completedCount} of {totalTasks} completed
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => handleMarkAllCompleted(timeSlot)}
                        className="px-4 py-2 text-sm font-medium rounded-lg transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            backgroundColor: completedCount === totalTasks ? theme.success : theme.primary,
                            color: theme.textOnPrimary
                        }}
                        disabled={loading || completedCount === totalTasks}
                    >
                        {completedCount === totalTasks ? '✓ Complete' : 'Mark All Done'}
                    </button>
                </div>

                <div className="space-y-2 pl-2">
                    {/* Render peptides */}
                    {peptides.map((peptide, index) => {
                        console.log(`🔍 Processing peptide ${index} in ${timeSlot}:`, peptide);
                        const task = {
                            type: 'peptide',
                            name: peptide.name,
                            dose: peptide.dose || '',
                            unit: peptide.unit || '',
                            time: timeSlot,
                            delivery: peptide.delivery || 'injection',
                            deliveryMethod: peptide.deliveryMethod || 'injection',
                            penColor: peptide.penColor,
                            penType: peptide.penType
                        };
                        console.log(`🔍 Created task for ${timeSlot}:`, task);
                        const taskId = generateTaskId(task);
                        const isCompleted = completedTasks[timeSlot]?.[taskId] || false;

                        return (
                            <TaskDisplay
                                key={`peptide-${index}`}
                                task={{ ...task, completed: isCompleted }}
                                theme={theme}
                                date={dateObj}
                                timeSlot={timeSlot}
                                onToggle={() => handleTaskToggle(timeSlot, taskId, isCompleted)}
                                size="normal"
                            />
                        );
                    })}

                    {/* Render supplements */}
                    {supplements.map((supplement, index) => {
                        const suppData = typeof supplement === 'object' ? supplement : { name: supplement };
                        const task = {
                            type: 'supplement',
                            name: suppData.name,
                            dose: suppData.dose || '',
                            unit: suppData.unit || '',
                            time: timeSlot,
                            delivery: suppData.delivery || 'oral'
                        };
                        const taskId = generateTaskId(task);
                        const isCompleted = completedTasks[timeSlot]?.[taskId] || false;

                        return (
                            <TaskDisplay
                                key={`supplement-${index}`}
                                task={{ ...task, completed: isCompleted }}
                                theme={theme}
                                date={dateObj}
                                timeSlot={timeSlot}
                                onToggle={() => handleTaskToggle(timeSlot, taskId, isCompleted)}
                                size="normal"
                            />
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
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col"
                 style={{ backgroundColor: theme.cardBackground }}>
                {/* Modern header */}
                <div className="relative p-6 pb-8" style={{ 
                    backgroundColor: theme.primary,
                    color: theme.textOnPrimary
                }}>
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-all"
                        style={{ color: theme.textOnPrimary }}
                    >
                        <X size={20} />
                    </button>
                    
                    <div className="pr-12">
                        <h3 className="text-2xl font-bold mb-2">
                            Quick Edit Tasks
                        </h3>
                        <p className="text-sm opacity-90">
                            {dateDisplay}
                        </p>
                    </div>
                </div>

                {/* Content area with scroll */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {Object.keys(scheduledData.bySlot).map(timeSlot => 
                        renderTimeSlot(timeSlot, scheduledData.bySlot[timeSlot])
                    )}
                    
                    {Object.keys(scheduledData.bySlot).length === 0 && (
                        <div className="text-center py-12">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" 
                                 style={{ backgroundColor: theme.secondary }}>
                                <Check size={32} style={{ color: theme.textLight }} />
                            </div>
                            <p className="text-lg font-medium mb-1" style={{ color: theme.text }}>
                                No Tasks Scheduled
                            </p>
                            <p className="text-sm" style={{ color: theme.textLight }}>
                                This day is clear!
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

