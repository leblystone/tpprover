import React from 'react';

export const CancellationPolicyContent = () => (
    <div className="space-y-4 text-sm text-gray-600">
        <h2 className="text-lg font-bold text-gray-800">Cancellation Policy</h2>

        <p>This Cancellation Policy describes how you can cancel your subscription to The Pep Planner ("Service," "we," "us") and what happens when you cancel.</p>

        <div>
            <h3 className="font-semibold text-gray-800">1. How to Cancel Your Subscription</h3>
            <p>You may cancel your subscription at any time through the following methods:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li><strong>Account Settings:</strong> Navigate to your Account settings within the application and select "Cancel Subscription" from your subscription management page.</li>
                <li><strong>Email Request:</strong> Send an email to support@thepepplanner.com with your account email address and a request to cancel your subscription.</li>
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
        </div>

        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <h3 className="font-semibold text-yellow-800">4. Data Retention After Cancellation</h3>
            <div className="text-yellow-700 space-y-2">
                <p><strong>30-Day Grace Period:</strong> After your subscription ends, your account and research data will remain accessible for 30 days. During this period, you can:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>Export all your research data</li>
                    <li>Download your protocols, schedules, and inventory information</li>
                    <li>Access your account to retrieve any information you need</li>
                </ul>
                <p><strong>Data Deletion:</strong> After the 30-day grace period, your account and all associated research data will be permanently deleted from our systems. This deletion is irreversible.</p>
                <p><strong>Backup Responsibility:</strong> We recommend exporting your data before cancellation or during the grace period to ensure you have a backup of your research information.</p>
            </div>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">5. Reinstating Your Subscription</h3>
            <p>If you cancel your subscription and later decide to reactivate it, you can do so at any time before your account is permanently deleted (within the 30-day grace period).</p>
            <p><strong>Reactivation Process:</strong> To reinstate your subscription, simply subscribe again through the application. Your previous data will be restored if you reactivate within the 30-day grace period.</p>
            <p><strong>After Deletion:</strong> If your account has been permanently deleted (after 30 days), you will need to create a new account and start fresh. Previous data cannot be recovered.</p>
        </div>

        <div>
            <h3 className="font-semibold text-gray-800">6. Lifetime Access Cancellation</h3>
            <p>If you have purchased lifetime access to The Pep Planner:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
                <li>You may cancel your account at any time, but lifetime access purchases are non-refundable</li>
                <li>Cancellation of your account will result in permanent deletion of your data after the 30-day grace period</li>
                <li>If you cancel and later wish to return, you will need to purchase lifetime access again (if available) or subscribe to a regular plan</li>
                <li>Lifetime access is tied to your account and cannot be transferred to another account</li>
            </ul>
        </div>

        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <h3 className="font-semibold text-green-800">7. Cancellation Confirmation</h3>
            <div className="text-green-700 space-y-2">
                <p>Upon cancellation, you will receive:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                    <li>A confirmation email within 24 hours of your cancellation request</li>
                    <li>Information about when your access will end</li>
                    <li>Instructions on how to export your data</li>
                    <li>Details about the 30-day grace period</li>
                </ul>
                <p><strong>Reminder Emails:</strong> We may send you reminder emails during the grace period to ensure you have an opportunity to export your data or reactivate your subscription.</p>
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
                <li><strong>Email:</strong> support@thepepplanner.com</li>
                <li><strong>General Support:</strong> Available through the in-app support feature</li>
                <li><strong>Response Time:</strong> We aim to respond to all cancellation inquiries within 24 hours</li>
            </ul>
        </div>

        <div className="pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
                <strong>Last Updated:</strong> December 2024
            </p>
            <p className="text-sm text-gray-600 mt-2">
                If you have any questions about this Cancellation Policy, please contact us at support@thepepplanner.com.
            </p>
        </div>

    </div>
);







