import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { PlusCircle, Trash } from '@phosphor-icons/react';

const DROPDOWN_MIN_WIDTH = 100;

function getPortalRoot() {
    let el = document.getElementById('__dosage-dropdown-root__');
    if (!el) {
        el = document.createElement('div');
        el.id = '__dosage-dropdown-root__';
        el.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;overflow:visible;z-index:2147483647;pointer-events:none;';
        document.body.appendChild(el);
    }
    // Always move to end of body so it paints after all modals
    document.body.appendChild(el);
    return el;
}

export default function DosingScheduleEditor({ titration, onChange, theme }) {
    const [focusedInputs, setFocusedInputs] = useState({});
    // Which dropdown is open: null | { type: 'dose'|'duration', index: number }
    const [openDropdown, setOpenDropdown] = useState(null);
    const [dropdownRect, setDropdownRect] = useState(null);

    const doseButtonRefs = useRef({});
    const durationButtonRefs = useRef({});
    const portalRootRef = useRef(null);

    const doseUnits = ['mcg', 'mg', 'mL', 'IU', 'sprays'];
    const durationUnits = ['days', 'weeks'];
    const steps = titration || [];

    useEffect(() => {
        portalRootRef.current = getPortalRoot();
    }, []);

    const updateRect = (type, index) => {
        const ref = type === 'dose' ? doseButtonRefs.current[index] : durationButtonRefs.current[index];
        if (!ref) return;
        const r = ref.getBoundingClientRect();
        setDropdownRect({ top: r.bottom + 4, right: window.innerWidth - r.right });
    };

    const openMenu = (type, index) => {
        setOpenDropdown({ type, index });
        requestAnimationFrame(() => updateRect(type, index));
    };

    const closeMenu = () => {
        setOpenDropdown(null);
        setDropdownRect(null);
    };

    // Close on outside tap/click
    useEffect(() => {
        if (!openDropdown) return;
        const close = (e) => {
            if (!e.target.closest('[data-tpp-dropdown]')) closeMenu();
        };
        document.addEventListener('mousedown', close);
        document.addEventListener('touchstart', close);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('touchstart', close);
        };
    }, [openDropdown]);

    // Update rect on scroll/resize while open
    useEffect(() => {
        if (!openDropdown) return;
        const update = () => updateRect(openDropdown.type, openDropdown.index);
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [openDropdown]);

    const addStep = () => {
        const first = steps[0] || null;
        const defaultDurationCount = first?.durationCount != null && first.durationCount !== '' ? first.durationCount : '';
        const defaultDurationUnit = first?.durationUnit || 'days';
        onChange([...steps, {
            dose: '',
            doseUnit: first?.doseUnit || 'mcg',
            durationCount: defaultDurationCount,
            durationUnit: defaultDurationUnit
        }]);
    };

    const updateStep = (index, field, value) => {
        const next = [...steps];
        next[index] = { ...next[index], [field]: value };
        onChange(next);
    };

    const removeStep = (index) => {
        onChange(steps.filter((_, i) => i !== index));
    };

    const getPhaseColor = (index, total) => {
        const light = [127, 158, 149], dark = [68, 89, 82];
        const t = total <= 1 ? 0 : index / (total - 1);
        const r = Math.round(light[0] + (dark[0] - light[0]) * t);
        const g = Math.round(light[1] + (dark[1] - light[1]) * t);
        const b = Math.round(light[2] + (dark[2] - light[2]) * t);
        return `rgb(${r},${g},${b})`;
    };

    const chevron = (
        <svg width="14" height="14" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    );

    const renderDropdownMenu = (items, currentVal, onSelect) => {
        if (!dropdownRect || !portalRootRef.current) return null;
        return createPortal(
            <div
                data-tpp-dropdown
                style={{
                    position: 'fixed',
                    top: dropdownRect.top,
                    right: dropdownRect.right,
                    pointerEvents: 'auto',
                    zIndex: 2147483647,
                    minWidth: `${DROPDOWN_MIN_WIDTH}px`,
                    borderRadius: '8px',
                    border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.08)' : (theme.border || '#e5e7eb')}`,
                    backgroundColor: theme.isDark ? '#1f2937' : '#ffffff',
                    boxShadow: theme.isDark ? '0 8px 16px rgba(0,0,0,0.5)' : '0 8px 16px rgba(0,0,0,0.15)',
                    overflow: 'hidden',
                }}
            >
                {items.map((item, idx) => (
                    <React.Fragment key={item}>
                        {idx > 0 && (
                            <div style={{ height: '1px', margin: '0 8px', backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : (theme.border || '#e5e7eb') }} />
                        )}
                        <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onTouchStart={(e) => e.preventDefault()}
                            onClick={() => { onSelect(item); closeMenu(); }}
                            className="w-full text-left px-3 py-2.5 text-sm touch-manipulation"
                            style={{
                                display: 'block',
                                color: currentVal === item ? (theme.isDark ? 'rgba(255,255,255,0.9)' : theme.primary) : theme.text,
                                backgroundColor: 'transparent',
                                WebkitTapHighlightColor: 'transparent',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = theme.isDark ? 'rgba(255,255,255,0.08)' : (theme.primaryLight || `${theme.primary}20`); }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        >
                            {item === 'ongoing' ? 'Ongoing' : item === 'days' ? 'day(s)' : item === 'weeks' ? 'week(s)' : (item === 'iu' || item === 'IU' ? 'IU' : item)}
                        </button>
                    </React.Fragment>
                ))}
            </div>,
            portalRootRef.current
        );
    };

    return (
        <div className="space-y-2">
            <div className="space-y-2">
                {steps.map((step, index) => {
                    const isLastPhase = index === steps.length - 1;
                    const durationOptions = isLastPhase ? ['days', 'weeks', 'ongoing'] : durationUnits;
                    const phaseColor = getPhaseColor(index, steps.length);

                    const isDoseOpen = openDropdown?.type === 'dose' && openDropdown?.index === index;
                    const isDurationOpen = openDropdown?.type === 'duration' && openDropdown?.index === index;

                    return (
                        <div key={index} className="rounded-lg overflow-hidden" style={{ border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.06)' : '#e8e6df'}` }}>
                            <div className="flex items-center justify-between px-3 py-1.5" style={{ backgroundColor: phaseColor }}>
                                <div className="text-xs font-bold uppercase tracking-wider" style={{ color: '#fff' }}>Phase {index + 1}</div>
                                <button type="button" onClick={() => removeStep(index)} className="hover:opacity-70 transition-opacity" style={{ color: 'rgba(255,255,255,0.7)' }}>
                                    <Trash size={18} />
                                </button>
                            </div>

                            <div className="flex gap-2 px-3 py-2" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)' }}>
                                {/* Dose Input */}
                                <div className="relative flex-1 min-w-0">
                                    <div className="flex items-stretch rounded-lg" style={{
                                        border: `1px solid ${focusedInputs[`dose-${index}`] ? theme.primary : (theme.isDark ? '#4b5563' : '#f0eee7')}`,
                                        boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                        backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')
                                    }}>
                                        <input
                                            type="text"
                                            id={`dose-input-${index}`}
                                            value={step.dose || ''}
                                            onChange={e => updateStep(index, 'dose', e.target.value)}
                                            onFocus={() => setFocusedInputs(prev => ({ ...prev, [`dose-${index}`]: true }))}
                                            onBlur={() => setTimeout(() => setFocusedInputs(prev => ({ ...prev, [`dose-${index}`]: false })), 150)}
                                            placeholder=" "
                                            className="flex-1 py-2.5 outline-none min-w-0 rounded-l-lg"
                                            style={{ backgroundColor: 'transparent', color: theme.isDark ? theme.text : '#181A18', border: 'none', paddingLeft: '10px', paddingRight: '4px' }}
                                        />
                                        <button
                                            ref={el => doseButtonRefs.current[index] = el}
                                            type="button"
                                            data-tpp-dropdown
                                            onClick={() => isDoseOpen ? closeMenu() : openMenu('dose', index)}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onTouchStart={(e) => e.preventDefault()}
                                            className="flex items-center justify-between gap-1 px-2 py-2.5 flex-shrink-0 rounded-r-lg cursor-pointer transition-all border-none outline-none"
                                            style={{
                                                borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
                                                backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                                                color: theme.isDark ? theme.text : '#181A18',
                                                minWidth: '60px'
                                            }}
                                        >
                                            <span className="text-sm font-semibold">{(step.doseUnit || 'mcg') === 'iu' ? 'IU' : (step.doseUnit || 'mcg')}</span>
                                            {chevron}
                                        </button>
                                    </div>
                                    {isDoseOpen && renderDropdownMenu(doseUnits, step.doseUnit || 'mcg', (unit) => updateStep(index, 'doseUnit', unit))}
                                    <label
                                        htmlFor={`dose-input-${index}`}
                                        className="absolute pointer-events-none transition-all"
                                        style={{
                                            fontSize: (focusedInputs[`dose-${index}`] || (step.dose && String(step.dose).trim())) ? '0.65rem' : '0.8125rem',
                                            top: (focusedInputs[`dose-${index}`] || (step.dose && String(step.dose).trim())) ? '-7px' : '11px',
                                            left: (focusedInputs[`dose-${index}`] || (step.dose && String(step.dose).trim())) ? '10px' : '12px',
                                            padding: (focusedInputs[`dose-${index}`] || (step.dose && String(step.dose).trim())) ? '0 3px' : '0',
                                            background: (focusedInputs[`dose-${index}`] || (step.dose && String(step.dose).trim())) ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                                            color: (focusedInputs[`dose-${index}`] || (step.dose && String(step.dose).trim())) ? theme.primary : (theme.textLight || theme.text),
                                            fontWeight: 500
                                        }}
                                    >Dose</label>
                                </div>

                                {/* Duration Input */}
                                <div className="relative flex-1 min-w-0">
                                    <div className="flex items-stretch rounded-lg" style={{
                                        border: `1px solid ${focusedInputs[`duration-${index}`] ? theme.primary : (theme.isDark ? '#4b5563' : '#f0eee7')}`,
                                        boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                                        backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')
                                    }}>
                                        <input
                                            type="text"
                                            id={`duration-input-${index}`}
                                            value={step.durationUnit === 'ongoing' ? '' : (step.durationCount || '')}
                                            onChange={e => updateStep(index, 'durationCount', e.target.value)}
                                            disabled={step.durationUnit === 'ongoing'}
                                            placeholder={step.durationUnit === 'ongoing' ? '' : ' '}
                                            onFocus={() => setFocusedInputs(prev => ({ ...prev, [`duration-${index}`]: true }))}
                                            onBlur={() => setTimeout(() => setFocusedInputs(prev => ({ ...prev, [`duration-${index}`]: false })), 150)}
                                            className="flex-1 py-2.5 outline-none min-w-0 rounded-l-lg"
                                            style={{ backgroundColor: 'transparent', color: theme.isDark ? theme.text : '#181A18', border: 'none', paddingLeft: '10px', paddingRight: '4px' }}
                                        />
                                        <button
                                            ref={el => durationButtonRefs.current[index] = el}
                                            type="button"
                                            data-tpp-dropdown
                                            onClick={() => isDurationOpen ? closeMenu() : openMenu('duration', index)}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onTouchStart={(e) => e.preventDefault()}
                                            className="flex items-center justify-between gap-1 px-2 py-2.5 flex-shrink-0 rounded-r-lg cursor-pointer transition-all border-none outline-none"
                                            style={{
                                                borderLeft: theme.isDark ? '1px solid #4b5563' : `1px solid #f0eee7`,
                                                backgroundColor: theme.isDark ? '#374151' : (theme.cardBackground || '#f9fafb'),
                                                color: theme.isDark ? theme.text : '#181A18',
                                                minWidth: '72px'
                                            }}
                                        >
                                            <span className="text-sm font-semibold">
                                                {step.durationUnit === 'ongoing' ? 'Ongoing' : (step.durationUnit || 'days') === 'days' ? 'day(s)' : 'week(s)'}
                                            </span>
                                            {chevron}
                                        </button>
                                    </div>
                                    {isDurationOpen && renderDropdownMenu(
                                        durationOptions,
                                        step.durationUnit || 'days',
                                        (unit) => {
                                            if (unit === 'ongoing') {
                                                const next = [...steps];
                                                next[index] = { ...next[index], durationUnit: 'ongoing', durationCount: '' };
                                                onChange(next);
                                            } else {
                                                updateStep(index, 'durationUnit', unit);
                                            }
                                        }
                                    )}
                                    <label
                                        htmlFor={`duration-input-${index}`}
                                        className="absolute pointer-events-none transition-all"
                                        style={{
                                            fontSize: (focusedInputs[`duration-${index}`] || (step.durationCount && String(step.durationCount).trim()) || step.durationUnit === 'ongoing') ? '0.65rem' : '0.8125rem',
                                            top: (focusedInputs[`duration-${index}`] || (step.durationCount && String(step.durationCount).trim()) || step.durationUnit === 'ongoing') ? '-7px' : '11px',
                                            left: (focusedInputs[`duration-${index}`] || (step.durationCount && String(step.durationCount).trim()) || step.durationUnit === 'ongoing') ? '10px' : '12px',
                                            padding: (focusedInputs[`duration-${index}`] || (step.durationCount && String(step.durationCount).trim()) || step.durationUnit === 'ongoing') ? '0 3px' : '0',
                                            background: (focusedInputs[`duration-${index}`] || (step.durationCount && String(step.durationCount).trim()) || step.durationUnit === 'ongoing') ? (theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff')) : 'transparent',
                                            color: (focusedInputs[`duration-${index}`] || (step.durationCount && String(step.durationCount).trim()) || step.durationUnit === 'ongoing') ? theme.primary : (theme.textLight || theme.text),
                                            fontWeight: 500
                                        }}
                                    >Duration</label>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <button
                type="button"
                onClick={addStep}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:opacity-90 active:scale-95"
                style={{
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.05)' : '#f5f4f0',
                    color: '#6B7F77',
                    border: `1px dashed ${theme.isDark ? 'rgba(107,127,119,0.3)' : 'rgba(107,127,119,0.25)'}`,
                }}
            >
                <PlusCircle size={18} /> Add Phase
            </button>
        </div>
    );
}
