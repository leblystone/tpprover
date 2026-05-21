import React from 'react';
import { UsersThree } from '@phosphor-icons/react';
import { getReviewSource, getReviewVerifyUrl } from '../../config/reviewSources';

const WEBSITE_LOGO = '/tpp_logo.png';
const ETSY_LOGO = '/etsy-mark.svg';

/** Official Etsy wordmark (Simple Icons / brand path) */
function EtsyMark({ size = 20 }) {
  return (
    <img
      src={ETSY_LOGO}
      alt="Etsy"
      width={size}
      height={size}
      className="flex-shrink-0 object-contain"
      draggable={false}
    />
  );
}

function TikTokMark({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <rect x="1" y="1" width="22" height="22" rx="5" fill="#010101" />
      <path
        d="M14.5 8.2v5.4a3.3 3.3 0 11-2.2-3.1v3.8a5.8 5.8 0 11-1.2-11.5 6.2 6.2 0 003.4 1v2.6z"
        fill="#25F4EE"
      />
      <path
        d="M13.8 7.5v5.2a3.3 3.3 0 01-2.1 3.1 3.3 3.3 0 01-3.3-3.3 3.3 3.3 0 013.3-3.3c.3 0 .6.04.9.12V8.8a6.2 6.2 0 00-3.4-1 6.2 6.2 0 00-6.2 6.2 6.2 6.2 0 006.2 6.2 6.2 6.2 0 006.2-6.2V7.5h-2.6z"
        fill="#FE2C55"
        opacity="0.9"
      />
    </svg>
  );
}

function WebsiteLogoMark({ size = 16 }) {
  return (
    <img
      src={WEBSITE_LOGO}
      alt=""
      width={size}
      height={size}
      className="rounded-full object-cover flex-shrink-0"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
      draggable={false}
    />
  );
}

function SourceIcon({ sourceId, size = 16 }) {
  const src = getReviewSource(sourceId);
  if (src.icon === 'etsy') return <EtsyMark size={size} />;
  if (src.icon === 'tiktok') return <TikTokMark size={size} />;
  if (src.icon === 'peptide_community') {
    return <UsersThree size={size} weight="duotone" color={src.brandColor} />;
  }
  return <WebsiteLogoMark size={size} />;
}

const VERIFY_LABELS = {
  etsy: 'View on Etsy',
  tiktok: 'View on TikTok Shop',
  peptide_community: 'View source',
  website: 'View on our shop',
};

export default function ReviewSourceBadge({
  review,
  showLink = true,
  size = 'sm',
  iconOnly = true,
}) {
  const source = getReviewSource(review?.source);
  const href = getReviewVerifyUrl(review);
  const iconPx = size === 'lg' ? 22 : size === 'md' ? 20 : 18;
  const websiteIconPx = size === 'lg' ? 36 : size === 'md' ? 32 : 28;
  const logoPx = source.icon === 'website' ? websiteIconPx : iconPx;
  const textClass = size === 'lg' ? 'text-xs' : 'text-[10px]';
  const verifyLabel = VERIFY_LABELS[source.icon] || `Verify on ${source.shortLabel}`;

  const logo = <SourceIcon sourceId={source.id} size={logoPx} />;

  if (iconOnly) {
    if (!showLink) {
      return (
        <span className="inline-flex items-center" title={source.shortLabel || source.label}>
          {logo}
        </span>
      );
    }
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center rounded-md p-0.5 transition-opacity hover:opacity-80"
        title={verifyLabel}
        aria-label={verifyLabel}
      >
        {logo}
      </a>
    );
  }

  const inner = (
    <>
      {logo}
      <span className={`font-bold tracking-wide uppercase ${textClass}`} style={{ color: source.brandColor }}>
        {source.label}
      </span>
    </>
  );

  if (!showLink) {
    return (
      <span
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border"
        style={{
          borderColor: `${source.brandColor}33`,
          backgroundColor: `${source.brandColor}0d`,
        }}
        title={source.label}
      >
        {inner}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border transition-all duration-200 hover:shadow-sm hover:-translate-y-px"
      style={{
        borderColor: `${source.brandColor}33`,
        backgroundColor: `${source.brandColor}0d`,
      }}
      title={verifyLabel}
    >
      {inner}
    </a>
  );
}

export { SourceIcon, EtsyMark, TikTokMark, WebsiteLogoMark };
