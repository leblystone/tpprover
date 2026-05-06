import React, { useState, useEffect, useRef, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Modal from './Modal';
import { ArrowRight, Sparkles, Crown, Bot, Megaphone, Share2 } from 'lucide-react';
import {
  ShootingStar,
  Flask,
  CalendarDots,
  Package,
  DeviceMobileCamera,
  PresentationChart,
  UserCirclePlus,
  HandHeart,
  Robot,
  Brain,
  ChatDots,
  ShareNetwork,
  Users,
  LockKeyOpen,
} from '@phosphor-icons/react';
import logo from '../../assets/tpp_logo.png';
import pipAvatar from '../../assets/PiP.png';

/** Research+ premium gold */
const GOLD = '#D4A030';

const STEPS = [
  {
    headline: 'Welcome to Pep Planner 2.0',
    highlightsIntro: {
      title: "This isn\u2019t a tiny patch\u2014it\u2019s a 2.0 rebuild",
      leadJsx: <>All researchers should have organized research. The Pep Planner now has a <strong>free plan*</strong>.</>,
    },
    bullets: [
      {
        Icon: UserCirclePlus,
        colorKey: 'gold',
        weight: 'duotone',
        iconSize: 26,
        textJsx: <>Research<span style={{ color: GOLD, fontWeight: 700 }}>+</span> unlocks P.i.P—your new peptide assistant, full research analytics with visual understanding, a buddy system, and so much more.</>,
      },
      {
        Icon: DeviceMobileCamera,
        colorKey: 'primary',
        weight: 'duotone',
        iconSize: 26,
        text: 'We reworked how you move through the app first—navigation, dashboard, and really all areas—tuned for a calmer daily workflow and less hunting for what matters.',
      },
      {
        Icon: PresentationChart,
        colorKey: 'info',
        weight: 'duotone',
        iconSize: 26,
        text: 'Aggressive analytics and now share cards—show off your commitment to your research!',
      },
      {
        Icon: HandHeart,
        colorKey: 'success',
        weight: 'duotone',
        iconSize: 26,
        textJsx: <>Start organizing your research at <strong>no cost</strong>—protocols, supplements, orders, and your calendar are all yours on the <strong>free plan*</strong>.</>,
      },
    ],
  },
  {
    headline: 'Research+',
    highlightsIntro: {
      boxed: false,
      badge: 'Research+',
      title: 'Everything unlocked\u2014for researchers who go deeper',
      leadJsx: <>P.i.P, buddy system, community, and zero caps. This is what Research<span style={{ color: GOLD, fontWeight: 700 }}>+</span> is.</>,
    },
    bullets: [
      {
        imgSrc: pipAvatar,
        imgSize: 30,
        colorKey: 'primary',
        textJsx: <>Think of me as the teammate who actually read the manual. Stack questions, protocol planning, recon math{'\u2014'}bring it. I{'\u2019'}ve read all your logs and I don{'\u2019'}t judge.*</>,
      },
      {
        Icon: Users,
        colorKey: 'success',
        weight: 'duotone',
        iconSize: 26,
        text: "Buddy system\u2014link up with one research buddy to share milestones, check in on each other\u2019s protocols, and keep each other accountable.",
      },
      {
        Icon: LockKeyOpen,
        colorKey: 'info',
        weight: 'duotone',
        iconSize: 26,
        text: 'Unlimited protocols, supplements, stockpile, orders, vendors, cloud sync, and premium themes\u2014no caps, no restrictions.',
      },
    ],
  },
  {
    headline: 'Navigation & dashboard',
    highlightsIntro: {
      boxed: false,
      badge: 'Rebuilt',
      title: 'A calmer way to move through your app',
      lead: 'Less hunting. Everything right where you expect it.',
    },
    bullets: [
      {
        Icon: DeviceMobileCamera,
        colorKey: 'primary',
        weight: 'duotone',
        iconSize: 26,
        text: 'Navigation rebuilt from the ground up\u2014every section tuned for a calmer daily workflow and faster access to what matters most.',
      },
      {
        Icon: Flask,
        colorKey: 'success',
        weight: 'duotone',
        iconSize: 26,
        text: 'Supplements, protocols, orders, and stockpile are easier to work with\u2014cleaner screens, fewer dead ends, and limits that make sense for your plan.',
      },
      {
        Icon: CalendarDots,
        colorKey: 'warning',
        weight: 'duotone',
        iconSize: 26,
        text: 'Calendar week-view and day-view now share the same story\u2014notes, side effects, and events line up so your week and your day always match.',
      },
    ],
  },
  {
    headline: 'Analytics & sharing',
    highlightsIntro: {
      boxed: false,
      badge: 'New',
      title: 'Aggressive analytics and sharing',
      lead: 'Show off your commitment to your research.',
    },
    bullets: [
      {
        Icon: PresentationChart,
        colorKey: 'primary',
        weight: 'duotone',
        iconSize: 26,
        text: 'Full visual analytics\u2014protocol performance, side effect timelines, and supplement history all in one view with real depth.',
      },
      {
        Icon: ShareNetwork,
        colorKey: 'info',
        weight: 'duotone',
        iconSize: 26,
        text: 'Share cards let you export and share your research milestones\u2014a clean visual snapshot of your tracking, ready to post.',
      },
      {
        Icon: Package,
        colorKey: 'success',
        weight: 'duotone',
        iconSize: 26,
        text: 'Achievement groundwork is in place\u2014you\u2019ll see more of this roll out as we build on top of your tracking history.',
      },
    ],
  },
];

function bulletColor(theme, key) {
  if (key === 'gold') return GOLD;
  if (key === 'info') return theme?.info ?? theme?.primary;
  if (key === 'success') return theme?.success ?? theme?.primary;
  if (key === 'warning') return theme?.warning ?? theme?.primary;
  return theme?.primary;
}

export default function FeatureAnnouncementModal({
  open,
  onClose,
  announcementId,
  theme,
  previewMode = false,
  /** When true, step 1 skips free-plan emphasis (accounts created before today’s local midnight). */
  audienceLegacyBeforeToday = false,
}) {
  const [hasSeenAnnouncement, setHasSeenAnnouncement] = useState(false);
  const [step, setStep] = useState(0);
  const direction = useRef(1);

  useEffect(() => {
    if (!announcementId) return;
    try {
      const seenAnnouncements = JSON.parse(localStorage.getItem('tpp_seen_announcements') || '{}');
      if (seenAnnouncements[announcementId]) setHasSeenAnnouncement(true);
    } catch (error) {
      console.error('Error checking announcement status:', error);
    }
  }, [announcementId]);

  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const handleClose = () => {
    if (announcementId && !previewMode) {
      try {
        const seenAnnouncements = JSON.parse(localStorage.getItem('tpp_seen_announcements') || '{}');
        seenAnnouncements[announcementId] = { seenAt: new Date().toISOString(), timestamp: Date.now() };
        localStorage.setItem('tpp_seen_announcements', JSON.stringify(seenAnnouncements));
      } catch (error) {
        console.error('Error saving announcement status:', error);
      }
    }
    onClose();
  };

  /** Uses signup date + App-passed founder dev simulation; must apply in preview too so dev toggles match production. */
  const effectiveLegacyFirstPage = audienceLegacyBeforeToday;

  const current = useMemo(() => {
    const base = STEPS[step];
    if (step !== 0 || !effectiveLegacyFirstPage) return base;
    return {
      ...base,
      highlightsIntro: {
        ...base.highlightsIntro,
        leadJsx: <>All researchers should have organized research. {'Here\u2019s what\u2019s new in your Pep Planner 2.0 rebuild.'}</>,
      },
      bullets: base.bullets.slice(0, 3),
    };
  }, [step, effectiveLegacyFirstPage]);

  if (!previewMode && hasSeenAnnouncement) return null;

  const last = STEPS.length - 1;

  const goNext = () => {
    if (step >= last) { handleClose(); return; }
    direction.current = 1;
    setStep((s) => Math.min(s + 1, last));
  };

  const goBack = () => {
    direction.current = -1;
    setStep((s) => Math.max(0, s - 1));
  };

  return (
    <Modal
      open={open}
      onClose={() => {}}
      title="What's New Here"
      theme={theme}
      variant="modern"
      maxWidth="max-w-md"
      onBack={step > 0 ? goBack : undefined}
      hideCloseButton
      disableBackdropClose
    >
      <div className="py-1">
        {/* Progress dots */}
        <div className="flex justify-center gap-1.5 mb-5 px-2" aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: i === step ? 28 : 7,
                backgroundColor: i === step ? theme?.primary : `${theme?.border}99`,
                opacity: i === step ? 1 : 0.55,
              }}
            />
          ))}
        </div>

        {/* Animated step content */}
        <div className="overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ x: direction.current * 48, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction.current * -48, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 380, damping: 34, mass: 0.8 }}
            >
              {/* Eyebrow */}
              <div className={`text-center px-3 ${current.highlightsIntro ? 'mb-5' : 'mb-6'}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wider mb-2 opacity-55" style={{ color: theme?.text }}>
                  Say Hello to The Pep Planner 2.0
                </p>
                {step > 0 && !current.highlightsIntro && (
                  <h2 className="text-xl sm:text-2xl font-semibold tracking-tight mb-2" style={{ color: theme?.text }}>
                    {current.headline}
                  </h2>
                )}
                {step > 0 && !current.highlightsIntro && (
                  <p className="text-sm opacity-75 leading-relaxed" style={{ color: theme?.text }}>
                    {current.sub}
                  </p>
                )}
              </div>

              {/* Intro card / flat header */}
              {current.highlightsIntro && (() => {
                const boxed = current.highlightsIntro.boxed !== false;
                return (
                  <div className="px-3 mb-5">
                    <div
                      className={boxed ? 'rounded-2xl p-4 sm:p-5 border' : ''}
                      style={boxed ? {
                        background: theme?.isDark
                          ? `linear-gradient(145deg, ${theme.primary}26 0%, rgba(255,255,255,0.03) 48%, rgba(0,0,0,0.12) 100%)`
                          : `linear-gradient(145deg, ${theme.primary}18 0%, ${theme.cardBackground || '#fff'} 42%, ${theme.secondary || theme.background} 100%)`,
                        borderColor: theme?.isDark ? `${theme.primary}55` : `${theme.primary}35`,
                        boxShadow: theme?.isDark
                          ? `0 12px 40px rgba(0,0,0,0.35), 0 0 0 1px ${theme.primary}22 inset`
                          : `0 10px 36px ${theme.primary}20, 0 1px 0 rgba(255,255,255,0.85) inset`,
                      } : undefined}
                    >
                      {/* Badge */}
                      <div className="flex justify-center sm:justify-start mb-3">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-md"
                          style={{
                            backgroundColor: theme?.primaryDark || theme?.primary,
                            boxShadow: `0 4px 14px ${theme?.primary}55`,
                          }}
                        >
                          <ShootingStar size={14} weight="fill" aria-hidden />
                          {(() => {
                            const badgeText = current.highlightsIntro.badge ?? 'New in 2.0';
                            if (!badgeText.includes('+')) return badgeText;
                            const [before, ...rest] = badgeText.split('+');
                            return (
                              <>
                                {before}
                                <span className="badge-plus-shimmer" style={{ color: GOLD, position: 'relative', display: 'inline-block' }}>+</span>
                                {rest.join('+')}
                              </>
                            );
                          })()}
                        </span>
                      </div>
                      <style>{`
                        @keyframes badgePlusShimmer {
                          0%   { text-shadow: 0 0 4px ${GOLD}00; filter: brightness(1); }
                          40%  { text-shadow: 0 0 8px ${GOLD}cc, 0 0 16px ${GOLD}88; filter: brightness(1.6); }
                          60%  { text-shadow: 0 0 8px ${GOLD}cc, 0 0 16px ${GOLD}88; filter: brightness(1.6); }
                          100% { text-shadow: 0 0 4px ${GOLD}00; filter: brightness(1); }
                        }
                        .badge-plus-shimmer {
                          animation: badgePlusShimmer 2.8s ease-in-out infinite;
                        }
                      `}</style>

                      {/* Title — JSX or plain string with optional em-dash break */}
                      <h3 className="text-lg sm:text-xl font-bold text-center sm:text-left mb-2 leading-snug" style={{ color: theme?.text }}>
                        {current.highlightsIntro.titleJsx
                          ? current.highlightsIntro.titleJsx
                          : (() => {
                              const parts = (current.highlightsIntro.title ?? '').split('\u2014');
                              if (parts.length < 2) return current.highlightsIntro.title;
                              return parts.map((part, i) => (
                                <React.Fragment key={i}>
                                  {i === 0 ? `${part}\u2014` : part}
                                  {i === 0 && <br />}
                                </React.Fragment>
                              ));
                            })()
                        }
                      </h3>

                      <p className="text-sm sm:text-[15px] leading-relaxed text-center sm:text-left opacity-90" style={{ color: theme?.text }}>
                        {current.highlightsIntro.leadJsx ?? current.highlightsIntro.lead}
                      </p>
                    </div>
                  </div>
                );
              })()}

              {/* Bullets */}
              <div className="px-3 mb-6 space-y-5">
                {current.bullets.map((row) => {
                  const Icon = row.Icon;
                  const col = bulletColor(theme, row.colorKey);
                  const iconSize = row.iconSize ?? 20;
                  return (
                    <div key={row.text ?? row.colorKey} className="flex items-center gap-3">
                      <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 30, height: 30 }} aria-hidden>
                        {row.imgSrc
                          ? <img src={row.imgSrc} alt="" style={{ width: row.imgSize ?? iconSize, height: row.imgSize ?? iconSize, objectFit: 'contain', borderRadius: '50%' }} />
                          : <Icon size={iconSize} style={{ color: col }} {...(row.weight ? { weight: row.weight } : { strokeWidth: 2 })} />
                        }
                      </div>
                      <p className="text-sm leading-relaxed text-left" style={{ color: theme?.text }}>
                        {row.textJsx ?? row.text}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Free plan disclaimer (only when we show free-plan copy on page 1) */}
              {step === 0 && !effectiveLegacyFirstPage && (
                <p className="px-3 mb-4 text-[10px] opacity-50 text-center leading-relaxed" style={{ color: theme?.text }}>
                  * Free plan includes core tracking features. Some features require a Research+ subscription.
                </p>
              )}

              {/* P.i.P AI disclaimer (Research+ step) */}
              {step === 1 && (
                <p className="px-3 mb-4 text-[10px] opacity-50 text-center leading-relaxed" style={{ color: theme?.text }}>
                  * P.i.P is an AI research planning tool, not medical advice.
                </p>
              )}

              {/* Final step logo divider */}
              {step === last && (
                <div className="flex items-center justify-center gap-3 px-4 mb-5">
                  <div className="h-px flex-1" style={{ backgroundColor: `${theme?.border}80` }} />
                  <img
                    src={logo}
                    alt=""
                    className="h-8 w-8 rounded-full object-contain opacity-80"
                    style={{ imageRendering: 'auto', backfaceVisibility: 'hidden', transform: 'translateZ(0)' }}
                  />
                  <div className="h-px flex-1" style={{ backgroundColor: `${theme?.border}80` }} />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Fixed footer */}
        <div className="flex flex-col items-center gap-3 px-3 pb-1">
          <motion.button
            type="button"
            onClick={goNext}
            whileTap={{ scale: 0.94 }}
            whileHover={{ opacity: 0.9 }}
            className="flex items-center justify-center gap-2 rounded-full px-8 py-3 text-sm font-semibold text-white touch-manipulation"
            style={{
              backgroundColor: theme?.primary,
              boxShadow: `0 4px 16px ${theme?.primary}55, inset 0 2px 4px rgba(255,255,255,0.18), inset 0 -2px 4px rgba(0,0,0,0.15)`,
            }}
            aria-label={step >= last ? 'Happy Researching' : `Next, step ${step + 1} of ${STEPS.length}`}
          >
            <span>{step >= last ? 'Happy Researching!' : 'Next'}</span>
            <ArrowRight size={15} strokeWidth={2.5} aria-hidden />
          </motion.button>

          <AnimatePresence mode="wait" initial={false}>
            {step > 0 ? (
              <motion.div
                key="back-row"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 4 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-4"
              >
                <button
                  type="button"
                  onClick={goBack}
                  className="text-xs font-medium opacity-50 hover:opacity-80 transition-opacity touch-manipulation"
                  style={{ color: theme?.text }}
                >
                  ← Back
                </button>
                {step < last && (
                  <span className="text-xs tabular-nums opacity-35" style={{ color: theme?.text }} aria-hidden>
                    {step + 1} / {STEPS.length}
                  </span>
                )}
              </motion.div>
            ) : step < last ? (
              <motion.span
                key="step-count"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="text-xs tabular-nums opacity-35"
                style={{ color: theme?.text }}
                aria-hidden
              >
                {step + 1} / {STEPS.length}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  );
}

export function shouldShowAnnouncement(announcementId) {
  try {
    const seenAnnouncements = JSON.parse(localStorage.getItem('tpp_seen_announcements') || '{}');
    return !seenAnnouncements[announcementId];
  } catch (error) {
    return false;
  }
}

export function resetAnnouncement(announcementId) {
  try {
    const seenAnnouncements = JSON.parse(localStorage.getItem('tpp_seen_announcements') || '{}');
    delete seenAnnouncements[announcementId];
    localStorage.setItem('tpp_seen_announcements', JSON.stringify(seenAnnouncements));
  } catch (error) {}
}
