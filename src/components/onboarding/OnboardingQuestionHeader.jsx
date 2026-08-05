import React from 'react';
import { motion } from 'framer-motion';

/**
 * Shared staggered text entrance for onboarding question screens.
 * Matches the welcome splash headline / subtitle timing.
 */
export default function OnboardingQuestionHeader({
  title,
  subtitle,
  accent,
  theme,
  align = 'center',
  titleClassName = 'text-3xl sm:text-4xl font-black mb-3 px-2 leading-tight',
  subtitleClassName = 'text-sm max-w-sm mx-auto',
  accentClassName = 'text-lg font-semibold mb-2',
  className = '',
}) {
  const text = theme?.text || '#1f2937';
  const muted = theme?.isDark ? 'rgba(255,255,255,0.65)' : '#6b7280';
  const primary = theme?.primary || '#7F9E95';
  const alignClass = align === 'left' ? 'text-left' : 'text-center';

  return (
    <div className={`${alignClass} ${className}`}>
      <motion.h1
        className={titleClassName}
        style={{ color: text }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.38, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
      >
        {title}
      </motion.h1>
      {accent && (
        <motion.p
          className={accentClassName}
          style={{ color: primary }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
        >
          {accent}
        </motion.p>
      )}
      {subtitle && (
        <motion.p
          className={subtitleClassName}
          style={{ color: muted }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: accent ? 0.24 : 0.18, ease: [0.22, 1, 0.36, 1] }}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
}
