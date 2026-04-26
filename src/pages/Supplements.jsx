import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Pill, Plus, Search, Sun, Moon } from 'lucide-react';
import { Syringe, Flask, Pill as PhPill } from '@phosphor-icons/react';
import { useAppContext } from '../context/AppContext';
import { useSubscriptionAccess } from '../utils/useSubscriptionAccess';
import SupplementEditorModal from '../components/dashboard/SupplementEditorModal';
import UpgradeModal from '../components/common/UpgradeModal';

const DAY_ORDER = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Labels for chips: daily, or sorted abbreviated weekdays */
function getDayChipLabels(supplement) {
  const days = Array.isArray(supplement.days) ? supplement.days : [];
  if (days.length === 0 || days.length === 7) return ['Daily'];
  const sorted = [...days].sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  return sorted;
}

const DELIVERY_ICON_CONFIG = {
  injection: { Icon: Syringe, color: '#8ea5a0' },
  syringe: { Icon: Syringe, color: '#8ea5a0' },
  powder: { Icon: Flask, color: '#8ba4c0' },
  oral: { Icon: PhPill, color: '#9ca3af' },
};

function DeliveryIcon({ delivery, size = 16, color, weight = 'duotone' }) {
  const d = String(delivery || 'oral').toLowerCase();
  const cfg = DELIVERY_ICON_CONFIG[d] || DELIVERY_ICON_CONFIG.oral;
  const Icon = cfg.Icon;
  return <Icon size={size} color={color || cfg.color} weight={weight} />;
}

function SupplementCard({ supplement, theme, onEdit }) {
  const schedule = Array.isArray(supplement.schedule) ? supplement.schedule : [];
  const hasAM = schedule.includes('AM');
  const hasPM = schedule.includes('PM');
  const deliveryKey = String(supplement.delivery || 'oral').toLowerCase();

  const iconCfg = DELIVERY_ICON_CONFIG[deliveryKey] || DELIVERY_ICON_CONFIG.oral;
  const tint = iconCfg.color;

  return (
    <button
      type="button"
      onClick={() => onEdit(supplement)}
      className="group relative text-left rounded-[20px] p-3.5 transition-all duration-300 hover:-translate-y-1 active:scale-95 flex flex-col justify-between"
      style={{
        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.95)',
        border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'}`,
        boxShadow: theme.isDark
          ? '0 4px 12px rgba(0,0,0,0.2)'
          : '0 4px 16px rgba(0,0,0,0.04)',
        minHeight: '110px'
      }}
    >
      {/* Background Hover Glow */}
      <div
        className="absolute inset-0 rounded-[20px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(circle at top right, ${theme.primary}15 0%, transparent 60%)`
        }}
      />

      <div className="relative z-10 w-full flex items-start gap-3 mb-2">
        <DeliveryIcon
          delivery={supplement.delivery}
          size={28}
          color={tint}
          weight="duotone"
        />
        <div className="flex-1 min-w-0 pt-0.5">
          <h3 className="font-bold text-sm truncate" style={{ color: theme.text }}>
            {supplement.name || 'Untitled'}
          </h3>
          {supplement.dose && (
            <p className="text-xs truncate mt-0.5" style={{ color: theme.textLight }}>
              {supplement.dose}{supplement.unit ? ` ${supplement.unit}` : ''}
            </p>
          )}
        </div>
      </div>

      <div
        className="relative z-10 mt-auto pt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-2 border-t"
        style={{ borderColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
      >
        <div className="flex flex-wrap gap-1 min-w-0 flex-1">
          {getDayChipLabels(supplement).map((label) => (
            <span
              key={label}
              className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium tabular-nums"
              style={{
                color: theme.textLight,
                backgroundColor: theme.isDark ? `${theme.primary}18` : `${theme.primary}0d`,
                border: `1px solid ${theme.border}`,
              }}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="flex gap-1 shrink-0 items-center">
          {hasAM && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium"
              style={{
                backgroundColor: theme.isDark ? `${theme.primaryLight || theme.primary}70` : theme.primary,
                color: theme.textOnPrimary,
                border: `1px solid ${theme.primaryDark || theme.primary}`,
              }}
            >
              <Sun size={11} strokeWidth={2} aria-hidden />
              AM
            </span>
          )}
          {hasPM && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[10px] font-medium"
              style={{
                backgroundColor: theme.primaryDark || theme.primary,
                color: theme.textOnPrimary,
                border: `1px solid ${theme.isDark ? `${theme.primary}90` : (theme.primaryDark || theme.primary)}`,
              }}
            >
              <Moon size={11} strokeWidth={2} aria-hidden />
              PM
            </span>
          )}
          {!hasAM && !hasPM && (
            <span className="text-[10px] font-medium" style={{ color: theme.textLight }}>
              Unscheduled
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function Supplements() {
  const { theme } = useOutletContext();
  const { supplements, addSupplement, updateSupplement, deleteSupplement } = useAppContext();
  const { isReadOnly } = useSubscriptionAccess();

  const [showEditor, setShowEditor] = useState(false);
  const [editingSupplement, setEditingSupplement] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [search, setSearch] = useState('');

  const { filteredItems, totalCount } = useMemo(() => {
    const list = (supplements || []).filter((s) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        (s.name || '').toLowerCase().includes(q) ||
        (s.dose || '').toLowerCase().includes(q) ||
        (s.delivery || '').toLowerCase().includes(q)
      );
    });

    return {
      filteredItems: list,
      totalCount: (supplements || []).length,
    };
  }, [supplements, search]);

  const handleAdd = useCallback(() => {
    if (isReadOnly) { setShowUpgrade(true); return; }
    setEditingSupplement(null);
    setShowEditor(true);
  }, [isReadOnly]);

  const handleEdit = (supplement) => {
    if (isReadOnly) { setShowUpgrade(true); return; }
    setEditingSupplement(supplement);
    setShowEditor(true);
  };

  const handleSave = async (supplement) => {
    if (supplement._delete && supplement.id) {
      await deleteSupplement(supplement.id);
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Supplement deleted', type: 'success' } }));
    } else if (editingSupplement) {
      await updateSupplement(supplement);
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Supplement updated', type: 'success' } }));
    } else {
      addSupplement(supplement);
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Supplement added', type: 'success' } }));
    }
    setShowEditor(false);
    setEditingSupplement(null);
  };

  const hasAny = totalCount > 0;

  useEffect(() => {
    const tabs = [{ value: 'supplements', label: 'Supplements' }];
    window.dispatchEvent(new CustomEvent('tpp:set-topbar-tabs', {
      detail: {
        tabs,
        activeTab: 'supplements',
        onTabChange: () => {},
        onActionClick: handleAdd,
        actionDisabled: isReadOnly,
      }
    }));
    return () => {
      window.dispatchEvent(new CustomEvent('tpp:clear-topbar-tabs'));
    };
  }, [handleAdd, isReadOnly]);

  return (
    <section className="page-bg px-2 sm:px-4 py-4">
      {/* Search (when 4+ items) */}
      {totalCount >= 4 && (
        <div className="relative mb-6">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: theme.textLight }} />
          <input
            type="text"
            placeholder="Search supplements..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-3 rounded-[16px] text-sm transition-all focus:outline-none focus:ring-2"
            style={{
              backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
              border: `1px solid ${theme.border}`,
              color: theme.text,
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)',
            }}
          />
        </div>
      )}

      {/* Empty state */}
      {!hasAny ? (
        <div
          className="rounded-[24px] p-10 text-center"
          style={{
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.6)',
            border: `1px solid ${theme.isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'}`,
          }}
        >
          <div
            className="w-14 h-14 rounded-[20px] mx-auto mb-4 flex items-center justify-center"
            style={{
              background: `linear-gradient(135deg, ${theme.primary}20 0%, ${theme.primary}05 100%)`,
              border: `1px solid ${theme.primary}25`,
            }}
          >
            <Pill size={26} style={{ color: theme.primary }} />
          </div>
          <p className="text-base font-bold mb-1" style={{ color: theme.text }}>
            No supplements yet
          </p>
          <p className="text-sm mb-6" style={{ color: theme.textLight }}>
            Track vitamins, minerals & peptide companions
          </p>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-1.5 px-6 py-3 rounded-[14px] text-sm font-bold transition-all active:scale-95 btn-primary-inset"
            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary || '#fff' }}
          >
            <Plus size={15} strokeWidth={3} />
            Add Supplement
          </button>
        </div>
      ) : filteredItems.length === 0 ? (
        <div
          className="rounded-[20px] p-8 text-center"
          style={{
            backgroundColor: theme.isDark ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.6)',
            border: `1px solid ${theme.border}`,
          }}
        >
          <Search size={28} className="mx-auto mb-3 opacity-30" style={{ color: theme.text }} />
          <p className="text-sm font-medium" style={{ color: theme.textLight }}>
            No supplements match "{search}"
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredItems.map((s) => (
            <SupplementCard
              key={s.id}
              supplement={s}
              theme={theme}
              onEdit={handleEdit}
            />
          ))}
        </div>
      )}

      <SupplementEditorModal
        open={showEditor}
        onClose={() => { setShowEditor(false); setEditingSupplement(null); }}
        theme={theme}
        supplement={editingSupplement}
        onSave={handleSave}
      />

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        theme={theme}
      />
    </section>
  );
}