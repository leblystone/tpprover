import React, { useState, useEffect } from 'react';
import { X, Mail } from 'lucide-react';
import ContactFormContent from '../common/ContactFormContent';

export default function LandingContactModal({ open, onClose, source = 'landing' }) {
    const [visible, setVisible] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        if (open) {
            setMounted(true);
            // one frame delay so the enter animation fires
            requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
        } else {
            setVisible(false);
            const t = setTimeout(() => setMounted(false), 380);
            return () => clearTimeout(t);
        }
    }, [open]);

    if (!mounted) return null;

    const handleSuccess = () => onClose();

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{
                perspective: '1000px',
                backgroundColor: visible ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0)',
                transition: 'background-color 300ms ease',
            }}
            onClick={onClose}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%',
                    maxWidth: '480px',
                    maxHeight: '90dvh',
                    display: 'flex',
                    flexDirection: 'column',
                    backgroundColor: '#fff',
                    borderRadius: '1rem',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
                    transformOrigin: 'center bottom',
                    transform: visible
                        ? 'translateY(0) rotateX(0deg) scale(1)'
                        : 'translateY(24px) rotateX(8deg) scale(0.97)',
                    opacity: visible ? 1 : 0,
                    transition: 'transform 380ms cubic-bezier(0.22,1,0.36,1), opacity 260ms ease',
                    willChange: 'transform, opacity',
                }}
            >
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: '#DDE6DE' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full" style={{ backgroundColor: '#F5F5F0' }}>
                            <Mail className="w-5 h-5" style={{ color: '#7F9E95' }} />
                        </div>
                        <h2 className="text-xl font-bold" style={{ color: '#2F3B3A' }}>Contact Us</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full transition-colors hover:opacity-70"
                        style={{ backgroundColor: '#F5F5F0' }}
                    >
                        <X className="w-5 h-5" style={{ color: '#6B7D7A' }} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    <ContactFormContent source={source} onSuccess={handleSuccess} />
                </div>
            </div>
        </div>
    );
}
