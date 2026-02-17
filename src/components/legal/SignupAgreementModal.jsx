import React, { useState, useRef, useEffect } from 'react';
import { X, CheckCircle, FileText, Shield } from 'lucide-react';
import { TermsOfServiceContent } from './TermsOfServiceContent';
import { PrivacyPolicyContent } from './PrivacyPolicyContent';
import ModernTooltip from '../ui/ModernTooltip';

export default function SignupAgreementModal({ open, onAccept, onClose, theme }) {
    const [currentTab, setCurrentTab] = useState('terms');
    const [scrolledToBottom, setScrolledToBottom] = useState({ terms: false, privacy: false });
    const termsRef = useRef(null);
    const privacyRef = useRef(null);

    useEffect(() => {
        if (open) {
            setCurrentTab('terms');
            setScrolledToBottom({ terms: false, privacy: false });
        }
    }, [open]);

    useEffect(() => {
        const handleScroll = () => {
            const element = currentTab === 'terms' ? termsRef.current : privacyRef.current;
            if (element) {
                const { scrollTop, scrollHeight, clientHeight } = element;
                // More precise bottom detection - user must scroll within 10px of the actual bottom
                const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
                setScrolledToBottom(prev => ({
                    ...prev,
                    [currentTab]: isAtBottom
                }));
            }
        };

        const element = currentTab === 'terms' ? termsRef.current : privacyRef.current;
        if (element) {
            element.addEventListener('scroll', handleScroll);
            // Check initial state - if content is short and fits in viewport, mark as scrolled
            setTimeout(() => {
                const { scrollTop, scrollHeight, clientHeight } = element;
                const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
                setScrolledToBottom(prev => ({
                    ...prev,
                    [currentTab]: isAtBottom
                }));
            }, 100);
            return () => element.removeEventListener('scroll', handleScroll);
        }
    }, [currentTab]);

    const canProceed = scrolledToBottom.terms && scrolledToBottom.privacy;

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black bg-opacity-75"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col" style={{ backgroundColor: theme?.isDark ? '#1f2937' : '#ffffff' }}>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme?.isDark ? 'rgba(255,255,255,0.08)' : '#DDE6DE' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full" style={{ backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.06)' : '#F5F5F0' }}>
                            <FileText className="w-6 h-6" style={{ color: theme?.primary || '#7F9E95' }} />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold" style={{ color: theme?.text || '#2F3B3A' }}>Agreement Required</h2>
                            <p className="text-sm" style={{ color: theme?.textLight || '#6B7D7A' }}>Please read and agree to our terms before creating your account</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full transition-colors hover:opacity-70"
                        style={{ backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.06)' : '#F5F5F0' }}
                    >
                        <X className="w-5 h-5" style={{ color: theme?.textLight || '#6B7D7A' }} />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b" style={{ borderColor: theme?.isDark ? 'rgba(255,255,255,0.08)' : '#DDE6DE' }}>
                    <button
                        className={`flex-1 px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium transition-colors ${
                            currentTab === 'terms' 
                                ? 'border-b-2' 
                                : 'hover:opacity-70'
                        }`}
                        style={currentTab === 'terms' 
                            ? { 
                                color: theme?.primary || '#7F9E95', 
                                borderBottomColor: theme?.primary || '#7F9E95', 
                                backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.04)' : '#F5F5F0' 
                            } 
                            : { color: theme?.textLight || '#6B7D7A' }
                        }
                        onClick={() => setCurrentTab('terms')}
                    >
                        <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-nowrap whitespace-nowrap">
                            <FileText className="w-4 h-4 flex-shrink-0" />
                            <span className="hidden sm:inline">Terms of Service</span>
                            <span className="sm:hidden">Terms</span>
                            {scrolledToBottom.terms && <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#5FAF8B' }} />}
                        </div>
                    </button>
                    <button
                        className={`flex-1 px-3 sm:px-6 py-3 text-xs sm:text-sm font-medium transition-colors ${
                            currentTab === 'privacy' 
                                ? 'border-b-2' 
                                : 'hover:opacity-70'
                        }`}
                        style={currentTab === 'privacy' 
                            ? { 
                                color: theme?.primary || '#7F9E95', 
                                borderBottomColor: theme?.primary || '#7F9E95', 
                                backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.04)' : '#F5F5F0' 
                            } 
                            : { color: theme?.textLight || '#6B7D7A' }
                        }
                        onClick={() => setCurrentTab('privacy')}
                    >
                        <div className="flex items-center justify-center gap-1.5 sm:gap-2 flex-nowrap whitespace-nowrap">
                            <Shield 
                                className={`w-4 h-4 flex-shrink-0 ${
                                    scrolledToBottom.terms && !scrolledToBottom.privacy 
                                        ? 'animate-pulse' 
                                        : ''
                                }`} 
                            />
                            <span className="hidden sm:inline">Privacy Policy</span>
                            <span className="sm:hidden">Privacy</span>
                            {scrolledToBottom.privacy && <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#5FAF8B' }} />}
                        </div>
                    </button>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-hidden relative">
                    {currentTab === 'terms' && (
                        <div 
                            ref={termsRef}
                            className="h-full overflow-y-auto p-6"
                            style={{ maxHeight: '400px' }}
                        >
                            <TermsOfServiceContent />
                            <div className="h-4"></div> {/* Extra space at bottom */}
                        </div>
                    )}
                    {currentTab === 'privacy' && (
                        <div 
                            ref={privacyRef}
                            className="h-full overflow-y-auto p-6"
                            style={{ maxHeight: '400px' }}
                        >
                            <PrivacyPolicyContent />
                            <div className="h-4"></div> {/* Extra space at bottom */}
                        </div>
                    )}
                    
                    {/* Scroll indicator */}
                    {currentTab === 'terms' && !scrolledToBottom.terms && (
                        <div className="absolute bottom-4 right-4">
                            <ModernTooltip text="Scroll down" position="left">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110" style={{ backgroundColor: '#7F9E95' }}>
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                    </svg>
                                </div>
                            </ModernTooltip>
                        </div>
                    )}
                    {currentTab === 'privacy' && !scrolledToBottom.privacy && (
                        <div className="absolute bottom-4 right-4">
                            <ModernTooltip text="Scroll down" position="left">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer transition-all hover:scale-110" style={{ backgroundColor: '#7F9E95' }}>
                                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                    </svg>
                                </div>
                            </ModernTooltip>
                        </div>
                    )}
                </div>
                
                {/* Footer */}
                <div className="p-6 border-t" style={{ borderColor: theme?.isDark ? 'rgba(255,255,255,0.08)' : '#DDE6DE', backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.03)' : '#F5F5F0' }}>
                    <div className="flex flex-col gap-4">
                        {/* Status text row */}
                        <div className="text-sm text-center" style={{ color: theme?.textLight || '#6B7D7A' }}>
                            {!canProceed && (
                                <p>Please scroll through both documents completely to proceed</p>
                            )}
                            {canProceed && (
                                <p className="font-medium" style={{ color: theme?.success || '#5FAF8B' }}>✓ Ready to proceed</p>
                            )}
                        </div>
                        
                        {/* Buttons row - two column grid */}
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 rounded-lg transition-colors hover:opacity-70"
                                style={{ color: theme?.textLight || '#6B7D7A', backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.08)' : '#E8EDEB' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onAccept}
                                disabled={!canProceed}
                                className={`px-4 py-2 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                                    canProceed 
                                        ? 'hover:opacity-90' 
                                        : 'cursor-not-allowed'
                                }`}
                                style={canProceed 
                                    ? { backgroundColor: theme?.primary || '#7F9E95', color: theme?.textOnPrimary || '#FFFFFF' } 
                                    : { backgroundColor: theme?.isDark ? 'rgba(255,255,255,0.1)' : '#B0C4BF', color: theme?.textLight || '#6B7D7A' }
                                }
                            >
                                I Agree
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
