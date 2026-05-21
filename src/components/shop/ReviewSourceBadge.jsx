import React from 'react';
import { Globe, UsersThree } from '@phosphor-icons/react';
import { ExternalLink } from 'lucide-react';
import { getReviewSource, getReviewVerifyUrl } from '../../config/reviewSources';

function EtsyMark({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="12" r="11" fill="#F1641E" />
      <text x="12" y="16" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="700" fontFamily="system-ui,sans-serif">
        E
      </text>
    </svg>
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

function SourceIcon({ sourceId, size = 16 }) {
  const src = getReviewSource(sourceId);
  if (src.icon === 'etsy') return <EtsyMark size={size} />;
  if (src.icon === 'tiktok') return <TikTokMark size={size} />;
  if (src.icon === 'peptide_community') {
    return <UsersThree size={size} weight="duotone" color={src.brandColor} />;
  }
  return <Globe size={size} weight="duotone" color={src.brandColor} />;
}

export default function ReviewSourceBadge({ review, showLink = true, size = 'sm' }) {
  const source = getReviewSource(review?.source);
  const href = getReviewVerifyUrl(review);
  const iconPx = size === 'lg' ? 20 : 16;
  const textClass = size === 'lg' ? 'text-xs' : 'text-[10px]';

  const inner = (
    <>
      <SourceIcon sourceId={source.id} size={iconPx} />
      <span className={`font-bold tracking-wide uppercase ${textClass}`} style={{ color: source.brandColor }}>
        {source.label}
      </span>
      {showLink && (
        <ExternalLink size={12} className="opacity-60" style={{ color: source.brandColor }} aria-hidden />
      )}
    </>
  );

  if (!showLink) {
    return (
      <span className="inline-flex items-center gap-1.5" title={source.label}>
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
      title={`Verify on ${source.shortLabel}`}
    >
      {inner}
    </a>
  );
}

export { SourceIcon, EtsyMark, TikTokMark };
