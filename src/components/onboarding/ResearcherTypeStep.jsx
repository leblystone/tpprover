import React from 'react';
import { motion } from 'framer-motion';
import { User, Microscope } from 'lucide-react';
import {
  TRACKING_MODES,
  TRACKING_MODE_LABELS,
  TRACKING_MODE_HELPER,
} from '../../utils/trackingMode';
import OnboardingBackButton from './OnboardingBackButton';
import OnboardingLogoFooter from './OnboardingLogoFooter';
import OnboardingQuestionHeader from './OnboardingQuestionHeader';
import simpleResearcherArt from '../../assets/onboarding/SIMPLE-RESEARCHER.png';
import advancedResearcherArt from '../../assets/onboarding/ADV-RESEARCHER.png';

/**
 * "What kind of researcher are you?" — Simple vs Advanced.
 * Two-column cards open like a book on first reveal; art sits on the card fill (no inset box).
 */
export default function ResearcherTypeStep({
  theme,
  selected,
  onSelect,
  onBack,
  simpleImage = simpleResearcherArt,
  advancedImage = advancedResearcherArt,
}) {
  const text = theme?.text || '#1f2937';
  const muted = theme?.isDark ? 'rgba(255,255,255,0.65)' : '#6b7280';
  const primary = theme?.primary || '#7F9E95';
  const cardBg = theme?.isDark ? 'rgba(255,255,255,0.06)' : '#ffffff';
  const border = theme?.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';

  const options = [
    {
      id: TRACKING_MODES.SIMPLE,
      label: TRACKING_MODE_LABELS[TRACKING_MODES.SIMPLE],
      helper: TRACKING_MODE_HELPER[TRACKING_MODES.SIMPLE],
      icon: User,
      image: simpleImage,
      side: 'left',
    },
    {
      id: TRACKING_MODES.ADVANCED,
      label: TRACKING_MODE_LABELS[TRACKING_MODES.ADVANCED],
      helper: TRACKING_MODE_HELPER[TRACKING_MODES.ADVANCED],
      icon: Microscope,
      image: advancedImage,
      side: 'right',
    },
  ];

  return (
    <div
      className="relative flex flex-col h-full px-5 pt-8 text-center"
      style={{ paddingBottom: 'calc(0.75rem + var(--safe-area-bottom, 0px))' }}
    >
      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-[560px] mx-auto gap-10 sm:gap-14 min-h-0">
        <OnboardingQuestionHeader
          className="flex-shrink-0"
          theme={theme}
          titleClassName="text-3xl sm:text-4xl font-black mb-4 px-2 leading-[1.15]"
          subtitleClassName="text-sm max-w-sm mx-auto leading-relaxed"
          title={
            <>
              What kind of researcher
              <br />
              are you?
            </>
          }
          subtitle={
            <>
              Let&apos;s make it yours.
              <br />
              You can change this anytime in Settings.
            </>
          }
        />

        <div className="w-full flex flex-col items-center gap-6">
          <div className="w-full" style={{ perspective: 1600 }}>
            <div className="w-full grid grid-cols-2 gap-4 sm:gap-6">
              {options.map((opt, i) => {
                const Icon = opt.icon;
                const active = selected === opt.id;
                const isLeft = opt.side === 'left';

                return (
                  <motion.button
                    key={opt.id}
                    type="button"
                    initial={{
                      opacity: 0,
                      rotateY: isLeft ? -28 : 28,
                      scale: 0.96,
                    }}
                    animate={{
                      opacity: 1,
                      rotateY: 0,
                      scale: 1,
                    }}
                    transition={{
                      delay: 0.18 + i * 0.1,
                      duration: 0.95,
                      ease: [0.22, 1, 0.36, 1],
                      opacity: { duration: 0.55, delay: 0.18 + i * 0.1, ease: 'easeOut' },
                    }}
                    whileHover={{ scale: 1.015, transition: { duration: 0.25, ease: 'easeOut' } }}
                    whileTap={{ scale: 0.985, transition: { duration: 0.15 } }}
                    onClick={() => onSelect(opt.id)}
                    className="flex flex-col items-center text-center rounded-3xl px-4 pt-6 pb-6 border-2 transition-[border-color,box-shadow] duration-300 ease-out"
                    style={{
                      backgroundColor: cardBg,
                      borderColor: active ? primary : border,
                      boxShadow: active
                        ? `0 0 0 3px ${primary}33, 0 12px 32px rgba(0,0,0,0.08)`
                        : theme?.isDark
                          ? '0 8px 28px rgba(0,0,0,0.35)'
                          : '0 8px 24px rgba(0,0,0,0.04)',
                      transformOrigin: isLeft ? '100% 50%' : '0% 50%',
                      transformStyle: 'preserve-3d',
                      backfaceVisibility: 'hidden',
                      willChange: 'transform, opacity',
                    }}
                  >
                    {/* mix-blend-mode:multiply removes the black background in light mode */}
                    <div className="w-full flex items-center justify-center mb-5" style={{ height: 180 }}>
                      {opt.image ? (
                        <img
                          src={opt.image}
                          alt=""
                          className="w-full h-full object-contain"
                          draggable={false}
                          style={{
                            mixBlendMode: theme?.isDark ? 'screen' : 'multiply',
                          }}
                        />
                      ) : (
                        <Icon className="w-8 h-8" strokeWidth={1.75} style={{ color: primary }} />
                      )}
                    </div>
                    <p className="text-xl font-bold mb-2.5" style={{ color: text }}>{opt.label}</p>
                    <p className="text-[13px] leading-relaxed px-1 opacity-80" style={{ color: muted }}>{opt.helper}</p>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* 2-col nav: Back in col 1 (right-aligned); Forward later left-aligned */}
          <div className="w-full grid grid-cols-2 gap-4 sm:gap-6">
            <div className="flex justify-end">
              <OnboardingBackButton onClick={onBack} theme={theme} />
            </div>
            <div className="flex justify-start">
              {/* Forward control lands here later */}
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[560px] mx-auto flex justify-center pt-4 flex-shrink-0">
        <OnboardingLogoFooter pinned={false} size="lg" />
      </div>
    </div>
  );
}
