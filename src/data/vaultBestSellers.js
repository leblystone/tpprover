/**
 * Vault carousel — curated best sellers (images in src/assets/vault/).
 * badge is optional — dark corner chip only (no title tags).
 */
import bookLover from '../assets/vault/book-lover.png';
import theLab from '../assets/vault/the-lab.png';
import dreamy from '../assets/vault/dreamy.png';
import pastel from '../assets/vault/pastel.png';
import brokenVials from '../assets/vault/broken-vials.png';
import lemon from '../assets/vault/lemon.png';
import botanical from '../assets/vault/botanical.png';
import chakra from '../assets/vault/chakra.png';
import sunflower from '../assets/vault/sunflower.png';

export const VAULT_BEST_SELLERS = [
  {
    id: 'book-lover',
    name: 'Book Lover',
    year: 'Vault favorite',
    desc: 'Dusty blue with ink-and-paper florals — the quiet bestseller researchers reorder first.',
    image: bookLover,
  },
  {
    id: 'the-lab',
    name: 'The Lab',
    year: 'Vault favorite',
    desc: 'Clean line art for the bench-minded — lab coat, glassware, zero clutter.',
    image: theLab,
  },
  {
    id: 'dreamy',
    name: 'Dreamy',
    year: 'Vault favorite',
    desc: 'Glowing vials on a starry field — sold out before the second coffee.',
    badge: 'Most requested',
    image: dreamy,
  },
  {
    id: 'pastel',
    name: 'Pastel',
    year: 'Vault favorite',
    desc: 'Iridescent shimmer that photographed itself — still the most-shared cover.',
    image: pastel,
  },
  {
    id: 'broken-vials',
    name: 'Broken Vials',
    year: 'Vault favorite',
    desc: 'Bold, moody, unforgettable — the edition people DM us about years later.',
    image: brokenVials,
  },
  {
    id: 'lemon',
    name: 'Lemon',
    year: 'Vault favorite',
    desc: 'Citrus and glass on mint — bright, fresh, and gone by end of summer.',
    image: lemon,
  },
  {
    id: 'botanical',
    name: 'Botanical',
    year: 'Vault favorite',
    desc: 'Florals meet vials on blush — coaches bought this in stacks for cohorts.',
    badge: "Researcher's Favorite",
    image: botanical,
  },
  {
    id: 'chakra',
    name: 'Chakra',
    year: 'Vault favorite',
    desc: 'Lotus light and layered glass — wellness researchers made this a repeat buy.',
    image: chakra,
  },
  {
    id: 'sunflower',
    name: 'Sunflower',
    year: 'Vault favorite',
    desc: 'Sunflowers and copper caps — the split-cover drop that broke the waitlist.',
    badge: 'Sold out fast',
    image: sunflower,
  },
];
