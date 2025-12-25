import React, { useEffect, useState } from 'react';
import logo from '../../assets/tpp_logo.png';

export default function WelcomeModal({ open, onClose, onStartTour, theme }) {
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
                className="bg-white rounded-xl shadow-2xl p-6 sm:p-8 max-w-3xl w-full m-4 border animate-fade-in"
                style={{ borderColor: theme.border }}
            >
                {/* Header with Logo */}
                <div className="flex justify-center mb-4">
                    <img src={logo} alt="The Pep Planner Logo" className="h-16 w-16 rounded-full shadow-lg object-cover" />
                </div>

                {!showPricing ? (
                    <>
                        <h1 className="text-2xl sm:text-3xl font-bold mb-3 text-center leading-tight" style={{ color: theme.primaryDark }}>
                            <span className="block">Welcome to</span>
                            <span className="block">The Pep Planner 🥼</span>
                        </h1>
                        
                        {/* Personal intro with free access info */}
                        <div className="text-left space-y-3 mb-5">
                            <p className="text-gray-700 leading-relaxed" style={{ fontSize: '14px' }}>
                                This was built for the pep research community (you!). This isn't your average peptide corporate made app; it's made by a researcher, for researchers.
                            </p>
                            
                            <div className="rounded-lg p-4 sm:p-5" style={{ backgroundColor: '#f3f7f6', border: '2px solid #9bc2bb' }}>
                                <p className="text-gray-800 font-medium mb-2">⌛ 10 Days to Test Drive</p>
                                <p className="text-sm text-gray-700 leading-relaxed">
                                    Take <strong>10 full days</strong> to explore every corner: protocols, calendars, inventory tracking, the works. No credit card, no strings attached. Just see if it works for you.
                                </p>
                            </div>

                            <div className="text-gray-700 leading-relaxed space-y-2" style={{ fontSize: '14px' }}>
                                <p className="font-semibold">After your 10 days researching:</p>
                                <div className="grid sm:grid-cols-3 gap-2">
                                    <div className="flex items-start gap-2">
                                        <span className="text-base">•</span>
                                        <span>Pick the plan that fits — monthly, annual, or lifetime access.</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-base">•</span>
                                        <span>No auto billing if you decide it's not right for your lab.</span>
                                    </div>
                                    <div className="flex items-start gap-2">
                                        <span className="text-base">•</span>
                                        <span>Use every feature freely until you're confident it helps your research.</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                            <button 
                                onClick={onClose}
                                className="px-7 py-2.5 rounded-lg text-base font-semibold text-white shadow-md hover:shadow-lg transition-all" 
                                style={{ backgroundColor: theme.primary }}
                            >
                                Start Researching! 🧪
                            </button>
                            <button 
                                onClick={() => setShowPricing(true)}
                                className="px-6 py-2.5 rounded-lg text-base font-medium text-gray-600 hover:bg-gray-100 transition-all"
                            >
                                Show me pricing first!
                            </button>
                        </div>

                        <p className="text-xs text-gray-500 text-center mt-4">
                            Questions? Feel free to reach out to support! 💬
                        </p>
                    </>
                ) : (
                    <>
                        {/* Pricing overview */}
                        <div className="text-left space-y-3 mb-5">
                            <button 
                                onClick={() => setShowPricing(false)}
                                className="text-sm text-gray-600 hover:text-gray-800 mb-4"
                            >
                                ← Back
                            </button>

                            <div className="flex items-center justify-between flex-wrap gap-1">
                                <h2 className="text-lg sm:text-2xl font-bold" style={{ color: theme.primaryDark }}>
                                    Here's how pricing works:
                                </h2>
                                <p className="text-[11px] text-gray-500">
                                    Decide on the right research after the trial wraps.
                                </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                                <div className="border border-gray-200 rounded-xl p-3 hover:border-gray-300 transition-all h-full text-center shadow-sm hover:shadow-md bg-white">
                                    <p className="font-semibold text-gray-800 text-sm">Monthly</p>
                                    <p className="text-[11px] text-gray-500 mb-1">Most flexible.</p>
                                    <p className="font-bold text-base" style={{ color: theme.primary }}>$3.99/mo</p>
                                </div>

                                <div className="border border-gray-200 rounded-xl p-3 hover:border-gray-300 transition-all h-full text-center shadow-sm hover:shadow-md bg-white relative">
                                    <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                                        <span className="inline-block px-2 py-0.5 text-[10px] font-semibold rounded-full text-white" style={{ backgroundColor: '#c87a5c' }}>
                                            Planner Price
                                        </span>
                                    </div>
                                    <p className="font-semibold text-gray-800 text-sm mt-2">Annual</p>
                                    <p className="text-[11px] text-gray-500 mb-1">Best value.</p>
                                    <p className="font-bold text-base" style={{ color: theme.primary }}>$36.99/yr</p>
                                </div>

                                <div className="border border-gray-200 rounded-xl p-3 relative h-full col-span-2 sm:col-span-1 flex flex-col items-center justify-between text-center shadow-sm hover:shadow-md bg-white">
                                    <p className="font-semibold text-gray-800 text-sm">Lifetime access</p>
                                    <p className="text-[11px] text-gray-600 mb-1">Pay once, keep forever.</p>
                                    <p className="font-bold text-lg" style={{ color: theme.primary }}>$99.99</p>
                                </div>
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4 mt-2">
                                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                                    <strong>🧪 Beta Pricing:</strong> We're actively building with your feedback! These prices reflect our beta status while we work out the kinks. Early adopters who subscribe now keep their rate forever—even after we exit beta. Try it first, see if you love it! 😊
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <button 
                                onClick={onClose}
                                className="px-7 py-2.5 rounded-lg text-base font-semibold text-white shadow-md hover:shadow-lg transition-all" 
                                style={{ backgroundColor: theme.primary }}
                            >
                                Understood! Let's Research 🧪
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
