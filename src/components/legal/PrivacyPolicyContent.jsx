import React from 'react';

export const PrivacyPolicyContent = () => (
    <div className="space-y-4 text-sm text-gray-600">
        <h2 className="text-lg font-bold text-gray-800">Privacy Policy</h2>
        
        <p><strong>Last Updated:</strong> April 30, 2026</p>
        <p><strong>Version:</strong> PP-2026-04-30-REV1</p>
        
        <p>The Pep Planner is powered by Belix Company LLC. This Privacy Policy describes how we ("we," "our," or "us") collect, use, and protect your information when you use our research tracking application.</p>

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
                    <li>Side effects logs and observations</li>
                    <li>Body metrics and bio check-in data (weight, measurements, and other metrics you choose to record)</li>
                    <li>Hydration tracking data and streak history</li>
                    <li>Achievement and gamification data (badges earned, streaks, milestones)</li>
                </ul>
                
                <p><strong>Usage Information:</strong></p>
                <ul className="list-disc list-inside ml-4">
                    <li>App usage patterns and feature interactions</li>
                    <li>Device information and browser type</li>
                    <li>Push notification tokens (for optional push notifications)</li>
                    <li>IP address (for security purposes)</li>
                    <li>Error logs and performance data</li>
                    <li>Conversion funnel events (e.g., sign-up, trial start, upgrade actions, AI feature usage) logged via Firebase Analytics and Firestore</li>
                    <li>Feature access events (e.g., when a premium feature gate is encountered)</li>
                </ul>
                
                <p><strong>AI Feature Data:</strong></p>
                <ul className="list-disc list-inside ml-4">
                    <li>AI conversation history (stored locally on your device; not retained on our servers beyond processing)</li>
                    <li>AI library saves (research summaries you save from AI interactions, stored locally)</li>
                    <li>Daily AI query counts (stored locally to enforce per-tier quotas)</li>
                </ul>
                
                <p><strong>Referral & Attribution Data:</strong></p>
                <ul className="list-disc list-inside ml-4">
                    <li>Referral codes you generate or redeem</li>
                    <li>Attribution data captured from referral URLs (stored locally until account creation)</li>
                    <li>Referral reward status</li>
                </ul>
                
                <p><strong>Public / Shared Content:</strong></p>
                <ul className="list-disc list-inside ml-4">
                    <li>Shareable card content (data you explicitly choose to share via a public link, such as analytics summaries or protocol cards)</li>
                </ul>
                
                <p><strong>Support and Communications:</strong></p>
                <ul className="list-disc list-inside ml-4">
                    <li>Support ticket content and in-app support chat messages</li>
                    <li>Contact form submissions (name, email, subject, message)</li>
                    <li>Feedback and survey responses (message, optional email, device/URL context)</li>
                </ul>
                
                <p><strong>Account and Compliance:</strong></p>
                <ul className="list-disc list-inside ml-4">
                    <li>Account deletion requests (we store and process these to fulfill your request and for compliance; we retain minimal records as required by law)</li>
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
                <li>Provide customer support and respond to support tickets and contact form submissions</li>
                <li>Use feedback and survey responses to improve the service</li>
                <li>Provide and operate AI features by routing your queries (after PII scrubbing) to Anthropic for processing</li>
                <li>Track and fulfill referral rewards and attribution</li>
                <li>Analyze conversion funnels to improve subscription and onboarding flows</li>
                <li>Deliver achievement, streak, and gamification features</li>
                <li>Ensure security and prevent fraud</li>
                <li>Comply with legal obligations</li>
            </ul>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">3. Data Storage and Security</h3>
            <div className="space-y-2">
                <p><strong>Local Storage:</strong> To provide offline access and enhance performance, some of your data is temporarily stored on your local device. This includes AI conversation history, AI quota counters, referral attribution codes, and cached application state. This data is protected using the device's native security features and/or application-level encryption.</p>
                
                <p><strong>Cloud Storage:</strong> Your data is securely synchronized with our Firebase cloud backend to enable multi-device access.</p>
                
                <p><strong>Security Measures:</strong></p>
                <ul className="list-disc list-inside ml-4">
                    <li>Industry-standard encryption for data transmission and storage</li>
                    <li>Secure authentication using Firebase Auth, including optional biometric authentication (Face ID, Touch ID, fingerprint) — biometric credentials are handled entirely by your device's operating system and are never transmitted to our servers</li>
                    <li>We periodically review our security practices</li>
                    <li>Access controls and user authentication</li>
                    <li>Secure payment processing through Stripe and applicable platform providers (Apple, applicable app stores, Squarespace)</li>
                </ul>
            </div>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">4. Data Sharing and Third Parties</h3>
            <p>We do not sell, trade, or rent your personal information to third parties. We may share your information only in the following circumstances:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Service Providers:</strong> With trusted third-party services that help us operate our app, including:
                    <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                        <li><strong>Firebase (Google):</strong> Authentication, cloud storage, analytics, and push notifications</li>
                        <li><strong>Stripe:</strong> Payment processing for web subscriptions</li>
                        <li><strong>Anthropic:</strong> AI feature processing — when you use AI features (PiP Research Assistant, AI Search), your queries and relevant research context are transmitted to Anthropic for processing. PII is scrubbed before transmission. Anthropic's privacy policy applies to data processed by their AI models.</li>
                        <li><strong>Apple / App Store platforms:</strong> Payment processing for iOS and applicable mobile app store purchases; their privacy policies apply to that processing</li>
                        <li><strong>Squarespace:</strong> Website purchase processing where applicable</li>
                    </ul>
                </li>
                <li><strong>Publicly Shared Content:</strong> When you generate a Shareable Card and share the link, the content of that card is accessible to any recipient of the link. You control what you share.</li>
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
            <p className="mt-2">
                <strong>Shop promotional emails:</strong> If you opted in to product updates at checkout, you may{' '}
                <a href="/unsubscribe" className="underline text-blue-700">unsubscribe from promotional emails</a>{' '}
                at any time. Order confirmations and shipping notices are not affected.
            </p>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-semibold text-blue-800">7. Enhanced Data Protection for Research Data</h3>
            <div className="text-blue-700 space-y-2">
                <p><strong>Research Data Classification:</strong> We recognize that your research data is particularly sensitive and requires enhanced protection. We treat all research data with the highest level of confidentiality and security.</p>
                
                <p><strong>Purpose Limitation:</strong> Your research data is used exclusively for providing our research tracking services. We do not use this data for any other purposes, including commercial analysis, marketing, or third-party sharing beyond what is necessary for service operation.</p>
                
                <p><strong>Data Minimization:</strong> We collect and retain only the minimum research data necessary to provide our services. We do not collect unnecessary information or retain data longer than required.</p>
                
                <p><strong>Access Controls:</strong> Access to your research data is strictly limited to authorized personnel who require such access for technical support or service maintenance.</p>
                
                <p><strong>Legal Resistance:</strong> We will resist any requests for your research data that we believe are not legally valid or properly authorized. We will challenge overly broad or inappropriate requests to the fullest extent permitted by law.</p>
            </div>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
            <h3 className="font-semibold text-amber-800">8. Data Retention</h3>
            <div className="text-amber-700 space-y-3">
                <p><strong>Agreement Records:</strong> We retain records of your Terms of Service and Privacy Policy acceptances (and the versions you agreed to) for as long as we operate the service.</p>
                
                <p><strong>Account and Research Data:</strong> We retain your account metadata and research data for the life of your account. When you request account deletion, your research data and account content are deleted. Your email address may be retained in our deletion request records so we can process and document your request.</p>
                
                <p><strong>Technical Data:</strong> We retain technical data (such as error logs and usage data) for as long as needed for troubleshooting and service improvement.</p>
                
                <p><strong>Your Deletion Rights:</strong> You may request account deletion at any time. We will process deletion requests and remove your research data and account. As noted above, we may retain your email and related details in deletion request records.</p>
            </div>
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
            <p>We use the following technologies to collect and process usage data:</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                <li><strong>Firebase SDK (Google):</strong> Collects the Usage Information detailed in Section 1, helps us understand how users interact with our Service, diagnose problems, and improve our application.</li>
                <li><strong>Firebase Analytics &amp; Firestore Conversion Funnel:</strong> We log conversion and engagement events (such as sign-up, trial start, upgrade actions, AI feature usage, and feature gate encounters) to both Firebase Analytics (Google Analytics for Firebase) and a user-scoped Firestore collection to enable funnel analysis and improve our onboarding and subscription flows. Google's privacy policy applies to Firebase Analytics data.</li>
                <li><strong>Firebase Remote Config:</strong> We use Firebase Remote Config to remotely manage feature flags and application configuration. This allows us to enable or adjust features without requiring an app update. Remote Config may fetch your user segment or subscription tier to determine which flags apply.</li>
                <li><strong>Google reCAPTCHA:</strong> Used on contact and sign-in forms for fraud prevention. Google may collect IP and usage data in connection with reCAPTCHA — Google's privacy policy applies to that processing.</li>
            </ul>
            <p className="mt-2">You can typically control the use of certain tracking technologies through your device or app settings.</p>
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
