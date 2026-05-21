/**
 * Review source channels — icons, labels, and default verification links.
 * Override per-review with `sourceUrl` in admin when linking to a specific post/listing.
 */
export const REVIEW_SOURCES = {
  website: {
    id: 'website',
    label: 'Website',
    shortLabel: 'Our shop',
    verifyUrl: 'https://thepepplanner.app/shop',
    brandColor: '#7F9E95',
    icon: 'website',
  },
  etsy: {
    id: 'etsy',
    label: 'Etsy',
    shortLabel: 'Etsy shop',
    verifyUrl: 'https://www.etsy.com/shop/ThePepPlanner',
    brandColor: '#F1641E',
    icon: 'etsy',
  },
  tiktok: {
    id: 'tiktok',
    label: 'TikTok Shop',
    shortLabel: 'TikTok Shop',
    verifyUrl: 'https://www.tiktok.com',
    brandColor: '#010101',
    icon: 'tiktok',
  },
  peptide_community: {
    id: 'peptide_community',
    label: 'Peptide community',
    shortLabel: 'Community',
    verifyUrl: 'https://thepepplanner.app/shop',
    brandColor: '#5F7F76',
    icon: 'peptide_community',
  },
};

export const REVIEW_SOURCE_IDS = Object.keys(REVIEW_SOURCES);

export function getReviewSource(id) {
  return REVIEW_SOURCES[id] || REVIEW_SOURCES.website;
}

export function getReviewVerifyUrl(review) {
  if (review?.sourceUrl?.trim()) return review.sourceUrl.trim();
  return getReviewSource(review?.source).verifyUrl;
}
