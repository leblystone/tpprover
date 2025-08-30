import React from 'react';
import { CreditCard, Banknote, Coins, Wallet, Landmark } from 'lucide-react';

export default function VendorPaymentIcons({ vendor, theme }) {
    const p = vendor?.payments || vendor?.paymentMethods || {};
    const items = [];
    if (p.card || p.credit || p['credit card']) items.push({ label: 'Card', Icon: CreditCard });
    if (p.zelle) items.push({ label: 'Zelle', Icon: Banknote });
    if (p.crypto) items.push({ label: 'Crypto', Icon: Coins });
    if (p.paypal) items.push({ label: 'PayPal', Icon: Wallet });
    if (p.wire) items.push({ label: 'Wire', Icon: Landmark });
    if (items.length === 0) return null;
    return (
        <div className="mt-2 flex flex-wrap gap-2 text-xs" title="Payment methods" style={{ color: theme.text }}>
            {items.map(({ label, Icon }) => (
                <span key={label} className="inline-flex items-center gap-1 px-2 py-1 rounded-full" style={{ backgroundColor: theme.white, border: `1px solid ${theme.border}`, color: theme.text }}>
                    <Icon className="w-3 h-3" />
                    {label}
                </span>
            ))}
        </div>
    );
}
