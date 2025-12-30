import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, X, FlaskConical, Calendar, Package, TrendingUp } from 'lucide-react';
import logo from '../../assets/tpp_logo.png';

const INTRO_SCREENS = [
  {
    id: 1,
    title: 'Welcome to The Pep Planner',
    subtitle: 'Your research companion',
    description: 'Built for the pep research community. Made by a researcher, for researchers.',
    gradient: ['#9bc2bb', '#86b0a8'], // Sage green gradient
    icon: FlaskConical,
    illustration: '🧪'
  },
  {
    id: 2,
    title: 'Organize Your Protocols',
    subtitle: 'Plan with precision',
    description: 'Create dosing schedules, track durations, and manage your research protocols all in one place.',
    gradient: ['#c4b8b0', '#a39890'], // Taupe gradient
    icon: Calendar,
    illustration: '📅'
  },
  {
    id: 3,
    title: 'Track Everything',
    subtitle: 'Stay on top of your research',
    description: 'Monitor inventory, manage orders, and keep detailed records of your peptide research journey.',
    gradient: ['#9f8f95', '#7d6f74'], // Mauve gradient
    icon: Package,
    illustration: '📦'
  },
  {
    id: 4,
    title: '10 Days to Explore',
    subtitle: 'No strings attached',
    description: 'Take 10 full days to explore every feature. No initial payment, just see if it works for you.',
    gradient: ['#7F9E95', '#5F7F76'], // Primary sage gradient
    icon: TrendingUp,
    illustration: '✨'
  }
];

export default function SwipeableIntro({ open, onComplete, theme }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [startX, setStartX] = useState(0);
  const containerRef = useRef(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);

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

  if (!open) return null;

  const currentScreen = INTRO_SCREENS[currentIndex];
  const nextScreen = INTRO_SCREENS[currentIndex + 1];
  const prevScreen = INTRO_SCREENS[currentIndex - 1];

  // Calculate background gradient based on swipe position
  const getBackgroundGradient = () => {
    if (!isDragging || dragOffset === 0) {
      return `linear-gradient(135deg, ${currentScreen.gradient[0]} 0%, ${currentScreen.gradient[1]} 100%)`;
    }

    // Determine if swiping left (next) or right (previous)
    if (dragOffset < 0 && nextScreen) {
      // Swiping left to next screen
      const progress = Math.abs(dragOffset) / window.innerWidth;
      const clampedProgress = Math.min(progress, 1);
      
      const color1 = mixColors(currentScreen.gradient[0], nextScreen.gradient[0], clampedProgress);
      const color2 = mixColors(currentScreen.gradient[1], nextScreen.gradient[1], clampedProgress);
      
      return `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
    } else if (dragOffset > 0 && prevScreen) {
      // Swiping right to previous screen
      const progress = Math.abs(dragOffset) / window.innerWidth;
      const clampedProgress = Math.min(progress, 1);
      
      const color1 = mixColors(currentScreen.gradient[0], prevScreen.gradient[0], clampedProgress);
      const color2 = mixColors(currentScreen.gradient[1], prevScreen.gradient[1], clampedProgress);
      
      return `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`;
    }

    return `linear-gradient(135deg, ${currentScreen.gradient[0]} 0%, ${currentScreen.gradient[1]} 100%)`;
  };

  // Simple color mixing function
  const mixColors = (color1, color2, ratio) => {
    const hex1 = color1.replace('#', '');
    const hex2 = color2.replace('#', '');
    
    const r1 = parseInt(hex1.substring(0, 2), 16);
    const g1 = parseInt(hex1.substring(2, 4), 16);
    const b1 = parseInt(hex1.substring(4, 6), 16);
    
    const r2 = parseInt(hex2.substring(0, 2), 16);
    const g2 = parseInt(hex2.substring(2, 4), 16);
    const b2 = parseInt(hex2.substring(4, 6), 16);
    
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    
    return `#${[r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('')}`;
  };

  const backgroundStyle = { background: getBackgroundGradient() };

  const IconComponent = currentScreen.icon;

  return (
    <div 
      className="fixed inset-0 z-[10001] overflow-hidden"
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
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/30 transition-all"
        aria-label="Skip intro"
      >
        <X className="w-5 h-5 text-white" />
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
            
            return (
              <div
                key={screen.id}
                className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center"
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
                    className="h-20 w-20 rounded-full shadow-2xl object-cover mx-auto border-4 border-white/30"
                  />
                </div>

                {/* Icon/Illustration */}
                <div className="mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                  <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4 border-2 border-white/30">
                    <IconComponent className="w-12 h-12 text-white" />
                  </div>
                  <div className="text-6xl mb-2">{screen.illustration}</div>
                </div>

                {/* Title */}
                <h1 
                  className="text-4xl sm:text-5xl font-black mb-3 text-white drop-shadow-lg animate-fade-in"
                  style={{ animationDelay: '0.2s' }}
                >
                  {screen.title}
                </h1>

                {/* Subtitle */}
                <h2 
                  className="text-xl sm:text-2xl font-semibold mb-4 text-white/90 drop-shadow-md animate-fade-in"
                  style={{ animationDelay: '0.3s' }}
                >
                  {screen.subtitle}
                </h2>

                {/* Description */}
                <p 
                  className="text-base sm:text-lg text-white/80 max-w-md mx-auto leading-relaxed mb-8 drop-shadow-sm animate-fade-in"
                  style={{ animationDelay: '0.4s' }}
                >
                  {screen.description}
                </p>

                {/* Progress dots */}
                <div className="flex gap-2 mb-8 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                  {INTRO_SCREENS.map((_, dotIndex) => (
                    <div
                      key={dotIndex}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        dotIndex === currentIndex 
                          ? 'w-8 bg-white' 
                          : 'w-2 bg-white/40'
                      }`}
                    />
                  ))}
                </div>

                {/* Next/Get Started button */}
                <button
                  onClick={handleNext}
                  className="px-8 py-4 rounded-full bg-white text-gray-800 font-bold text-lg shadow-2xl hover:shadow-3xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center gap-2 animate-fade-in"
                  style={{ animationDelay: '0.6s' }}
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
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <div className="flex flex-col items-center text-white/60 text-sm">
            <span className="mb-2">Swipe to continue</span>
            <ChevronRight className="w-5 h-5" />
          </div>
        </div>
      )}
    </div>
  );
}

