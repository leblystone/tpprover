import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { recordDismissal, getStoreUrl } from '../../utils/versionChecker';
import updateImg from '../../assets/update.png';

/**
 * Full-screen update splash (native store builds).
 * Optical centering (content sits above geometric mid), large hero art, roomy type stack.
 */
export default function UpdatePromptModal({
  open,
  onClose,
  updateInfo,
  theme,
}) {
  React.useEffect(() => {
    const handleTestUpdate = (event) => {
      console.log('🧪 Test update event received:', event.detail);
    };
    window.addEventListener('tpp:test-update', handleTestUpdate);
    return () => window.removeEventListener('tpp:test-update', handleTestUpdate);
  }, []);

  if (!updateInfo) return null;

  const {
    latestVersion,
    urgency,
    isRequired,
    storeUrls,
  } = updateInfo;

  const isCritical = urgency === 'critical' || isRequired;
  const isRecommended = urgency === 'recommended';
  const primary = theme?.primary || '#5F7F76';
  const splashBg = theme?.primaryDark || primary;

  const title = isCritical
    ? 'Update Required'
    : isRecommended
      ? 'Update Recommended'
      : 'New Update Available';

  const body = isCritical
    ? 'A newer version of The Pep Planner is required to continue. Please update to access the latest features and fixes.'
    : isRecommended
      ? 'This update includes meaningful improvements. Updating now keeps your research tracking smooth and up to date.'
      : 'Update now for smoother research tracking and fixes under the hood.';

  const dismissLabel = isRecommended ? 'Remind Me Later' : 'Not Now';

  const handleUpdate = () => {
    const storeUrl = getStoreUrl(storeUrls);
    window.open(storeUrl, '_blank');
    if (!isRequired) onClose();
  };

  const handleDismiss = () => {
    if (!isRequired) {
      recordDismissal();
      onClose();
    }
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="update-splash"
          className="fixed inset-0 z-[10002] overflow-hidden"
          style={{ backgroundColor: splashBg }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          {/* Concentric ring atmosphere */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            <div
              className="absolute left-1/2 top-[6%] -translate-x-1/2 rounded-full"
              style={{
                width: '140vmax',
                height: '140vmax',
                background:
                  'radial-gradient(circle, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.06) 35%, transparent 60%)',
              }}
            />
            {[0.42, 0.58, 0.74].map((scale, i) => (
              <div
                key={i}
                className="absolute left-1/2 top-[16%] -translate-x-1/2 -translate-y-1/2 rounded-full border"
                style={{
                  width: `${scale * 100}vmax`,
                  height: `${scale * 100}vmax`,
                  borderColor: `rgba(255,255,255,${0.1 - i * 0.02})`,
                }}
              />
            ))}
          </div>

          {/* Optically centered stack — art top ~35% of viewport */}
          <div
            className="relative h-full flex flex-col items-center px-8 sm:px-10"
            style={{
              paddingTop: 'max(2.5rem, env(safe-area-inset-top))',
              paddingBottom: 'max(2.5rem, env(safe-area-inset-bottom))',
              color: '#FFFFFF',
            }}
          >
            {/* Spacer — push stack lower for optical balance */}
            <div className="shrink-0" style={{ height: '36vh', minHeight: '9rem' }} aria-hidden />

            <motion.img
              src={updateImg}
              alt=""
              className="w-[260px] sm:w-[312px] h-auto max-h-[min(52vh,360px)] object-contain select-none pointer-events-none drop-shadow-lg shrink-0"
              draggable={false}
              initial={{ opacity: 0, y: 16, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.08, duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
            />

            <motion.div
              className="w-full max-w-sm mt-10 sm:mt-12 text-center flex flex-col items-center"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              <h1 className="text-[1.75rem] sm:text-3xl font-bold leading-tight mb-5">
                {title}
              </h1>
              <p className="text-[15px] sm:text-base leading-[1.65] opacity-85 max-w-[18.5rem] mb-10">
                {body}
              </p>

              <div className="flex flex-col items-center gap-5 w-full">
                <button
                  type="button"
                  onClick={handleUpdate}
                  className="px-10 py-3.5 rounded-full text-base font-bold transition-transform active:scale-[0.98]"
                  style={{
                    backgroundColor: '#FFFFFF',
                    color: splashBg,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                  }}
                >
                  Update Now
                </button>

                {!isRequired && (
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="py-1.5 text-sm font-medium transition-opacity hover:opacity-70"
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: 'rgba(255,255,255,0.85)',
                    }}
                  >
                    {dismissLabel}
                  </button>
                )}
              </div>
            </motion.div>

            <div className="flex-1 min-h-[1.5rem]" aria-hidden />
          </div>

          {/* Version — out of the primary stack */}
          {latestVersion && (
            <p
              className="pointer-events-none absolute text-[11px] font-medium tracking-wide"
              style={{
                left: 'max(1.5rem, env(safe-area-inset-left))',
                bottom: 'max(1.25rem, env(safe-area-inset-bottom))',
                color: 'rgba(255,255,255,0.38)',
              }}
            >
              v{latestVersion}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
