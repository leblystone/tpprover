import React from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { recordAgreement, AGREEMENT_TYPES } from '../../services/agreementTracking';
import { useFirebase } from '../../context/FirebaseContext';

export default function FirstLaunchDisclaimer({ open, onAccept }) {
    const { firebaseUser } = useFirebase();
    
    if (!open) return null;

    const handleAccept = async () => {
        try {
            // Record the agreement
            await recordAgreement(
                AGREEMENT_TYPES.FIRST_LAUNCH_DISCLAIMER,
                null,
                {
                    disclaimerText: 'NOT FOR HUMAN USE - NO MEDICAL ADVICE',
                    version: '2025-01-01-v1'
                },
                firebaseUser?.email || null
            );
            
            // Call the original onAccept
            onAccept();
        } catch (error) {
            console.error('Error recording agreement:', error);
            // Still call onAccept even if recording fails
            onAccept();
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] flex flex-col border-4 border-red-500">
                {/* Header with Warning Icon */}
                <div className="bg-red-500 text-white p-6 rounded-t-lg">
                    <div className="flex items-center justify-center gap-3">
                        <AlertTriangle className="w-8 h-8" />
                        <h2 className="text-xl font-bold">IMPORTANT ACKNOWLEDGMENT</h2>
                    </div>
                </div>
                
                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-4">
                            This application is a research tool. It is NOT for human use.
                        </h3>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                            <p className="text-red-800 font-semibold text-center">
                                All peptides and substances tracked are for LABORATORY RESEARCH PURPOSES ONLY and are NOT FOR HUMAN CONSUMPTION.
                            </p>
                        </div>

                        <div className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-lg">
                            <p className="text-yellow-800 font-semibold text-center">
                                This application provides NO MEDICAL ADVICE.
                            </p>
                        </div>

                        <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                            <p className="text-gray-700 text-center">
                                By proceeding, you acknowledge and confirm you understand these terms.
                            </p>
                        </div>
                    </div>
                </div>
                
                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={handleAccept}
                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg transition-colors duration-200 text-lg"
                    >
                        I Understand and Agree
                    </button>
                    <p className="text-xs text-gray-500 text-center mt-3">
                        You must acknowledge these terms to use this application
                    </p>
                </div>
            </div>
        </div>
    );
}
