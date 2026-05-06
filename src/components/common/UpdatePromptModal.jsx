import React from 'react';
import Modal from './Modal';
import { motion } from 'framer-motion';
import {
  DeviceMobile,
  ShieldCheck,
  Sparkle,
  ArrowSquareOut,
  Clock,
} from '@phosphor-icons/react';
import { recordDismissal, getStoreUrl } from '../../utils/versionChecker';

export default function UpdatePromptModal({
  open,
  onClose,
  updateInfo,
  theme,
}) {
  // TEST HELPER: Listen for test events (remove in production)
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
  const cardBg = theme?.cardBackground || (theme?.isDark ? 'rgba(255,255,255,0.05)' : '#f8faf9');
  const border = theme?.border || '#e5e7eb';
  const textMain = theme?.text || '#111827';
  const textLight = theme?.textLight || '#6b7280';

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

  return (
    <Modal
      open={open}
      onClose={isRequired ? () => {} : onClose}
      title={isCritical ? 'Update Required' : 'Update Available'}
      theme={theme}
      variant="modern"
      maxWidth="max-w-md"
      hideCloseButton={isRequired}
      disableBackdropClose={isRequired}
    >
      <div className="space-y-5 py-1">

        {/* Icon badge row */}
        <div className="flex flex-col items-center gap-2 pt-1">
          <div
            className="rounded-2xl flex items-center justify-center"
            style={{
              width: 64,
              height: 64,
              background: isCritical
                ? `${primary}18`
                : `${primary}14`,
              border: `1.5px solid ${primary}30`,
            }}
          >
            {isCritical ? (
              <ShieldCheck
                size={34}
                weight="duotone"
                style={{ color: primary }}
              />
            ) : (
              <Sparkle
                size={34}
                weight="duotone"
                style={{ color: primary }}
              />
            )}
          </div>

          <div className="text-center">
            <h2
              className="text-lg font-semibold leading-tight"
              style={{ color: textMain }}
            >
              {isCritical ? 'Update Required' : 'Update Available'}
            </h2>
            {latestVersion && (
              <span
                className="text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block"
                style={{
                  background: `${primary}15`,
                  color: primary,
                }}
              >
                v{latestVersion}
              </span>
            )}
          </div>

          <p
            className="text-sm text-center leading-relaxed max-w-xs"
            style={{ color: textLight }}
          >
            {isCritical
              ? <>This update is <span style={{ color: textMain, fontWeight: 600 }}>required</span> to keep using <em>The Pep Planner</em> safely and securely.</>
              : <>We've squashed bugs and added improvements to make <em>The Pep Planner</em> better.</>}
          </p>
        </div>


        {/* Critical inline notice */}
        {isCritical && (
          <p className="text-xs text-center leading-relaxed" style={{ color: textLight }}>
            You{'\u2019'}ll need to update before continuing.
          </p>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2 pt-1">
          <motion.button
            onClick={handleUpdate}
            whileTap={{ scale: 0.97 }}
            className="w-full px-6 py-3.5 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-sm"
            style={{
              background: primary,
              boxShadow: `0 2px 10px ${primary}40`,
            }}
          >
            <DeviceMobile size={18} weight="duotone" />
            Update Now
            <ArrowSquareOut size={15} weight="bold" className="opacity-70" />
          </motion.button>

          {!isRequired && (
            <motion.button
              onClick={handleDismiss}
              whileTap={{ scale: 0.97 }}
              className="w-full px-6 py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 transition-opacity hover:opacity-70"
              style={{
                background: cardBg,
                color: textLight,
                border: `1px solid ${border}`,
              }}
            >
              <Clock size={15} weight="duotone" />
              Remind Me Later
            </motion.button>
          )}
        </div>

        {/* Dismissal footnote */}
        {!isRequired && (
          <p className="text-xs text-center" style={{ color: textLight }}>
            We{'\u2019'}ll remind you again in 5 days
          </p>
        )}
      </div>
    </Modal>
  );
}
