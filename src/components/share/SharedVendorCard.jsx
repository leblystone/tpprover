import React from 'react';
import { Star, Mail, Phone, Globe, MessageSquare, CreditCard, Coins, Info } from 'lucide-react';
import { FaDiscord, FaTelegramPlane, FaWhatsapp, FaFacebook } from 'react-icons/fa';
import { SiZelle, SiCashapp, SiVenmo } from 'react-icons/si';
import { FaPaypal, FaAlipay } from 'react-icons/fa6';
import { RiBitCoinFill } from "react-icons/ri";
import logo from '../../assets/tpp_logo.png';

// Modern theme colors - matching app aesthetic
const shareTheme = {
    primary: '#7F9E95',        // Sage green matching app
    primaryDark: '#5F7F76',
    border: '#DDE6DE',
    text: '#2F3B3A',
    textLight: '#6B7D7A',
    accent: '#8ca68c'
};

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

export default function SharedVendorCard({ vendor, theme }) {
    if (!vendor) return null;

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

    return (
        <div className="p-6 rounded-2xl bg-white w-full max-w-md shadow-xl" style={{ fontFamily: 'Poppins, sans-serif' }}>
            {/* Header */}
            <div className="flex items-start justify-between mb-5 pb-4 border-b" style={{ borderColor: shareTheme.border }}>
                <div className="flex items-center gap-3">
                    <img src={logo} alt="The Pep Planner" className="h-10 w-10 rounded-full shadow-sm object-cover" />
                    <div>
                        <h1 className="font-bold text-xl tracking-tight" style={{ color: shareTheme.text }}>{vendor.name}</h1>
                        <div className="flex items-center gap-1 mt-1">
                            {[1, 2, 3, 4, 5].map(n => (
                                <Star 
                                    key={n} 
                                    size={14} 
                                    style={{ 
                                        fill: (vendor.rating || 0) >= n ? shareTheme.primary : '#e5e7eb', 
                                        color: (vendor.rating || 0) >= n ? shareTheme.primary : '#d1d5db' 
                                    }} 
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Sections */}
            <div className="space-y-4">
                {/* Contacts */}
                {vendor.contacts && vendor.contacts.length > 0 && vendor.contacts.some(c => c.value) && (
                    <div className="relative pl-3">
                        <div 
                            className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full"
                            style={{ backgroundColor: shareTheme.accent, opacity: 0.4 }}
                        />
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-60 flex items-center" style={{ color: shareTheme.text }}>
                            <MessageSquare size={10} style={{ color: shareTheme.accent, marginRight: '6px' }} />
                            Contacts
                        </div>
                        <div className="space-y-1.5">
                            {vendor.contacts.filter(c => c.value).map(c => (
                                <div key={c.type+c.value} className="flex items-center gap-2 text-xs">
                                    <span style={{ color: shareTheme.accent }}>{getContactIcon(c.type)}</span>
                                    <span className="truncate font-medium" style={{ color: shareTheme.text }}>{c.value}</span>
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
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-2 opacity-60 flex items-center" style={{ color: shareTheme.text }}>
                            <CreditCard size={10} style={{ color: shareTheme.accent, marginRight: '6px' }} />
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
                                                backgroundColor: 'rgba(0, 0, 0, 0.03)', 
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
                        <div className="text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-60 flex items-center" style={{ color: shareTheme.text }}>
                            <Info size={10} style={{ color: shareTheme.accent, marginRight: '6px' }} />
                            Research Notes
                        </div>
                        <p 
                            className="text-[11px] leading-relaxed italic opacity-70"
                            style={{ color: shareTheme.text }}
                        >
                            {vendor.notes}
                        </p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t text-center" style={{ borderColor: shareTheme.border }}>
                <p className="text-xs font-bold mb-1" style={{ color: shareTheme.primary }}>The Pep Planner</p>
                <p className="text-[10px] opacity-60 mb-2" style={{ color: shareTheme.text }}>Organize Your Research</p>
                <p className="text-[9px] font-semibold px-2 py-1 rounded bg-red-50 text-red-700 inline-block">
                    For Research & Informational Purposes Only
                </p>
            </div>
        </div>
    );
}
