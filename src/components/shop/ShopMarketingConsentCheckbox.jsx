import React from 'react';
import { Link } from 'react-router-dom';
import { themes, defaultThemeName } from '../../theme/themes';

const theme = themes[defaultThemeName];

/**
 * Optional promotional email opt-in (unchecked by default — CAN-SPAM / GDPR friendly).
 */
export default function ShopMarketingConsentCheckbox({ checked, onChange, id = 'shop-marketing-consent' }) {
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-2.5 cursor-pointer select-none text-left"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 w-4 h-4 rounded border flex-shrink-0 accent-[#5a7a6a]"
        style={{ borderColor: `${theme.text}40` }}
      />
      <span className="text-[11px] leading-snug" style={{ color: theme.textLight }}>
        Yes, send me emails about new products, sales, and PEP Planner updates.{' '}
        <a href="/unsubscribe" className="underline" style={{ color: theme.primary }} onClick={(e) => e.stopPropagation()}>
          Unsubscribe anytime
        </a>
        . See our{' '}
        <Link to="/privacy" className="underline" style={{ color: theme.primary }} onClick={(e) => e.stopPropagation()}>
          Privacy Policy
        </Link>
        .
      </span>
    </label>
  );
}
