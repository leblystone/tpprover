import React from 'react';
import { Star, Mail, Phone, Globe, MessageSquare, CreditCard, Coins, Info } from 'lucide-react';
import { FaDiscord, FaTelegramPlane, FaWhatsapp, FaFacebook } from 'react-icons/fa';
import { SiZelle, SiCashapp, SiVenmo } from 'react-icons/si';
import { FaPaypal, FaAlipay } from 'react-icons/fa6';
import { RiBitCoinFill } from "react-icons/ri";
import logo from '../../assets/tpp_logo.png';

const getShareTheme = (theme) => ({
    primary:   theme?.primary       || '#7F9E95',
    border:    theme?.border        || '#DDE6DE',
    text:      theme?.text          || '#2F3B3A',
    textLight: theme?.textLight     || '#6B7D7A',
    accent:    theme?.primary       || '#8ca68c',
    card:      theme?.cardBackground || '#ffffff',
    bg:        theme?.secondary     || '#f9fafb',
});

const GOOD_LABELS = ['Reliable', 'Fast Shipping', 'Overfill', 'Vetted', 'Reshipper'];
const BAD_LABELS = ['Bad Test', 'Bad Packaging', 'Broken Vials', 'Rude Reps', 'Out of Service', 'Puck Problem'];

const getContactIcon = (type) => {
    const s = String(type || '').toLowerCase();
    if (s === 'email') return <Mail size={12} />;
    if (s === 'phone') return <Phone size={12} />;
    if (s === 'website') return <Globe size={12} />;
    if (s === 'whatsapp') return <FaWhatsapp size={12} />;
    if (s === 'discord') return <FaDiscord size={12} />;
    if (s === 'telegram') return <FaTelegramPlane size={12} />;
    if (s === 'facebook') return <FaFacebook size={12} />;
    return <MessageSquare size={12} />;
};

const VenmoIcon = ({ size = 18, style, className }) => {
    return <SiVenmo size={size} style={style} className={className} />;
};

const hexToRgb = (hex) => {
    const h = (hex || '#7F9E95').replace('#', '');
    if (h.length !== 6) return '127, 158, 149';
    return `${parseInt(h.slice(0,2),16)}, ${parseInt(h.slice(2,4),16)}, ${parseInt(h.slice(4,6),16)}`;
};

export default function SharedVendorCard({ vendor, theme }) {
    if (!vendor) return null;

    const shareTheme = getShareTheme(theme);

    // Build payment methods
    const paymentMethods = [];
    const p = vendor?.payments || {};
    if (p.card) paymentMethods.push({ label: 'Card', Icon: CreditCard });
    if (p.zelle) paymentMethods.push({ label: 'Zelle', Icon: SiZelle });
    if (p.crypto) paymentMethods.push({ label: 'Crypto', Icon: RiBitCoinFill });
    if (p.paypal) paymentMethods.push({ label: 'PayPal', Icon: FaPaypal });
    if (p.venmo) paymentMethods.push({ label: 'Venmo', Icon: VenmoIcon });
    if (p.cashapp) paymentMethods.push({ label: 'CashApp', Icon: SiCashapp });
    if (p.alipay) paymentMethods.push({ label: 'AliPay', Icon: FaAlipay });

    const accentRgb = hexToRgb(shareTheme.accent);

    return (
        <div
            className="rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            style={{ fontFamily: 'Poppins, sans-serif', minWidth: 300, backgroundColor: shareTheme.card }}
        >
            {/* ─── Hero header with gradient wash ─── */}
            <div
                className="relative px-5 pt-5 pb-4 overflow-hidden"
                style={{
                    background: `linear-gradient(145deg, rgba(${accentRgb}, 0.14) 0%, rgba(${accentRgb}, 0.04) 60%, ${shareTheme.card} 100%)`,
                }}
            >
                {/* Decorative circle */}
                <div
                    className="absolute -top-8 -right-8 w-32 h-32 rounded-full pointer-events-none"
                    style={{ background: `radial-gradient(circle, rgba(${accentRgb}, 0.18) 0%, transparent 70%)` }}
                />

                {/* Logo + brand row */}
                <div className="flex items-center gap-2 mb-3">
                    <img src={logo} alt="TPP" className="h-6 w-6 rounded-full shadow-sm object-cover" />
                    <span className="text-[9px] font-bold uppercase tracking-[0.18em] opacity-50" style={{ color: shareTheme.text }}>
                        The Pep Planner
                    </span>
                </div>

                {/* Vendor name */}
                <h1 className="font-black text-2xl leading-tight tracking-tight mb-1" style={{ color: shareTheme.text }}>
                    {vendor.name || 'Vendor Profile'}
                </h1>

                {/* Star rating */}
                {vendor.rating > 0 && (
                    <div className="flex items-center gap-[3px] mt-1.5">
                        {[1, 2, 3, 4, 5].map(n => (
                            <Star 
                                key={n} 
                                size={12} 
                                style={{ 
                                    fill: (vendor.rating || 0) >= n ? '#fbbf24' : 'transparent', 
                                    color: (vendor.rating || 0) >= n ? '#fbbf24' : shareTheme.border 
                                }} 
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Content Sections */}
            <div className="px-5 py-4 space-y-4">
                {/* Contacts */}
                {vendor.contacts && vendor.contacts.length > 0 && vendor.contacts.some(c => c.value) && (
                    <div className="relative pl-3">
                        <div 
                            className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                            style={{ backgroundColor: shareTheme.accent, opacity: 0.4 }}
                        />
                        <div className="text-[8px] font-bold uppercase tracking-[0.18em] mb-2 flex items-center" style={{ color: shareTheme.accent, opacity: 0.65 }}>
                            <MessageSquare size={8} style={{ color: shareTheme.accent, marginRight: '5px' }} />
                            Contacts
                        </div>
                        <div className="space-y-1.5">
                            {vendor.contacts.filter(c => c.value).map(c => (
                                <div key={c.type+c.value} className="flex items-center gap-2">
                                    <span style={{ color: shareTheme.accent }}>{getContactIcon(c.type)}</span>
                                    <span className="truncate text-[11px] font-medium" style={{ color: shareTheme.text }}>{c.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Payments & Labels */}
                {(paymentMethods.length > 0 || (vendor.labels && vendor.labels.length > 0)) && (
                    <div className="relative pl-3">
                        <div 
                            className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                            style={{ backgroundColor: shareTheme.accent, opacity: 0.4 }}
                        />
                        <div className="text-[8px] font-bold uppercase tracking-[0.18em] mb-2 flex items-center" style={{ color: shareTheme.accent, opacity: 0.65 }}>
                            <CreditCard size={8} style={{ color: shareTheme.accent, marginRight: '5px' }} />
                            Trust & Payments
                        </div>
                        <div className="space-y-2">
                            {paymentMethods.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {paymentMethods.map(({ label, Icon }) => (
                                        <span 
                                            key={label} 
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold" 
                                            style={{ 
                                                backgroundColor: `rgba(${accentRgb}, 0.08)`,
                                                border: `1px solid rgba(${accentRgb}, 0.14)`,
                                                color: shareTheme.text 
                                            }}
                                        >
                                            <Icon className="w-3 h-3 opacity-70" />
                                            {label}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {vendor.labels && vendor.labels.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {vendor.labels.map(l => {
                                        let backgroundColor, color;
                                        if (GOOD_LABELS.includes(l)) {
                                            backgroundColor = 'rgba(96, 124, 92, 0.15)';
                                            color = '#3c4e3a';
                                        } else if (BAD_LABELS.includes(l)) {
                                            backgroundColor = 'rgba(161, 77, 77, 0.15)';
                                            color = '#6D2B2C';
                                        } else {
                                            backgroundColor = 'rgba(173, 195, 209, 0.2)';
                                            color = '#1e3a5f';
                                        }
                                        return (
                                            <span 
                                                key={l} 
                                                className="px-2 py-0.5 rounded-md text-[10px] font-bold"
                                                style={{ backgroundColor, color }}
                                            >
                                                {l}
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Notes */}
                {vendor.notes && vendor.notes.trim() && (
                    <div className="relative pl-3">
                        <div 
                            className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                            style={{ backgroundColor: shareTheme.accent, opacity: 0.4 }}
                        />
                        <div className="text-[8px] font-bold uppercase tracking-[0.18em] mb-1.5 flex items-center" style={{ color: shareTheme.accent, opacity: 0.65 }}>
                            <Info size={8} style={{ color: shareTheme.accent, marginRight: '5px' }} />
                            Research Notes
                        </div>
                        <p 
                            className="text-[10.5px] leading-relaxed italic opacity-60"
                            style={{ color: shareTheme.text }}
                        >
                            {vendor.notes}
                        </p>
                    </div>
                )}
            </div>

            {/* ─── Footer ─── */}
            <div
                className="px-5 py-2.5 flex items-center justify-center"
                style={{ backgroundColor: 'transparent' }}
            >
                <p className="text-[8px] opacity-30 font-semibold" style={{ color: shareTheme.text }}>For Research &amp; Informational Purposes Only</p>
            </div>
        </div>
    );
}
