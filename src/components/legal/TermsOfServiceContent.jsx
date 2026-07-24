import React from 'react';

export const TermsOfServiceContent = () => (
    <div className="space-y-4 text-sm text-gray-600">
        <h2 className="text-lg font-bold text-gray-800">Terms of Service</h2>

        <p>The Pep Planner is powered by Belix Company LLC. By using The Pep Planner application ("App," "Service," "we," "us"), you agree to these Terms of Service ("Terms"). Please read them carefully.</p>

        <div className="p-4 bg-red-50 border-2 border-red-300 rounded-md">
            <h3 className="font-bold text-red-800 text-sm">⚠️ CRITICAL: NOT FOR HUMAN USE</h3>
            <p className="text-red-700 font-medium">This application is designed EXCLUSIVELY for research purposes. All peptides and substances tracked in this application are for RESEARCH USE ONLY and are NOT INTENDED FOR HUMAN CONSUMPTION. Any information provided is strictly for educational and research tracking purposes.</p>
        </div>

        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="font-semibold text-yellow-800">1. Research & Educational Purposes Only</h3>
            <p className="text-yellow-700">This application is intended solely for tracking and organizing research data. The information, calculators, and features provided by us are not intended to be, and should not be interpreted as, medical advice. This product is not a substitute for professional medical advice, diagnosis, or treatment. NO MEDICAL ADVICE IS PROVIDED.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">2. No Medical Relationship or Advice</h3>
            <p>Your use of this application does not create a doctor-patient relationship. This application provides NO MEDICAL ADVICE whatsoever. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read or tracked in this application.</p>
            <p className="mt-2">Optional medication and blood/lab value journals, goal tracking, and one-off/as-needed dose logs are personal logs for your records only. The App does not diagnose, treat, cure, or prevent any medical condition; does not interpret lab results; and is not a medical device.</p>
        </div>
        
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <h3 className="font-semibold text-red-800">3. Research Substances & Legal Compliance</h3>
            <p className="text-red-700">You acknowledge that this application may be used to track research substances that are for LABORATORY RESEARCH PURPOSES ONLY. We do not endorse, recommend, or condone the use of any substance for human consumption. You are solely responsible for complying with all applicable laws and regulations regarding any research substances you choose to track. All substances are NOT FOR HUMAN USE.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">4. Subscription Services & Research+ Tier</h3>
            <p>Full continued access to features is available through subscription plans. We offer tiered plans including a free tier and the <strong>Research+ ("Research Plus")</strong> paid subscription tier, which unlocks premium features including enhanced AI query quotas, advanced analytics and insights, community access, and additional tracking capabilities. Subscriptions and one-time purchases may be processed by Stripe (web), Apple Inc.'s App Store (iOS app), Google Play (operated by Google LLC, for Android), or Squarespace (website purchases), as applicable. Subscriptions automatically renew unless cancelled. We reserve the right to modify subscription pricing and features. We will provide you with at least thirty (30) days' notice of any price changes by sending an email to the address associated with your account or by providing an in-app notification.</p>
            <p className="mt-3"><strong>Trial Periods:</strong> Where offered, free trials automatically convert to paid subscriptions at the end of the trial period unless cancelled before the trial ends. You will receive notice before your trial converts.</p>
            <p className="mt-3"><strong>Continued Access After Subscription Ends:</strong> If your Research+ subscription lapses, expires, or is not renewed, we do not lock you out of the application. Your account automatically continues on the free tier so you can access the application and your previously entered data, subject to free-tier limits (such as reduced AI query quotas and feature caps). We do not delete your account or data solely because a subscription ended.</p>
            <p className="mt-3"><strong>Cancellation Policy (incorporated by reference):</strong> By subscribing or purchasing, you agree to our Cancellation Policy. In summary: you may cancel your subscription at any time through your Account or by contacting us at contact@thepepplanner.com; cancellation takes effect at the end of your current billing period and you retain access until then; we do not automatically delete your account or data—deletion only occurs if you request it; we do not provide refunds for unused portions of subscription periods except as required by law; refunds for Apple Inc.'s App Store and Google Play purchases are handled by the respective platform per their policies. The full Cancellation Policy is part of these Terms and available in the app and on our website.</p>
            <p className="mt-3"><strong>Buddy System (Research+):</strong> Where available, the Buddy System allows a Research+ subscriber to label and co-track research data for one additional person within the same account. The Buddy System does not create a separate user account, login, or standalone subscription for the buddy. Advanced analytics, streaks, AI Research quotas, and other premium capabilities apply to the subscribing account holder unless otherwise stated. Buddy-tagged data may be exported by the account holder. We may limit buddy count, features available to buddy-tagged records, or modify Buddy System functionality at any time.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">5. Lifetime Access</h3>
            <p>Lifetime access plans provide unlimited access to all application features for the duration of the application's availability. "Lifetime" is defined as the period during which The Pep Planner application remains operational and accessible to users. Lifetime access purchases are non-refundable and non-transferable. In the event that the application is discontinued or becomes unavailable, lifetime access holders will not be entitled to refunds or compensation. Lifetime access does not guarantee perpetual service availability and is subject to the continued operation of our platform.</p>
        </div>

        <div className="p-3 bg-purple-50 border border-purple-200 rounded-md">
            <h3 className="font-semibold text-purple-800">6. Artificial Intelligence (AI) Features</h3>
            <div className="text-purple-700 space-y-2">
                <p>The application includes AI-powered features ("AI Features"), such as the PiP Research Assistant and the AI Search interface, which are powered by Anthropic's Claude AI model and Google's Gemini AI model (with Google Search used in Research Mode to help verify factual information such as dosing ranges and half-life data). By using any AI Feature, you agree to the following:</p>
                <p><strong>Third-Party AI Processing:</strong> When you submit a query to an AI Feature, your input — along with relevant research context from your account (e.g., active protocols, tracked substances) — is transmitted to Anthropic and/or Google for processing, depending on which AI Feature and mode you use. Personally identifiable information (such as email addresses and phone numbers) is automatically redacted before transmission, but research-related context is included to provide meaningful responses. You should not include sensitive personal information in AI prompts.</p>
                <p><strong>AI Is Not Medical Advice:</strong> All AI-generated responses are for informational and research tracking purposes only. AI responses do not constitute medical advice, diagnosis, or treatment recommendations. Never rely solely on AI output for health or medical decisions.</p>
                <p><strong>Usage Quotas:</strong> AI Features are subject to daily usage quotas that vary by subscription tier. Research+ subscribers receive higher daily query limits than free-tier users. Quotas reset daily. We reserve the right to adjust quota limits.</p>
                <p><strong>Conversation Storage & Research Caching:</strong> Your full AI conversation history is stored locally on your device. However, the text of individual research queries may be temporarily cached on our servers (for a limited period) to speed up and improve the accuracy of similar future queries, and a log of queries (with your account identifier hashed) may be kept for quality monitoring and abuse prevention. See our Privacy Policy for details.</p>
                <p><strong>Accuracy Disclaimer:</strong> AI-generated content may be inaccurate, incomplete, or outdated. You are solely responsible for verifying any information obtained through AI Features before acting on it.</p>
            </div>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">7. Referral Program</h3>
            <p>We may offer a referral program ("Referral Program") that allows existing users to invite others and earn rewards (such as subscription credits or extended access). The following terms apply:</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-gray-600">
                <li>Referral codes are personal and non-transferable.</li>
                <li>Rewards are granted at our sole discretion and are subject to change or cancellation at any time without notice.</li>
                <li>Fraudulent referrals (e.g., self-referrals, fake accounts) will result in reward forfeiture and may result in account termination.</li>
                <li>Referral codes captured via URL are stored locally on your device to attribute sign-ups; by completing registration through a referral link you consent to that attribution being recorded.</li>
                <li>We reserve the right to modify, suspend, or terminate the Referral Program at any time.</li>
            </ul>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">8. Community Features & User-Generated Content</h3>
            <p>The application may include community features ("Community Features") where users can view community discussions, share experiences, and interact with other researchers. Community Features are available to Research+ subscribers. By participating in Community Features, you agree that:</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-gray-600">
                <li>Any content you contribute to community areas may be visible to other users of the application.</li>
                <li>You will not share personal medical information, personally identifiable information of third parties, or content that violates applicable law.</li>
                <li>We reserve the right to moderate, remove, or disable any community content at our sole discretion.</li>
            </ul>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">9. Shareable Cards & Public Content</h3>
            <p>The application allows you to generate shareable cards ("Shareable Cards") containing summaries of your research data (such as analytics, protocol summaries, or research journey highlights) that can be shared via a public link. By generating a Shareable Card, you acknowledge and agree that:</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-gray-600">
                <li>The content of the Shareable Card will be accessible to anyone with the link — including individuals who do not have an account.</li>
                <li>You are solely responsible for determining what information is appropriate to share publicly.</li>
                <li>We do not guarantee the permanent availability of shared links.</li>
                <li>You may revoke or manage your shared cards through the application settings.</li>
            </ul>
        </div>

        <div className="p-3 bg-teal-50 border border-teal-200 rounded-md">
            <h3 className="font-semibold text-teal-800">10. Physical & Digital Products (Shop)</h3>
            <div className="text-teal-700 space-y-2">
                <p>We may sell physical products (such as printed planners and merchandise) and digital products (such as downloadable PDF planners) through our Shop ("Shop Purchases"). Shop Purchases are separate one-time purchases and are not subscriptions.</p>
                <p><strong>Ordering:</strong> You do not need a Pep Planner account to place a Shop order or to redeem a digital download — guest checkout is available. Checkout is processed by Stripe. We collect the information necessary to fulfill your order, including your shipping address (physical products, U.S. only), email address, and, where applicable, phone number and gift message. You may optionally opt in to promotional emails about Shop products at checkout.</p>
                <p><strong>Shipping:</strong> Physical orders typically ship within 3–5 business days (Monday–Friday) via the shipping method selected at checkout. Shipping timelines are estimates and not guaranteed.</p>
                <p><strong>Digital Delivery:</strong> Digital PDF products are delivered via a secure, tokenized download link emailed to you shortly after payment. Download links expire automatically 90 days after purchase or after a maximum of 25 downloads, whichever occurs first. Please save your files locally after downloading.</p>
                <p><strong>Returns, Exchanges & Refunds:</strong> Digital PDF purchases are non-refundable once the download link has been sent. Physical products may qualify for a refund or exchange if unopened or defective, provided you contact us within 14 days of delivery before returning the item. <strong>Personalized/Custom Products:</strong> Orders that include personalization (such as custom cover art or engraving) become non-returnable and non-refundable once submitted for production. Files you submit for personalization must be clear and suitable for the product size selected; we reserve the right to decline any personalization request (e.g., due to poor image quality or inappropriate content).</p>
                <p><strong>Reviews:</strong> We may invite you to submit a product review after a verified purchase. Reviews you submit (including your name, rating, and comments) may be displayed publicly on our Shop pages and marketing materials.</p>
                <p><strong>Waitlist / Notify Me:</strong> If you submit your email to be notified when a sold-out product restocks, we will use that email solely to send you that notification (and any related Shop communications you've opted into).</p>
                <p><strong>Marketplace Listings:</strong> Some Shop products may also be listed for sale on third-party marketplaces (such as Etsy). Purchases made directly through a third-party marketplace are subject to that marketplace's own terms and policies in addition to these Terms.</p>
            </div>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">11. Communications, Notifications & Application Updates</h3>
            <p>By using the Service, you may receive the following types of communications:</p>
            <ul className="list-disc list-inside ml-4 mt-2 space-y-1 text-gray-600">
                <li><strong>Push Notifications:</strong> Optional research schedule reminders (e.g., dose reminders) delivered via push notification. You can disable these at any time in your device or app notification settings.</li>
                <li><strong>Weekly Research Summary Email:</strong> Active users may receive a periodic email summarizing their recent research activity. You may opt out of this email at any time through your account settings.</li>
                <li><strong>Shop Transactional Emails:</strong> Order confirmations, shipping notices, and digital download links are sent as necessary to fulfill your Shop order and are not optional.</li>
                <li><strong>Shop Marketing Emails:</strong> Sent only if you opt in at checkout; you may unsubscribe at any time without affecting transactional emails.</li>
                <li><strong>Account & Security Communications:</strong> Emails such as verification, password reset, and billing/cancellation confirmations are sent as necessary to operate your account and are not optional.</li>
            </ul>
            <p className="mt-2"><strong>Application Updates:</strong> In addition to updates delivered through the Apple Inc. App Store or Google Play, our mobile app may receive updates to its web-based content automatically over the internet ("over-the-air" updates) between app-store releases, delivered through our update provider, so that you receive bug fixes and improvements without needing to manually update through the app store.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">12. User Responsibility & Assumption of Risk</h3>
            <p>You are solely responsible for the information you track and any decisions you make based on that information. You assume all risks associated with your research activities. We are not liable for any outcomes, positive or negative, that may result from your use of this application or any research activities you conduct.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">13. Data & Privacy</h3>
            <p>We take your privacy seriously. To provide a seamless experience across your devices, your data is securely stored and synchronized with our cloud backend. Cloud sync is available across all subscription tiers, including the free tier. We use industry-standard security measures to protect your information. Some data may be temporarily stored on your local device for performance and offline access. For more details, please see our Privacy Policy.</p>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-semibold text-blue-800">14. Research Data Protection & Legal Safeguards</h3>
            <div className="text-blue-700 space-y-2">
                <p><strong>Data Minimization:</strong> We collect and store only the minimum data necessary to provide our research tracking services. We do not collect unnecessary personal information or research data beyond what is required for the application's core functionality.</p>
                
                <p><strong>Purpose Limitation:</strong> Your research data is used solely for providing the services you have requested. We do not use your research data for any other purposes, including marketing, advertising, or data analysis beyond service improvement.</p>
                
                <p><strong>Data Retention Limits:</strong> We retain your research data only as long as necessary to provide our services. You may request deletion of your data at any time, and we will comply with such requests within 30 days, subject to legal obligations.</p>
                
                <p><strong>Limited Access:</strong> Access to your research data is restricted to authorized personnel who require such access to provide technical support or maintain our services.</p>
                
                <p><strong>Legal Challenge Rights:</strong> In the event of any legal request for your data, we will, where legally permissible, provide you with notice and an opportunity to challenge such requests before disclosure.</p>
            </div>
        </div>

        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <h3 className="font-semibold text-green-800">15. Data Security & Legal Compliance Commitments</h3>
            <div className="text-green-700 space-y-2">
                <p><strong>Security Standards:</strong> We maintain industry-standard security measures to protect your research data, including encryption in transit and at rest, secure authentication, and periodic review of our security practices.</p>
                
                <p><strong>Legal Compliance:</strong> We operate in compliance with applicable data protection laws and regulations. We will resist any requests for your data that we believe are not legally valid or properly authorized.</p>
                
                <p><strong>Transparency:</strong> We will provide you with clear information about any data requests we receive and our response to such requests, where legally permitted.</p>
                
                <p><strong>Data Integrity:</strong> We commit to maintaining the integrity and confidentiality of your research data and will not access, use, or disclose it except as necessary to provide our services or as required by law.</p>
                
                <p><strong>User Control:</strong> You maintain full control over your research data and may export, modify, or delete it at any time through the application's features.</p>
            </div>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">16. Changes to Terms</h3>
            <p>We may modify these terms at any time. We will notify you of any changes by posting the new Terms of Service in the application. You are advised to review these Terms of Service periodically for any changes.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">17. Limitation of Liability</h3>
            <p>TO THE FULLEST EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL BELIX COMPANY LLC, ITS AFFILIATES, DIRECTORS, OR EMPLOYEES, BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES, INCLUDING WITHOUT LIMITATION DAMAGES FOR LOSS OF PROFITS, GOODWILL, USE, DATA, OR OTHER INTANGIBLE LOSSES, ARISING OUT OF OR RELATING TO THE USE OF, OR INABILITY TO USE, THIS SERVICE.</p>
            <p>IN NO EVENT SHALL BELIX COMPANY LLC'S AGGREGATE LIABILITY FOR ALL CLAIMS RELATING TO THE SERVICE EXCEED THE GREATER OF ONE HUNDRED U.S. DOLLARS ($100) OR THE AMOUNTS PAID BY YOU TO BELIX COMPANY LLC FOR THE PAST 12 MONTHS OF THE SERVICES IN QUESTION.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">18. Indemnification</h3>
            <p>You agree to defend, indemnify, and hold harmless Belix Company LLC and its licensee and licensors, and their employees, contractors, agents, officers, and directors, from and against any and all claims, damages, obligations, losses, liabilities, costs or debt, and expenses (including but not limited to attorney's fees), resulting from or arising out of a) your use and access of the Service, or b) a breach of these Terms.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">19. Your California Privacy Rights</h3>
            <p>If you are a California resident, you have specific rights under the California Consumer Privacy Act (CCPA). We do not "sell" or "share" your personal information as those terms are defined under the CCPA. California residents have the right to: request information about the categories and specific pieces of personal information we have collected; request deletion of their personal information; and not be discriminated against for exercising their privacy rights. To make a request, please contact us at the email provided below.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">20. Governing Law</h3>
            <p>These Terms shall be governed and construed in accordance with the laws of the State of New Mexico, United States, without regard to its conflict of law provisions. You agree to submit to the personal and exclusive jurisdiction of the state and federal courts located within Socorro County, New Mexico, United States to litigate any such matters.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">21. Termination</h3>
            <p>We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.</p>
        </div>

        <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
            <h3 className="font-semibold text-gray-800">22. Acknowledgment</h3>
            <p className="text-gray-700">By using this application, you acknowledge that you understand this is a research tracking tool and that NO MEDICAL ADVICE is provided. You confirm that you will use this application solely for research purposes and that any substances tracked are NOT FOR HUMAN USE.</p>
        </div>

        <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
                <strong>Last Updated:</strong> July 24, 2026
            </p>
            <p className="text-sm text-gray-600 mt-2">
                If you have any questions about these Terms, please contact Belix Company LLC at contact@thepepplanner.com.
            </p>
        </div>

    </div>
);
