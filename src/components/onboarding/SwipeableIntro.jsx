import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, X, FlaskConical, Calendar, Package, TrendingUp } from 'lucide-react';
import logo from '../../assets/tpp_logo.png';

const INTRO_SCREENS = [
  {
    id: 1,
    title: 'Welcome to The Pep Planner',
    subtitle: 'Your research companion',
    description: 'Built for the pep research community. Made by a researcher, for researchers.',
    gradient: ['#1a1a1a', '#0a0a0a'], // Deep black
    accentColor: '#7F9E95', // Sage accent
    icon: FlaskConical,
    illustration: '🧪'
  },
  {
    id: 2,
    title: 'Organize Your Protocols',
    subtitle: 'Plan with precision',
    description: 'Create dosing schedules, track durations, and manage your research protocols all in one place.',
    gradient: ['#7F9E95', '#6B8A81'], // Sage green
    accentColor: '#F5F3EF', // Cream accent
    icon: Calendar,
    illustration: '📅'
  },
  {
    id: 3,
    title: 'Track Everything',
    subtitle: 'Stay on top of your research',
    description: 'Monitor inventory, manage orders, and keep detailed records of your peptide research journey.',
    gradient: ['#F5F3EF', '#E8E6E1'], // Cream/beige
    accentColor: '#7F9E95', // Sage accent
    icon: Package,
    illustration: '📦',
    darkText: true // Use dark text on light background
  },
  {
    id: 4,
    title: '10 Days to Explore',
    subtitle: 'No strings attached',
    description: 'Take 10 full days to explore every feature. No initial payment, just see if it works for you.',
    gradient: ['#2a2a2a', '#1a1a1a'], // Charcoal to black
    accentColor: '#7F9E95', // Sage accent
    icon: TrendingUp,
    illustration: '✨'
  }
];

export default function SwipeableIntro({ open, onComplete, theme }) {
  console.log('🎬 SwipeableIntro rendering, open =', open);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [startX, setStartX] = useState(0);
  const containerRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  
  console.log('🎬 SwipeableIntro state:', { currentIndex, isDragging, dragOffset });

  // Reset to first screen when opened
  useEffect(() => {
    if (open) {
      setCurrentIndex(0);
      setDragOffset(0);
    }
  }, [open]);

  // Handle touch start
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    setIsDragging(true);
    setStartX(touch.clientX);
  };

  // Handle touch move
  const handleTouchMove = (e) => {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = Math.abs(touch.clientY - touchStartY.current);
    
    // Only allow horizontal swiping (prevent vertical scroll interference)
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault();
      setDragOffset(deltaX);
    }
  };

  // Handle touch end
  const handleTouchEnd = () => {
    if (!isDragging) return;
    
    const threshold = 100; // Minimum swipe distance
    const velocity = Math.abs(dragOffset) / 10; // Simple velocity calculation
    
    if (Math.abs(dragOffset) > threshold || velocity > 5) {
      if (dragOffset > 0 && currentIndex > 0) {
        // Swipe right - go to previous
        setCurrentIndex(currentIndex - 1);
      } else if (dragOffset < 0 && currentIndex < INTRO_SCREENS.length - 1) {
        // Swipe left - go to next
        setCurrentIndex(currentIndex + 1);
      }
    }
    
    setIsDragging(false);
    setDragOffset(0);
  };

  // Handle mouse events for desktop
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setDragOffset(e.clientX - startX);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    
    const threshold = 100;
    if (Math.abs(dragOffset) > threshold) {
      if (dragOffset > 0 && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      } else if (dragOffset < 0 && currentIndex < INTRO_SCREENS.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }
    
    setIsDragging(false);
    setDragOffset(0);
  };

  // Handle skip
  const handleSkip = () => {
    onComplete();
  };

  // Handle next/complete
  const handleNext = () => {
    if (currentIndex < INTRO_SCREENS.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  if (!open) {
    console.log('🎬 SwipeableIntro not rendering (open = false)');
    return null;
  }

  const currentScreen = INTRO_SCREENS[currentIndex];
  const nextScreen = INTRO_SCREENS[currentIndex + 1];
  const prevScreen = INTRO_SCREENS[currentIndex - 1];
  
  console.log('🎬 SwipeableIntro rendering screen:', currentScreen?.title);
  console.log('🎬 Current index:', currentIndex, 'Total screens:', INTRO_SCREENS.length);
  console.log('🎬 Screen data:', currentScreen);

  // Calculate background gradient based on swipe position
  const getBackgroundGradient = () => {
    // Use solid color fallback for better Android compatibility
    return currentScreen.gradient[0]; // Just use first color as solid background
  };

  const backgroundStyle = { 
    backgroundColor: getBackgroundGradient() // Solid color instead of gradient
  };

  // Determine text color for current screen (for skip button)
  const currentTextColor = currentScreen.darkText ? '#2F3B3A' : '#FFFFFF';
  const currentSubtleTextColor = currentScreen.darkText ? 'rgba(47, 59, 58, 0.8)' : 'rgba(255, 255, 255, 0.8)';

  return (
    <div 
      className="fixed inset-0 z-[10001] overflow-hidden relative"
      style={backgroundStyle}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      ref={containerRef}
    >
      {/* Skip button */}
      <button
        onClick={handleSkip}
        className="absolute top-4 right-4 z-10 p-2 rounded-full backdrop-blur-sm hover:bg-white/30 transition-all"
        style={{ 
          backgroundColor: currentScreen.darkText ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)'
        }}
        aria-label="Skip intro"
      >
        <X className="w-5 h-5" style={{ color: currentTextColor }} />
      </button>

      {/* Content container with drag offset */}
      <div 
        className="flex h-full transition-transform duration-300 ease-out"
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out'
        }}
      >
        {/* All screens container */}
        <div className="flex w-full h-full flex-shrink-0">
          {INTRO_SCREENS.map((screen, index) => {
            const isActive = index === currentIndex;
            const offset = (index - currentIndex) * 100;
            
            // Calculate text colors for THIS screen
            const screenTextColor = screen.darkText ? '#2F3B3A' : '#FFFFFF';
            const screenSubtleTextColor = screen.darkText ? 'rgba(47, 59, 58, 0.8)' : 'rgba(255, 255, 255, 0.8)';
            const IconComponent = screen.icon;
            
            return (
              <div
                key={screen.id}
                className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center z-[2]"
                style={{
                  transform: `translateX(${offset}%)`,
                  opacity: isActive ? 1 : 0,
                  transition: isDragging ? 'none' : 'all 0.3s ease-out',
                  pointerEvents: isActive ? 'auto' : 'none'
                }}
              >
                {/* Logo */}
                <div className="mb-8 animate-fade-in">
                  <img 
                    src={logo} 
                    alt="The Pep Planner Logo" 
                    className="h-20 w-20 rounded-full shadow-2xl object-cover mx-auto border-4"
                    style={{ 
                      borderColor: screen.darkText ? 'rgba(127, 158, 149, 0.3)' : 'rgba(255, 255, 255, 0.3)',
                      backgroundColor: '#7F9E95' // Fallback bg if image doesn't load
                    }}
                    onError={(e) => {
                      console.error('❌ Logo failed to load');
                      e.target.style.backgroundColor = '#7F9E95';
                      e.target.style.border = '4px solid rgba(255, 255, 255, 0.3)';
                    }}
                  />
                </div>

                {/* Icon/Illustration */}
                <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  <div 
                    className="w-24 h-24 rounded-full backdrop-blur-sm flex items-center justify-center mb-4 border-2"
                    style={{
                      backgroundColor: screen.darkText ? 'rgba(127, 158, 149, 0.2)' : 'rgba(255, 255, 255, 0.2)',
                      borderColor: screen.darkText ? 'rgba(127, 158, 149, 0.3)' : 'rgba(255, 255, 255, 0.3)'
                    }}
                  >
                    {IconComponent && <IconComponent 
                      className="w-12 h-12" 
                      style={{ color: screen.accentColor }}
                    />}
                  </div>
                  <div className="text-6xl mb-2">{screen.illustration}</div>
                </div>

                {/* Title */}
                <h1 
                  className="text-4xl sm:text-5xl font-black mb-3 drop-shadow-lg animate-fade-in"
                  style={{ 
                    color: screenTextColor,
                    animationDelay: '0.2s'
                  }}
                >
                  {screen.title}
                </h1>

                {/* Subtitle */}
                <h2 
                  className="text-xl sm:text-2xl font-semibold mb-4 drop-shadow-md animate-fade-in"
                  style={{ 
                    color: screenSubtleTextColor,
                    animationDelay: '0.3s'
                  }}
                >
                  {screen.subtitle}
                </h2>

                {/* Description */}
                <p 
                  className="text-base sm:text-lg max-w-md mx-auto leading-relaxed mb-8 drop-shadow-sm animate-fade-in"
                  style={{ 
                    color: screenSubtleTextColor,
                    animationDelay: '0.4s'
                  }}
                >
                  {screen.description}
                </p>

                {/* Progress dots */}
                <div className="flex gap-2 mb-8 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                  {INTRO_SCREENS.map((_, dotIndex) => (
                    <div
                      key={dotIndex}
                      className="h-2 rounded-full transition-all duration-300"
                      style={{
                        width: dotIndex === currentIndex ? '32px' : '8px',
                        backgroundColor: dotIndex === currentIndex 
                          ? screenTextColor
                          : screenSubtleTextColor.replace('0.8', '0.4')
                      }}
                    />
                  ))}
                </div>

                {/* Next/Get Started button */}
                <button
                  onClick={handleNext}
                  className="px-8 py-4 rounded-full font-bold text-lg shadow-2xl hover:shadow-3xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2 animate-fade-in"
                  style={{ 
                    backgroundColor: screen.accentColor,
                    color: screen.darkText ? '#FFFFFF' : '#1a1a1a',
                    animationDelay: '0.6s'
                  }}
                >
                  {currentIndex === INTRO_SCREENS.length - 1 ? (
                    <>
                      Get Started
                      <ChevronRight className="w-5 h-5" />
                    </>
                  ) : (
                    <>
                      Next
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Swipe indicator (only show on first screen) */}
      {currentIndex === 0 && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce z-[3]">
          <div className="flex flex-col items-center text-sm" style={{ color: currentSubtleTextColor }}>
            <span className="mb-2">Swipe to continue</span>
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>
      )}
    </div>
  );
}

