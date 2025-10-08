import React from 'react';
import logo from '../../assets/tpp-logo.png';

export default function WelcomeModal({ open, onClose, onStartTour, theme }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000]">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full m-4 text-center border animate-fade-in" style={{ borderColor: theme.border }}>
                <h1 className="text-3xl font-bold mb-4" style={{ color: theme.primaryDark }}>
                    Welcome to The Pep Planner!
                </h1>
                
                <p className="text-gray-600 mb-6">
                    The Pep Planner helps organize, track, and ultimately make your research easier! Developed with the pep community in mind; it's the cornerstone tool you need. Take the next 7 days and take a look around! Happy researching! 🧪
                </p>

                <div className="flex justify-center mb-6">
                    <img src={logo} alt="The Pep Planner Logo" className="h-20 w-20 rounded-full shadow-lg object-cover" />
                </div>

                <div className="flex justify-center">
                    <button 
                        onClick={onClose}
                        className="px-6 py-3 rounded-md text-base font-semibold text-white" 
                        style={{ backgroundColor: theme.primary }}
                    >
                        Get Started
                    </button>
                </div>
            </div>
        </div>
    );
}
