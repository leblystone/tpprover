import React, { useState, useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { TermsOfServiceContent } from './TermsOfServiceContent';

export default function LandingTermsModal({ open, onClose }) {
    const [scrolledToBottom, setScrolledToBottom] = useState(false);
    const contentRef = useRef(null);

    const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 10) {
            setScrolledToBottom(true);
        }
    };

    useEffect(() => {
        if (open) {
            setScrolledToBottom(false);
            setTimeout(() => {
                if (contentRef.current && contentRef.current.scrollHeight <= contentRef.current.clientHeight) {
                    setScrolledToBottom(true);
                }
            }, 100);
        }
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black bg-opacity-50"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-900">Terms of Service</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                
                {/* Content */}
                <div 
                    ref={contentRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-6"
                >
                    <TermsOfServiceContent />
                </div>
                
                {/* Footer */}
                <div className="p-6 border-t border-gray-200">
                    <div className="flex justify-end gap-3">
                        <button 
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
