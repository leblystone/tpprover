import React from 'react';
import ShopHeader from '../components/shop/ShopHeader';
import InquiryForm from '../components/shop/InquiryForm';
import LandingFooter from '../components/layout/LandingFooter';
import { useCart } from '../context/CartContext';

const SHOP_BG = '#EDE9E3';

const HOW = [
  { step: '01', title: 'Tell me about your community', desc: 'Drop your group name, platform, and roughly how many members are active researchers.' },
  { step: '02', title: 'Get a custom discount code', desc: "I'll send a code your members can use at checkout — on planners, digital downloads, whatever fits." },
  { step: '03', title: 'Everyone orders on their own', desc: 'No bulk order, no coordinator headaches. Share the code and let your people grab what they need.' },
];

const GROUPS = [
  'Reddit peptide communities', 'Discord research servers',
  'Telegram protocol groups', 'GLP-1 coaching cohorts',
  'Private Facebook research groups', 'Peptide vendor communities',
  'Longevity & biohacking circles', 'Group buy organizers',
];

const FIELDS = [
  { name: 'name',      label: 'Your Name',              type: 'text',     required: true,  placeholder: 'Alex Johnson' },
  { name: 'email',     label: 'Email',                   type: 'email',    required: true,  placeholder: 'alex@mygroup.com' },
  { name: 'groupName', label: 'Community / Group Name',  type: 'text',     required: false, placeholder: 'r/Peptides, GLP-1 Research Discord, etc.' },
  { name: 'platform',  label: 'Where does your group live?', type: 'select', required: true,
    options: ['Reddit', 'Discord', 'Telegram', 'Facebook Group', 'Private forum / website', 'Coaching platform', 'Other'] },
  { name: 'groupSize', label: 'Active Members (approx)', type: 'select',   required: true,
    options: ['5–25', '26–100', '101–500', '500+'] },
  { name: 'message',   label: 'Anything else we should know?', type: 'textarea', placeholder: "What peptides are your members tracking? Any specific planner needs?" },
];

export default function ShopGroupDiscounts() {
  const { cartCount } = useCart();

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: SHOP_BG }}>
      <ShopHeader cartCount={cartCount} />

      {/* Hero */}
      <div className="bg-white border-b py-16 px-5 text-center" style={{ borderColor: '#DDE6DE' }}>
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#9B958D' }}>For Research Communities</p>
        <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4" style={{ color: '#2F3B3A' }}>
          Research Together,<br />Save Together.
        </h1>
        <p className="text-sm max-w-lg mx-auto leading-relaxed" style={{ color: '#6B7575' }}>
          Running a peptide Discord, GLP-1 support group, or research community? Get your members a discount code on Pep Planners — physical and digital. Everyone orders at their own pace, no bulk buy required.
        </p>
      </div>

      {/* How it works — horizontal timeline */}
      <div className="bg-white border-b py-8 px-5" style={{ borderColor: '#DDE6DE' }}>
        <div className="max-w-2xl mx-auto">
          <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-6 text-center" style={{ color: '#9B958D' }}>How It Works</h2>
          <div className="relative flex items-start justify-between gap-2">
            {/* connecting line */}
            <div className="absolute top-4 left-[calc(16.67%-0px)] right-[calc(16.67%-0px)] h-px" style={{ backgroundColor: '#DDE6DE' }} />
            {HOW.map(({ step, title, desc }) => (
              <div key={step} className="relative flex flex-col items-center text-center flex-1 px-2">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white mb-3 relative z-10"
                  style={{ backgroundColor: '#7F9E95' }}>
                  {step}
                </div>
                <h3 className="text-xs font-bold mb-1 leading-snug" style={{ color: '#2F3B3A' }}>{title}</h3>
                <p className="text-[11px] leading-relaxed" style={{ color: '#6B7575' }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="py-10 px-5">
        <div className="max-w-lg mx-auto">
          <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2 text-center" style={{ color: '#9B958D' }}>Apply for a</p>
          <h2 className="text-2xl font-bold mb-8 text-center" style={{ color: '#2F3B3A' }}>Group Discount</h2>
          <div className="bg-white rounded-2xl p-8 shadow-sm border" style={{ borderColor: '#DDE6DE' }}>
            <InquiryForm
              type="group-discount"
              fields={FIELDS}
              cta="Submit"
              successMsg={"Got it!\nYou'll receive your group discount code soon!"}
            />
          </div>
        </div>
      </div>

      {/* Who qualifies */}
      <div className="py-10 pb-20 px-5">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-[10px] font-bold tracking-[0.2em] uppercase mb-6 text-center" style={{ color: '#9B958D' }}>Built for Communities Like Yours</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {GROUPS.map(g => (
              <div key={g} className="bg-white rounded-xl px-3 py-2.5 border text-center text-xs font-medium" style={{ borderColor: '#DDE6DE', color: '#2F3B3A' }}>
                {g}
              </div>
            ))}
          </div>
          <p className="text-xs text-center mt-4" style={{ color: '#9B958D' }}>Minimum 5 active members to qualify. Discount scales with your community size.</p>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
