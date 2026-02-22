import React from 'react';
import { X, Mail } from 'lucide-react';
import ContactFormContent from '../common/ContactFormContent';

export default function LandingContactModal({ open, onClose, source = 'landing' }) {
    if (!open) return null;

    const handleSuccess = () => {
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
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
