import React, { useState, useEffect } from 'react';
import { Check, X, Pill, Beaker, ShoppingCart, Pipette, CalendarCheck2 } from 'lucide-react';
import { generateTaskId, toggleTaskCompletion, isTaskCompleted, getCompletionStats } from '../../utils/taskCompletion';
import TaskDisplay from './TaskDisplay';
import InjectionSiteSelector from '../common/InjectionSiteSelector';
import { isInjectionSiteTrackingEnabled } from '../../utils/injectionSiteSettings';
import { toKey } from './MonthGrid';

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

// Helper to safely parse YYYY-MM-DD strings into local time dates
// This prevents timezone issues where UTC parsing causes the wrong day to display
function parseDateString(dateString) {
    try {
        if (!dateString) return null;
        if (dateString instanceof Date) return dateString;
        // Firebase Timestamp objects have a toDate() method
        if (typeof dateString === 'object' && typeof dateString.toDate === 'function') {
            return dateString.toDate();
        }
        if (typeof dateString !== 'string') {
            return new Date(dateString);
        }
        // Try to parse as YYYY-MM-DD format
        const parts = dateString.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts.map(Number);
            // Validate the numbers are valid
            if (isNaN(year) || isNaN(month) || isNaN(day)) {
                return new Date(dateString);
            }
            // Create date in local timezone to avoid UTC conversion issues
            return new Date(year, month - 1, day);
        }
        // Fallback for other formats
        return new Date(dateString);
    } catch (error) {
        console.error('Error parsing date string:', dateString, error);
        // Return current date as fallback
        return new Date();
    }
}

export default function CalendarQuickEdit({ date, scheduledData, theme, onClose, onTasksUpdated, onLogOneOff }) {
    const [completedTasks, setCompletedTasks] = useState({});
    const [loading, setLoading] = useState(false);
    const [forceRender, setForceRender] = useState(0);
    const [injectionTask, setInjectionTask] = useState(null);
    const [pendingInjectionTasks, setPendingInjectionTasks] = useState([]);
    const [pendingMarkAllContext, setPendingMarkAllContext] = useState(null); // Store { timeSlot, slotKey, allTaskIds }

    // Convert date string to Date object if needed - use local time parsing to avoid timezone issues
    const dateObj = parseDateString(date);

    // Listen for task completion events to force re-render
    useEffect(() => {
        const handleTaskCompletionChange = (e) => {
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
                        time: slotKey,
                        protocolId: peptide.protocolId,
                        peptideId: peptide.peptideId
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
                    time: slotKey,
                    protocolId: p.protocolId,
                    peptideId: p.peptideId
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
            
            // Only show injection site selector if tracking is enabled AND it's an injection task
            if (isInjection && isInjectionSiteTrackingEnabled()) {
                // Show injection site selector modal
                setInjectionTask(taskData);
                setLoading(false);
                return; // Don't complete the task yet, wait for injection site selection
            }
        }
        
        
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
                    time: slotKey,
                    protocolId: peptide.protocolId,
                    peptideId: peptide.peptideId
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
                    // Store with time property for proper taskId generation
                    injectionTasks.push({ ...peptide, time: slotKey, type: 'peptide' });
                }
            });
        }
        
        if (slotData.supplements) {
            slotData.supplements.forEach(supplement => {
                const suppData = typeof supplement === 'object' ? supplement : { name: supplement };
                const deliveryMethod = suppData.deliveryMethod || suppData.delivery;
                const isInjection = deliveryMethod === 'syringe' || deliveryMethod === 'pipette' || deliveryMethod === 'pen' || deliveryMethod === 'injection';
                if (isInjection) {
                    // Store with time property for proper taskId generation
                    injectionTasks.push({ ...suppData, time: slotKey, type: 'supplement' });
                }
            });
        }
        
        // If there are injection tasks and tracking is enabled, show injection site selector for each one
        if (injectionTasks.length > 0 && isInjectionSiteTrackingEnabled()) {
            // Store context for completing all tasks after injection flow
            setPendingMarkAllContext({ timeSlot, slotKey, allTaskIds: taskIds });
            setPendingInjectionTasks(injectionTasks);
            setInjectionTask(injectionTasks[0]); // Start with first injection task
            return; // Don't complete tasks yet, wait for injection site selection
        }

        // Mark all tasks as completed (no injection tasks or tracking disabled)
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
            // Injection site recorded
        }
        
        // Complete the current injection task
        if (injectionTask) {
            // Build proper task object for taskId generation using stored context
            const context = pendingMarkAllContext;
            const slotKey = context?.slotKey || normalizeSlot(injectionTask.time || 'AM');
            const timeSlot = context?.timeSlot || normalizeSlot(injectionTask.time || 'AM');
            
            // Build task object with correct properties
            const task = {
                type: injectionTask.type || (injectionTask.deliveryMethod ? 'peptide' : 'supplement'),
                name: injectionTask.name,
                dose: injectionTask.dose || '',
                unit: injectionTask.unit || '',
                time: slotKey
            };
            
            const taskId = generateTaskId(task);
            
            // Mark this injection task as completed
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
            // All injection tasks completed - now complete ALL remaining tasks
            const context = pendingMarkAllContext;
            if (context) {
                const newCompletedTasks = { ...completedTasks };
                if (!newCompletedTasks[context.timeSlot]) newCompletedTasks[context.timeSlot] = {};
                
                // Complete all tasks (both injection and non-injection)
                context.allTaskIds.forEach(taskId => {
                    // Only mark tasks that aren't already completed
                    if (!newCompletedTasks[context.timeSlot][taskId]) {
                        newCompletedTasks[context.timeSlot][taskId] = true;
                        toggleTaskCompletion(taskId, true, date, context.slotKey);
                    }
                });
                
                setCompletedTasks(newCompletedTasks);
                setPendingMarkAllContext(null);
            }
            
            // Clean up injection state
            setInjectionTask(null);
            setPendingInjectionTasks([]);
            onTasksUpdated?.();
        }
    };

    // Handle injection site cancellation
    const handleInjectionCancel = () => {
        // Cancel doesn't complete tasks - just clear the injection flow
        setInjectionTask(null);
        setPendingInjectionTasks([]);
        setPendingMarkAllContext(null);
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
                time: slotKey,
                protocolId: peptide.protocolId,
                peptideId: peptide.peptideId
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
                {/* Clean time slot header */}
                <div className="flex items-center justify-between pb-2 border-b"
                     style={{ borderColor: theme.border }}>
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" 
                             style={{ 
                                 backgroundColor: theme.primary + (theme.isDark ? '25' : '15'),
                                 color: theme.primary
                             }}>
                            <span className="text-xs font-bold">
                                {normalizeSlot(timeSlot)}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs" style={{ color: theme.textLight }}>
                                {completedCount} of {totalTasks} completed
                            </p>
                        </div>
                    </div>
                    {completedCount < totalTasks && (
                        <button
                            onClick={() => handleMarkAllCompleted(timeSlot)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                backgroundColor: theme.primary,
                                color: theme.textOnPrimary
                            }}
                            disabled={loading}
                        >
                            Check All
                        </button>
                    )}
                    {completedCount === totalTasks && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg" 
                             style={{ 
                                 backgroundColor: theme.success + (theme.isDark ? '25' : '15'),
                                 color: theme.success 
                             }}>
                            <Check size={14} />
                            <span className="text-xs font-semibold">Done</span>
                        </div>
                    )}
                </div>

                {/* Tasks list - cleaner spacing */}
                <div className="space-y-2">
                    {/* Render peptides */}
                    {peptides.map((peptide, index) => {
                        const task = {
                            type: 'peptide',
                            name: peptide.name,
                            dose: peptide.dose || '',
                            unit: peptide.unit || '',
                            time: slotKey,
                            protocolId: peptide.protocolId,
                            peptideId: peptide.peptideId,
                            delivery: peptide.delivery || peptide.deliveryMethod || 'injection',
                            deliveryMethod: peptide.deliveryMethod || peptide.delivery || 'injection',
                            penColor: peptide.penColor,
                            penType: peptide.penType
                        };
                        const taskId = generateTaskId(task);
                        const isCompleted = completedTasks[timeSlot]?.[taskId] || false;

                        // Use the original date string if available, otherwise generate from dateObj using local time
                        const dateKey = typeof date === 'string' ? date : (dateObj ? toKey(dateObj) : '');
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
                                disableInjectionSelector={true}
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
                            delivery: suppData.delivery || suppData.deliveryMethod || 'oral',
                            deliveryMethod: suppData.deliveryMethod || suppData.delivery || 'oral'
                        };
                        const taskId = generateTaskId(task);
                        const isCompleted = completedTasks[timeSlot]?.[taskId] || false;

                        // Use the original date string if available, otherwise generate from dateObj using local time
                        const dateKey = typeof date === 'string' ? date : (dateObj ? toKey(dateObj) : '');
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
                                disableInjectionSelector={true}
                            />
                        );
                    })}
                </div>
            </div>
        );
    }, [date, completedTasks, forceRender, dateObj, theme, loading, handleMarkAllCompleted, handleTaskToggle]);

    // Don't render if date or scheduledData is invalid
    if (!date || !dateObj || !scheduledData?.bySlot) {
        return null;
    }

    // Use dateObj (properly parsed in local time) for display
    const dateDisplay = dateObj ? dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    }) : '';

    // Calculate overall completion stats
    const allSlots = Object.keys(scheduledData.bySlot || {});
    let totalTasksOverall = 0;
    let completedTasksOverall = 0;
    
    allSlots.forEach(timeSlot => {
        const slotData = scheduledData.bySlot[timeSlot];
        const peptides = slotData?.peptides || [];
        const supplements = slotData?.supplements || [];
        const slotKey = normalizeSlot(timeSlot);
        
        // Count peptides
        peptides.forEach(peptide => {
            totalTasksOverall++;
            const task = {
                type: 'peptide',
                name: typeof peptide === 'object' ? peptide.name : peptide,
                dose: typeof peptide === 'object' ? (peptide.dose || '') : '',
                unit: typeof peptide === 'object' ? (peptide.unit || '') : '',
                time: slotKey,
                protocolId: peptide?.protocolId,
                peptideId: peptide?.peptideId
            };
            const taskId = generateTaskId(task);
            if (isTaskCompleted(taskId, date, slotKey)) {
                completedTasksOverall++;
            }
        });
        
        // Count supplements
        supplements.forEach(supplement => {
            totalTasksOverall++;
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
                completedTasksOverall++;
            }
        });
    });

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                 style={{ backgroundColor: theme.cardBackground }}>
                {/* Clean header */}
                <div className="relative p-5 border-b flex items-center justify-between"
                     style={{ 
                         borderColor: theme.border,
                         backgroundColor: theme.cardBackground
                     }}>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold mb-1 flex items-center gap-2" style={{ color: theme.text }}>
                            <CalendarCheck2 size={20} style={{ color: theme.primary }} />
                            {dateDisplay}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                    {onLogOneOff && (
                        <button
                            type="button"
                            onClick={onLogOneOff}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{
                                color: theme.text,
                                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : `${theme.primary}15`,
                                border: `1px solid ${theme.border}`,
                            }}
                        >
                            Log one-off
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:opacity-70 transition-all"
                        style={{ 
                            color: theme.textLight,
                            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
                        }}
                    >
                        <X size={20} />
                    </button>
                    </div>
                </div>

                {/* Content area with scroll */}
                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                    {Object.keys(scheduledData.bySlot || {}).map(timeSlot => 
                        renderTimeSlot(timeSlot, scheduledData.bySlot[timeSlot])
                    )}

                    {Array.isArray(scheduledData.oneOffs) && scheduledData.oneOffs.length > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: theme.textLight }}>One-off doses</h4>
                            {scheduledData.oneOffs.map((dose) => (
                                <div
                                    key={dose.id}
                                    className="flex items-center justify-between gap-2 py-2 px-3 rounded-lg"
                                    style={{
                                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : `${theme.primary}08`,
                                        borderLeft: `3px solid ${theme.primary}`,
                                    }}
                                >
                                    <div>
                                        <div className="text-sm font-semibold" style={{ color: theme.text }}>
                                            {dose.peptideName}{dose.dose ? ` · ${dose.dose}${dose.unit || ''}` : ''}
                                        </div>
                                        <div className="text-[10px] uppercase" style={{ color: theme.textLight }}>
                                            {dose.timeSlot || 'AM'} · One-off
                                        </div>
                                    </div>
                                    <Check size={16} style={{ color: theme.primary }} />
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {Object.keys(scheduledData.bySlot || {}).length === 0 && !(scheduledData.oneOffs || []).length && (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" 
                                 style={{ backgroundColor: theme.secondary }}>
                                <Check size={32} style={{ color: theme.textLight }} />
                            </div>
                            <p className="text-lg font-medium mb-1" style={{ color: theme.text }}>
                                No Tasks Scheduled
                            </p>
                            <p className="text-sm mb-4" style={{ color: theme.textLight }}>
                                This day is clear!
                            </p>
                            {onLogOneOff && (
                                <button
                                    type="button"
                                    onClick={onLogOneOff}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold"
                                    style={{ backgroundColor: theme.primary, color: '#fff' }}
                                >
                                    Log one-off dose
                                </button>
                            )}
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

