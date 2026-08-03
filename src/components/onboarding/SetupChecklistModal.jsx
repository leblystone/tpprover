import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Package,
  ShoppingCart,
  Pill,
  FirstAid,
  Storefront,
  Target,
  Flask,
} from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import AddToStockpileBottomSheet from '../stockpile/AddToStockpileBottomSheet';
import AddSupplyModal from '../stockpile/AddSupplyModal';
import { useAppContext } from '../../context/AppContext';
import { prepareItemForSave } from '../../utils/userDataSave';
import { DEFAULT_SETUP_CHECKLIST } from '../../utils/trackingMode';
import OnboardingBackButton from './OnboardingBackButton';
import OnboardingLogoFooter from './OnboardingLogoFooter';
import OnboardingQuestionHeader from './OnboardingQuestionHeader';
import stockpileSetupArt from '../../assets/onboarding/stockpile_stock.png';
import ordersSetupArt from '../../assets/onboarding/order_researcher.png';
import supplementsSetupArt from '../../assets/onboarding/supplement_researcher.png';
import medicationsSetupArt from '../../assets/onboarding/medication_researcher.png';
import vendorsSetupArt from '../../assets/onboarding/vendor_researcher.png';
import goalsSetupArt from '../../assets/onboarding/goal_researcher.png';

const ICON_WEIGHT = 'duotone';
const OVERLAY_Z = 'z-[10040]';

const SETUP_ITEMS = [
  { id: 'stockpile', label: 'Stockpile', description: 'Vials & supplies on hand', icon: Package, path: null, art: stockpileSetupArt },
  { id: 'orders', label: 'Orders', description: 'Pending or scheduled orders', icon: ShoppingCart, path: '/app/orders', art: ordersSetupArt },
  { id: 'supplements', label: 'Supplements', description: 'Daily supplements schedule', icon: Pill, path: '/app/supplements', art: supplementsSetupArt },
  { id: 'medications', label: 'Medications', description: 'Routine medications', icon: FirstAid, path: '/app/supplements?tab=meds', art: medicationsSetupArt },
  { id: 'vendors', label: 'Vendors', description: 'Where you source research', icon: Storefront, path: '/app/vendors', art: vendorsSetupArt },
  { id: 'goals', label: 'Goals', description: 'Research goals to track', icon: Target, path: '/app/goals', art: goalsSetupArt },
];

/**
 * Post-first-protocol optional setup checklist.
 * Unchecked items are skipped entirely.
 */
export default function SetupChecklistModal({ open, theme, onComplete, onBack, fillParent = false }) {
  const navigate = useNavigate();
  const { setStockpile } = useAppContext();
  const [selected, setSelected] = useState({ ...DEFAULT_SETUP_CHECKLIST });
  const [queue, setQueue] = useState([]);
  const [queueIndex, setQueueIndex] = useState(-1);
  const [showStockpile, setShowStockpile] = useState(false);
  const [showSupplyWizard, setShowSupplyWizard] = useState(false);

  if (!open) return null;

  const primary = theme?.primary || '#7F9E95';
  const text = theme?.text || '#1f2937';
  const muted = theme?.isDark ? 'rgba(255,255,255,0.65)' : '#6b7280';
  const cardBg = theme?.isDark ? 'rgba(255,255,255,0.06)' : '#ffffff';
  const border = theme?.isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)';
  const bg = theme?.isDark
    ? 'linear-gradient(180deg, #14191f 0%, #0e1219 100%)'
    : 'linear-gradient(180deg, #F5F3EF 0%, #E8E6E1 100%)';

  const inQueue = queueIndex >= 0 && queue.length > 0;
  const current = inQueue ? queue[queueIndex] : null;

  const toggle = (id) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const finish = (checklist) => {
    onComplete?.(checklist || selected);
  };

  const closeStockpileModals = () => {
    setShowStockpile(false);
    setShowSupplyWizard(false);
  };

  const advanceQueue = (list, index) => {
    const nextIndex = index + 1;
    if (nextIndex >= list.length) {
      setQueue([]);
      setQueueIndex(-1);
      closeStockpileModals();
      finish(selected);
      return;
    }
    const item = list[nextIndex];
    setQueueIndex(nextIndex);
    closeStockpileModals();
    if (item.id !== 'stockpile' && item.path) {
      navigate(item.path);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: `Add your first ${item.label.toLowerCase()} anytime — or tap Continue below.`, type: 'info' },
      }));
    }
  };

  const handleContinue = () => {
    const checked = SETUP_ITEMS.filter((i) => selected[i.id]);
    if (checked.length === 0) {
      finish(selected);
      return;
    }
    setQueue(checked);
    setQueueIndex(-1);
    advanceQueue(checked, -1);
  };

  const handleSkipAll = () => {
    finish({ ...DEFAULT_SETUP_CHECKLIST });
  };

  const handleQueueBack = () => {
    closeStockpileModals();
    if (queueIndex <= 0) {
      // Return to checklist selection
      setQueue([]);
      setQueueIndex(-1);
      return;
    }
    setQueueIndex((i) => i - 1);
  };

  const handleSupplySaved = (supplyItem) => {
    const saved = prepareItemForSave(
      { ...supplyItem, type: 'supply' },
      { isNew: !supplyItem.createdAt }
    );
    setStockpile?.((prev) => {
      const list = Array.isArray(prev) ? prev : [];
      const exists = list.some((i) => i.id === saved.id);
      return exists
        ? list.map((i) => (i.id === saved.id ? saved : i))
        : [saved, ...list];
    });
    window.dispatchEvent(new CustomEvent('tpp:toast', {
      detail: { message: `${saved.name} added to supplies`, type: 'success' },
    }));
    setShowSupplyWizard(false);
    advanceQueue(queue, queueIndex);
  };

  return (
    <div
      className={`${fillParent ? 'absolute inset-0' : 'fixed inset-0 z-[10020]'} flex flex-col`}
      style={{
        background: bg,
        paddingTop: fillParent ? '0.5rem' : 'max(1.5rem, var(--safe-area-top, 0px))',
        paddingBottom: fillParent ? 0 : 'max(1.5rem, var(--safe-area-bottom, 0px))',
      }}
    >
      {(inQueue || onBack) && (
        <div className="px-3 pt-1">
          <OnboardingBackButton
            onClick={inQueue ? handleQueueBack : onBack}
            theme={theme}
          />
        </div>
      )}
      <div className="flex-1 px-6 max-w-lg mx-auto w-full flex flex-col justify-center">
        {!inQueue ? (
          <>
            <OnboardingQuestionHeader
              className="mb-6"
              theme={theme}
              align="left"
              title={(
                <>
                  Good momentum - let&apos;s
                  <br />
                  keep going.
                </>
              )}
              subtitle="Build up your pep planner;"
            />

            <div className="space-y-2 mb-8">
              {SETUP_ITEMS.map((item, i) => {
                const Icon = item.icon;
                const on = Boolean(selected[item.id]);
                return (
                  <motion.button
                    key={item.id}
                    type="button"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => toggle(item.id)}
                    className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left"
                    style={{
                      backgroundColor: cardBg,
                      borderColor: on ? primary : border,
                      boxShadow: on ? `0 0 0 1px ${primary}55` : undefined,
                    }}
                  >
                    <span
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${primary}18`, color: primary }}
                    >
                      <Icon size={22} weight={ICON_WEIGHT} color={primary} aria-hidden />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-bold" style={{ color: text }}>{item.label}</span>
                      <span className="block text-xs opacity-70" style={{ color: muted }}>{item.description}</span>
                    </span>
                    <span
                      className="w-6 h-6 rounded-md border flex items-center justify-center flex-shrink-0"
                      style={{
                        backgroundColor: on ? primary : 'transparent',
                        borderColor: on ? primary : border,
                        color: '#fff',
                      }}
                    >
                      {on ? <Check size={14} weight="bold" /> : null}
                    </span>
                  </motion.button>
                );
              })}
            </div>

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={handleContinue}
                className="w-full py-3.5 rounded-full font-bold"
                style={{ backgroundColor: primary, color: theme?.textOnPrimary || '#fff' }}
              >
                Continue
              </button>
              <button
                type="button"
                onClick={handleSkipAll}
                className="w-full py-2.5 text-sm font-medium opacity-70"
                style={{ color: muted }}
              >
                Skip for now
              </button>
            </div>
          </>
        ) : current?.id === 'stockpile' ? (
          <div className="text-center">
            <div className="w-56 h-56 sm:w-64 sm:h-64 mx-auto mb-4 flex items-center justify-center">
              <img
                src={stockpileSetupArt}
                alt=""
                className="w-full h-full object-contain"
                draggable={false}
                style={{
                  mixBlendMode: theme?.isDark ? 'screen' : 'multiply',
                }}
              />
            </div>
            <OnboardingQuestionHeader
              className="mb-6"
              theme={theme}
              titleClassName="text-2xl font-bold mb-2 leading-tight"
              title="Let's build your stockpile!"
            />
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSupplyWizard(false);
                  setShowStockpile(true);
                }}
                className="w-full py-3.5 rounded-full font-bold inline-flex items-center justify-center gap-2"
                style={{ backgroundColor: primary, color: theme?.textOnPrimary || '#fff' }}
              >
                <Flask size={18} weight={ICON_WEIGHT} />
                Add vial or kit
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowStockpile(false);
                  setShowSupplyWizard(true);
                }}
                className="w-full py-3.5 rounded-full font-bold border inline-flex items-center justify-center gap-2"
                style={{
                  backgroundColor: cardBg,
                  color: text,
                  borderColor: border,
                }}
              >
                <Package size={18} weight={ICON_WEIGHT} />
                Add Supplies
              </button>
              <button
                type="button"
                onClick={() => {
                  closeStockpileModals();
                  advanceQueue(queue, queueIndex);
                }}
                className="text-sm opacity-70 py-2"
                style={{ color: muted }}
              >
                Skip this one
              </button>
            </div>
            <p className="text-xs mt-6 opacity-50" style={{ color: muted }}>
              Step {queueIndex + 1} of {queue.length}
            </p>
          </div>
        ) : (
          <div className="text-center">
            {current?.art ? (
              <div className="w-56 h-56 sm:w-64 sm:h-64 mx-auto mb-4 flex items-center justify-center">
                <img
                  src={current.art}
                  alt=""
                  className="w-full h-full object-contain"
                  draggable={false}
                  style={{
                    mixBlendMode: theme?.isDark ? 'screen' : 'multiply',
                  }}
                />
              </div>
            ) : (
              (() => {
                const CurrentIcon = current?.icon;
                return (
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: `${primary}22`, color: primary }}
                  >
                    {CurrentIcon && <CurrentIcon size={28} weight={ICON_WEIGHT} color={primary} aria-hidden />}
                  </div>
                );
              })()
            )}
            <OnboardingQuestionHeader
              className="mb-8"
              theme={theme}
              titleClassName="text-2xl font-bold mb-2 leading-tight"
              subtitleClassName="text-sm"
              title={`Set up ${current?.label || ''}`}
              subtitle={`We've opened ${current?.label}. Add an item if you like, then continue.`}
            />
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => advanceQueue(queue, queueIndex)}
                className="w-full py-3.5 rounded-full font-bold border"
                style={{
                  backgroundColor: primary,
                  color: theme?.textOnPrimary || '#fff',
                  borderColor: border,
                }}
              >
                {queueIndex >= queue.length - 1 ? 'Finish setup' : 'Continue'}
              </button>
              <button
                type="button"
                onClick={() => advanceQueue(queue, queueIndex)}
                className="text-sm opacity-70 py-2"
                style={{ color: muted }}
              >
                Skip this one
              </button>
            </div>
            <p className="text-xs mt-6 opacity-50" style={{ color: muted }}>
              Step {queueIndex + 1} of {queue.length}
            </p>
          </div>
        )}
      </div>

      <AddToStockpileBottomSheet
        open={showStockpile}
        onClose={() => {
          setShowStockpile(false);
          if (inQueue && current?.id === 'stockpile') {
            advanceQueue(queue, queueIndex);
          }
        }}
        theme={theme}
        zIndexClass={OVERLAY_Z}
        onAddSupply={() => {
          setShowStockpile(false);
          setTimeout(() => setShowSupplyWizard(true), 200);
        }}
      />

      <AddSupplyModal
        open={showSupplyWizard}
        onClose={() => {
          setShowSupplyWizard(false);
          if (inQueue && current?.id === 'stockpile') {
            advanceQueue(queue, queueIndex);
          }
        }}
        theme={theme}
        zIndexClass={OVERLAY_Z}
        onSave={handleSupplySaved}
      />

      <div className="absolute bottom-0 left-0 right-0">
        <OnboardingLogoFooter />
      </div>
    </div>
  );
}
