import React from 'react';
import logo from '../../assets/tpp_logo.png';

export default function SampleDataModal({ open, onClose, onAddSampleData, theme, isLoading }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[10000]">
            <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full m-4 text-center border animate-fade-in" style={{ borderColor: theme.border }}>
                <h1 className="text-3xl font-bold mb-4" style={{ color: theme.primaryDark }}>
                    Add Sample Data
                </h1>
                
                <p className="text-gray-600 mb-6">
                    Add example protocols, orders, and other sample content to help you explore the app features. Your existing data will not be affected.
                </p>

                <div className="flex justify-center mb-6">
                    <img src={logo} alt="The Pep Planner Logo" className="h-20 w-20 rounded-full shadow-lg object-cover" />
                </div>

                <div className="mb-6">
                    <div className="text-sm text-gray-500 mb-4">Sample data includes:</div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                        <div>• Example Protocols</div>
                        <div>• Sample Orders</div>
                        <div>• Mock Vendors</div>
                        <div>• Test Metrics</div>
                        <div>• Sample Notes</div>
                        <div>• Demo Schedules</div>
                    </div>
                </div>

                <div className="flex justify-center gap-3">
                    <button 
                        onClick={onClose}
                        className="px-6 py-3 rounded-md text-base font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={onAddSampleData}
                        disabled={isLoading}
                        className="px-6 py-3 rounded-md text-base font-semibold text-white transition-colors disabled:opacity-50" 
                        style={{ backgroundColor: theme.primary }}
                    >
                        {isLoading ? 'Adding...' : 'Add Sample Data'}
                    </button>
                </div>
            </div>
        </div>
    );
}
