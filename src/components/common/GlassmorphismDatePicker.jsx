import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

// Conservative heights for positioning (actual dropdown is taller than old 140/160)
const DROPDOWN_HEIGHT_COMPACT = 260;
const DROPDOWN_HEIGHT_FULL = 320;

export default function GlassmorphismDatePicker({ value, onChange, theme, placeholder = "Select date", compact = false, preferOpenAbove = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(() => {
        if (value) {
            // Parse YYYY-MM-DD string directly to avoid timezone issues
            const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (match) {
                const [, year, month] = match;
                return new Date(parseInt(year), parseInt(month) - 1, 1);
            }
            // Fallback to Date parse if format doesn't match
            const date = new Date(value);
            return new Date(date.getFullYear(), date.getMonth(), 1);
        }
        return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    });
    const dropdownRef = useRef(null);
    const buttonRef = useRef(null);
    const scrollContainerRef = useRef(null);
    const justScrolledRef = useRef(false);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

    // Parse value to Date object - parse YYYY-MM-DD string directly to avoid timezone issues
    const selectedDate = value ? (() => {
        const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
            const [, year, month, day] = match;
            return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        }
        // Fallback to Date parse if format doesn't match
        return new Date(value);
    })() : null;

    // Find scrollable ancestor (e.g. BottomSheet content) for bounds + scroll listener
    const getScrollContainer = () => {
        if (!buttonRef.current) return null;
        let el = buttonRef.current.parentElement;
        while (el && el !== document.body) {
            const style = window.getComputedStyle(el);
            const oy = style.overflowY;
            if (oy === 'auto' || oy === 'scroll' || el.classList.contains('overflow-y-auto')) {
                return el;
            }
            el = el.parentElement;
        }
        return null;
    };

    // Calculate dropdown position when opening and on scroll/resize
    const updatePosition = () => {
        if (buttonRef.current) {
            const buttonRect = buttonRef.current.getBoundingClientRect();
            const calendarWidth = compact ? 240 : 320;
            const calendarHeight = compact ? DROPDOWN_HEIGHT_COMPACT : DROPDOWN_HEIGHT_FULL;
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
                const zNum = parseInt(zIndex, 10);
                const hasHighZIndex = (!isNaN(zNum) && zNum >= 9999) || (parent.classList && (parent.classList.contains('z-[9999]') || parent.classList.contains('z-[10002]')));
                
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
            
            // Prefer scrollable ancestor (BottomSheet content) as container when inside modal
            const scrollEl = getScrollContainer();
            if (scrollEl && modalContainer && modalContainer.contains(scrollEl)) {
                modalRect = scrollEl.getBoundingClientRect();
            } else if (modalContainer) {
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
                // On mobile: prefer above when preferOpenAbove (e.g. in modals), else below
                const spaceAbove = buttonRect.top - containerTop - 16;
                const spaceBelow = containerBottom - buttonRect.bottom - 16;
                const positionAbove = buttonRect.top - calendarHeight - 8;
                const positionBelow = buttonRect.bottom + 8;

                if (preferOpenAbove && spaceAbove >= calendarHeight + 8) {
                    top = positionAbove;
                } else if (!preferOpenAbove && spaceBelow >= calendarHeight + 8) {
                    top = positionBelow;
                } else if (spaceAbove >= calendarHeight + 8) {
                    top = positionAbove;
                } else if (spaceBelow >= calendarHeight + 8) {
                    top = positionBelow;
                } else {
                    top = spaceAbove >= spaceBelow ? positionAbove : positionBelow;
                    if (top < containerTop + 16) top = containerTop + 16;
                    if (top + calendarHeight > containerBottom - 16) top = containerBottom - calendarHeight - 16;
                }
            }
            
            setDropdownPosition({
                top: Math.max(containerTop + 16, top), // Ensure at least 16px from top of container
                left: Math.max(containerLeft + 16, left) // Ensure at least 16px from left of container
            });
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        updatePosition();
        const scrollEl = getScrollContainer();
        scrollContainerRef.current = scrollEl;

        const onScroll = () => {
            updatePosition();
            justScrolledRef.current = true;
            clearTimeout(window._datePickerScrollTimeout);
            window._datePickerScrollTimeout = setTimeout(() => {
                justScrolledRef.current = false;
            }, 150);
        };

        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        if (scrollEl) scrollEl.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
            if (scrollEl) scrollEl.removeEventListener('scroll', onScroll);
            if (window._datePickerScrollTimeout) clearTimeout(window._datePickerScrollTimeout);
            scrollContainerRef.current = null;
        };
    }, [isOpen]);

    // Close dropdown on click outside (use 'click' not mousedown/touchstart so scroll-drag doesn't close)
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (justScrolledRef.current) {
                justScrolledRef.current = false;
                return;
            }
            if (buttonRef.current && !buttonRef.current.contains(event.target) &&
                dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [isOpen]);

    // Update currentMonth when value changes
    useEffect(() => {
        if (value) {
            // Parse YYYY-MM-DD string directly to avoid timezone issues
            const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
            if (match) {
                const [, year, month] = match;
                setCurrentMonth(new Date(parseInt(year), parseInt(month) - 1, 1));
            } else {
                // Fallback to Date parse if format doesn't match
                const date = new Date(value);
                setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
            }
        }
    }, [value]);

    const formatDisplayDate = (dateString) => {
        if (!dateString) return placeholder;
        // Parse YYYY-MM-DD string directly to avoid timezone issues
        const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        let date;
        if (match) {
            const [, year, month, day] = match;
            date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
            // Fallback to Date parse if format doesn't match
            date = new Date(dateString);
        }
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
        // Create date in local timezone to avoid timezone conversion issues
        // This ensures the selected date is preserved correctly
        const localDate = new Date(year, month, day);
        // Format as YYYY-MM-DD using local date components to preserve the selected date
        const dateString = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
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

    const calendarDropdown = createPortal(
        <>
            {/* Invisible overlay: click outside calendar to close (reliable on touch) */}
            <div
                aria-hidden="true"
                className="fixed inset-0"
                style={{
                    zIndex: 2147483646,
                    pointerEvents: isOpen ? 'auto' : 'none'
                }}
                onClick={() => setIsOpen(false)}
            />
            <div
                ref={dropdownRef}
                className="fixed rounded-xl overflow-hidden transition-all duration-300 ease-in-out"
            style={{
                backdropFilter: 'blur(24px) saturate(180%)',
                WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                backgroundColor: theme.isDark ? 'rgba(30, 30, 30, 0.75)' : 'rgba(139, 133, 125, 0.2)',
                border: `1px solid ${theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.15)'}`,
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
                minWidth: compact ? '240px' : '320px',
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                zIndex: 2147483647,
                maxHeight: isOpen ? '500px' : '0',
                opacity: isOpen ? 1 : 0,
                transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)',
                pointerEvents: isOpen ? 'auto' : 'none',
                overflow: isOpen ? 'visible' : 'hidden'
            }}
        >
            {/* Calendar Header */}
            <div className={`${compact ? 'p-1.5' : 'p-2.5'} border-b`} style={{ borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.2)' }}>
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
                    <div className={`${compact ? 'text-xs' : 'text-sm'} font-semibold`} style={{ color: theme.isDark ? 'rgba(255,255,255,0.85)' : '#5F7F76' }}>
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
                            style={{ color: theme.isDark ? 'rgba(255,255,255,0.5)' : '#5F7F76' }}
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
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDateSelect(day);
                                }}
                                className={`aspect-square rounded-lg transition-all ${compact ? 'text-xs' : 'text-sm'} font-medium touch-manipulation`}
                                style={{
                                    backgroundColor: isSelectedDate
                                        ? (theme.isDark ? 'rgba(160, 180, 153, 0.5)' : theme.primary)
                                        : isTodayDate
                                            ? 'rgba(255, 255, 255, 0.2)'
                                            : 'transparent',
                                    color: isSelectedDate
                                        ? '#ffffff'
                                        : '#ffffff',
                                    border: isTodayDate && !isSelectedDate
                                        ? `1px solid ${theme.isDark ? 'rgba(255,255,255,0.4)' : theme.primary}`
                                        : '1px solid transparent',
                                    boxShadow: isSelectedDate
                                        ? (theme.isDark 
                                            ? `0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)` 
                                            : `0 2px 8px ${theme.primary}50, inset 0 1px 0 rgba(255, 255, 255, 0.2)`)
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
            <div className={`${compact ? 'p-1.5' : 'p-2'} border-t flex gap-2`} style={{ borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.2)' }}>
                <button
                    type="button"
                    onClick={() => {
                        const today = new Date();
                        // Format as YYYY-MM-DD using local date components to preserve today's date
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
        </div>
        </>,
        document.body
    );

    return (
        <div className="relative" ref={buttonRef}>
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full ${compact ? 'px-2 py-2' : 'px-3 py-3'} rounded-lg transition-all focus:outline-none flex items-center justify-between touch-manipulation`}
                style={{
                    border: theme.isDark ? '1px solid rgba(255,255,255,0.08)' : '1px solid #f0eee7',
                    boxShadow: theme.isDark ? 'inset 0 1px 3px rgba(0,0,0,0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)',
                    backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : (theme.inputBackground || theme.cardBackground),
                    color: theme.isDark ? theme.text : '#181A18',
                    WebkitTapHighlightColor: 'transparent'
                }}
            >
                <span className={compact ? 'text-sm' : ''} style={{ color: value ? (theme.isDark ? theme.text : '#181A18') : (theme.textLight || theme.text) }}>
                    {formatDisplayDate(value)}
                </span>
                <Calendar size={compact ? 14 : 18} style={{ color: theme.isDark ? 'rgba(255,255,255,0.5)' : theme.primary, opacity: 0.7 }} />
            </button>
            {calendarDropdown}
        </div>
    );
}

