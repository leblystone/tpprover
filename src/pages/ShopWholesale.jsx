import React from 'react';
import { Chats, Tag, Mailbox } from '@phosphor-icons/react';
import ShopHeader from '../components/shop/ShopHeader';
import InquiryForm from '../components/shop/InquiryForm';
import CustomWorkShowcaseSection from '../components/shop/CustomWorkShowcaseSection';
import LandingFooter from '../components/layout/LandingFooter';
import { useCart } from '../context/CartContext';
import { usePageSEO } from '../utils/pageSEO';
import useShopPageView from '../utils/useShopPageView';

/** Landing-aligned sage palette */
const PAGE_BG = '#D7E0D9';
const HERO_BG = '#EFF2EE';
const WHITE = '#FFFFFF';
const WARM_GREIGE = '#F5F5F0';
const SAGE_PANEL = '#ECF2ED';

const HOW = [
  { Icon: Chats, title: 'Share your needs', desc: 'Tell us your quantity, which planners you want, and whether you need your logo on the cover.' },
  { Icon: Tag, title: 'Get bulk pricing', desc: 'We’ll follow up with volume rates, branding options, and invoice details.' },
  { Icon: Mailbox, title: 'Order & ship', desc: 'Approve your quote, place the order, and we’ll get your planners on the way.' },
];

const WHO = [
  'Peptide & GLP-1 clinics', 'Wellness coaches',
  'Gyms & trainers', 'Online communities',
  'Healthcare providers', 'Supplement brands',
  'Coaching programs', 'Distributors',
];

const PERKS = [
  ['Bulk Pricing', 'Volume discounts so you can stock up for your clients or retail shelves.'],
  ['Your Logo & Branding', 'Put your brand on the cover — a research tool that feels like yours.'],
  ['Built for Your Customers', 'Give them a unique planner that reinforces your practice or business.'],
];

const FIELDS = [
  { name: 'name', label: 'Person or Company Name', type: 'text', required: true, placeholder: 'Your name or company' },
  { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'you@example.com' },
  {
    name: 'newsUpdates',
    label: 'Sign up for news and updates',
    type: 'checkbox',
    hideLabel: true,
    checkboxLabel: 'Sign up for news and updates',
  },
  {
    name: 'plannerSize',
    label: 'Planner Size(s)',
    type: 'select',
    required: true,
    placeholder: 'Choose a size',
    options: [
      { value: '4x6', label: '4×6' },
      { value: '5x7', label: '5×7' },
      { value: '7x10', label: '7×10' },
      { value: 'custom', label: 'Custom' },
    ],
  },
  {
    name: 'plannerSizeCustom',
    label: 'Custom Size',
    type: 'text',
    required: true,
    placeholder: 'Describe your custom size',
    showWhen: { field: 'plannerSize', equals: 'custom' },
  },
  {
    name: 'quantity',
    label: 'Estimated Quantity',
    type: 'text',
    required: true,
    placeholder: '25',
    hint: 'MOQ for bulk ordering is 25 pcs',
  },
  {
    name: 'image',
    label: 'Image Upload',
    type: 'file',
    accept: 'image/*',
    hint: 'Upload a clean image of your logo/branding.',
  },
];

export default function ShopWholesale() {
  usePageSEO();
  useShopPageView('wholesale');
  const { cartCount } = useCart();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: PAGE_BG }}>
      <ShopHeader cartCount={cartCount} />

      <section
        className="relative overflow-hidden border-b py-12 sm:py-16 px-5 text-center"
        style={{ backgroundColor: HERO_BG, borderColor: '#DDE6DE' }}
      >
        <div
          className="pointer-events-none absolute -top-24 right-0 w-64 h-64 rounded-full opacity-25 blur-3xl"
          style={{ backgroundColor: '#7F9E95' }}
        />
        <div
          className="pointer-events-none absolute -bottom-16 left-0 w-48 h-48 rounded-full opacity-20 blur-3xl"
          style={{ backgroundColor: '#D5E0DC' }}
        />
        <div className="relative max-w-lg mx-auto">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#9B958D' }}>
            Bulk & Wholesale
          </p>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4" style={{ color: '#2F3B3A' }}>
            Your Brand,<br />Your Planner.
          </h1>
          <p className="text-sm max-w-lg mx-auto leading-relaxed" style={{ color: '#6B7575' }}>
            The Pep Planner offers bulk pricing and the option to incorporate your logo or branding onto the planners.
            Provide your customers with a unique research tool that reinforces your brand.
          </p>
        </div>
      </section>

      <section className="border-b py-8 px-5" style={{ backgroundColor: WHITE, borderColor: '#DDE6DE' }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-6 text-center" style={{ color: '#9B958D' }}>
            How It Works
          </h2>
          <div className="relative flex items-start justify-between gap-2">
            <div className="absolute top-6 left-[calc(16.67%-0px)] right-[calc(16.67%-0px)] h-px" style={{ backgroundColor: '#DDE6DE' }} />
            {HOW.map(({ Icon, title, desc }) => (
              <div key={title} className="relative flex flex-col items-center text-center flex-1 px-2">
                <div
                  className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center mb-3 relative z-10"
                  style={{ backgroundColor: '#EFF2EE', border: '1px solid #DDE6DE' }}
                >
                  <Icon className="w-7 h-7" weight="duotone" style={{ color: '#7F9E95' }} />
                </div>
                <h3 className="text-xs font-bold mb-1 leading-snug" style={{ color: '#2F3B3A' }}>{title}</h3>
                <p className="text-[11px] leading-relaxed" style={{ color: '#6B7575' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CustomWorkShowcaseSection
        eyebrow="Community work"
        title="See what we've made for others"
        subtitle="Custom covers shipped for clinics, groups, and brands — more history lives in The Vault."
        marqueeId="wholesale-community-marquee"
        durationSec={70}
        sectionBg={WARM_GREIGE}
        fadeColor={WARM_GREIGE}
      />

      <section className="py-10 px-5" style={{ backgroundColor: SAGE_PANEL }}>
        <div className="max-w-lg mx-auto">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2 text-center" style={{ color: '#9B958D' }}>
            Get started
          </p>
          <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: '#2F3B3A' }}>
            Bulk Order Inquiry
          </h2>
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border" style={{ borderColor: '#DDE6DE' }}>
            <InquiryForm
              type="wholesale"
              fields={FIELDS}
              cta="Submit"
              successMsg={"Got it! ✌🏻\nWe'll be in touch with pricing soon."}
            />
          </div>
        </div>
      </section>

      <section className="py-10 pb-20 px-5" style={{ backgroundColor: WARM_GREIGE }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-6 text-center" style={{ color: '#9B958D' }}>
            Why Order Bulk
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {PERKS.map(([title, desc]) => (
              <div key={title} className="bg-white rounded-xl p-4 border" style={{ borderColor: '#DDE6DE' }}>
                <h3 className="text-sm font-bold mb-1" style={{ color: '#2F3B3A' }}>{title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: '#6B7575' }}>{desc}</p>
              </div>
            ))}
          </div>
          <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-6 text-center" style={{ color: '#9B958D' }}>
            Perfect For
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {WHO.map((label) => (
              <div
                key={label}
                className="bg-white rounded-xl px-3 py-2.5 border text-center text-xs font-medium"
                style={{ borderColor: '#DDE6DE', color: '#2F3B3A' }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
