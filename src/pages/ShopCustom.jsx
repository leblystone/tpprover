import React from 'react';
import ShopHeader from '../components/shop/ShopHeader';
import ShopSubNav from '../components/shop/ShopSubNav';
import InquiryForm from '../components/shop/InquiryForm';
import LandingFooter from '../components/layout/LandingFooter';
import { useCart } from '../context/CartContext';

const SHOP_BG = '#EDE9E3';

const FIELDS = [
  { name: 'name',         label: 'Your Name',           type: 'text',     required: true,  placeholder: 'Jane Smith' },
  { name: 'email',        label: 'Email',               type: 'email',    required: true,  placeholder: 'jane@example.com' },
  { name: 'organization', label: 'Organization / Brand (optional)', type: 'text', placeholder: 'My Clinic LLC' },
  { name: 'quantity',     label: 'Estimated Quantity',  type: 'select',   required: true,
    options: ['1–10', '11–24', '25–49', '50–99', '100+'] },
  { name: 'size',         label: 'Preferred Size',      type: 'select',   required: true,
    options: ['7×10', '5×7', 'Not sure yet'] },
  { name: 'details',      label: 'Tell me about your vision', type: 'textarea', required: true,
    placeholder: 'Cover design ideas, branding colors, special sections, deadline…' },
  { name: 'timeline',     label: 'Ideal Delivery Timeline', type: 'select',
    options: ['ASAP (rush)', '2–4 weeks', '1–2 months', 'Flexible'] },
];

const PERKS = [
  ['Your Logo & Branding', 'Custom cover design featuring your colors, logo, and aesthetic.'],
  ['Tailored Inside Pages', 'Add, remove, or rearrange sections to match your exact workflow.'],
  ['Community Editions', 'Perfect for clinics, coaching groups, gyms, and online communities.'],
  ['Bulk Pricing Available', 'The more you order, the better the per-unit price.'],
];

export default function ShopCustom() {
  const { cartCount } = useCart();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: SHOP_BG }}>
      <ShopHeader cartCount={cartCount} />
      <ShopSubNav />

      {/* Hero */}
      <div className="bg-white border-b py-16 px-5 text-center" style={{ borderColor: '#DDE6DE' }}>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#9B958D' }}>Custom PEP Planners</p>
        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4" style={{ color: '#2F3B3A' }}>
          Built Around You
        </h1>
        <p className="text-sm max-w-lg mx-auto leading-relaxed" style={{ color: '#6B7575' }}>
          Every practice, community, and team is different. Custom PEP Planners let you deliver a fully branded research tool that feels like it was made for your people — because it was.
        </p>
      </div>

      {/* Perks grid */}
      <div className="bg-white border-b py-14 px-5" style={{ borderColor: '#DDE6DE' }}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          {PERKS.map(([title, desc]) => (
            <div key={title} className="flex gap-4">
              <div className="w-1.5 flex-shrink-0 rounded-full mt-1.5" style={{ backgroundColor: '#7F9E95', height: 40 }} />
              <div>
                <h3 className="text-sm font-bold mb-1" style={{ color: '#2F3B3A' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6B7575' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 py-16 px-5">
        <div className="max-w-lg mx-auto">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2 text-center" style={{ color: '#9B958D' }}>Get Started</p>
          <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: '#2F3B3A' }}>Request a Custom Order</h2>
          <div className="bg-white rounded-2xl p-8 shadow-sm border" style={{ borderColor: '#DDE6DE' }}>
            <InquiryForm
              type="custom"
              fields={FIELDS}
              cta="Submit Custom Request"
              successMsg="Your request is in! I'll reach out within 1–2 business days to talk through your vision."
            />
          </div>
          <p className="text-[11px] text-center mt-4" style={{ color: '#9B958D' }}>
            Custom orders typically have a 2–4 week turnaround. Rush options available.
          </p>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
