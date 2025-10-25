import React, { useState, useEffect } from 'react';
import { Check, X, Pill, Beaker, ShoppingCart, Pipette } from 'lucide-react';
import { generateTaskId, toggleTaskCompletion, isTaskCompleted, getCompletionStats } from '../../utils/taskCompletion';
import TaskDisplay from './TaskDisplay';
import InjectionSiteSelector from '../common/InjectionSiteSelector';

// Normalize timeslot labels for consistent storage/IDs
function normalizeSlot(slot) {
    const s = String(slot || '').toLowerCase();
    if (s === 'am') return 'AM';
    if (s === 'pm') return 'PM';
    return slot;
}

function labelForSlot(slot) {
    return normalizeSlot(slot) === 'AM' ? 'AM' : 'PM';
}

// Helper function to get supplement icon based on delivery method
function getSupplementIcon(delivery, size = 16) {
    switch (String(delivery || '').toLowerCase()) {
        case 'injection': return <Pipette size={size} />;
        case 'powder': return <Beaker size={size} />;
        case 'pill':
        case 'oral':
        default: return <Pill size={size} />;
    }
}

export default function CalendarQuickEdit({ date, scheduledData, theme, onClose, onTasksUpdated }) {
    const [completedTasks, setCompletedTasks] = useState({});
    const [loading, setLoading] = useState(false);
    const [forceRender, setForceRender] = useState(0);
    const [injectionTask, setInjectionTask] = useState(null);
    const [pendingInjectionTasks, setPendingInjectionTasks] = useState([]);

    // Convert date string to Date object if needed
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    // Debug: Log the scheduled data structure
    console.log('🔍 CalendarQuickEdit received data:', {
        date,
        scheduledData,
        bySlot: scheduledData?.bySlot,
        amSlot: scheduledData?.bySlot?.AM,
        pmSlot: scheduledData?.bySlot?.PM
    });

    // Listen for task completion events to force re-render
    useEffect(() => {
        const handleTaskCompletionChange = (e) => {
            console.log('📡 CalendarQuickEdit received task completion event:', e.detail);
            setForceRender(prev => prev + 1);
        };
        
        window.addEventListener('tpp:task-completion-changed', handleTaskCompletionChange);
        
        return () => {
            window.removeEventListener('tpp:task-completion-changed', handleTaskCompletionChange);
        };
    }, []);

    // Load current completion status
    useEffect(() => {
        if (!scheduledData?.bySlot) return;

        const currentCompletion = {};
        
        Object.keys(scheduledData.bySlot).forEach(timeSlot => {
            const slotData = scheduledData.bySlot[timeSlot];
            const slotKey = normalizeSlot(timeSlot);
            currentCompletion[timeSlot] = {};

            // Check peptides
            if (slotData.peptides) {
                slotData.peptides.forEach(peptide => {
                    const task = {
                        type: 'peptide',
                        name: peptide.name,
                        dose: peptide.dose || '',
                        unit: peptide.unit || '',
                        time: slotKey
                    };
                    const taskId = generateTaskId(task);
                    currentCompletion[timeSlot][taskId] = isTaskCompleted(taskId, date, slotKey);
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
                        time: slotKey
                    };
                    const taskId = generateTaskId(task);
                    currentCompletion[timeSlot][taskId] = isTaskCompleted(taskId, date, slotKey);
                });
            }
        });

        setCompletedTasks(currentCompletion);
    }, [date, scheduledData, forceRender]);

    const handleTaskToggle = async (timeSlot, taskId) => {
        setLoading(true);
        
        const slotKey = normalizeSlot(timeSlot);
        // Always check current completion status from localStorage to avoid stale closures
        const currentStatus = isTaskCompleted(taskId, date, slotKey);
        const newStatus = !currentStatus;
        
        // Find the task data to check delivery method
        const slotData = scheduledData?.bySlot?.[slotKey];
        let taskData = null;
        
        if (slotData?.peptides) {
            taskData = slotData.peptides.find(p => {
                const task = {
                    type: 'peptide',
                    name: p.name,
                    dose: p.dose || '',
                    unit: p.unit || '',
                    time: slotKey
                };
                return generateTaskId(task) === taskId;
            });
        }
        
        if (!taskData && slotData?.supplements) {
            taskData = slotData.supplements.find(s => {
                const suppData = typeof s === 'object' ? s : { name: s };
                const task = {
                    type: 'supplement',
                    name: suppData.name,
                    dose: suppData.dose || '',
                    unit: '',
                    time: slotKey
                };
                return generateTaskId(task) === taskId;
            });
        }
        
        // Check if this is a syringe or pen delivery method
        if (taskData && !currentStatus) {
            const deliveryMethod = taskData.deliveryMethod || taskData.delivery;
            const isInjection = deliveryMethod === 'syringe' || deliveryMethod === 'pipette' || deliveryMethod === 'pen' || deliveryMethod === 'injection';
            
            // If it's an injection and currently not completed, show injection modal
            if (isInjection) {
                // Show injection site selector modal
                setInjectionTask(taskData);
                setLoading(false);
                return; // Don't complete the task yet, wait for injection site selection
            }
        }
        
        console.log('🔄 CalendarQuickEdit: Toggling task', {
            taskId,
            currentStatus,
            newStatus,
            date,
            timeSlot
        });
        
        // Update local state immediately for responsive UI
        setCompletedTasks(prev => ({
            ...prev,
            [timeSlot]: {
                ...prev[timeSlot],
                [taskId]: newStatus
            }
        }));

        // Update unified completion system
        toggleTaskCompletion(taskId, newStatus, date, slotKey);

        // Notify parent component to refresh
        onTasksUpdated?.();
        
        setLoading(false);
    };

    const handleMarkAllCompleted = (timeSlot) => {
        if (!scheduledData?.bySlot?.[timeSlot]) return;

        const slotData = scheduledData.bySlot[timeSlot];
        const slotKey = normalizeSlot(timeSlot);
        const taskIds = [];

        // Collect all task IDs for this slot
        if (slotData.peptides) {
            slotData.peptides.forEach(peptide => {
                const task = {
                    type: 'peptide',
                    name: peptide.name,
                    dose: peptide.dose || '',
                    unit: peptide.unit || '',
                    time: slotKey
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
                    time: slotKey
                };
                taskIds.push(generateTaskId(task));
            });
        }

        // Check for injection tasks and ask for confirmation
        const injectionTasks = [];
        
        if (slotData.peptides) {
            slotData.peptides.forEach(peptide => {
                const deliveryMethod = peptide.deliveryMethod || peptide.delivery;
                const isInjection = deliveryMethod === 'syringe' || deliveryMethod === 'pipette' || deliveryMethod === 'pen' || deliveryMethod === 'injection';
                if (isInjection) {
                    injectionTasks.push(peptide);
                }
            });
        }
        
        if (slotData.supplements) {
            slotData.supplements.forEach(supplement => {
                const suppData = typeof supplement === 'object' ? supplement : { name: supplement };
                const deliveryMethod = suppData.deliveryMethod || suppData.delivery;
                const isInjection = deliveryMethod === 'syringe' || deliveryMethod === 'pipette' || deliveryMethod === 'pen' || deliveryMethod === 'injection';
                if (isInjection) {
                    injectionTasks.push(suppData);
                }
            });
        }
        
        // If there are injection tasks, show injection site selector for each one
        if (injectionTasks.length > 0) {
            setPendingInjectionTasks(injectionTasks);
            setInjectionTask(injectionTasks[0]); // Start with first injection task
            return; // Don't complete tasks yet, wait for injection site selection
        }

        // Mark all tasks as completed
        const newCompletedTasks = { ...completedTasks };
        if (!newCompletedTasks[timeSlot]) newCompletedTasks[timeSlot] = {};

        taskIds.forEach(taskId => {
            newCompletedTasks[timeSlot][taskId] = true;
            toggleTaskCompletion(taskId, true, date, slotKey);
        });

        setCompletedTasks(newCompletedTasks);
        onTasksUpdated?.();
    };

    // Handle injection site confirmation
    const handleInjectionConfirm = (injectionSite) => {
        if (injectionSite && injectionSite.trim()) {
            console.log(`💉 Shot location recorded for ${injectionTask.name}: ${injectionSite}`);
        }
        
        // Complete the current injection task
        if (injectionTask) {
            const taskId = generateTaskId(injectionTask);
            const slotKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;
            const timeSlot = normalizeSlot(injectionTask.time);
            
            toggleTaskCompletion(taskId, true, date, slotKey);
            
            // Update local state
            setCompletedTasks(prev => {
                const newState = { ...prev };
                if (!newState[timeSlot]) newState[timeSlot] = {};
                newState[timeSlot][taskId] = true;
                return newState;
            });
        }
        
        // Move to next injection task or finish
        if (Array.isArray(pendingInjectionTasks) && pendingInjectionTasks.length > 1) {
            const remainingTasks = pendingInjectionTasks.slice(1);
            setPendingInjectionTasks(remainingTasks);
            setInjectionTask(remainingTasks[0]);
        } else {
            // All injection tasks completed
            setInjectionTask(null);
            setPendingInjectionTasks([]);
            onTasksUpdated?.();
        }
    };

    // Handle injection site cancellation
    const handleInjectionCancel = () => {
        setInjectionTask(null);
        setPendingInjectionTasks([]);
    };

    // Use React.useMemo to ensure this recalculates when forceRender changes
    const renderTimeSlot = React.useCallback((timeSlot, slotData) => {
        const peptides = slotData.peptides || [];
        const supplements = slotData.supplements || [];
        const totalTasks = peptides.length + supplements.length;
        const slotKey = normalizeSlot(timeSlot);
        
        // Calculate actual completion count from localStorage, not local state
        let completedCount = 0;
        
        // Check peptides
        peptides.forEach(peptide => {
            const task = {
                type: 'peptide',
                name: peptide.name,
                dose: peptide.dose || '',
                unit: peptide.unit || '',
                time: slotKey
            };
            const taskId = generateTaskId(task);
            if (isTaskCompleted(taskId, date, slotKey)) {
                completedCount++;
            }
        });
        
        // Check supplements
        supplements.forEach(supplement => {
            const suppData = typeof supplement === 'object' ? supplement : { name: supplement };
            const task = {
                type: 'supplement',
                name: suppData.name,
                dose: suppData.dose || '',
                unit: '',
                time: slotKey
            };
            const taskId = generateTaskId(task);
            if (isTaskCompleted(taskId, date, slotKey)) {
                completedCount++;
            }
        });

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
                                {normalizeSlot(timeSlot)}
                            </span>
                        </div>
                        <div>
                            <h4 className="text-base font-semibold" style={{ color: theme.text }}>
                                {labelForSlot(timeSlot)}
                            </h4>
                            <p className="text-xs" style={{ color: theme.textLight }}>
                                {completedCount} of {totalTasks} completed
                            </p>
                        </div>
                    </div>
                    {completedCount < totalTasks && (
                        <button
                            onClick={() => handleMarkAllCompleted(timeSlot)}
                            className="px-4 py-2 text-sm font-medium rounded-lg transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                backgroundColor: theme.primary,
                                color: theme.textOnPrimary
                            }}
                            disabled={loading}
                        >
                            Mark All Done
                        </button>
                    )}
                    {completedCount === totalTasks && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ backgroundColor: theme.success + '20' }}>
                            <Check size={18} style={{ color: theme.success }} />
                            <span className="text-sm font-semibold" style={{ color: theme.success }}>Complete</span>
                        </div>
                    )}
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
                            time: slotKey,
                            delivery: peptide.delivery || 'injection',
                            deliveryMethod: peptide.deliveryMethod || 'injection',
                            penColor: peptide.penColor,
                            penType: peptide.penType
                        };
                        console.log(`🔍 Created task for ${timeSlot}:`, task);
                        const taskId = generateTaskId(task);
                        const isCompleted = completedTasks[timeSlot]?.[taskId] || false;

                        const dateKey = typeof date === 'string' ? date : dateObj.toISOString().slice(0,10);
                        return (
                            <TaskDisplay
                                key={`peptide-${index}-${forceRender}`}
                                task={{ ...task, completed: isCompleted }}
                                theme={theme}
                                date={dateObj}
                                timeSlot={slotKey}
                                dateKey={dateKey}
                                onToggle={() => handleTaskToggle(timeSlot, taskId)}
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
                            time: slotKey,
                            delivery: suppData.delivery || 'oral'
                        };
                        const taskId = generateTaskId(task);
                        const isCompleted = completedTasks[timeSlot]?.[taskId] || false;

                        const dateKey = typeof date === 'string' ? date : dateObj.toISOString().slice(0,10);
                        return (
                            <TaskDisplay
                                key={`supplement-${index}-${forceRender}`}
                                task={{ ...task, completed: isCompleted }}
                                theme={theme}
                                date={dateObj}
                                timeSlot={slotKey}
                                dateKey={dateKey}
                                onToggle={() => handleTaskToggle(timeSlot, taskId)}
                                size="normal"
                            />
                        );
                    })}
                </div>
            </div>
        );
    }, [date, completedTasks, forceRender, dateObj, theme, loading, handleMarkAllCompleted, handleTaskToggle]);

    if (!scheduledData?.bySlot) {
        return null;
    }

    const dateDisplay = new Date(date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });

    return (
        <>
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
            
            {/* Injection Site Selector Modal */}
            <InjectionSiteSelector
                taskName={injectionTask?.name}
                task={injectionTask}
                onConfirm={handleInjectionConfirm}
                onCancel={handleInjectionCancel}
                theme={theme}
                isVisible={!!injectionTask}
            />
        </>
    );
}

