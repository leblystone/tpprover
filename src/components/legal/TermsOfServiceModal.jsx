import React, { useState, useRef, useEffect } from 'react';
import Modal from '../common/Modal';
import { TermsOfServiceContent } from './TermsOfServiceContent';

export default function TermsOfServiceModal({ open, onClose, onAgree, theme }) {
    const [scrolledToBottom, setScrolledToBottom] = useState(false);
    const contentRef = useRef(null);

    const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = contentRef.current;
        if (scrollTop + clientHeight >= scrollHeight - 10) { // -10px buffer
            setScrolledToBottom(true);
        }
    };

    useEffect(() => {
        if (open) {
            setScrolledToBottom(false);
            // Check if already at bottom on open (for short content)
            setTimeout(() => {
                if (contentRef.current && contentRef.current.scrollHeight <= contentRef.current.clientHeight) {
                    setScrolledToBottom(true);
                }
            }, 100);
        }
    }, [open]);

    return (
        <Modal
            open={open}
            onClose={onClose}
            title="Terms of Service"
            theme={theme}
            maxWidth="max-w-3xl"
            footer={
                <div className="flex items-center w-full">
                    <button onClick={onClose} className="text-sm font-medium" style={{ color: theme.textLight || theme.text, background: 'none', border: 'none', padding: 0 }}>{onAgree ? 'Cancel' : 'Close'}</button>
                    {onAgree && (
                        <button 
                            onClick={onAgree} 
                            disabled={!scrolledToBottom}
                            className="ml-auto px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50" 
                            style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
                        >
                            I Agree
                        </button>
                    )}
                </div>
            }
        >
            <div 
                ref={contentRef}
                onScroll={handleScroll}
                className="max-h-[60vh] overflow-y-auto pr-4"
            >
                <TermsOfServiceContent />
            </div>
        </Modal>
    );
}
