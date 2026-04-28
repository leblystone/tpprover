import React, { useEffect, useState } from 'react';
import { FlaskConical, ShieldCheck, Unlock, Beaker } from 'lucide-react';
import logo from '../../assets/tpp_logo.png';
import { SUBSCRIPTION_PLANS } from '../../utils/subscriptionPlans';

export default function WelcomeModal({ open, onClose, theme }) {
    const [showPricing, setShowPricing] = useState(false);

    // Set session flag when modal is actually displayed
    useEffect(() => {
        if (open) {
            console.log('🎉 Welcome modal displayed - setting session flag');
            sessionStorage.setItem('tpp_welcome_shown', 'true');
        }
    }, [open]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000]">
            <div
                className="rounded-xl shadow-2xl p-4 sm:p-5 max-w-xl w-full m-4 border animate-fade-in"
                style={{ borderColor: theme.border, backgroundColor: theme.isDark ? '#1f2937' : '#ffffff' }}
            >
                {/* Back button at top when on Research Plans */}
                {showPricing && (
                    <div className="flex justify-start mb-2">
                        <button
                            type="button"
                            onClick={() => setShowPricing(false)}
                            className="text-[12px] transition-colors flex items-center gap-0.5"
                            style={{ color: theme.isDark ? '#9ca3af' : '#9ca3af' }}
                        >
                            ← Back
                        </button>
                    </div>
                )}
                {/* Header with Logo */}
                <div className="flex justify-center mb-2">
                    <img src={logo} alt="The Pep Planner Logo" className="h-10 w-10 rounded-full shadow-md object-cover" />
                </div>

                {!showPricing ? (
                    <div className="text-center">
                        <h1 className="text-xl sm:text-2xl font-black mb-1 leading-tight" style={{ color: theme.primaryDark }}>
                            Welcome to The Pep Planner
                        </h1>
                        
                        <p className="mb-3 text-sm leading-relaxed max-w-md mx-auto" style={{ color: theme.isDark ? '#d1d5db' : '#4b5563' }}>
                            Made by a researcher, for researchers.
                        </p>

                        <div className="relative mb-4 group max-w-lg mx-auto">
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#9bc2bb] to-[#86b0a8] rounded-xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                            <div className="relative rounded-xl p-3 sm:p-4 border-2 border-[#9bc2bb]/20 backdrop-blur-sm" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : 'rgba(243,247,246,0.5)' }}>
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center justify-center gap-2 mb-1.5">
                                        <Beaker className="w-5 h-5" style={{ color: theme.primary }} />
                                        <h3 className="text-base font-semibold tracking-tight" style={{ color: theme.isDark ? '#e5e7eb' : '#1f2937' }}>14 Days of Research<span style={{ color: '#D4A030', fontWeight: 700, fontSize: '1.15em', lineHeight: 1, verticalAlign: 'middle' }}>+</span></h3>
                                    </div>
                                    <p className="max-w-sm mx-auto text-[13px] leading-relaxed" style={{ color: theme.isDark ? '#d1d5db' : '#4b5563' }}>
                                        Organize your research. Protocols, Dosing Schedule, Stockpile Tracking, the works.<br />
                                        Just see if it works for your research.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-4 max-w-lg mx-auto border-t pt-3" style={{ borderColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb' }}>
                            <div className="flex flex-col items-center px-1">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center mb-1.5" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#f3f7f6' }}>
                                    <FlaskConical className="w-5 h-5" style={{ color: theme.primary }} />
                                </div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.isDark ? '#e5e7eb' : '#1f2937' }}>Flexible</p>
                                <p className="text-[9px] mt-0.5" style={{ color: theme.isDark ? '#9ca3af' : '#9ca3af' }}>Month / Annual / Life</p>
                            </div>
                            <div className="flex flex-col items-center px-1 border-x" style={{ borderColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#f3f4f6' }}>
                                <div className="w-9 h-9 rounded-full flex items-center justify-center mb-1.5" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#f3f7f6' }}>
                                    <ShieldCheck className="w-5 h-5" style={{ color: theme.primary }} />
                                </div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.isDark ? '#e5e7eb' : '#1f2937' }}>Zero Pressure</p>
                                <p className="text-[9px] mt-0.5" style={{ color: theme.isDark ? '#9ca3af' : '#9ca3af' }}>No upfront payment</p>
                            </div>
                            <div className="flex flex-col items-center px-1">
                                <div className="w-9 h-9 rounded-full flex items-center justify-center mb-1.5" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : '#f3f7f6' }}>
                                    <Unlock className="w-5 h-5" style={{ color: theme.primary }} />
                                </div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: theme.isDark ? '#e5e7eb' : '#1f2937' }}>Full Access</p>
                                <p className="text-[9px] mt-0.5" style={{ color: theme.isDark ? '#9ca3af' : '#9ca3af' }}>Every research tool</p>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-2.5 justify-center items-center">
                            <button 
                                onClick={onClose}
                                className="w-auto inline-flex items-center justify-center px-7 py-2.5 rounded-lg text-base font-bold text-white shadow-md hover:shadow-lg active:scale-95 transition-all duration-200" 
                                style={{ backgroundColor: theme.primary }}
                            >
                                Start Researching!
                            </button>
                            <button 
                                onClick={() => setShowPricing(true)}
                                className="w-auto inline-flex items-center justify-center px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200"
                                style={{ color: theme.isDark ? '#9ca3af' : '#9ca3af' }}
                            >
                                Show me pricing first!
                            </button>
                        </div>

                        <p className="text-[10px] text-center mt-4" style={{ color: theme.isDark ? '#9ca3af' : '#9ca3af' }}>
                            Questions? Reach out to support!
                        </p>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="mb-4">
                            <h2 className="text-xl sm:text-2xl font-semibold" style={{ color: theme.primaryDark }}>
                                Research Plans
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                            <div className="border border-[#9bc2bb]/20 rounded-xl p-4 hover:border-[#9bc2bb] hover:shadow-md transition-all flex flex-col justify-between shadow-sm" style={{ backgroundColor: theme.isDark ? '#1f2937' : '#f8faf9' }}>
                                <div>
                                    <p className="font-semibold text-sm mb-0.5" style={{ color: theme.isDark ? '#e5e7eb' : '#1f2937' }}>Monthly</p>
                                    <p className="text-[10px] mb-2" style={{ color: theme.isDark ? '#9ca3af' : '#9ca3af' }}>Most flexible</p>
                                </div>
                                <p className="font-semibold text-2xl" style={{ color: theme.primary }}>${SUBSCRIPTION_PLANS.researchPlusMonthly.price}<span className="text-sm font-normal text-gray-400">/mo</span></p>
                            </div>

                            <div className="border-2 border-[#9bc2bb] rounded-xl p-4 hover:shadow-lg transition-all relative flex flex-col justify-between sm:scale-105 shadow-md" style={{ backgroundColor: theme.isDark ? '#1f2937' : '#f3f7f6' }}>
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-full">
                                    <span className="inline-block px-3 py-1 text-[9px] font-semibold rounded-full text-white uppercase tracking-widest shadow-sm" style={{ backgroundColor: '#c87a5c' }}>
                                        Best Value
                                    </span>
                                </div>
                                <div>
                                    <p className="font-semibold text-sm mb-0.5 mt-1.5" style={{ color: theme.isDark ? '#e5e7eb' : '#1f2937' }}>Annual</p>
                                    <p className="text-[10px] mb-2" style={{ color: theme.isDark ? '#9ca3af' : '#9ca3af' }}>~${(SUBSCRIPTION_PLANS.researchPlusAnnual.price / 12).toFixed(2)}/mo</p>
                                </div>
                                <p className="font-semibold text-2xl" style={{ color: theme.primary }}>${SUBSCRIPTION_PLANS.researchPlusAnnual.price}<span className="text-sm font-normal text-gray-400">/yr</span></p>
                            </div>

                            <div className="border border-[#9bc2bb]/20 rounded-xl p-4 hover:border-[#9bc2bb] hover:shadow-md transition-all flex flex-col justify-between shadow-sm" style={{ backgroundColor: theme.isDark ? '#1f2937' : '#f8faf9' }}>
                                <div>
                                    <p className="font-semibold text-sm mb-0.5" style={{ color: theme.isDark ? '#e5e7eb' : '#1f2937' }}>Lifetime</p>
                                    <p className="text-[10px] mb-2" style={{ color: theme.isDark ? '#9ca3af' : '#9ca3af' }}>Pay once, own forever</p>
                                </div>
                                <p className="font-semibold text-2xl" style={{ color: theme.primary }}>${SUBSCRIPTION_PLANS.researchPlusLifetime.price}</p>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <button 
                                onClick={onClose}
                                className="px-10 py-2.5 rounded-lg text-base font-bold text-white shadow-md hover:shadow-lg active:scale-95 transition-all duration-200" 
                                style={{ backgroundColor: theme.primary }}
                            >
                                Let's Research!
                            </button>
                        </div>

                        <p className="text-[10px] text-center mt-4" style={{ color: theme.isDark ? '#9ca3af' : '#9ca3af' }}>
                            Questions? Reach out to support!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
