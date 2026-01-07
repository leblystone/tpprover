import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2 } from 'lucide-react';

export default function DosingScheduleEditor({ titration, onChange, theme }) {
    const [openDropdowns, setOpenDropdowns] = useState({});
    const [focusedInputs, setFocusedInputs] = useState({});
    const [durationUnitDropdowns, setDurationUnitDropdowns] = useState({});

    const addStep = () => {
        onChange([...(titration || []), { dose: '', doseUnit: 'mcg', durationCount: '', durationUnit: 'days' }]);
    };

    const updateStep = (index, field, value) => {
        const newTitration = [...titration];
        newTitration[index] = { ...newTitration[index], [field]: value };
        onChange(newTitration);
    };

    const removeStep = (index) => {
        onChange(titration.filter((_, i) => i !== index));
    };

    const toggleDropdown = (index) => {
        setOpenDropdowns(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const toggleDurationUnitDropdown = (index) => {
        setDurationUnitDropdowns(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const doseUnits = ['mcg', 'mg', 'mL', 'iu', 'sprays'];
    const durationUnits = ['days', 'weeks'];

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('[data-dropdown-container]')) {
                setOpenDropdowns({});
                setDurationUnitDropdowns({});
            }
        };

        const hasOpenDropdowns = Object.keys(openDropdowns).some(key => openDropdowns[key]) ||
                                 Object.keys(durationUnitDropdowns).some(key => durationUnitDropdowns[key]);

        if (hasOpenDropdowns) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [openDropdowns, durationUnitDropdowns]);

    return (
        <div className="space-y-2">
            <div className="space-y-2">
                {(titration || []).map((step, index) => (
                    <div key={index} className="px-3 py-2 rounded-lg" style={{backgroundColor: theme.cardBackground}}>
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm font-medium" style={{ color: theme.text }}>Phase {index + 1}</div>
                            <button 
                                type="button" 
                                onClick={() => removeStep(index)} 
                                className="text-red-500 hover:text-red-700 transition-colors"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {/* Dose Input with Dropdown */}
                            <div className="relative">
                                <div 
                                    className="flex items-stretch rounded-lg"
                                    style={{ 
                                        border: `1px solid ${focusedInputs[`dose-${index}`] ? theme.primary : (theme.isDark ? '#4b5563' : '#f0eee7')}`,
                                        boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                        backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')
                                    }}
                                >
                                    <input 
                                        type="text"
                                        id={`dose-input-${index}`}
                                        value={step.dose || ''}
                                        onChange={e => updateStep(index, 'dose', e.target.value)}
                                        onFocus={() => setFocusedInputs(prev => ({ ...prev, [`dose-${index}`]: true }))}
                                        onBlur={(e) => {
                                            setTimeout(() => {
                                                const relatedTarget = e.relatedTarget || document.activeElement;
                                                const isClickingDropdown = relatedTarget?.closest('[data-dropdown-container]');
                                                if (!isClickingDropdown && !openDropdowns[index]) {
                                                    setFocusedInputs(prev => ({ ...prev, [`dose-${index}`]: false }));
                                                }
                                            }, 150);
                                        }}
                                        placeholder=" "
                                        className="flex-1 py-3 outline-none min-w-0 rounded-l-lg"
                                        style={{ 
                                            backgroundColor: 'transparent',
                                            color: theme.isDark ? theme.text : '#181A18',
                                            border: 'none',
                                            paddingLeft: '12px',
                                            paddingRight: '8px'
                                        }}
                                    />
                                    
                                    {/* Unit Dropdown Button */}
                                    <button
                                        type="button"
                                        onClick={() => toggleDropdown(index)}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onTouchStart={(e) => e.preventDefault()}
                                        className="flex items-center justify-between gap-2 px-3 py-3 flex-shrink-0 rounded-r-lg relative cursor-pointer transition-all border-none outline-none"
                                        data-dropdown-container
                                        style={{ 
                                            borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
                                            backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                                            color: theme.isDark ? theme.text : '#181A18',
                                            minWidth: '80px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb');
                                        }}
                                    >
                                        <span className="text-sm font-semibold">
                                            {(step.doseUnit || 'mcg') === 'iu' ? 'IU' : (step.doseUnit || 'mcg')}
                                        </span>
                                        <svg width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>
                                    {openDropdowns[index] && (
                                        <div className="relative" data-dropdown-container>
                                            <div 
                                                className="absolute top-full right-0 mt-1 z-50 rounded-lg shadow-lg border overflow-hidden"
                                                style={{
                                                    backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                                                    borderColor: theme.border,
                                                    minWidth: '100px',
                                                    boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                                                }}
                                            >
                                                {doseUnits.map((unit, idx) => (
                                                    <React.Fragment key={unit}>
                                                        {idx > 0 && (
                                                            <div 
                                                                className="h-px mx-2"
                                                                style={{ backgroundColor: theme.border }}
                                                            />
                                                        )}
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onTouchStart={(e) => e.preventDefault()}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                updateStep(index, 'doseUnit', unit);
                                                                toggleDropdown(index);
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                                                            style={{
                                                                color: (step.doseUnit || 'mcg') === unit ? theme.primary : theme.text,
                                                                backgroundColor: 'transparent',
                                                                WebkitTapHighlightColor: 'transparent'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                                                e.currentTarget.style.color = theme.primary;
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                                e.currentTarget.style.color = (step.doseUnit || 'mcg') === unit ? theme.primary : theme.text;
                                                            }}
                                                        >
                                                            {unit === 'iu' ? 'IU' : unit}
                                                        </button>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <label 
                                    htmlFor={`dose-input-${index}`}
                                    className="absolute pointer-events-none transition-all"
                                    style={{
                                        fontSize: (focusedInputs[`dose-${index}`] || (step.dose && String(step.dose).trim())) ? '0.75rem' : '0.9375rem',
                                        top: (focusedInputs[`dose-${index}`] || (step.dose && String(step.dose).trim())) ? '-8px' : '14px',
                                        left: (focusedInputs[`dose-${index}`] || (step.dose && String(step.dose).trim())) ? '12px' : '16px',
                                        right: (focusedInputs[`dose-${index}`] || (step.dose && String(step.dose).trim())) ? '85px' : 'auto',
                                        padding: (focusedInputs[`dose-${index}`] || (step.dose && String(step.dose).trim())) ? '0 4px' : '0',
                                        background: (focusedInputs[`dose-${index}`] || (step.dose && String(step.dose).trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                                        color: (focusedInputs[`dose-${index}`] || (step.dose && String(step.dose).trim())) ? theme.primary : (theme.textLight || theme.text),
                                        fontWeight: 500
                                    }}
                                >
                                    Dose
                                </label>
                            </div>

                            {/* Duration Input with Single Pill */}
                            <div className="relative">
                                <div 
                                    className="flex items-stretch rounded-lg"
                                    style={{ 
                                        border: `1px solid ${focusedInputs[`duration-${index}`] ? theme.primary : (theme.isDark ? '#4b5563' : '#f0eee7')}`,
                                        boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                        backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')
                                    }}
                                >
                                    <input 
                                        type="text"
                                        id={`duration-input-${index}`}
                                        value={step.durationCount || ''}
                                        onChange={e => updateStep(index, 'durationCount', e.target.value)}
                                        onFocus={() => setFocusedInputs(prev => ({ ...prev, [`duration-${index}`]: true }))}
                                        onBlur={(e) => {
                                            setTimeout(() => {
                                                const relatedTarget = e.relatedTarget || document.activeElement;
                                                const isClickingDropdown = relatedTarget?.closest('[data-dropdown-container]');
                                                if (!isClickingDropdown && !durationUnitDropdowns[index]) {
                                                    setFocusedInputs(prev => ({ ...prev, [`duration-${index}`]: false }));
                                                }
                                            }, 150);
                                        }}
                                        placeholder=" "
                                        className="flex-1 py-3 outline-none min-w-0 rounded-l-lg"
                                        style={{ 
                                            backgroundColor: 'transparent',
                                            color: theme.isDark ? theme.text : '#181A18',
                                            border: 'none',
                                            paddingLeft: '12px',
                                            paddingRight: '8px'
                                        }}
                                    />
                                    
                                    {/* Duration Unit Dropdown Button */}
                                    <button
                                        type="button"
                                        onClick={() => toggleDurationUnitDropdown(index)}
                                        onMouseDown={(e) => e.preventDefault()}
                                        onTouchStart={(e) => e.preventDefault()}
                                        className="flex items-center justify-between gap-2 px-3 py-3 flex-shrink-0 rounded-r-lg relative cursor-pointer transition-all border-none outline-none"
                                        data-dropdown-container
                                        style={{ 
                                            borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
                                            backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                                            color: theme.isDark ? theme.text : '#181A18',
                                            minWidth: '95px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = theme.isDark ? '#4b5563' : '#f3f4f6';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb');
                                        }}
                                    >
                                        <span className="text-sm font-semibold">
                                            {(step.durationUnit || 'days') === 'days' ? 'day(s)' : 'week(s)'}
                                        </span>
                                        <svg width="14" height="14" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    </button>
                                    {durationUnitDropdowns[index] && (
                                        <div className="relative" data-dropdown-container>
                                            <div 
                                                className="absolute top-full right-0 mt-1 z-50 rounded-lg shadow-lg border overflow-hidden"
                                                style={{
                                                    backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                                                    borderColor: theme.border,
                                                    minWidth: '100px',
                                                    boxShadow: theme.isDark ? '0 4px 6px rgba(0,0,0,0.3)' : '0 4px 6px rgba(0,0,0,0.1)'
                                                }}
                                            >
                                                {durationUnits.map((unit, idx) => (
                                                    <React.Fragment key={unit}>
                                                        {idx > 0 && (
                                                            <div 
                                                                className="h-px mx-2"
                                                                style={{ backgroundColor: theme.border }}
                                                            />
                                                        )}
                                                        <button
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onTouchStart={(e) => e.preventDefault()}
                                                            onClick={(e) => {
                                                                e.preventDefault();
                                                                e.stopPropagation();
                                                                updateStep(index, 'durationUnit', unit);
                                                                toggleDurationUnitDropdown(index);
                                                            }}
                                                            className="w-full text-left px-3 py-2 text-sm transition-all touch-manipulation"
                                                            style={{
                                                                color: (step.durationUnit || 'days') === unit ? theme.primary : theme.text,
                                                                backgroundColor: 'transparent',
                                                                WebkitTapHighlightColor: 'transparent'
                                                            }}
                                                            onMouseEnter={(e) => {
                                                                e.currentTarget.style.backgroundColor = theme.primaryLight || `${theme.primary}20`;
                                                                e.currentTarget.style.color = theme.primary;
                                                            }}
                                                            onMouseLeave={(e) => {
                                                                e.currentTarget.style.backgroundColor = 'transparent';
                                                                e.currentTarget.style.color = (step.durationUnit || 'days') === unit ? theme.primary : theme.text;
                                                            }}
                                                        >
                                                            {unit === 'days' ? 'day(s)' : 'week(s)'}
                                                        </button>
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <label 
                                    htmlFor={`duration-input-${index}`}
                                    className="absolute pointer-events-none transition-all"
                                    style={{
                                        fontSize: (focusedInputs[`duration-${index}`] || (step.durationCount && String(step.durationCount).trim())) ? '0.75rem' : '0.9375rem',
                                        top: (focusedInputs[`duration-${index}`] || (step.durationCount && String(step.durationCount).trim())) ? '-8px' : '14px',
                                        left: (focusedInputs[`duration-${index}`] || (step.durationCount && String(step.durationCount).trim())) ? '12px' : '16px',
                                        right: (focusedInputs[`duration-${index}`] || (step.durationCount && String(step.durationCount).trim())) ? '95px' : 'auto',
                                        padding: (focusedInputs[`duration-${index}`] || (step.durationCount && String(step.durationCount).trim())) ? '0 4px' : '0',
                                        background: (focusedInputs[`duration-${index}`] || (step.durationCount && String(step.durationCount).trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                                        color: (focusedInputs[`duration-${index}`] || (step.durationCount && String(step.durationCount).trim())) ? theme.primary : (theme.textLight || theme.text),
                                        fontWeight: 500
                                    }}
                                >
                                    Duration
                                </label>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            <button 
                type="button" 
                onClick={addStep} 
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-md text-xs font-semibold transition-all hover:opacity-90"
                style={{ 
                    backgroundColor: theme.isDark ? '#374151' : theme.secondary,
                    color: theme.primary,
                    boxShadow: theme.isDark ? '0 2px 4px rgba(0,0,0,0.3)' : '0 1px 2px rgba(0,0,0,0.05)'
                }}
            >
                <PlusCircle size={14} /> Add Step
            </button>
        </div>
    );
}
