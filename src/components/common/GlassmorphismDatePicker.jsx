import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

export default function GlassmorphismDatePicker({ value, onChange, theme, placeholder = "Select date", compact = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(() => {
        if (value) {
            const date = new Date(value);
            return new Date(date.getFullYear(), date.getMonth(), 1);
        }
        return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    });
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

    // Parse value to Date object
    const selectedDate = value ? new Date(value) : null;

    // Calculate dropdown position when opening and on scroll/resize
    const updatePosition = () => {
        if (buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const calendarWidth = compact ? 240 : 320;
            const calendarHeight = compact ? 140 : 160;
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            const isDesktop = viewportWidth >= 1024; // lg breakpoint
            
            // Find modal container to constrain calendar within modal bounds
            let modalContainer = null;
            let modalRect = null;
            let parent = buttonRef.current.parentElement;
            
            // Try multiple strategies to find the modal container
            while (parent && parent !== document.body) {
                // Strategy 1: Check for fixed positioned element with high z-index
                const isFixed = window.getComputedStyle(parent).position === 'fixed';
                const zIndex = window.getComputedStyle(parent).zIndex;
                const hasHighZIndex = zIndex && (parseInt(zIndex) >= 9999 || parent.classList.contains('z-[9999]'));
                
                if (isFixed && hasHighZIndex) {
                    // Check if it contains a modal structure (has backdrop and modal content)
                    const hasBackdrop = parent.querySelector('.backdrop-blur-md, .backdrop-blur-sm');
                    if (hasBackdrop) {
                        // Find the actual modal content div (the one with max-w-* classes)
                        const modalContent = parent.querySelector('[class*="max-w-"]');
                        if (modalContent) {
                            modalContainer = modalContent;
                            break;
                        }
                    }
                }
                
                // Strategy 2: Check if parent has max-w-* class directly (might be the modal content)
                const classes = parent.className || '';
                if (classes.includes('max-w-') && isFixed) {
                    modalContainer = parent;
                    break;
                }
                
                parent = parent.parentElement;
            }
            
            // If we found a modal, get its bounds
            if (modalContainer) {
                modalRect = modalContainer.getBoundingClientRect();
            }
            
            // Use modal bounds if available, otherwise use viewport
            const containerLeft = modalRect ? modalRect.left : 0;
            const containerRight = modalRect ? modalRect.right : viewportWidth;
            const containerTop = modalRect ? modalRect.top : 0;
            const containerBottom = modalRect ? modalRect.bottom : viewportHeight;
            const containerWidth = containerRight - containerLeft;
            const containerHeight = containerBottom - containerTop;
            
            // Calculate horizontal position
            let left;
            if (isDesktop) {
                // On desktop, position to the right of the button, slightly overlapping or close
                left = buttonRect.right - (calendarWidth * 0.15); // Move it 15% of calendar width to the left from right edge
                // Ensure it doesn't go off the left edge of container
                if (left < containerLeft + 16) {
                    left = containerLeft + 16;
                }
                // If it goes off screen to the right, adjust
                if (left + calendarWidth > containerRight - 16) {
                    left = containerRight - calendarWidth - 16;
                }
            } else {
                // On mobile, position below aligned to left edge
                left = buttonRect.left;
                if (left + calendarWidth > containerRight - 16) {
                    left = containerRight - calendarWidth - 16;
                }
                if (left < containerLeft + 16) {
                    left = containerLeft + 16;
                }
            }
            
            // Calculate vertical position
            let top;
            if (isDesktop) {
                // On desktop when positioned to the right, check available space
                const spaceBelow = containerBottom - buttonRect.bottom - 16;
                const spaceAbove = buttonRect.top - containerTop - 16;
                
                // Calculate positions
                const positionBelow = buttonRect.bottom + 8;
                const positionAbove = buttonRect.top - calendarHeight - 8;
                
                // Check if calendar would fit below (with buffer)
                const wouldFitBelow = spaceBelow >= calendarHeight + 8;
                // Check if calendar would fit above (with buffer)
                const wouldFitAbove = spaceAbove >= calendarHeight + 8;
                
                // Check if positioned below would go off screen
                const wouldGoOffBottom = positionBelow + calendarHeight > containerBottom - 16;
                
                // Prioritize: if it would go off bottom, position above
                if (wouldGoOffBottom && wouldFitAbove) {
                    top = positionAbove;
                } 
                // If it fits below, use below
                else if (wouldFitBelow && !wouldGoOffBottom) {
                    top = positionBelow;
                }
                // If it doesn't fit below but fits above, use above
                else if (wouldFitAbove) {
                    top = positionAbove;
                }
                // If neither fits perfectly, use whichever has more space
                else {
                    if (spaceAbove > spaceBelow) {
                        // More space above, position above
                        top = positionAbove;
                    } else {
                        // More space below, position at bottom of container
                        top = containerBottom - calendarHeight - 16;
                    }
                }
                
                // Final bounds check - if it would still go off bottom, force above
                if (top + calendarHeight > containerBottom - 16) {
                    const abovePos = buttonRect.top - calendarHeight - 8;
                    if (abovePos >= containerTop + 16) {
                        top = abovePos;
                    } else {
                        // Last resort: position at top of container
                        top = containerTop + 16;
                    }
                }
                if (top < containerTop + 16) {
                    top = containerTop + 16;
                }
            } else {
                // On mobile, position below the button
                top = buttonRect.bottom + 8;
                if (top + calendarHeight > containerBottom - 16) {
                    // Show above the button instead
                    top = buttonRect.top - calendarHeight - 8;
                    // If still off screen at top, position at bottom of container
                    if (top < containerTop + 16) {
                        top = containerBottom - calendarHeight - 16;
                    }
                }
            }
            
            setDropdownPosition({
                top: Math.max(containerTop + 16, top), // Ensure at least 16px from top of container
                left: Math.max(containerLeft + 16, left) // Ensure at least 16px from left of container
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            
            // Update position on scroll and resize
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen]);

    // Close dropdown when clicking outside (supports both mouse and touch)
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (buttonRef.current && !buttonRef.current.contains(event.target) &&
                dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            // Support both mouse and touch events for mobile compatibility
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('touchstart', handleClickOutside);
            return () => {
                document.removeEventListener('mousedown', handleClickOutside);
                document.removeEventListener('touchstart', handleClickOutside);
            };
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
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        // Format as YYYY-MM-DD without timezone conversion to preserve the selected date
        const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

    const calendarDropdown = isOpen && createPortal(
        <div
            ref={dropdownRef}
            className="fixed rounded-xl overflow-hidden"
            style={{
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                backgroundColor: 'rgba(139, 133, 125, 0.2)',
                border: `1px solid rgba(0, 0, 0, 0.15)`,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                minWidth: compact ? '240px' : '320px',
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                zIndex: 2147483647
            }}
        >
            {/* Calendar Header */}
            <div className={`${compact ? 'p-1.5' : 'p-2.5'} border-b`} style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                <div className={`flex items-center justify-between ${compact ? 'mb-1.5' : 'mb-2'}`}>
                    <button
                        type="button"
                        onClick={handlePrevMonth}
                        className={`${compact ? 'p-1' : 'p-1.5'} rounded-lg transition-all`}
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
                        <ChevronLeft size={compact ? 14 : 18} />
                    </button>
                    <div className={`${compact ? 'text-xs' : 'text-sm'} font-semibold`} style={{ color: '#5F7F76' }}>
                        {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </div>
                    <button
                        type="button"
                        onClick={handleNextMonth}
                        className={`${compact ? 'p-1' : 'p-1.5'} rounded-lg transition-all`}
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
                        <ChevronRight size={compact ? 14 : 18} />
                    </button>
                </div>

                {/* Day Names Header */}
                <div className={`grid grid-cols-7 ${compact ? 'gap-0.5' : 'gap-1'} ${compact ? 'mb-1' : 'mb-2'}`}>
                    {dayNames.map(day => (
                        <div
                            key={day}
                            className={`${compact ? 'text-[10px]' : 'text-xs'} font-medium text-center ${compact ? 'py-0.5' : 'py-1'}`}
                            style={{ color: '#5F7F76' }}
                        >
                            {day}
                        </div>
                    ))}
                </div>
            </div>

            {/* Calendar Grid */}
            <div className={`${compact ? 'p-1.5 pt-1' : 'p-2.5 pt-1.5'}`}>
                <div className={`grid grid-cols-7 ${compact ? 'gap-0.5' : 'gap-1'}`}>
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
                                    handleDateSelect(day);
                                }}
                                className={`aspect-square rounded-lg transition-all ${compact ? 'text-xs' : 'text-sm'} font-medium touch-manipulation`}
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
                                    WebkitBackdropFilter: !isSelectedDate ? 'blur(4px)' : 'none',
                                    WebkitTapHighlightColor: 'transparent'
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
            <div className={`${compact ? 'p-1.5' : 'p-2'} border-t flex gap-2`} style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                <button
                    type="button"
                    onClick={() => {
                        const today = new Date();
                        // Format as YYYY-MM-DD without timezone conversion to preserve today's date
                        const year = today.getFullYear();
                        const month = today.getMonth();
                        const day = today.getDate();
                        const todayString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        onChange(todayString);
                        setIsOpen(false);
                    }}
                    className={`flex-1 ${compact ? 'px-2 py-1' : 'px-3 py-2'} rounded-lg ${compact ? 'text-xs' : 'text-sm'} font-medium transition-all`}
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
                    className={`flex-1 ${compact ? 'px-2 py-1' : 'px-3 py-2'} rounded-lg ${compact ? 'text-xs' : 'text-sm'} font-medium transition-all`}
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
        </div>,
        document.body
    );

    return (
        <div className="relative" ref={buttonRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                onMouseDown={(e) => {
                    // Prevent any parent blur events on mobile
                    e.preventDefault();
                }}
                onTouchStart={(e) => {
                    // Prevent any parent blur events on touch devices
                    e.preventDefault();
                }}
                className={`w-full ${compact ? 'px-2 py-2' : 'px-3 py-3'} rounded-lg transition-all focus:outline-none flex items-center justify-between touch-manipulation`}
                style={{
                    border: `1px solid #f0eee7`,
                    boxShadow: theme.isDark ? 'inset 0 2px 4px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                    backgroundColor: theme.isDark ? '#0f172a' : (theme.inputBackground || '#fff'),
                    color: theme.isDark ? theme.text : '#181A18',
                    WebkitTapHighlightColor: 'transparent'
                }}
            >
                <span className={compact ? 'text-sm' : ''} style={{ color: value ? (theme.isDark ? theme.text : '#181A18') : (theme.textLight || theme.text) }}>
                    {formatDisplayDate(value)}
                </span>
                <Calendar size={compact ? 14 : 18} style={{ color: theme.primary, opacity: 0.7 }} />
            </button>
            {calendarDropdown}
        </div>
    );
}

