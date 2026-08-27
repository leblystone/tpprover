import React from 'react';
import { Chats, PaintBrush, Printer } from '@phosphor-icons/react';
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
  { Icon: Chats, title: 'Tell us your vision', desc: 'Share your brand, size, quantity, and what you want inside the planner.' },
  { Icon: PaintBrush, title: 'We design it together', desc: 'Cover, layout, and sections tailored to your workflow — not a generic template.' },
  { Icon: Printer, title: 'You approve & we print', desc: 'Review proofs, then we produce and ship. Rush options when you need them.' },
];

const USE_CASES = [
  'Clinics & telehealth', 'Coaching programs',
  'Gyms & wellness studios', 'Online communities',
  'Corporate wellness', 'Group buys & events',
  'Branded client gifts', 'Research cohorts',
];

const SETUP_FEE_DESC =
  'This one-time fee of $10 covers the initial design and preparation of your 100% customized peptide planners, based on the specific cover and layout details you provide.\n\nDigital proofs are included and can be remade once if requested during process.';

const PERSONALIZATION_AGREE =
  'Personalization of covers and products results in your order becoming non-returnable and non-refundable. Files received MUST be clear and large enough to be placed onto your chosen cover size. The Pep Planner reserves the right to decline any personalization due to picture quality, derogatory images, etc.';

const FIELDS = [
  { name: 'name', label: 'Name', type: 'text', required: true, placeholder: 'Your name' },
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    placeholder: 'you@example.com',
    hint: 'Digital proofs, invoice, and terms will be sent here.',
  },
  {
    name: 'plannerSize',
    label: 'Planner Size',
    type: 'select',
    required: true,
    placeholder: 'Select size…',
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
    placeholder: 'Describe your custom size (e.g. 8×10)',
    showWhen: { field: 'plannerSize', equals: 'custom' },
  },
  {
    name: 'briefDetails',
    label: 'Brief Details',
    type: 'textarea',
    required: true,
    placeholder: 'Extra pages, new tracking idea, custom colors, etc.',
  },
  {
    name: 'quantity',
    label: 'Quantity Needed',
    type: 'text',
    required: true,
    placeholder: '5',
  },
  {
    name: 'setupFeeAck',
    label: 'Setup Fee',
    type: 'checkbox',
    required: true,
    description: SETUP_FEE_DESC,
    checkboxLabel: 'I agree to the one-time $10 setup fee.',
  },
  {
    name: 'image',
    label: 'Image Upload',
    type: 'file',
    accept: 'image/*',
    maxFiles: 3,
    hint: 'If you have inspiration photos or a photo for the cover, upload up to 3 images here.',
  },
  {
    name: 'personalizationAgree',
    label: 'I agree I have read the following',
    type: 'checkbox',
    required: true,
    checkboxLabel: PERSONALIZATION_AGREE,
  },
];

export default function ShopCustom() {
  usePageSEO();
  useShopPageView('custom');
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
            Custom Planners
          </p>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4" style={{ color: '#2F3B3A' }}>
            Create Your Own<br />Pep Planner
          </h1>
          <p className="text-sm max-w-lg mx-auto leading-relaxed" style={{ color: '#6B7575' }}>
            Your logo, your community, your inside pages — real custom work we&apos;ve already shipped for teams like yours.
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

      <section className="py-10 px-5" style={{ backgroundColor: SAGE_PANEL }}>
        <div className="max-w-lg mx-auto">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2 text-center" style={{ color: '#9B958D' }}>
            Get started
          </p>
          <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: '#2F3B3A' }}>
            Custom Planner Request
          </h2>
          <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border" style={{ borderColor: '#DDE6DE' }}>
            <InquiryForm
              type="custom"
              fields={FIELDS}
              cta="Send it over!"
              successMsg={"Got it! ✌🏻\nWe'll be in touch soon."}
            />
          </div>
        </div>
      </section>

      <CustomWorkShowcaseSection
        eyebrow="Custom Work"
        title="We've shipped for the community"
        subtitle="Real covers made for clinics, groups, and brands — browse more in The Vault."
        marqueeId="custom-marquee"
        durationSec={80}
        sectionBg={WARM_GREIGE}
        fadeColor={WARM_GREIGE}
      />

      <section className="py-10 pb-20 px-5" style={{ backgroundColor: WHITE }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-6 text-center" style={{ color: '#9B958D' }}>
            Perfect For
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
            {USE_CASES.map((label) => (
              <div
                key={label}
                className="bg-white rounded-xl px-3 py-2.5 border text-center text-xs font-medium"
                style={{ borderColor: '#DDE6DE', color: '#2F3B3A' }}
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
            {[
              ['Your Logo & Branding', 'Custom cover with your colors, logo, and look.'],
              ['Tailored Inside Pages', 'Add, remove, or rearrange sections for your workflow.'],
            ].map(([title, desc]) => (
              <div key={title} className="bg-white rounded-xl p-4 border" style={{ borderColor: '#DDE6DE' }}>
                <h3 className="text-sm font-bold mb-1" style={{ color: '#2F3B3A' }}>{title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: '#6B7575' }}>{desc}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-center mt-6" style={{ color: '#9B958D' }}>
            Typical turnaround is 2–4 weeks. Rush available — tell us in the form.
          </p>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
