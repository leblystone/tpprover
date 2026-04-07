/**
 * Pep Planner shop catalog.
 */
import cover0 from '../assets/NEW ITEM.png';
import cover1 from '../assets/NEW ITEM (2).png';
import cover2 from '../assets/NEW ITEM (3).png';
import cover3 from '../assets/NEW ITEM (4).png';
import cover4 from '../assets/NEW ITEM (5).png';
import cover5 from '../assets/NEW ITEM (6).png';
import cover6 from '../assets/NEW ITEM (7).png';
import cover7 from '../assets/NEW ITEM (8).png';
import cover8 from '../assets/NEW ITEM (9).png';

/** Placeholder shown in shop cards until real images are set */
export const SHOP_PLACEHOLDER_IMAGE = '/tpp_logo.png';

export const COVERS = [cover0, cover1, cover2, cover3, cover4, cover5, cover6, cover7, cover8];

const PLANNER_DESCRIPTION =
  'The Pep Planner helps you track peptide research and injection schedules with dedicated pages for protocol management. Perfect for monitoring GLP-1 research activities like Semaglutide and Tirzepatide tracking. This planner includes sections for recording peptide research data, managing reconstitution dates, organizing your peptide stockpile, and planning your research schedule.';

const DIGITAL_PLANNER_EXTRA =
  'A digital planner is the smart, interactive version of THE PEP PLANNER. Best used on tablets with a stylus pen. Annotation apps may require a separate fee. This is not a physical product — you will receive download instructions by email after purchase. Not suitable for printing.';

const CROSS_PHYSICAL = ['research-bookmark', 'research-planner-tabs', 'digital-planner'];

export const SHOP_PRODUCTS = [
  {
    id: 'in-the-clouds',
    slug: 'in-the-clouds-pep-planner',
    name: 'In The Clouds Pep Planner',
    price: 36.99,
    sizeLabel: '7×10',
    category: 'planner',
    isPhysical: true,
    isDigital: false,
    shortDescription: 'Welcome to your new research tool! Only available in 7×10.',
    description: PLANNER_DESCRIPTION,
    image: SHOP_PLACEHOLDER_IMAGE,
    crossSells: CROSS_PHYSICAL,
  },
  {
    id: 'dune',
    slug: 'dune-pep-planner',
    name: 'Dune Pep Planner',
    price: 26.99,
    sizeLabel: '5×7',
    category: 'planner',
    isPhysical: true,
    isDigital: false,
    shortDescription: 'Welcome to your new research tool! Only available in 5×7.',
    description: PLANNER_DESCRIPTION,
    image: SHOP_PLACEHOLDER_IMAGE,
    crossSells: CROSS_PHYSICAL,
  },
  {
    id: 'skyline',
    slug: 'skyline-pep-planner',
    name: 'Skyline Pep Planner',
    price: 26.99,
    sizeLabel: '5×7',
    category: 'planner',
    isPhysical: true,
    isDigital: false,
    shortDescription: 'Welcome to your new research tool! Only available in 5×7.',
    description: PLANNER_DESCRIPTION,
    image: SHOP_PLACEHOLDER_IMAGE,
    crossSells: CROSS_PHYSICAL,
  },
  {
    id: 'alchemist-bloom',
    slug: 'alchemist-bloom-pep-planner',
    name: 'Alchemist Bloom Pep Planner',
    price: 36.99,
    sizeLabel: '7×10',
    category: 'planner',
    isPhysical: true,
    isDigital: false,
    shortDescription: 'Welcome to your new research tool! Only available in 7×10.',
    description: PLANNER_DESCRIPTION,
    image: SHOP_PLACEHOLDER_IMAGE,
    crossSells: CROSS_PHYSICAL,
  },
  {
    id: 'umber',
    slug: 'umber-pep-planner',
    name: 'Umber Pep Planner',
    price: 26.99,
    sizeLabel: '5×7',
    category: 'planner',
    isPhysical: true,
    isDigital: false,
    shortDescription: 'Welcome to your new research tool! Only available in 5×7.',
    description: PLANNER_DESCRIPTION,
    image: SHOP_PLACEHOLDER_IMAGE,
    crossSells: CROSS_PHYSICAL,
  },
  {
    id: 'amino-axis',
    slug: 'amino-axis-pep-planner',
    name: 'Amino Axis Pep Planner',
    price: 36.99,
    sizeLabel: '7×10',
    category: 'planner',
    isPhysical: true,
    isDigital: false,
    shortDescription: 'Welcome to your new research tool! Only available in 7×10.',
    description: PLANNER_DESCRIPTION,
    image: SHOP_PLACEHOLDER_IMAGE,
    crossSells: CROSS_PHYSICAL,
  },
  {
    id: 'serum',
    slug: 'serum-pep-planner',
    name: 'Serum Pep Planner',
    price: 36.99,
    sizeLabel: '7×10',
    category: 'planner',
    isPhysical: true,
    isDigital: false,
    shortDescription: 'Welcome to your new research tool! Only available in 7×10.',
    description: PLANNER_DESCRIPTION,
    image: SHOP_PLACEHOLDER_IMAGE,
    crossSells: CROSS_PHYSICAL,
  },
  {
    id: 'midnight',
    slug: 'midnight-pep-planner',
    name: 'Midnight Pep Planner',
    price: 26.99,
    sizeLabel: '5×7',
    category: 'planner',
    isPhysical: true,
    isDigital: false,
    shortDescription: 'Welcome to your new research tool! Only available in 5×7.',
    description: PLANNER_DESCRIPTION,
    image: SHOP_PLACEHOLDER_IMAGE,
    crossSells: CROSS_PHYSICAL,
  },
  {
    id: 'research-bookmark',
    slug: 'research-bookmark',
    name: "Today's Research Bookmark",
    price: 2.50,
    sizeLabel: 'Approx. 2.5" × 3.5"',
    category: 'accessory',
    isPhysical: true,
    isDigital: false,
    shortDescription: "Grab another bookmark for your planner! Punched to fit your Pep Planner.",
    description: PLANNER_DESCRIPTION,
    image: SHOP_PLACEHOLDER_IMAGE,
    crossSells: ['research-planner-tabs', 'digital-planner'],
  },
  {
    id: 'research-planner-tabs',
    slug: 'research-planner-dividers',
    name: 'Research Planner Tabs',
    price: 4.50,
    sizeLabel: null,
    category: 'accessory',
    isPhysical: true,
    isDigital: false,
    shortDescription: 'Organize your research! Custom sticker tabs for your Pep Planner.',
    description: PLANNER_DESCRIPTION,
    image: SHOP_PLACEHOLDER_IMAGE,
    crossSells: ['research-bookmark', 'digital-planner'],
  },
  {
    id: 'digital-planner',
    slug: 'digital-planner-sage-taupe-botanical',
    name: 'Digital Planner; Hyperlinked PDF',
    price: 19.99,
    sizeLabel: null,
    category: 'digital',
    isPhysical: false,
    isDigital: true,
    shortDescription: 'Welcome to your new digital research tool!',
    description: `${PLANNER_DESCRIPTION}\n\n${DIGITAL_PLANNER_EXTRA}`,
    image: SHOP_PLACEHOLDER_IMAGE,
    crossSells: ['research-bookmark', 'research-planner-tabs'],
  },
];

export function getProductById(id) {
  return SHOP_PRODUCTS.find((p) => p.id === id) || null;
}

export function getProductBySlug(slug) {
  return SHOP_PRODUCTS.find((p) => p.slug === slug) || null;
}

export function getProductsByCategory(category) {
  if (category === 'all') return SHOP_PRODUCTS;
  return SHOP_PRODUCTS.filter((p) => p.category === category);
}
