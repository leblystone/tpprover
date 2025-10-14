import React from 'react';

export const PrivacyPolicyContent = () => (
    <div className="space-y-4 text-sm text-gray-600">
        <h2 className="text-lg font-bold text-gray-800">Privacy Policy</h2>
        
        <p><strong>Last Updated:</strong> {new Date().toLocaleDateString()}</p>
        
        <p>This Privacy Policy describes how The Pep Planner ("we," "our," or "us") collects, uses, and protects your information when you use our research tracking application.</p>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-semibold text-blue-800">1. Information We Collect</h3>
            <div className="text-blue-700 space-y-2">
                <p><strong>Account Information:</strong></p>
                <ul className="list-disc list-inside ml-4">
                    <li>Email address (for authentication and account management)</li>
                    <li>Password (encrypted and securely stored)</li>
                    <li>User preferences and settings</li>
                </ul>
                
                <p><strong>Research Data:</strong></p>
                <ul className="list-disc list-inside ml-4">
                    <li>Protocol information and schedules</li>
                    <li>Research substance tracking data</li>
                    <li>Vendor and supplier information</li>
                    <li>Order history and tracking</li>
                    <li>Stockpile and inventory data</li>
                    <li>Research notes and observations</li>
                    <li>Calendar entries and reminders</li>
                    <li>Supplement and compliance tracking</li>
                </ul>
                
                <p><strong>Usage Information:</strong></p>
                <ul className="list-disc list-inside ml-4">
                    <li>App usage patterns and feature interactions</li>
                    <li>Device information and browser type</li>
                    <li>IP address (for security purposes)</li>
                    <li>Error logs and performance data</li>
                </ul>
            </div>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">2. How We Use Your Information</h3>
            <p>We use your information to:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Provide and maintain our research tracking services</li>
                <li>Sync your data across multiple devices</li>
                <li>Process subscription payments and manage your account</li>
                <li>Send important notifications about your account and research</li>
                <li>Improve our application features and user experience</li>
                <li>Provide customer support</li>
                <li>Ensure security and prevent fraud</li>
                <li>Comply with legal obligations</li>
            </ul>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">3. Data Storage and Security</h3>
            <div className="space-y-2">
                <p><strong>Local Storage:</strong> To provide offline access and enhance performance, some of your data is temporarily stored on your local device. This data is protected using the device's native security features and/or application-level encryption.</p>
                
                <p><strong>Cloud Storage:</strong> Your data is securely synchronized with our Firebase cloud backend to enable multi-device access.</p>
                
                <p><strong>Security Measures:</strong></p>
                <ul className="list-disc list-inside ml-4">
                    <li>Industry-standard encryption for data transmission and storage</li>
                    <li>Secure authentication using Firebase Auth</li>
                    <li>Regular security audits and updates</li>
                    <li>Access controls and user authentication</li>
                    <li>Secure payment processing through Stripe</li>
                </ul>
            </div>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">4. Data Sharing and Third Parties</h3>
            <p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Service Providers:</strong> With trusted third-party services that help us operate our app (Firebase, Stripe for payments)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights and safety</li>
                <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets</li>
                <li><strong>Consent:</strong> When you explicitly consent to sharing your information</li>
            </ul>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">5. Law Enforcement Requests and Compelled Disclosure</h3>
            <p>We are committed to protecting the privacy of your research data. We will not disclose your data to law enforcement or any third party except in response to a valid and legally binding demand, such as a subpoena, court order, or search warrant.</p>
            <p>Our policy is as follows:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li>We will scrutinize all government and law enforcement requests to ensure they are legally valid and comply with all applicable laws.</li>
                <li>We will interpret requests as narrowly as possible and will not disclose any data beyond what is legally required.</li>
                <li>Where permitted by law, we will provide you with prior notice of a request for your data to give you an opportunity to challenge it. We may be prohibited from providing notice in certain circumstances, such as by a gag order issued by a court.</li>
                <li>By using this service, you acknowledge that we may be compelled to disclose your information if we receive a legally binding request from a government or law enforcement authority.</li>
            </ul>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">6. Your Privacy Rights</h3>
            <p>You have the following rights regarding your personal information:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal data</li>
                <li><strong>Portability:</strong> Export your research data</li>
                <li><strong>Restriction:</strong> Limit how we process your information</li>
                <li><strong>Objection:</strong> Object to certain processing activities</li>
            </ul>
            <p className="mt-2">To exercise these rights, contact us at the information provided below.</p>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-semibold text-blue-800">7. Enhanced Data Protection for Research Data</h3>
            <div className="text-blue-700 space-y-2">
                <p><strong>Research Data Classification:</strong> We recognize that your research data is particularly sensitive and requires enhanced protection. We treat all research data with the highest level of confidentiality and security.</p>
                
                <p><strong>Purpose Limitation:</strong> Your research data is used exclusively for providing our research tracking services. We do not use this data for any other purposes, including commercial analysis, marketing, or third-party sharing beyond what is necessary for service operation.</p>
                
                <p><strong>Data Minimization:</strong> We collect and retain only the minimum research data necessary to provide our services. We do not collect unnecessary information or retain data longer than required.</p>
                
                <p><strong>Access Controls:</strong> Access to your research data is strictly limited to authorized personnel who require such access for technical support or service maintenance. All access is logged and monitored.</p>
                
                <p><strong>Legal Resistance:</strong> We will resist any requests for your research data that we believe are not legally valid or properly authorized. We will challenge overly broad or inappropriate requests to the fullest extent permitted by law.</p>
            </div>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">8. Data Retention</h3>
            <p>We retain your information for as long as your account is active or as needed to provide services. Research data is retained to maintain your research history and enable data recovery. You may delete your account and associated data at any time through the app settings.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">9. International Data Transfers</h3>
            <p>Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your information in accordance with this Privacy Policy.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">10. Children's Privacy</h3>
            <p>Our application is not intended for use by individuals under 18 years of age. We do not knowingly collect personal information from children under 18.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">11. Tracking Technologies</h3>
            <p>We use technologies, such as the Firebase SDK, to collect the Usage Information detailed in Section 1. These tools help us understand how users interact with our Service, diagnose problems, and improve our application. You can typically control the use of certain tracking technologies through your device settings.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">12. Changes to This Privacy Policy</h3>
            <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy in the application and updating the "Last Updated" date. For any material changes, we will provide a more prominent notice, such as through an in-app notification or by sending an email to the address associated with your account. Your continued use of the application after such changes constitutes acceptance of the updated Privacy Policy.</p>
        </div>

        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <h3 className="font-semibold text-gray-800">13. Contact Information</h3>
            <p className="text-gray-700">
                If you have any questions about this Privacy Policy or our privacy practices, please contact us at:
            </p>
            <ul className="list-none mt-2 text-gray-700">
                <li><strong>Email:</strong> contact@thepepplanner.com</li>
                <li><strong>Subject Line:</strong> Privacy Policy Inquiry</li>
            </ul>
        </div>

        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="font-semibold text-yellow-800">Important Notice</h3>
            <p className="text-yellow-700">
                This application is designed for research tracking purposes only. All substances and information tracked are for RESEARCH USE ONLY and are NOT INTENDED FOR HUMAN CONSUMPTION. Please review our Terms of Service for additional important information about the intended use of this application.
            </p>
        </div>
    </div>
);
