import React from 'react';

export const CancellationPolicyContent = () => (
    <div className="space-y-4 text-sm text-gray-600">
        <h2 className="text-lg font-bold text-gray-800">Cancellation Policy</h2>

        <p>The Pep Planner is powered by Belix Company LLC. This Cancellation Policy describes how you can cancel your subscription to The Pep Planner ("Service," "we," "us") and what happens when you cancel.</p>

        <div>
            <h3 className="font-semibold text-gray-800">1. How to Cancel Your Subscription</h3>
            <p>You may cancel your subscription at any time through the following methods:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Account:</strong> Navigate to your Account within the application and select "Cancel Subscription" from your subscription management page.</li>
                <li><strong>Email Request:</strong> Send an email to contact@thepepplanner.com with your account email address and a request to cancel your subscription.</li>
                <li><strong>Customer Support:</strong> Contact our customer support team through the in-app support feature or via email.</li>
            </ul>
            <p className="mt-2">Once you initiate cancellation, you will receive a confirmation email within 24 hours confirming that your cancellation request has been processed.</p>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-semibold text-blue-800">2. When Cancellation Takes Effect</h3>
            <div className="text-blue-700 space-y-2">
                <p><strong>Subscription Cancellation:</strong> When you cancel your subscription, the cancellation takes effect at the end of your current billing period. You will continue to have full access to all features until the end of the period you have already paid for.</p>
                <p><strong>Example:</strong> If you cancel on day 10 of a monthly subscription, you will retain access until day 30 (the end of your billing period).</p>
                <p><strong>No Immediate Termination:</strong> We do not terminate your access immediately upon cancellation. You retain full access until the end of your paid period.</p>
            </div>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">3. Refund Policy</h3>
            <p><strong>Subscription Fees:</strong> Subscription fees are billed in advance for the billing period (monthly or annually). Refunds are not provided for unused portions of subscription periods after cancellation, except as required by applicable law.</p>
            <p><strong>Free Trial Period:</strong> If you cancel during your free trial period, you will not be charged. No refund is necessary as no payment has been processed.</p>
            <p><strong>Lifetime Access:</strong> Lifetime access purchases are non-refundable and non-transferable. If you have purchased lifetime access, cancellation of your account does not entitle you to a refund.</p>
            <p><strong>Legal Requirements:</strong> In jurisdictions where applicable law requires refunds for cancelled subscriptions, we will comply with such requirements.</p>
            <p><strong>In-App Purchases:</strong> Refunds for subscriptions or purchases made through the Apple App Store or applicable mobile app stores are handled by the respective platform per their policies. This Cancellation Policy applies to subscriptions and purchases made on our website (e.g. via Stripe or Squarespace).</p>
        </div>

        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="font-semibold text-yellow-800">4. Access and Data After Cancellation</h3>
            <div className="text-yellow-700 space-y-2">
                <p><strong>When Access Ends:</strong> When your subscription ends (at the end of your paid billing period), you will no longer have access to subscription features. We do not automatically delete your account or research data after a set period.</p>
                <p><strong>Account Deletion:</strong> If you want your account and data removed, you must request account deletion (for example via the in-app option or by emailing contact@thepepplanner.com). We will process deletion requests and remove your research data and account. Your email address may be retained in our deletion request records.</p>
                <p><strong>Backup Responsibility:</strong> We recommend exporting your data before cancelling or before requesting deletion so you have a copy if you need it.</p>
            </div>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">5. Resubscribing</h3>
            <p>If you cancel your subscription and later want to use the service again, you can subscribe again through the application. If you have not requested account deletion, your existing account and data may still be available. If you have requested and completed account deletion, you would need to create a new account to use the service again.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">6. Lifetime Access</h3>
            <p>If you have purchased lifetime access to The Pep Planner:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Lifetime access purchases are non-refundable and non-transferable.</li>
                <li>You may request account deletion at any time. We do not automatically delete accounts or data; deletion only happens when you request it.</li>
                <li>Lifetime access is tied to your account and cannot be transferred to another account.</li>
                <li>If you request account deletion and later wish to use the service again, you would need to create a new account and purchase access again (lifetime if available, or a subscription).</li>
            </ul>
        </div>

        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <h3 className="font-semibold text-green-800">7. Cancellation Confirmation</h3>
            <div className="text-green-700 space-y-2">
                <p>Upon cancellation, you will receive:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>A confirmation email within 24 hours of your cancellation request</li>
                    <li>Information about when your access will end</li>
                    <li>Instructions on how to export your data if you wish to keep a copy</li>
                </ul>
            </div>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">8. Changes to This Policy</h3>
            <p>We reserve the right to modify this Cancellation Policy at any time. We will notify you of any material changes by:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li>Email to the address associated with your account</li>
                <li>In-app notification</li>
                <li>Posting the updated policy on our website</li>
            </ul>
            <p className="mt-2">Your continued use of the Service after changes to this policy constitutes acceptance of the updated policy.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">9. Questions About Cancellation</h3>
            <p>If you have any questions about cancelling your subscription, please contact us:</p>
            <ul className="list-none space-y-2 mt-2">
                <li><strong>Email:</strong> contact@thepepplanner.com</li>
                <li><strong>General Support:</strong> Available through the in-app support feature</li>
                <li><strong>Response Time:</strong> We aim to respond to all cancellation inquiries within 24 hours</li>
            </ul>
        </div>

        <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
                <strong>Last Updated:</strong> February 2026
            </p>
            <p className="text-sm text-gray-600 mt-2">
                If you have any questions about this Cancellation Policy, please contact us at contact@thepepplanner.com.
            </p>
        </div>

    </div>
);









