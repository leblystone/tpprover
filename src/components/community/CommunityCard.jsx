import React, { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import { Globe, DotsThree, Star } from '@phosphor-icons/react';
import { motion } from 'framer-motion';
import { SiReddit, SiDiscord, SiTelegram, SiFacebook, SiX, SiYoutube } from 'react-icons/si';
import OwnerChip from '../buddy/OwnerChip';

// Same brand icons as CommunityDetailsModal
const PLATFORMS = {
    reddit:   { color: '#FF4500', Logo: SiReddit },
    discord:  { color: '#5865F2', Logo: SiDiscord },
    telegram: { color: '#26A5E4', Logo: SiTelegram },
    facebook: { color: '#1877F2', Logo: SiFacebook },
    twitter:  { color: '#000000', Logo: SiX },
    youtube:  { color: '#FF0000', Logo: SiYoutube },
    forum:    { color: '#6B7280', Logo: ({ size = 18 }) => <Globe size={size} weight="duotone" color="#6B7280" /> },
    other:    { color: '#9CA3AF', Logo: ({ size = 18 }) => <DotsThree size={size} weight="bold" color="#9CA3AF" /> },
};

function getPlatform(key) {
    return PLATFORMS[(key || 'other').toLowerCase()] || PLATFORMS.other;
}

function PlatformLogo({ platform, color }) {
    const plat = getPlatform(platform);
    const Icon = plat.Logo;
    return <Icon size={18} color={color || plat.color} />;
}

export default function CommunityCard({ community, theme, onEdit, onToggleFavorite }) {
    const [starPop, setStarPop] = useState(false);

    if (!community) return null;

    const plat = getPlatform(community.platform);
    const link = community.url || '';
    const favorited = Boolean(community.favorited);
    const starColor = theme.primary || '#7F9E95';

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onEdit?.(community)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onEdit?.(community);
                }
            }}
            className="w-full h-full text-left rounded-2xl p-3 transition-all hover:shadow-md touch-manipulation active:scale-[0.99] cursor-pointer"
            style={{
                backgroundColor: theme.cardBackground || theme.white,
                border: `1px solid ${theme.border}`,
                WebkitTapHighlightColor: 'transparent',
            }}
        >
            <div className="flex items-start gap-2.5">
                {link ? (
                    <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 p-1.5"
                        style={{ backgroundColor: plat.color + '15' }}
                        aria-label={`Open ${community.name || 'community'} link`}
                        title={community.name || 'Open link'}
                    >
                        <PlatformLogo platform={community.platform} color={plat.color} />
                    </a>
                ) : (
                    <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 p-1.5"
                        style={{ backgroundColor: plat.color + '15' }}
                    >
                        <PlatformLogo platform={community.platform} color={plat.color} />
                    </div>
                )}

                <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start gap-1.5">
                        {link ? (
                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="block flex-1 min-w-0 font-semibold text-sm truncate hover:underline"
                                style={{ color: theme.text }}
                                title={community.name || 'Untitled'}
                            >
                                {community.name || 'Untitled'}
                            </a>
                        ) : (
                            <h3 className="flex-1 min-w-0 font-semibold text-sm truncate" style={{ color: theme.text }}>
                                {community.name || 'Untitled'}
                            </h3>
                        )}
                        <motion.button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setStarPop(true);
                                onToggleFavorite?.(community);
                                window.setTimeout(() => setStarPop(false), 320);
                            }}
                            className="shrink-0 p-0.5 rounded-md touch-manipulation"
                            style={{
                                color: starColor,
                                opacity: favorited ? 1 : 0.55,
                                WebkitTapHighlightColor: 'transparent',
                            }}
                            aria-label={favorited ? 'Unfavorite community' : 'Favorite community'}
                            aria-pressed={favorited}
                            title={favorited ? 'Unpin from top' : 'Pin to top'}
                            whileTap={{ y: -8, scale: 1.12 }}
                            animate={starPop
                                ? { y: [0, -16, 0], scale: [1, 1.3, 1] }
                                : { y: 0, scale: 1 }}
                            transition={{ type: 'spring', stiffness: 520, damping: 18 }}
                        >
                            <Star size={18} weight={favorited ? 'fill' : 'regular'} />
                        </motion.button>
                    </div>

                    <div className="mt-0.5">
                        <OwnerChip ownerId={community.ownerId} theme={theme} compact />
                    </div>

                    {(community.handle || link) && (
                        link ? (
                            <a
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium hover:underline min-w-0"
                                style={{ color: plat.color }}
                            >
                                <ExternalLink size={10} className="shrink-0" />
                                <span className="truncate">{community.handle || 'Open'}</span>
                            </a>
                        ) : (
                            <span
                                className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium min-w-0"
                                style={{ color: plat.color }}
                            >
                                <ExternalLink size={10} className="shrink-0" />
                                <span className="truncate">{community.handle}</span>
                            </span>
                        )
                    )}

                    {community.notes && (
                        <p className="text-[11px] mt-1 line-clamp-2" style={{ color: theme.textLight }}>
                            {community.notes}
                        </p>
                    )}

                    <div className="mt-auto pt-2 flex justify-end">
                        <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0"
                            style={{ backgroundColor: plat.color + '18', color: plat.color }}
                        >
                            {(community.platform || 'other').charAt(0).toUpperCase() + (community.platform || 'other').slice(1)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
