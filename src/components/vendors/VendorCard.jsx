import React, { useState } from 'react';
import { Star, Mail, Phone, Globe, MessageSquare, Share2, CreditCard, Edit, ShoppingCart, FileText } from 'lucide-react';
import { FaDiscord, FaTelegramPlane, FaWhatsapp, FaFacebook } from 'react-icons/fa';
import { SiZelle, SiCashapp } from 'react-icons/si';
import { FaPaypal, FaAlipay } from 'react-icons/fa6';
import { RiBitCoinFill } from "react-icons/ri";
import ShareModal from '../common/ShareModal';

const GOOD_LABELS = ['Reliable', 'Fast Shipping', 'Overfill', 'Vetted', 'Reshipper'];
const BAD_LABELS = ['Bad Test', 'Bad Packaging', 'Broken Vials', 'Rude Reps', 'Out of Service', 'Puck Problem'];

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

function buildContactHref(type, rawValue) {
  const t = String(type || '').toLowerCase()
  const v = String(rawValue || '').trim()
  if (!v) return { isLink: false }
  // email
  if (t === 'email') return { isLink: true, href: `mailto:${v}` }
  // phone and WhatsApp
  if (t === 'phone') return { isLink: true, href: `tel:${v.replace(/[^0-9+]/g,'')}` }
  if (t === 'whatsapp') {
    const num = v.match(/^[+0-9 ]+$/) ? v.replace(/[^0-9]/g,'') : ''
    const href = num ? `https://wa.me/${num}` : (v.startsWith('http') ? v : `https://wa.me/${encodeURIComponent(v)}`)
    return { isLink: true, href }
  }
  // telegram
  if (t === 'telegram') {
    const handle = v.replace(/^@/, '')
    if (v.startsWith('http')) return { isLink: true, href: v }
    return { isLink: true, href: `https://t.me/${handle}` }
  }
  // discord: user handles are not directly linkable, but server invites are. Treat as copyable otherwise.
  if (t === 'discord') {
    if (/discord\.gg|discord\.com\/invite/.test(v)) return { isLink: true, href: v }
    return { isLink: false } // Always treat as a copyable button if not an invite link
  }
  // facebook
  if (t === 'facebook') {
    if (v.startsWith('http')) return { isLink: true, href: v }
    return { isLink: true, href: `https://facebook.com/${v.replace(/^@/, '')}` }
  }
  // website/URL
  if (t === 'website' || /^https?:\/\//i.test(v) || v.includes('.')) {
    const href = v.startsWith('http') ? v : `https://${v}`
    return { isLink: true, href }
  }
  return { isLink: false }
}


export default function VendorCard({ vendor, theme, onEditClick, onManageProtocolClick, onForceDelete, isPublicView = false }) {
    const [isShareModalOpen, setShareModalOpen] = useState(false);
    const [showForceDeleteConfirm, setShowForceDeleteConfirm] = useState(false);

    const handleShare = () => {
        setShareModalOpen(true);
    };

    // Check for order history
    const getOrderHistory = () => {
        try {
            const orders = JSON.parse(localStorage.getItem('tpprover_orders') || '[]');
            return orders.filter(order => 
                (order.vendorId && order.vendorId === vendor.id) || 
                (!order.vendorId && order.vendor && order.vendor.toLowerCase() === vendor.name.toLowerCase())
            );
        } catch {
            return [];
        }
    };

    const orderHistory = getOrderHistory();

    const paymentMethods = [];
    const p = vendor?.payments || {};
    if (p.card) paymentMethods.push({ label: 'Card', Icon: CreditCard });
    if (p.zelle) paymentMethods.push({ label: 'Zelle', Icon: SiZelle });
    if (p.crypto) paymentMethods.push({ label: 'Crypto', Icon: RiBitCoinFill });
    if (p.paypal) paymentMethods.push({ label: 'PayPal', Icon: FaPaypal });
    if (p.venmo) paymentMethods.push({ label: 'Venmo', Icon: FaPaypal }); // Using PayPal icon for Venmo as it's a subsidiary and visually similar
    if (p.cashapp) paymentMethods.push({ label: 'CashApp', Icon: SiCashapp });
    if (p.alipay) paymentMethods.push({ label: 'AliPay', Icon: FaAlipay });

    const cardStyle = {
        backgroundColor: theme.cardBackground,
    };

    return (
        <>
            <div className={`p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow flex flex-col justify-between h-full ${vendor.isStub ? 'ring-2 ring-opacity-50' : ''}`} style={{...cardStyle, '--tw-ring-color': vendor.isStub ? theme.primary : 'transparent'}}>
                {/* Top Section: Name, Rating, Contacts */}
                <div>
                    <div className="flex items-start justify-between">
                        <div className="font-semibold text-base">{vendor.name}</div>
                        <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map(n => (
                                <Star key={n} size={16} style={{ fill: (vendor.rating || 0) >= n ? theme.primary : '#e5e7eb', color: (vendor.rating || 0) >= n ? theme.primary : '#d1d5db' }} />
                            ))}
                        </div>
                    </div>
                    
                    {vendor.isStub && (
                        <div className="mt-3 text-center">
                            <button 
                                onClick={() => onEditClick(vendor)}
                                className="w-full px-3 py-2 rounded-md text-sm font-semibold"
                                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                            >
                                Complete Profile
                            </button>
                        </div>
                    )}

                    {vendor.contacts && vendor.contacts.length > 0 && (
                        <div className="mt-3 pt-3" style={{ borderTop: theme.isDark ? '1px solid #374151' : `1px solid ${theme.border}` }}>
                            <div className="grid grid-cols-1 gap-x-4 gap-y-2">
                                {vendor.contacts.filter(c => c.value).map(c => {
                                    const action = buildContactHref(c.type, c.value);
                                    const content = (
                                        <div className="flex items-center gap-2 text-sm transition-colors" style={{ color: theme.text }}>
                                            <span className="text-base" style={{ color: theme.primary }}>{getContactIcon(c.type)}</span>
                                            <span className="truncate">{c.value}</span>
                                        </div>
                                    );
                                    
                                    if (action.isLink) {
                                        return (
                                            <a key={c.type+c.value} href={action.href} target="_blank" rel="noopener noreferrer" className="min-w-0" style={{ color: theme.text }}>{content}</a>
                                        );
                                    }
                                    
                                    return (
                                        <button key={c.type+c.value} onClick={() => { try { navigator.clipboard.writeText(c.value); window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Copied!', type: 'success' } })) } catch { } }} title={`Copy ${c.value}`} className="min-w-0 text-left w-full" style={{ color: theme.text }}>{content}</button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {vendor.notes && vendor.notes.trim() && (
                        <div className="mt-3 pt-3" style={{ borderTop: theme.isDark ? '1px solid #374151' : `1px solid ${theme.border}` }}>
                            <div className="flex items-start gap-2 text-sm">
                                <FileText size={14} className="mt-0.5 flex-shrink-0" style={{ color: theme.primary }} />
                                <div 
                                    className="text-xs leading-relaxed"
                                    style={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        maxHeight: '3.6em',
                                        color: theme.isDark ? theme.textLight : theme.text
                                    }}
                                >
                                    {vendor.notes}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Bottom Section: Payments, Labels, Buttons */}
                <div>
                    {(paymentMethods.length > 0 || (vendor.labels && vendor.labels.length > 0)) && (
                        <div className="mt-3 pt-3 space-y-3" style={{ borderTop: theme.isDark ? '1px solid #374151' : `1px solid ${theme.border}` }}>
                            {paymentMethods.length > 0 && (
                                <div className="flex flex-wrap gap-2 text-xs">
                                    {paymentMethods.map(({ label, Icon }) => (
                                        <span key={label} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full" style={{ backgroundColor: theme.secondary, color: theme.text }}>
                                            <Icon className="w-3.5 h-3.5" />
                                            {label}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {vendor.labels && vendor.labels.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {vendor.labels.map(l => {
                                        let labelClass = "px-2 py-1 rounded-full text-xs font-semibold ";
                                        if (GOOD_LABELS.includes(l)) labelClass += "bg-green-100 text-green-800";
                                        else if (BAD_LABELS.includes(l)) labelClass += "bg-red-100 text-red-800";
                                        else labelClass += "bg-blue-100 text-blue-800";
                                        return <span key={l} className={labelClass}>{l}</span>;
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {!isPublicView && (
                         <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: theme.isDark ? '1px solid #374151' : `1px solid ${theme.border}` }}>
                            {orderHistory.length > 0 && (
                                <div className="flex items-center gap-1 text-xs" style={{ color: theme.textLight }}>
                                    <ShoppingCart size={12} />
                                    <span>{orderHistory.length} order{orderHistory.length !== 1 ? 's' : ''}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-2 ml-auto">
                                <button data-tour="vendor-share" onClick={handleShare} className="p-2 rounded-md transition-colors flex-shrink-0" style={{ color: theme.text }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'} aria-label="Share vendor">
                                    <Share2 className="h-4 w-4" />
                                </button>
                                <button onClick={() => onEditClick(vendor)} className="p-2 rounded-md transition-colors flex-shrink-0" style={{ color: theme.text }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.isDark ? '#374151' : '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'} aria-label="Edit vendor">
                                    <Edit className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* ShareModal remains unchanged */}
            <ShareModal
                open={isShareModalOpen}
                onClose={() => setShareModalOpen(false)}
                theme={theme}
                title="Vendor"
                cardProps={{ vendor: vendor, theme, isPublicView: true }}
                shareData={{ ...vendor, type: 'vendor' }}
            />
        </>
    );
}
