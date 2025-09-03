import React from 'react';
import logo from '../../assets/tpp-logo.png';
import { Rocket, X } from 'lucide-react';

export default function WelcomeModal({ open, onClose, onStartTour, theme }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000]">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full m-4 text-center border animate-fade-in" style={{ borderColor: theme.border }}>
                <h1 className="text-3xl font-bold mb-4" style={{ color: theme.primaryDark }}>
                    Welcome to The Pep Planner!
                </h1>
                
                <p className="text-gray-600 mb-6">
                    Thank you for joining our beta testing! The app will remain open for you from <b>September 6th - September 13th</b>. Feedback will be requested at the end of your trial testing. Once again, I appreciate your time! I hope you enjoy The Pep Planner.✌️
                </p>

                <div className="flex justify-center mb-6">
                    <img src={logo} alt="The Pep Planner Logo" className="h-20 w-20 rounded-full shadow-lg object-cover" />
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                        onClick={onStartTour}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-base font-semibold text-white" 
                        style={{ backgroundColor: theme.primary }}
                    >
                        <Rocket size={18} />
                        Start Guided Tour
                    </button>
                    <button 
                        onClick={onClose}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-md text-base font-semibold bg-gray-100"
                        style={{ color: theme.text, borderColor: theme.border }}
                    >
                         <X size={18} />
                        Skip For Now
                    </button>
                </div>
            </div>
        </div>
    );
}
