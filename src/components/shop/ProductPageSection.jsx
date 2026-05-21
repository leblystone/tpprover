import React from 'react';

const PRIMARY = '#7F9E95';
const EYEBROW = '#9B958D';
const TITLE = '#2F3B3A';
const RULE = '#E8EFE9';

/** Matches app settings: icon + uppercase label + gradient fade line */
export function ShopSectionGroupHeader({ icon: Icon, label, className = '' }) {
  return (
    <div className={`flex items-center gap-2 px-1 ${className}`}>
      <Icon size={14} style={{ color: PRIMARY }} weight="duotone" />
      <h4
        className="text-[11px] font-semibold uppercase tracking-[0.2em]"
        style={{ color: EYEBROW }}
      >
        {label}
      </h4>
      <div
        className="flex-1 h-px"
        style={{
          background: `linear-gradient(to right, ${PRIMARY}55 0%, ${PRIMARY}22 45%, transparent 100%)`,
        }}
      />
    </div>
  );
}

/** Glass panel card — same as Settings Notifications `content-section` */
export function ShopContentSection({ children, className = '', innerClassName = '' }) {
  return (
    <div
      className={`content-section rounded-[2rem] border-2 shadow-sm transition-all px-4 py-1 ${className}`}
      style={{ borderColor: 'transparent' }}
    >
      <div className={innerClassName}>{children}</div>
    </div>
  );
}

/** @deprecated — prefer ShopSectionGroupHeader */
export function ProductSectionEyebrow({ children, className = '' }) {
  return (
    <p
      className={`text-[10px] font-bold tracking-[0.2em] uppercase mb-2 ${className}`}
      style={{ color: EYEBROW }}
    >
      {children}
    </p>
  );
}

export function ProductSectionTitle({ children, className = '' }) {
  return (
    <h2
      className={`text-2xl sm:text-3xl font-bold tracking-tight ${className}`}
      style={{ color: TITLE, fontFamily: 'Playfair Display, serif' }}
    >
      {children}
    </h2>
  );
}

export function ProductFadedRule({ className = '', dashed = false }) {
  return (
    <div
      className={`w-full border-b my-5 md:my-6 ${dashed ? 'border-dashed' : ''} ${className}`}
      style={{ borderColor: dashed ? `${PRIMARY}40` : RULE }}
      aria-hidden
    />
  );
}

/** Solid white card (purchase block) */
export function ProductSectionCard({ children, className = '' }) {
  return (
    <div
      className={`rounded-2xl p-6 md:p-8 shadow-sm ${className}`}
      style={{ backgroundColor: '#ffffff' }}
    >
      {children}
    </div>
  );
}

export default function ProductPageSection({
  eyebrow,
  title,
  children,
  id,
  className = '',
  withTopRule = true,
  cream = false,
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-24 ${withTopRule ? 'border-t' : ''} ${className}`}
      style={{
        borderColor: RULE,
        backgroundColor: cream ? '#f0eee7' : undefined,
      }}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-10">
        {eyebrow && <ProductSectionEyebrow>{eyebrow}</ProductSectionEyebrow>}
        {title && <ProductSectionTitle>{title}</ProductSectionTitle>}
        {(eyebrow || title) && <ProductFadedRule />}
        {children}
      </div>
    </section>
  );
}
