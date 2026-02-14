import React, { useEffect, useState } from 'react';
import { Timer, FlaskConical, ShieldCheck, Unlock } from 'lucide-react';
import logo from '../../assets/tpp_logo.png';

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
                className="bg-white rounded-xl shadow-2xl p-4 sm:p-5 max-w-xl w-full m-4 border animate-fade-in"
                style={{ borderColor: theme.border }}
            >
                {/* Back button at top when on Research Plans */}
                {showPricing && (
                    <div className="flex justify-start mb-2">
                        <button
                            type="button"
                            onClick={() => setShowPricing(false)}
                            className="text-[12px] text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-0.5"
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
                        
                        <p className="text-gray-600 mb-3 text-sm leading-relaxed max-w-md mx-auto">
                            Made by a researcher, for researchers.
                        </p>

                        <div className="relative mb-4 group max-w-lg mx-auto">
                            <div className="absolute -inset-1 bg-gradient-to-r from-[#9bc2bb] to-[#86b0a8] rounded-xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                            <div className="relative rounded-xl p-3 sm:p-4 border-2 border-[#9bc2bb]/20 bg-[#f3f7f6]/50 backdrop-blur-sm">
                                <div className="flex flex-col items-center">
                                    <div className="flex items-center justify-center gap-2 mb-1.5">
                                        <Timer className="w-5 h-5" style={{ color: theme.primary }} />
                                        <h3 className="text-base font-bold text-gray-800 tracking-tight">30 Days to Test Drive</h3>
                                    </div>
                                    <p className="text-gray-600 max-w-sm mx-auto text-[13px] leading-relaxed">
                                        Take <strong>30 full days</strong> to explore every corner: protocols, calendars, inventory tracking, the works. No inital payment, no strings.<br />
                                        Just see if it works for you.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mb-4 max-w-lg mx-auto border-t border-gray-50 pt-3">
                            <div className="flex flex-col items-center px-1">
                                <div className="w-9 h-9 rounded-full bg-[#f3f7f6] flex items-center justify-center mb-1.5">
                                    <FlaskConical className="w-5 h-5" style={{ color: theme.primary }} />
                                </div>
                                <p className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">Flexible</p>
                                <p className="text-[9px] text-gray-400 mt-0.5">Month / Annual / Life</p>
                            </div>
                            <div className="flex flex-col items-center px-1 border-x border-gray-100">
                                <div className="w-9 h-9 rounded-full bg-[#f3f7f6] flex items-center justify-center mb-1.5">
                                    <ShieldCheck className="w-5 h-5" style={{ color: theme.primary }} />
                                </div>
                                <p className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">Zero Pressure</p>
                                <p className="text-[9px] text-gray-400 mt-0.5">No upfront payment</p>
                            </div>
                            <div className="flex flex-col items-center px-1">
                                <div className="w-9 h-9 rounded-full bg-[#f3f7f6] flex items-center justify-center mb-1.5">
                                    <Unlock className="w-5 h-5" style={{ color: theme.primary }} />
                                </div>
                                <p className="text-[10px] font-bold text-gray-800 uppercase tracking-wider">Full Access</p>
                                <p className="text-[9px] text-gray-400 mt-0.5">Every research tool</p>
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
                                className="w-auto inline-flex items-center justify-center px-5 py-2 rounded-lg text-sm font-semibold text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-all duration-200"
                            >
                                Show me pricing first!
                            </button>
                        </div>

                        <p className="text-[10px] text-gray-400 text-center mt-4">
                            Questions? Reach out to support!
                        </p>
                    </div>
                ) : (
                    <div className="text-center">
                        <div className="mb-4">
                            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: theme.primaryDark }}>
                                Research Plans
                            </h2>
                            <p className="text-sm text-gray-500 mt-1">Plans available once your 30 day run is done.</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
                            <div className="border border-[#9bc2bb]/20 rounded-xl p-4 hover:border-[#9bc2bb] hover:shadow-md transition-all bg-[#f8faf9] flex flex-col justify-between shadow-sm">
                                <div>
                                    <p className="font-bold text-gray-800 text-sm mb-0.5">Monthly</p>
                                    <p className="text-[10px] text-gray-400 mb-2">Most flexible</p>
                                </div>
                                <p className="font-semibold text-2xl" style={{ color: theme.primary }}>$3.99<span className="text-sm font-normal text-gray-400">/mo</span></p>
                            </div>

                            <div className="border-2 border-[#9bc2bb] rounded-xl p-4 hover:shadow-lg transition-all bg-[#f3f7f6] relative flex flex-col justify-between sm:scale-105 shadow-md">
                                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-full">
                                    <span className="inline-block px-3 py-1 text-[9px] font-bold rounded-full text-white uppercase tracking-widest shadow-sm" style={{ backgroundColor: '#c87a5c' }}>
                                        Best Value
                                    </span>
                                </div>
                                <div>
                                    <p className="font-bold text-gray-800 text-sm mb-0.5 mt-1.5">Annual</p>
                                    <p className="text-[10px] text-gray-400 mb-2">Planner price</p>
                                </div>
                                <p className="font-semibold text-2xl" style={{ color: theme.primary }}>$36.99<span className="text-sm font-normal text-gray-400">/yr</span></p>
                            </div>

                            <div className="border border-[#9bc2bb]/20 rounded-xl p-4 hover:border-[#9bc2bb] hover:shadow-md transition-all bg-[#f8faf9] flex flex-col justify-between shadow-sm">
                                <div>
                                    <p className="font-bold text-gray-800 text-sm mb-0.5">Lifetime</p>
                                    <p className="text-[10px] text-gray-400 mb-2">Pay once</p>
                                </div>
                                <p className="font-semibold text-2xl" style={{ color: theme.primary }}>$99.99</p>
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

                        <p className="text-[10px] text-gray-400 text-center mt-4">
                            Questions? Reach out to support!
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
