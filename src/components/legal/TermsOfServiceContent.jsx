import React from 'react';

export const TermsOfServiceContent = () => (
    <div className="space-y-4 text-sm text-gray-600">
        <h2 className="text-lg font-bold text-gray-800">Terms of Service</h2>

        <p>Welcome to The Pep Planner. By using our application, you agree to these Terms of Service. Please read them carefully.</p>

        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="font-semibold text-yellow-800">1. For Research & Informational Purposes Only</h3>
            <p className="text-yellow-700">This application is intended solely for tracking and organizing personal research data. The information you input and the features provided are not intended to be, and should not be interpreted as, medical advice. This product is not a substitute for professional medical advice, diagnosis, or treatment.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">2. No Medical Relationship</h3>
            <p>Your use of this application does not create a doctor-patient relationship. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read or tracked in this application.</p>
        </div>
        
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <h3 className="font-semibold text-red-800">3. Regarding "Grey Market" Peptides</h3>
            <p className="text-red-700">You acknowledge that this application may be used to track substances that are not prescribed by a medical professional and may be considered "grey market" products. We do not endorse or condone the use of any substance for non-research purposes. You are solely responsible for complying with all applicable laws and regulations regarding any substances you choose to research and track.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">4. User Responsibility & Assumption of Risk</h3>
            <p>You are solely responsible for the information you track and any decisions you make based on that information. You assume all risks associated with your research. We are not liable for any outcomes, positive or negative, that may result from your use of this application.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">5. Data & Privacy</h3>
            <p>We take your privacy seriously. To provide a seamless experience across your devices, your data is securely stored and synchronized with our cloud backend. We use industry-standard security measures to protect your information. Some data may be temporarily stored on your local device for performance and offline access. For more details, please see our Privacy Policy.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">6. Changes to Terms</h3>
            <p>We may modify these terms at any time. We will notify you of any changes by posting the new Terms of Service in the application. You are advised to review these Terms of Service periodically for any changes.</p>
        </div>

        <p className="pt-2 border-t border-gray-200">By clicking "I Agree," you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.</p>
    </div>
);
