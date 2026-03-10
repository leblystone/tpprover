import React from 'react';
import { themes, defaultThemeName } from '../theme/themes';
import { usePageSEO } from '../utils/pageSEO';
import LandingFooter from '../components/layout/LandingFooter';
import LandingHeader from '../components/layout/LandingHeader';

export default function Terms() {
  usePageSEO();
  const theme = themes[defaultThemeName];

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.background }}>
      <LandingHeader />

      {/* Hero Section */}
      <div className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ color: theme.primaryDark }}>
            Terms of Service
          </h1>
          <p className="text-sm mt-4" style={{ color: theme.textLight }}>
            Last updated: February 2026
          </p>
        </div>
      </div>

      {/* Terms Content */}
      <div className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: theme.white }}>
        <div className="max-w-4xl mx-auto">
          <div className="prose prose-lg max-w-none">
            
            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                1. Acceptance of Terms
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>
                  By accessing or using The Pep Planner ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of these terms, you may not access the Service.
                </p>
                <p>
                  These Terms apply to all visitors, users, and others who access or use the Service. Your use of the Service is also governed by our Privacy Policy, which is incorporated into these Terms by reference.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                2. Description of Service
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>
                  The Pep Planner is a research organization platform designed to help researchers organize, track, and manage peptide research protocols. The Service includes:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Research protocol management and scheduling</li>
                  <li>Inventory tracking and management</li>
                  <li>Goal setting and progress tracking</li>
                  <li>Data analytics and reporting</li>
                  <li>Mobile and web applications</li>
                </ul>
                <p>
                  <strong>Important:</strong> The Pep Planner is designed for research purposes only. It is not intended for medical advice, diagnosis, or treatment.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                3. User Accounts and Registration
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>
                  To access certain features of the Service, you must register for an account. You agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Provide accurate, current, and complete information during registration</li>
                  <li>Maintain and update your account information</li>
                  <li>Keep your password secure and confidential</li>
                  <li>Accept responsibility for all activities under your account</li>
                  <li>Notify us immediately of any unauthorized use of your account</li>
                </ul>
                <p>
                  You must be at least 18 years old to create an account. If you are under 18, you may not use the Service.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                4. Acceptable Use Policy
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>You agree to use the Service only for lawful purposes and in accordance with these Terms. You agree not to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Use the Service for any illegal or unauthorized purpose</li>
                  <li>Violate any applicable laws or regulations</li>
                  <li>Infringe on the rights of others</li>
                  <li>Transmit harmful or malicious code</li>
                  <li>Attempt to gain unauthorized access to the Service</li>
                  <li>Interfere with the proper functioning of the Service</li>
                  <li>Use the Service to conduct medical treatment or provide medical advice</li>
                  <li>Share false or misleading information</li>
                </ul>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                5. Research Data and Content
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>
                  <strong>Your Content:</strong> You retain ownership of all research data and content you upload to the Service. By using the Service, you grant us a limited license to store, process, and display your content as necessary to provide the Service.
                </p>
                <p>
                  <strong>Data Security:</strong> We implement industry-standard security measures to protect your data. However, you are responsible for backing up your important data.
                </p>
                <p>
                  <strong>Data Export:</strong> You may export your data at any time. Upon account termination, you have 30 days to export your data before it is permanently deleted.
                </p>
                <p>
                  <strong>Research Compliance:</strong> You are responsible for ensuring your research complies with all applicable laws, regulations, and institutional policies.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                6. Subscription and Payment
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>
                  <strong>Research Trial:</strong> We offer a 14-day research trial for new users. No credit card is required to start your trial.
                </p>
                <p>
                  <strong>Subscription Plans:</strong> After the trial period, you must subscribe to a paid plan to continue using the Service. Subscription fees are billed in advance.
                </p>
                <p>
                  <strong>Payment:</strong> Subscriptions and one-time purchases may be processed by Stripe (web), Apple App Store (iOS app), applicable mobile app stores, or Squarespace (website purchases), as applicable. You agree to pay all fees associated with your subscription. Fees are non-refundable except as required by law.
                </p>
                <p>
                  <strong>Refunds:</strong> Refunds for in-app purchases made through the Apple App Store or applicable mobile app stores are subject to their respective refund policies. Refunds for purchases made on our website (Stripe, Squarespace) are governed by our Cancellation Policy.
                </p>
                <p>
                  <strong>Cancellation:</strong> You may cancel your subscription at any time through your Account or by contacting us. Cancellation takes effect at the end of your current billing period and you retain access until then. We do not automatically delete your account or data; deletion only occurs if you request it. By subscribing or purchasing, you agree to our full Cancellation Policy, which is incorporated into these Terms and available in the app and on our website.
                </p>
                <p>
                  <strong>Lifetime Access:</strong> Lifetime access may be purchased as a one-time payment or obtained through promotional redemption codes. Lifetime access grants unlimited use of the Service for as long as The Pep Planner continues to operate. Lifetime purchases are non-refundable and non-transferable.
                </p>
                <p>
                  <strong>Redemption Codes:</strong> Promotional and product redemption codes are single-use, non-transferable, and tied to one account only. Once redeemed, codes cannot be transferred to a different account. Codes have no cash value and cannot be resold. We reserve the right to invalidate codes obtained through unauthorized means.
                </p>
                <p>
                  <strong>Service Continuity:</strong> "Lifetime" access refers to the operational lifetime of The Pep Planner service, not the lifetime of the user. In the event of service discontinuation, we will provide reasonable notice and data export capabilities.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                7. Intellectual Property
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>
                  <strong>Service Ownership:</strong> The Service and its original content, features, and functionality are owned by Belix Company LLC and are protected by international copyright, trademark, and other intellectual property laws.
                </p>
                <p>
                  <strong>User Content:</strong> You retain ownership of your research data and content. You grant us a limited license to use your content as necessary to provide the Service.
                </p>
                <p>
                  <strong>Feedback:</strong> Any feedback, comments, or suggestions you provide may be used by us without compensation or attribution.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                8. Disclaimers and Limitations
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>
                  <strong>Service Availability:</strong> We strive to maintain high service availability but do not guarantee uninterrupted access. The Service is provided "as is" without warranties of any kind.
                </p>
                <p>
                  <strong>Research Disclaimer:</strong> The Service is for research organization purposes only. It is not intended for medical advice, diagnosis, or treatment. Always consult with qualified professionals for medical decisions.
                </p>
                <p>
                  <strong>Limitation of Liability:</strong> To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Service.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                9. Termination
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>
                  <strong>Termination by You:</strong> You may terminate your account at any time by contacting us or using the account deletion feature.
                </p>
                <p>
                  <strong>Termination by Us:</strong> We may terminate or suspend your account immediately if you violate these Terms or for other reasons at our discretion.
                </p>
                <p>
                  <strong>Effect of Termination:</strong> Upon termination, your right to use the Service ceases immediately. You have 30 days to export your data before it is permanently deleted.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                10. Governing Law and Disputes
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>
                  These Terms are governed by the laws of the State of New Mexico, United States, without regard to its conflict of law provisions. Any disputes arising from these Terms or your use of the Service shall be subject to the personal and exclusive jurisdiction of the state and federal courts located within Socorro County, New Mexico, United States.
                </p>
                <p>
                  Before initiating any legal action, you agree to first contact us to attempt to resolve the dispute informally.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                11. Changes to Terms
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>
                  We reserve the right to modify these Terms at any time. We will notify users of material changes by email or through the Service. Your continued use of the Service after changes constitutes acceptance of the new Terms.
                </p>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl font-bold mb-6" style={{ color: theme.primaryDark }}>
                12. Contact Information
              </h2>
              <div className="space-y-4 text-sm leading-relaxed" style={{ color: theme.textLight }}>
                <p>
                  If you have any questions about these Terms of Service, please contact us:
                </p>
                <ul className="list-none space-y-2">
                  <li><strong>Email:</strong> contact@thepepplanner.com</li>
                  <li><strong>Address:</strong> Belix Company LLC, New Mexico, United States</li>
                </ul>
              </div>
            </section>

          </div>
        </div>
      </div>

      <LandingFooter />
    </div>
  );
}
