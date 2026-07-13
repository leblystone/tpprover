import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import BottomSheet from '../common/BottomSheet';

/** Shared transition tokens — match admin sage palette */
export const ADMIN_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)';
export const ADMIN_DURATION_MS = 300;

export function AdminSpinner({ size = 18, className = '' }) {
  return (
    <svg
      className={`animate-spin ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

const BTN_BASE =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-all duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 enabled:hover:scale-[1.02] enabled:active:scale-[0.97] disabled:cursor-not-allowed disabled:hover:scale-100 disabled:active:scale-100';

/**
 * Admin button with hover / active / focus micro-interactions and optional loading spinner.
 */
export function AdminButton({
  variant = 'secondary',
  theme,
  loading = false,
  disabled = false,
  className = '',
  children,
  style: styleProp,
  ...props
}) {
  const isDisabled = disabled || loading;
  const primary = theme?.primary || '#5F7F76';
  const border = theme?.border || '#DDE6DE';
  const text = theme?.text || '#2F3B3A';
  const textOnPrimary = theme?.textOnPrimary ?? '#fff';

  let variantStyle = {};
  let variantClass = 'px-3 py-1.5 text-sm border';

  if (variant === 'primary') {
    variantClass = 'px-4 py-2 text-sm text-white border border-transparent min-w-[7rem]';
    variantStyle = {
      backgroundColor: isDisabled ? `${primary}55` : primary,
      color: textOnPrimary,
      '--tw-ring-color': primary,
    };
  } else if (variant === 'ghost') {
    variantClass = 'p-2 text-sm border border-transparent';
    variantStyle = { color: text, '--tw-ring-color': primary };
  } else if (variant === 'icon') {
    variantClass = 'p-2 border';
    variantStyle = {
      borderColor: border,
      color: text,
      backgroundColor: 'transparent',
      '--tw-ring-color': primary,
    };
  } else {
    variantStyle = {
      borderColor: border,
      color: text,
      backgroundColor: 'transparent',
      '--tw-ring-color': primary,
    };
  }

  return (
    <button
      type="button"
      disabled={isDisabled}
      className={`${BTN_BASE} ${variantClass} ${className}`}
      style={{ ...variantStyle, ...styleProp }}
      {...props}
    >
      {loading ? <AdminSpinner size={16} /> : children}
    </button>
  );
}

/** Pulse skeleton block — fixed dimensions prevent CLS */
export function AdminSkeleton({ className = '', style = {}, theme }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{
        backgroundColor: theme?.border ? `${theme.border}99` : 'rgba(0,0,0,0.06)',
        ...style,
      }}
      aria-hidden
    />
  );
}

/** Skeleton layout matching Shop Analytics dashboard */
export function AdminShopAnalyticsSkeleton({ theme }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading analytics">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <AdminSkeleton key={i} theme={theme} className="h-[88px]" />
        ))}
      </div>
      <AdminSkeleton theme={theme} className="h-[220px] w-full" />
      <div className="grid lg:grid-cols-2 gap-6">
        <AdminSkeleton theme={theme} className="h-[280px]" />
        <AdminSkeleton theme={theme} className="h-[280px]" />
      </div>
    </div>
  );
}

/**
 * Full-height bottom sheet for admin — matches main app OrderDetailsModal pattern.
 * Slides up on mobile; centered sheet on desktop (via shared BottomSheet).
 */
export function AdminBottomSheet({
  open,
  onClose,
  onBack,
  title,
  titleExtra,
  titleSuffix,
  theme,
  children,
  footer,
  maxHeight = '92vh',
  fitContent = false,
  seamlessContent = true,
  centerTitle = false,
  contentStyle = {},
  hideHeader = false,
  wide = false,
}) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      onBack={onBack}
      title={title}
      titleExtra={titleExtra}
      titleSuffix={titleSuffix}
      theme={theme}
      footer={footer}
      maxHeight={maxHeight}
      fitContent={fitContent}
      seamlessContent={seamlessContent}
      centerTitle={centerTitle}
      contentStyle={contentStyle}
      hideHeader={hideHeader}
      maxWidthClass={wide ? 'md:max-w-2xl' : 'md:max-w-lg'}
    >
      {children}
    </BottomSheet>
  );
}

/**
 * @deprecated Prefer AdminBottomSheet. Kept for legacy admin modals with custom chrome.
 */
export function AdminSlideOver({
  open,
  onClose,
  children,
  panelClassName = '',
  panelStyle = {},
  title,
  theme,
  footer,
  wide = false,
}) {
  return (
    <AdminBottomSheet
      open={open}
      onClose={onClose}
      title={title}
      theme={theme}
      footer={footer}
      hideHeader={!title}
      wide={wide}
      seamlessContent={!!title}
    >
      <div className={`flex flex-col min-h-0 ${panelClassName}`} style={panelStyle}>
        {typeof children === 'function' ? children({ onClose }) : children}
      </div>
    </AdminBottomSheet>
  );
}

/**
 * Admin modal — now a full bottom sheet (same UX as the main app).
 */
export function AdminModal({
  open,
  onClose,
  children,
  className = '',
  theme,
  title,
  footer,
  maxHeight = '92vh',
  wide = false,
  seamlessContent,
}) {
  return (
    <AdminBottomSheet
      open={open}
      onClose={onClose}
      title={title}
      theme={theme}
      footer={footer}
      maxHeight={maxHeight}
      hideHeader={!title}
      wide={wide}
      seamlessContent={seamlessContent ?? !!title}
      fitContent={false}
    >
      <div className={className}>
        {typeof children === 'function' ? children({ onClose }) : children}
      </div>
    </AdminBottomSheet>
  );
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/** Count-up / count-down when value changes (respects reduced motion). */
export function AdminAnimatedNumber({ value, duration = 420, className = '', style }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const end = Number(value) || 0;
    if (prefersReducedMotion()) {
      setDisplay(end);
      prevRef.current = end;
      return undefined;
    }

    const start = prevRef.current;
    const startTime = performance.now();
    let raf;

    const tick = (now) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(start + (end - start) * eased));
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        prevRef.current = end;
      }
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return (
    <span className={className} style={style}>
      {display.toLocaleString()}
    </span>
  );
}

/** Stat card with hover lift + animated value. */
export function AdminMetricCard({ label, value, color, delay = 0, className = '' }) {
  return (
    <div
      className={`admin-metric-card p-4 rounded-lg border ${className}`}
      style={{
        backgroundColor: '#ffffff',
        borderColor: '#d0d0d0',
        animationDelay: `${delay}ms`,
      }}
    >
      <AdminAnimatedNumber
        value={value}
        className="block text-2xl font-bold tabular-nums"
        style={{ color }}
      />
      <div className="text-sm font-medium" style={{ color: '#4a4a4a' }}>
        {label}
      </div>
    </div>
  );
}

/** Subtle fade + rise when keyed content remounts (e.g. date range change). */
export function AdminDataRefresh({ refreshKey, children, className = '' }) {
  return (
    <div key={refreshKey} className={`admin-data-refresh ${className}`}>
      {children}
    </div>
  );
}

/** Centered empty panel for admin lists, charts, and widgets. */
export function AdminEmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact = false,
  theme,
  className = '',
}) {
  const primary = theme?.primary || '#5F7F76';
  const text = theme?.text || '#2F3B3A';
  const textLight = theme?.textLight || '#6B7D7A';
  const border = theme?.border || '#DDE6DE';
  const padding = compact ? 'py-8 px-4' : 'py-10 px-6';
  const iconSize = compact ? 28 : 36;

  return (
    <div
      className={`admin-empty-state rounded-lg text-center border border-dashed ${padding} ${className}`}
      style={{ borderColor: `${border}`, backgroundColor: theme?.cardBackground || '#fafafa' }}
    >
      {Icon && (
        <Icon
          size={iconSize}
          className="mx-auto mb-2 opacity-40"
          style={{ color: primary }}
          aria-hidden
        />
      )}
      <p className={`font-semibold ${compact ? 'text-sm' : 'text-base'}`} style={{ color: text }}>
        {title}
      </p>
      {description && (
        <p className={`mt-1 max-w-sm mx-auto ${compact ? 'text-xs' : 'text-sm'}`} style={{ color: textLight }}>
          {description}
        </p>
      )}
      {action && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}

/** Bar that grows from baseline — remount via key on parent when date range changes. */
export function AdminSignupBar({
  targetHeight,
  delay = 0,
  className = '',
  style = {},
}) {
  const reduced = useReducedMotion();
  const h = typeof targetHeight === 'number' ? targetHeight : parseFloat(targetHeight) || 2;

  if (reduced) {
    return (
      <div
        className={`admin-signup-bar rounded-t-lg w-full cursor-default ${className}`}
        style={{ height: `${h}px`, minHeight: h <= 2 ? '2px' : 0, ...style }}
      />
    );
  }

  return (
    <motion.div
      className={`admin-signup-bar rounded-t-lg w-full cursor-default ${className}`}
      initial={{ scaleY: 0, opacity: 0.35 }}
      animate={{ scaleY: 1, opacity: 1 }}
      transition={{
        duration: 0.75,
        delay: delay / 1000,
        ease: [0.22, 1.35, 0.36, 1],
      }}
      style={{
        height: `${h}px`,
        minHeight: h <= 2 ? '2px' : 0,
        transformOrigin: 'bottom center',
        ...style,
      }}
    />
  );
}

export const ADMIN_ANALYTICS_MOTION_CSS = `
  @keyframes admin-metric-enter {
    from { opacity: 0; transform: translateY(8px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes admin-data-refresh {
    from { opacity: 0.45; }
    to   { opacity: 1; }
  }
  @keyframes admin-signup-bar-grow {
    0% {
      transform: scaleY(0);
      opacity: 0.45;
    }
    100% {
      transform: scaleY(1);
      opacity: 1;
    }
  }
  @keyframes admin-bar-grow {
    from { height: 0; opacity: 0.55; }
    to   { height: var(--bar-h, 2px); opacity: 1; }
  }
  .admin-metric-card {
    animation: admin-metric-enter 0.45s cubic-bezier(0.4, 0, 0.2, 1) both;
    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .admin-metric-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(47, 59, 58, 0.08);
  }
  .admin-data-refresh {
    animation: admin-data-refresh 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
  }
  .admin-signup-bar {
    transform-origin: bottom center;
    will-change: transform;
  }
  .admin-signup-bar-animate {
    animation: admin-signup-bar-grow 0.72s cubic-bezier(0.22, 1.28, 0.36, 1) both;
  }
  .admin-chart-bar {
    transform-origin: bottom center;
    animation: admin-bar-grow 0.55s cubic-bezier(0.34, 1.2, 0.64, 1) both;
    transition: filter 0.15s ease, opacity 0.15s ease;
  }
  .admin-chart-bar:hover {
    filter: brightness(1.08);
    opacity: 0.95;
  }
  .admin-funnel-fill {
    transition: width 0.65s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .admin-preset-indicator {
    transition: left 0.28s cubic-bezier(0.34, 1.15, 0.64, 1),
                width 0.28s cubic-bezier(0.34, 1.15, 0.64, 1);
  }
  .admin-empty-state {
    animation: admin-data-refresh 0.35s cubic-bezier(0.4, 0, 0.2, 1) both;
  }
  @media (prefers-reduced-motion: reduce) {
    .admin-metric-card,
    .admin-data-refresh,
    .admin-chart-bar {
      animation: none !important;
      transition: none !important;
    }
    .admin-signup-bar-animate {
      animation: none !important;
      transform: none !important;
    }
    .admin-metric-card:hover {
      transform: none;
      box-shadow: none;
    }
    .admin-funnel-fill {
      transition: none !important;
    }
    .admin-preset-indicator {
      transition: none !important;
    }
    .admin-empty-state {
      animation: none !important;
    }
  }
`;

/** Inline help tip for admin sections — explains when to use a tool */
export function AdminSectionHelp({ title, children, theme }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const t = theme || {};

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  return (
    <span className="relative inline-flex items-center" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center"
        style={{
          backgroundColor: (t.info || '#3B82F6') + '20',
          color: t.info || '#3B82F6',
          border: `1px solid ${(t.info || '#3B82F6')}40`,
        }}
        aria-label={title ? `Help: ${title}` : 'Help'}
      >
        ?
      </button>
      {open && (
        <div
          className="absolute z-50 left-0 top-6 w-56 p-2.5 rounded-lg text-[11px] leading-snug shadow-lg"
          style={{
            backgroundColor: t.cardBackground || '#fff',
            color: t.textLight || '#555',
            border: `1px solid ${t.border || '#e5e7eb'}`,
          }}
        >
          {title && (
            <p className="font-semibold mb-1" style={{ color: t.text || '#111' }}>
              {title}
            </p>
          )}
          {children}
        </div>
      )}
    </span>
  );
}

/** Collapsible admin card — keeps dense panels scannable */
export function AdminCollapsibleSection({
  title,
  icon: Icon,
  theme,
  defaultOpen = false,
  badge,
  help,
  children,
  className = '',
}) {
  const [open, setOpen] = useState(defaultOpen);
  const t = theme || {};

  return (
    <div
      className={`rounded-xl border overflow-hidden ${className}`}
      style={{ borderColor: t.border, backgroundColor: t.cardBackground }}
    >
      <div
        className="flex items-center gap-1"
        style={{ backgroundColor: open ? t.background : 'transparent' }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 flex items-center gap-2 px-3 py-2.5 text-left transition-opacity hover:opacity-90 min-w-0"
        >
          {Icon && (
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: (t.primary || '#5F7F76') + '18' }}
            >
              <Icon size={14} style={{ color: t.primary }} />
            </span>
          )}
          <span className="font-semibold text-sm flex-1 truncate" style={{ color: t.primaryDark || t.text }}>
            {title}
          </span>
          {badge}
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0"
            style={{ color: t.textLight, backgroundColor: t.background }}
          >
            {open ? 'Hide' : 'Show'}
          </span>
        </button>
        {help && (
          <div
            className="shrink-0 pr-2"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {help}
          </div>
        )}
      </div>
      {open && <div className="px-3 pb-3 pt-0 space-y-3 border-t" style={{ borderColor: t.border }}>{children}</div>}
    </div>
  );
}
