import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

/**
 * AnimatedCard - A wrapper component that provides smooth animations for cards
 * Supports entry, exit, and deletion animations
 * 
 * @param {string} id - Unique identifier for the card
 * @param {boolean} isDeleting - Whether the card is currently being deleted
 * @param {string} animationStyle - Animation style: 'fade-scale' | 'slide-out' | 'collapse' | 'shrink'
 * @param {number} animationDuration - Duration in milliseconds (default: 300)
 * @param {boolean} enableStagger - Enable stagger effect based on index
 * @param {number} staggerIndex - Index for stagger calculation
 * @param {React.ReactNode} children - Card content
 * @param {string} className - Additional CSS classes
 * @param {object} style - Inline styles
 * @param {function} onClick - Click handler
 * @param {object} layoutAnimation - Enable layout animations for repositioning
 */
export default function AnimatedCard({
  id,
  isDeleting = false,
  animationStyle = 'fade-scale',
  animationDuration = 300,
  enableStagger = false,
  staggerIndex = 0,
  children,
  className = '',
  style = {},
  onClick,
  layoutAnimation = true,
  ...props
}) {
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    if (isDeleting) {
      // Remove from DOM after animation completes
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, animationDuration);
      return () => clearTimeout(timer);
    }
  }, [isDeleting, animationDuration]);

  if (!shouldRender && isDeleting) {
    return null;
  }

  // Animation variants based on style
  const getVariants = () => {
    const baseTransition = {
      duration: animationDuration / 1000,
      ease: 'easeInOut'
    };

    const staggerDelay = enableStagger ? staggerIndex * 0.03 : 0;

    switch (animationStyle) {
      case 'fade-scale':
        return {
          initial: { opacity: 0, scale: 0.95, y: -10 },
          animate: { 
            opacity: isDeleting ? 0 : 1, 
            scale: isDeleting ? 0.9 : 1,
            y: 0
          },
          exit: { 
            opacity: 0, 
            scale: 0.85,
            transition: { ...baseTransition, duration: baseTransition.duration * 0.9 }
          },
          transition: {
            ...baseTransition,
            delay: staggerDelay
          }
        };

      case 'slide-out':
        return {
          initial: { opacity: 0, x: -20 },
          animate: { 
            opacity: isDeleting ? 0 : 1,
            x: isDeleting ? 100 : 0
          },
          exit: { 
            opacity: 0,
            x: 100,
            transition: { ...baseTransition, duration: baseTransition.duration * 0.85, ease: 'easeIn' }
          },
          transition: {
            ...baseTransition,
            delay: staggerDelay
          }
        };

      case 'collapse':
        return {
          initial: { opacity: 0, height: 0 },
          animate: { 
            opacity: isDeleting ? 0 : 1,
            height: isDeleting ? 0 : 'auto'
          },
          exit: { 
            opacity: 0,
            height: 0,
            marginBottom: 0,
            transition: baseTransition
          },
          transition: {
            ...baseTransition,
            delay: staggerDelay
          }
        };

      case 'shrink':
        return {
          initial: { opacity: 0, scaleX: 0.9 },
          animate: { 
            opacity: isDeleting ? 0 : 1,
            scaleX: isDeleting ? 0 : 1
          },
          exit: { 
            opacity: 0,
            scaleX: 0,
            transition: { ...baseTransition, duration: baseTransition.duration * 0.8 }
          },
          transition: {
            ...baseTransition,
            delay: staggerDelay
          }
        };

      default:
        return {
          initial: { opacity: 0 },
          animate: { opacity: isDeleting ? 0 : 1 },
          exit: { opacity: 0 },
          transition: baseTransition
        };
    }
  };

  const variants = getVariants();

  return (
    <motion.div
      key={id}
      layout={layoutAnimation}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={variants}
      className={className}
      style={style}
      onClick={onClick}
      whileHover={!isDeleting ? { scale: 1.01 } : undefined}
      transition={variants.transition}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/**
 * AnimatedList - Wrapper for lists of animated cards
 * Handles AnimatePresence automatically
 */
export function AnimatedList({ 
  children, 
  className = '',
  mode = 'popLayout' // 'sync' | 'wait' | 'popLayout'
}) {
  return (
    <div className={className}>
      <AnimatePresence mode={mode}>
        {children}
      </AnimatePresence>
    </div>
  );
}

