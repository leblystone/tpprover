import React from 'react';
import ShopHeader from '../components/shop/ShopHeader';
import ShopSubNav from '../components/shop/ShopSubNav';
import InquiryForm from '../components/shop/InquiryForm';
import LandingFooter from '../components/layout/LandingFooter';
import { useCart } from '../context/CartContext';

const SHOP_BG = '#EDE9E3';

const HOW = [
  { step: '01', title: 'Reach out below', desc: 'Tell me about your group — size, type, and what you need.' },
  { step: '02', title: 'Get a group code', desc: "I'll send a personalized discount code your group can use at checkout." },
  { step: '03', title: 'Everyone saves', desc: 'Share the code and your people order at their own pace — no minimums.' },
];

const GROUPS = [
  'Research & peptide protocol groups', 'GLP-1 support communities',
  'Coaching cohorts & masterminds', 'Fitness & wellness teams',
  'Online membership communities', 'Accountability groups & challenges',
  'Book clubs & study groups', 'Healthcare & clinical teams',
];

const FIELDS = [
  { name: 'name',      label: 'Your Name',       type: 'text',   required: true, placeholder: 'Alex Johnson' },
  { name: 'email',     label: 'Email',            type: 'email',  required: true, placeholder: 'alex@mygroup.com' },
  { name: 'groupName', label: 'Group / Community Name', type: 'text', placeholder: 'GLP-1 Research Squad' },
  { name: 'groupType', label: 'Group Type',       type: 'select', required: true,
    options: ['Online community', 'Coaching cohort', 'Clinical / healthcare team', 'Fitness / wellness team', 'Accountability group', 'Other'] },
  { name: 'groupSize', label: 'Estimated Group Size', type: 'select', required: true,
    options: ['5–10', '11–25', '26–50', '51–100', '100+'] },
  { name: 'message',   label: 'Anything else?',  type: 'textarea', placeholder: 'Tell me more about your group or any specific needs.' },
];

export default function ShopGroupDiscounts() {
  const { cartCount } = useCart();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: SHOP_BG }}>
      <ShopHeader cartCount={cartCount} />
      <ShopSubNav />

      {/* Hero */}
      <div className="bg-white border-b py-16 px-5 text-center" style={{ borderColor: '#DDE6DE' }}>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#9B958D' }}>Group Discounts</p>
        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4" style={{ color: '#2F3B3A' }}>
          Research Together,<br />Save Together
        </h1>
        <p className="text-sm max-w-lg mx-auto leading-relaxed" style={{ color: '#6B7575' }}>
          Got a community, cohort, or crew? Get everyone on the same planner with a group discount code. No bulk order required — everyone orders individually, everyone saves.
        </p>
      </div>

      {/* How it works */}
      <div className="bg-white border-b py-14 px-5" style={{ borderColor: '#DDE6DE' }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-10 text-center" style={{ color: '#9B958D' }}>How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {HOW.map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-lg font-bold text-white"
                  style={{ backgroundColor: '#7F9E95' }}>
                  {step}
                </div>
                <h3 className="text-sm font-bold mb-2" style={{ color: '#2F3B3A' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#6B7575' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Who qualifies */}
      <div className="py-14 px-5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-6 text-center" style={{ color: '#9B958D' }}>Who Qualifies</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {GROUPS.map(g => (
              <div key={g} className="bg-white rounded-xl px-3 py-2.5 border text-center text-xs font-medium" style={{ borderColor: '#DDE6DE', color: '#2F3B3A' }}>
                {g}
              </div>
            ))}
          </div>
          <p className="text-xs text-center mt-4" style={{ color: '#9B958D' }}>Minimum 5 members to qualify. Discount varies by group size.</p>
        </div>
      </div>

      {/* Form */}
      <div className="pb-20 px-5">
        <div className="max-w-lg mx-auto">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2 text-center" style={{ color: '#9B958D' }}>Apply</p>
          <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: '#2F3B3A' }}>Group Discount Request</h2>
          <div className="bg-white rounded-2xl p-8 shadow-sm border" style={{ borderColor: '#DDE6DE' }}>
            <InquiryForm
              type="group-discount"
              fields={FIELDS}
              cta="Apply for Group Discount"
              successMsg="You're in! I'll send your group's discount code within 1 business day."
            />
          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
