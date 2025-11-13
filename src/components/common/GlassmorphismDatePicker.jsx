import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export default function GlassmorphismDatePicker({ value, onChange, theme, placeholder = "Select date" }) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(() => {
        if (value) {
            const date = new Date(value);
            return new Date(date.getFullYear(), date.getMonth(), 1);
        }
        return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    });
    const dropdownRef = useRef(null);

    // Parse value to Date object
    const selectedDate = value ? new Date(value) : null;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isOpen]);

    // Update currentMonth when value changes
    useEffect(() => {
        if (value) {
            const date = new Date(value);
            setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
        }
    }, [value]);

    const formatDisplayDate = (dateString) => {
        if (!dateString) return placeholder;
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    };

    const getDaysInMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const isToday = (day) => {
        const today = new Date();
        return (
            day === today.getDate() &&
            currentMonth.getMonth() === today.getMonth() &&
            currentMonth.getFullYear() === today.getFullYear()
        );
    };

    const isSelected = (day) => {
        if (!selectedDate) return false;
        return (
            day === selectedDate.getDate() &&
            currentMonth.getMonth() === selectedDate.getMonth() &&
            currentMonth.getFullYear() === selectedDate.getFullYear()
        );
    };

    const handleDateSelect = (day) => {
        const newDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dateString = newDate.toISOString().slice(0, 10);
        onChange(dateString);
        setIsOpen(false);
    };

    const handlePrevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    };

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
        days.push(null);
    }

    // Add cells for each day of the month
    for (let day = 1; day <= daysInMonth; day++) {
        days.push(day);
    }

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-3 py-3 rounded-lg transition-all focus:outline-none flex items-center justify-between"
                style={{
                    border: `1px solid #f0eee7`,
                    boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                    backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
                    color: '#181A18'
                }}
            >
                <span style={{ color: value ? '#181A18' : (theme.textLight || theme.text) }}>
                    {formatDisplayDate(value)}
                </span>
                <Calendar size={18} style={{ color: theme.primary, opacity: 0.7 }} />
            </button>

            {/* Glassmorphism Calendar Dropdown */}
            {isOpen && (
                <div
                    className="absolute z-50 mt-2 rounded-xl overflow-hidden"
                    style={{
                        backdropFilter: 'blur(24px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                        backgroundColor: 'rgba(139, 133, 125, 0.2)',
                        border: `1px solid rgba(0, 0, 0, 0.15)`,
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                        minWidth: '320px',
                        top: '100%',
                        left: 0
                    }}
                >
                    {/* Calendar Header */}
                    <div className="p-4 border-b" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                        <div className="flex items-center justify-between mb-3">
                            <button
                                type="button"
                                onClick={handlePrevMonth}
                                className="p-1.5 rounded-lg transition-all"
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                    color: '#ffffff',
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                                }}
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <div className="text-base font-semibold" style={{ color: '#5F7F76' }}>
                                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                            </div>
                            <button
                                type="button"
                                onClick={handleNextMonth}
                                className="p-1.5 rounded-lg transition-all"
                                style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                    color: '#ffffff',
                                    backdropFilter: 'blur(8px)',
                                    WebkitBackdropFilter: 'blur(8px)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                                }}
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>

                        {/* Day Names Header */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {dayNames.map(day => (
                                <div
                                    key={day}
                                    className="text-xs font-medium text-center py-1"
                                    style={{ color: '#5F7F76' }}
                                >
                                    {day}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Calendar Grid */}
                    <div className="p-4 pt-2">
                        <div className="grid grid-cols-7 gap-1">
                            {days.map((day, index) => {
                                if (day === null) {
                                    return <div key={`empty-${index}`} className="aspect-square" />;
                                }

                                const isTodayDate = isToday(day);
                                const isSelectedDate = isSelected(day);

                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => handleDateSelect(day)}
                                        className="aspect-square rounded-lg transition-all text-sm font-medium"
                                        style={{
                                            backgroundColor: isSelectedDate
                                                ? theme.primary
                                                : isTodayDate
                                                    ? 'rgba(255, 255, 255, 0.2)'
                                                    : 'transparent',
                                            color: isSelectedDate
                                                ? '#ffffff'
                                                : '#ffffff',
                                            border: isTodayDate && !isSelectedDate
                                                ? `1px solid ${theme.primary}`
                                                : '1px solid transparent',
                                            boxShadow: isSelectedDate
                                                ? `0 2px 8px ${theme.primary}50, inset 0 1px 0 rgba(255, 255, 255, 0.2)`
                                                : isTodayDate
                                                    ? `inset 0 1px 0 rgba(255, 255, 255, 0.3)`
                                                    : 'none',
                                            backdropFilter: !isSelectedDate ? 'blur(4px)' : 'none',
                                            WebkitBackdropFilter: !isSelectedDate ? 'blur(4px)' : 'none'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isSelectedDate) {
                                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isSelectedDate) {
                                                e.currentTarget.style.backgroundColor = isTodayDate
                                                    ? 'rgba(255, 255, 255, 0.2)'
                                                    : 'transparent';
                                            }
                                        }}
                                    >
                                        {day}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="p-3 border-t flex gap-2" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                        <button
                            type="button"
                            onClick={() => {
                                const today = new Date();
                                const todayString = today.toISOString().slice(0, 10);
                                onChange(todayString);
                                setIsOpen(false);
                            }}
                            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                color: '#ffffff',
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                            }}
                        >
                            Today
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onChange('');
                                setIsOpen(false);
                            }}
                            className="flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all"
                            style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                                color: '#ffffff',
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                                border: '1px solid rgba(255, 255, 255, 0.2)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.25)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
                            }}
                        >
                            Clear
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

