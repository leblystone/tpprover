import React from 'react';
import { Star, Mail, Phone, Globe, MessageSquare, CreditCard, Banknote, Coins, Wallet, Landmark } from 'lucide-react';
import { FaDiscord, FaTelegramPlane, FaWhatsapp, FaFacebook } from 'react-icons/fa';
import logo from '../../assets/tpp-logo.png';

const GOOD_LABELS = ['Reliable', 'Fast Shipping', 'Overfill', 'Vetted'];
const BAD_LABELS = ['Bad Test', 'Bad Packaging', 'Broken Vials', 'Rude Reps', 'Out of Service'];

const getContactIcon = (type) => {
    const s = String(type || '').toLowerCase();
    if (s === 'email') return <Mail size={14} />;
    if (s === 'phone') return <Phone size={14} />;
    if (s === 'website') return <Globe size={14} />;
    if (s === 'whatsapp') return <FaWhatsapp size={14} />;
    if (s === 'discord') return <FaDiscord size={14} />;
    if (s === 'telegram') return <FaTelegramPlane size={14} />;
    if (s === 'facebook') return <FaFacebook size={14} />;
    return <MessageSquare size={14} />;
};

const VendorPaymentIcons = ({ vendor, theme }) => {
    const p = vendor?.payments || {};
    const items = [];
    if (p.card) items.push({ label: 'Card', Icon: CreditCard });
    if (p.zelle) items.push({ label: 'Zelle', Icon: Banknote });
    if (p.crypto) items.push({ label: 'Crypto', Icon: Coins });
    if (p.paypal) items.push({ label: 'PayPal', Icon: Wallet });
    if (p.wire) items.push({ label: 'Wire', Icon: Landmark });
    if (items.length === 0) return null;

    return (
        <div className="mt-3">
            <h3 className="text-xs font-bold text-gray-500 mb-2">Payment Methods</h3>
            <div className="flex flex-wrap gap-2 text-xs">
                {items.map(({ label, Icon }) => (
                    <span key={label} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100" style={{ color: theme.text }}>
                        <Icon className="w-3.5 h-3.5" />
                        {label}
                    </span>
                ))}
            </div>
        </div>
    );
};

export default function SharedVendorCard({ vendor, theme }) {
    if (!vendor) return null;

    const sections = [];

    // 1. Build Contacts section if data exists
    if (vendor.contacts && vendor.contacts.length > 0) {
        sections.push(
            <div key="contacts">
                <h3 className="text-xs font-bold text-gray-500 mb-2">Contact Info</h3>
                <div className="flex flex-col gap-1.5">
                    {vendor.contacts.filter(c => c.value).map(c => (
                        <div key={c.type+c.value} className="flex items-center gap-2 text-xs">
                            <span style={{ color: theme.primary }}>{getContactIcon(c.type)}</span>
                            <span className="truncate">{c.value}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // 2. Build Payments section if data exists
    const paymentMethods = [];
    const p = vendor?.payments || {};
    if (p.card) paymentMethods.push({ label: 'Card', Icon: CreditCard });
    if (p.zelle) paymentMethods.push({ label: 'Zelle', Icon: Banknote });
    if (p.crypto) paymentMethods.push({ label: 'Crypto', Icon: Coins });
    if (p.paypal) paymentMethods.push({ label: 'PayPal', Icon: Wallet });
    if (p.wire) paymentMethods.push({ label: 'Wire', Icon: Landmark });

    if (paymentMethods.length > 0) {
        sections.push(
            <div key="payments">
                <h3 className="text-xs font-bold text-gray-500 mb-2">Payments</h3>
                <div className="flex flex-col gap-1.5 text-xs">
                    {paymentMethods.map(({ label, Icon }) => (
                        <span key={label} className="inline-flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-gray-500" />
                            {label}
                        </span>
                    ))}
                </div>
            </div>
        );
    }

    // 3. Build Labels section if data exists
    if (vendor.labels && vendor.labels.length > 0) {
        sections.push(
            <div key="labels">
                <h3 className="text-xs font-bold text-gray-500 mb-2">Labels</h3>
                <div className="flex flex-wrap gap-1">
                    {vendor.labels.map(l => {
                        let labelClass = "px-2 py-1 rounded-full text-xs font-semibold ";
                        if (GOOD_LABELS.includes(l)) labelClass += "bg-green-100 text-green-800";
                        else if (BAD_LABELS.includes(l)) labelClass += "bg-red-100 text-red-800";
                        else labelClass += "bg-blue-100 text-blue-800";
                        return <span key={l} className={labelClass}>{l}</span>;
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 rounded-xl border bg-white w-[400px]" style={{ borderColor: theme.border, fontFamily: 'sans-serif' }}>
            <header className="flex items-center gap-3 mb-4 pb-4 border-b" style={{borderColor: theme.border}}>
                <img src={logo} alt="The Pep Planner Logo" className="h-12 w-12 rounded-full shadow-md object-cover" />
                <div>
                    <h1 className="font-bold text-lg" style={{ color: theme.primaryDark }}>{vendor.name}</h1>
                    <p className="text-xs text-gray-500">Vendor Details</p>
                    <div className="flex items-center gap-1 mt-1">
                        {[1, 2, 3, 4, 5].map(n => (
                            <Star key={n} size={16} style={{ fill: (vendor.rating || 0) >= n ? '#f59e0b' : '#e5e7eb', color: (vendor.rating || 0) >= n ? '#f59e0b' : '#d1d5db' }} />
                        ))}
                    </div>
                </div>
            </header>
            
            <div className={`grid grid-cols-${Math.min(sections.length, 3)} gap-4 text-sm text-gray-700`}>
                {sections}
            </div>

            <footer className="text-center mt-6 pt-4 border-t" style={{ borderColor: theme.border }}>
                <p className="text-xs font-semibold" style={{ color: theme.primary }}>The Pep Planner</p>
                <p className="text-xs text-gray-400 mb-2">Organize Your Research</p>
                <p className="text-[10px] text-red-600 font-semibold p-1 bg-red-100 rounded">
                    For Research & Informational Purposes Only. The content is user-generated and not endorsed by The Pep Planner.
                </p>
            </footer>
        </div>
    );
}
