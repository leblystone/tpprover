import React from 'react';
import ShopHeader from '../components/shop/ShopHeader';
import InquiryForm from '../components/shop/InquiryForm';
import LandingFooter from '../components/layout/LandingFooter';
import { useCart } from '../context/CartContext';

const SHOP_BG = '#EDE9E3';

const TIERS = [
  { range: '1–10',   label: 'Retail',      discount: 'Standard pricing', note: 'Free shipping on orders $75+' },
  { range: '11–24',  label: 'Starter Bulk', discount: '10% off',         note: 'Per-unit savings start here' },
  { range: '25–49',  label: 'Wholesale',    discount: '20% off',         note: 'Invoicing available' },
  { range: '50–99',  label: 'Distributor',  discount: '28% off',         note: 'Net-30 terms available' },
  { range: '100+',   label: 'Enterprise',   discount: 'Custom quote',    note: 'White-label & custom branding' },
];

const WHO = [
  'Peptide & GLP-1 clinics', 'Wellness coaches & practitioners', 'Gym owners & personal trainers',
  'Online communities & memberships', 'Healthcare providers', 'Supplement brands & distributors',
];

const FIELDS = [
  { name: 'businessName', label: 'Business / Practice Name', type: 'text',   required: true,  placeholder: 'Apex Wellness Clinic' },
  { name: 'contactName',  label: 'Your Name',                type: 'text',   required: true,  placeholder: 'Dr. Sarah Lee' },
  { name: 'email',        label: 'Email',                    type: 'email',  required: true,  placeholder: 'sarah@apexwellness.com' },
  { name: 'phone',        label: 'Phone (optional)',          type: 'tel',    placeholder: '(555) 000-0000' },
  { name: 'quantity',     label: 'Estimated Order Quantity',  type: 'select', required: true,
    options: ['11–24', '25–49', '50–99', '100–199', '200+'] },
  { name: 'products',     label: 'Products of Interest',      type: 'textarea', placeholder: 'Which planners, sizes, or accessories are you interested in?' },
  { name: 'timeline',     label: 'When do you need them?',   type: 'select',
    options: ['ASAP', 'Within a month', '1–3 months', 'Planning ahead'] },
];

export default function ShopWholesale() {
  const { cartCount } = useCart();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: SHOP_BG }}>
      <ShopHeader cartCount={cartCount} />

      {/* Hero */}
      <div className="bg-white border-b py-16 px-5 text-center" style={{ borderColor: '#DDE6DE' }}>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#9B958D' }}>Bulk & Wholesale</p>
        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4" style={{ color: '#2F3B3A' }}>
          Stock Your Practice
        </h1>
        <p className="text-sm max-w-lg mx-auto leading-relaxed" style={{ color: '#6B7575' }}>
          Equip your clients, patients, or community with the research tool they need. Volume pricing, flexible invoicing, and white-label options available.
        </p>
      </div>

      {/* Pricing tiers */}
      <div className="bg-white border-b py-14 px-5" style={{ borderColor: '#DDE6DE' }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-8 text-center" style={{ color: '#9B958D' }}>Volume Pricing</h2>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            {TIERS.map((t, i) => (
              <div
                key={t.range}
                className="rounded-xl p-4 text-center border"
                style={{
                  borderColor: i === 2 ? '#7F9E95' : '#DDE6DE',
                  backgroundColor: i === 2 ? '#7F9E95' : 'white',
                }}
              >
                <p className="text-[10px] font-bold tracking-widest uppercase mb-1"
                  style={{ color: i === 2 ? 'rgba(255,255,255,0.7)' : '#9B958D' }}>{t.label}</p>
                <p className="text-xl font-bold mb-1" style={{ color: i === 2 ? 'white' : '#2F3B3A' }}>{t.range}</p>
                <p className="text-sm font-bold" style={{ color: i === 2 ? 'white' : '#7F9E95' }}>{t.discount}</p>
                <p className="text-[10px] mt-1.5" style={{ color: i === 2 ? 'rgba(255,255,255,0.75)' : '#9B958D' }}>{t.note}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Who it's for */}
      <div className="py-14 px-5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-6 text-center" style={{ color: '#9B958D' }}>Who Orders Wholesale</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {WHO.map(w => (
              <div key={w} className="bg-white rounded-xl px-4 py-3 border text-center text-sm font-medium" style={{ borderColor: '#DDE6DE', color: '#2F3B3A' }}>
                {w}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="pb-20 px-5">
        <div className="max-w-lg mx-auto">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2 text-center" style={{ color: '#9B958D' }}>Get a Quote</p>
          <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: '#2F3B3A' }}>Wholesale Inquiry</h2>
          <div className="bg-white rounded-2xl p-8 shadow-sm border" style={{ borderColor: '#DDE6DE' }}>
            <InquiryForm
              type="wholesale"
              fields={FIELDS}
              cta="Request Wholesale Quote"
              successMsg="Got it! I'll follow up with pricing and terms within 1–2 business days."
            />
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
