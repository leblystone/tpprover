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
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-2xl w-full m-4 border animate-fade-in" style={{ borderColor: theme.border }}>
                {/* Header with Logo */}
                <div className="flex justify-center mb-4">
                    <img src={logo} alt="The Pep Planner Logo" className="h-16 w-16 rounded-full shadow-lg object-cover" />
                </div>

                <h1 className="text-3xl font-bold mb-4 text-center" style={{ color: theme.primaryDark }}>
                    Welcome to The Pep Planner 🥼
                </h1>
                
                {!showPricing ? (
                    <>
                        {/* Personal intro with free access info */}
                        <div className="text-left space-y-4 mb-6">
                            <p className="text-gray-700" style={{ fontSize: '15px' }}>
                                This was built for the pep research community (you!). This isn't some corporate app - it's made by a researcher, for researchers.
                            </p>
                            
                            <div className="rounded-lg p-4" style={{ backgroundColor: '#f5e6e0', border: '2px solid #c87a5c' }}>
                                <p className="text-gray-800 font-medium mb-2">⌛ 10 Days to Test Drive Everything</p>
                                <p className="text-sm text-gray-700">
                                    Take <strong>10 full days</strong> to explore - protocols, calendars, inventory tracking, the works. No credit card, no strings attached. Just see if it works for you.
                                </p>
                            </div>

                            <p className="text-gray-700" style={{ fontSize: '15px' }}>
                                <strong>What happens after 10 days?</strong><br />
                                If you love it (I hope you do! 🤞), you can choose a plan that works for you - monthly, annual, or a one-time lifetime payment. If it's not your thing, no worries - you won't be charged.
                            </p>

                            <p className="text-gray-700" style={{ fontSize: '15px' }}>
                                Try it out, see if it helps your research (which i hope it does), and then decide. That's it.
                            </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                            <button 
                                onClick={onClose}
                                className="px-8 py-3 rounded-lg text-base font-semibold text-white shadow-md hover:shadow-lg transition-all" 
                                style={{ backgroundColor: theme.primary }}
                            >
                                Start Researching! 🧪
                            </button>
                            <button 
                                onClick={() => setShowPricing(true)}
                                className="px-6 py-3 rounded-lg text-base font-medium text-gray-600 hover:bg-gray-100 transition-all"
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
                        <div className="text-left space-y-4 mb-6">
                            <button 
                                onClick={() => setShowPricing(false)}
                                className="text-sm text-gray-600 hover:text-gray-800 mb-4"
                            >
                                ← Back
                            </button>

                            <h2 className="text-xl font-bold" style={{ color: theme.primaryDark }}>Here's How Pricing Works</h2>
                            
                            <p className="text-gray-700" style={{ fontSize: '15px' }}>
                                After your first 10 days (no charge), you can choose what works for you:
                            </p>

                            <div className="space-y-3">
                                <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-gray-800">Monthly Plan</p>
                                            <p className="text-sm text-gray-600">Flexible, cancel anytime</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-400 line-through">$8.99/mo</p>
                                            <p className="font-bold text-lg" style={{ color: theme.primary }}>$6.74/mo</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold text-gray-800">Annual Plan</p>
                                            <p className="text-sm text-gray-600">Save ~17% vs monthly</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-400 line-through">$89.99/yr</p>
                                            <p className="font-bold text-lg" style={{ color: theme.primary }}>$67.49/yr</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="border-2 rounded-lg p-4 relative" style={{ borderColor: '#c87a5c', backgroundColor: '#f5e6e0' }}>
                                    <div className="absolute -top-3 left-4 text-white text-xs px-3 py-1 rounded-full font-semibold" style={{ backgroundColor: '#c87a5c' }}>
                                        One-time payment • 25% OFF
                                    </div>
                                    <div className="flex justify-between items-start mt-2">
                                        <div>
                                            <p className="font-semibold text-gray-800">Lifetime Access</p>
                                            <p className="text-sm text-gray-600">Pay once, use forever</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-400 line-through">$249.99</p>
                                            <p className="font-bold text-xl" style={{ color: theme.primary }}>$187.49</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                                <p className="text-sm text-gray-700">
                                    <strong>Founders Deal:</strong> For the early supporters I'm offering a limited-time Founder discount as we build. Its our starting rate to compensate the year thats gone into our work! For our founders who choose to use the app consistently, that rate never goes up! In the meantime, try the app first - see if you love it for your research before worrying about pricing! 😊
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-center">
                            <button 
                                onClick={onClose}
                                className="px-8 py-3 rounded-lg text-base font-semibold text-white shadow-md hover:shadow-lg transition-all" 
                                style={{ backgroundColor: theme.primary }}
                            >
                                Understood! - Lets Research🧪
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
