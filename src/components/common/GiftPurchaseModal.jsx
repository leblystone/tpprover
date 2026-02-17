import React, { useState } from 'react';
import { Gift, PartyPopper, HeartCrack, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { createCheckoutSession } from '../../services/stripe';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import Modal from "./Modal";

const GiftPurchaseModal = ({ isOpen, onClose, theme }) => {
  const { user } = useAppContext();
  const functions = getFunctions();
  
  const [formData, setFormData] = useState({
    giftGiverName: user?.name || '',
    recipientEmail: '',
    recipientName: '',
    giftMessage: '',
    subscriptionType: 'monthly'
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [showFailure, setShowFailure] = useState(false);
  const [giftData, setGiftData] = useState(null);

  const subscriptionOptions = [
    { 
      value: 'monthly', 
      label: '1 Month', 
      price: 8.99, 
      priceId: 'price_1SNf8t50b3cktl9Xrgtgcyr0',
      description: 'Perfect for trying out The Pep Planner' 
    },
    { 
      value: 'quarterly', 
      label: '3 Months', 
      price: 24.99, 
      priceId: 'price_1SNfDj50b3cktl9Xb7bfctCE',
      description: 'Great for ongoing research projects', 
      savings: 'Save 17%' 
    },
    { 
      value: 'annual', 
      label: '1 Year', 
      price: 89.99, 
      priceId: 'price_1SNfEK50b3cktl9XVZc6HBz3',
      description: 'Best value for serious researchers', 
      savings: 'Save 33%' 
    }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Validate form
      if (!formData.recipientEmail || !formData.giftGiverName) {
        throw new Error('Please fill in all required fields');
      }

      // Get selected subscription option
      const selectedOption = subscriptionOptions.find(opt => opt.value === formData.subscriptionType);
      
      // For testing purposes, show success modal instead of redirecting
      // In production, this would create the actual Stripe checkout session
      setGiftData({
        recipientEmail: formData.recipientEmail,
        recipientName: formData.recipientName,
        giftGiverName: formData.giftGiverName,
        giftMessage: formData.giftMessage,
        subscriptionType: formData.subscriptionType,
        pricePaid: selectedOption.price
      });
      setShowSuccess(true);
      
      // Uncomment this for production:
      // await createCheckoutSession(
      //   selectedOption.priceId,
      //   user.email,
      //   user.uid,
      //   '/gift-success',
      //   true, // isGift flag
      //   {
      //     cancelPath: window.location.pathname + window.location.search,
      //     successPath: '/gift-success',
      //     giftData: {
      //       recipientEmail: formData.recipientEmail,
      //       recipientName: formData.recipientName,
      //       giftGiverName: formData.giftGiverName,
      //       giftMessage: formData.giftMessage,
      //       subscriptionType: formData.subscriptionType,
      //       pricePaid: selectedOption.price
      //     }
      //   }
      // );

    } catch (error) {
      console.error('Error creating gift:', error);
      setGiftData({
        recipientEmail: formData.recipientEmail,
        recipientName: formData.recipientName,
        giftGiverName: formData.giftGiverName,
        giftMessage: formData.giftMessage,
        subscriptionType: formData.subscriptionType,
        pricePaid: selectedOption.price,
        errorMessage: error.message || 'Failed to create gift. Please try again.'
      });
      setShowFailure(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Give the Gift of Research"
      titleExtra="Share The Pep Planner with someone special"
      theme={theme}
      maxWidth="max-w-2xl"
      variant="modern"
      footer={
        <div className="flex gap-4 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 rounded-xl border-2 font-medium transition-colors"
            style={{ borderColor: theme.border, backgroundColor: theme.secondary, color: theme.text }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading}
            onClick={handleSubmit}
            className="flex-1 px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: theme.success, color: '#fff' }}
          >
            {isLoading ? 'Processing...' : `Purchase Gift - $${subscriptionOptions.find(opt => opt.value === formData.subscriptionType)?.price}`}
          </button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Gift Giver Info */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>Your Name *</label>
          <input
            type="text"
            name="giftGiverName"
            value={formData.giftGiverName}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors"
            style={{ borderColor: theme.border, backgroundColor: theme.isDark ? '#1e293b' : '#f9fafb', color: theme.text }}
            placeholder="Enter your name"
          />
        </div>

        {/* Recipient Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>Recipient Email *</label>
            <input
              type="email"
              name="recipientEmail"
              value={formData.recipientEmail}
              onChange={handleInputChange}
              required
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors"
              style={{ borderColor: theme.border, backgroundColor: theme.isDark ? '#1e293b' : '#f9fafb', color: theme.text }}
              placeholder="friend@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>Recipient Name (Optional)</label>
            <input
              type="text"
              name="recipientName"
              value={formData.recipientName}
              onChange={handleInputChange}
              className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors"
              style={{ borderColor: theme.border, backgroundColor: theme.isDark ? '#1e293b' : '#f9fafb', color: theme.text }}
              placeholder="Their name"
            />
          </div>
        </div>

        {/* Gift Message */}
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>Personal Message (Optional)</label>
          <textarea
            name="giftMessage"
            value={formData.giftMessage}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-4 py-3 rounded-xl border-2 focus:outline-none transition-colors resize-none"
            style={{ borderColor: theme.border, backgroundColor: theme.isDark ? '#1e293b' : '#f9fafb', color: theme.text }}
            placeholder="I thought you'd love organizing your research with The Pep Planner..."
          />
        </div>

        {/* Subscription Options */}
        <div>
          <label className="block text-sm font-medium mb-4" style={{ color: theme.text }}>Choose Gift Duration</label>
          <div className="space-y-3">
            {subscriptionOptions.map((option) => (
              <label key={option.value} className="block">
                <input
                  type="radio"
                  name="subscriptionType"
                  value={option.value}
                  checked={formData.subscriptionType === option.value}
                  onChange={handleInputChange}
                  className="sr-only"
                />
                <div 
                  className="p-4 rounded-xl border-2 cursor-pointer transition-all"
                  style={{
                    borderColor: formData.subscriptionType === option.value ? theme.success : theme.border,
                    backgroundColor: formData.subscriptionType === option.value ? theme.successBg : theme.cardBackground
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold" style={{ color: theme.text }}>{option.label}</h3>
                        {option.savings && (
                          <span className="px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: theme.successBg, color: theme.success }}>
                            {option.savings}
                          </span>
                        )}
                      </div>
                      <p className="text-sm mt-1" style={{ color: theme.textLight }}>{option.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-semibold" style={{ color: theme.success }}>${option.price}</div>
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-xl border" style={{ backgroundColor: theme.isDark ? 'rgba(220,38,38,0.1)' : '#fef2f2', borderColor: theme.isDark ? 'rgba(220,38,38,0.3)' : '#fecaca' }}>
            <p className="text-sm" style={{ color: '#dc2626' }}>{error}</p>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-6 p-4 rounded-xl" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }}>
          <div className="flex items-start gap-3">
            <Gift size={24} style={{ color: theme.primary, flexShrink: 0 }} />
            <div>
              <h4 className="font-semibold mb-1" style={{ color: theme.text }}>How it works:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside" style={{ color: theme.textLight }}>
                <li>Recipient receives email with redemption link</li>
                <li>They have 60 days to claim their gift (expiration date shown on redemption page)</li>
                <li>Gift activates immediately upon redemption</li>
                <li>You'll be notified when they redeem it</li>
                <li>If unredeemed, gift expires automatically after 60 days</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </Modal>

    {/* Success Modal */}
    {showSuccess && (
      <Modal
        open={showSuccess}
        onClose={() => setShowSuccess(false)}
        title="Gift Sent Successfully!"
        theme={theme}
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-center w-full">
            <button
              onClick={() => {
                setShowSuccess(false);
                onClose();
              }}
              className="px-6 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              Close
            </button>
          </div>
        }
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: theme.successBg }}>
            <Gift size={32} style={{ color: theme.success }} />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
              Gift Purchase Complete!
            </h3>
            <p className="text-sm" style={{ color: theme.textLight }}>
              Your gift has been sent to <strong>{giftData?.recipientName}</strong> at {giftData?.recipientEmail}
            </p>
          </div>

          <div className="rounded-lg p-4 text-left" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }}>
            <h4 className="font-medium mb-2" style={{ color: theme.text }}>Gift Details:</h4>
            <div className="space-y-1 text-sm" style={{ color: theme.textLight }}>
              <p><strong>Recipient:</strong> {giftData?.recipientName}</p>
              <p><strong>Email:</strong> {giftData?.recipientEmail}</p>
              <p><strong>Subscription:</strong> {giftData?.subscriptionType} (${giftData?.pricePaid})</p>
              <p><strong>Message:</strong> "{giftData?.giftMessage}"</p>
            </div>
          </div>

          <p className="text-xs" style={{ color: theme.textLight }}>
            The recipient will receive an email with instructions to redeem their gift.
          </p>
        </div>
      </Modal>
    )}

    {/* Failure Modal */}
    {showFailure && (
      <Modal
        open={showFailure}
        onClose={() => setShowFailure(false)}
        title="Gift Purchase Failed"
        theme={theme}
        maxWidth="max-w-md"
        footer={
          <div className="flex justify-center w-full">
            <button
              onClick={() => setShowFailure(false)}
              className="px-6 py-2 rounded-lg text-sm font-medium transition-all"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              Try Again
            </button>
          </div>
        }
      >
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full flex items-center justify-center" style={{ backgroundColor: theme.isDark ? 'rgba(220,38,38,0.15)' : '#FEE2E2' }}>
            <HeartCrack size={32} style={{ color: theme.error || '#dc2626' }} />
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: theme.text }}>
              Gift Purchase Failed
            </h3>
            <p className="text-sm" style={{ color: theme.textLight }}>
              We encountered an issue processing your gift purchase.
            </p>
          </div>

          <div className="rounded-lg p-4 text-left" style={{ backgroundColor: theme.isDark ? 'rgba(220,38,38,0.1)' : '#fef2f2', border: `1px solid ${theme.isDark ? 'rgba(220,38,38,0.3)' : '#fecaca'}` }}>
            <h4 className="font-medium mb-2" style={{ color: '#dc2626' }}>Error Details:</h4>
            <p className="text-sm" style={{ color: theme.isDark ? '#fca5a5' : '#b91c1c' }}>
              {giftData?.errorMessage || 'Payment was declined or checkout was abandoned. Please try again with a different payment method.'}
            </p>
          </div>

          <div className="rounded-lg p-4 text-left" style={{ backgroundColor: theme.isDark ? 'rgba(255,255,255,0.04)' : '#f9fafb' }}>
            <h4 className="font-medium mb-2" style={{ color: theme.text }}>Gift Details:</h4>
            <div className="space-y-1 text-sm" style={{ color: theme.textLight }}>
              <p><strong>Recipient:</strong> {giftData?.recipientName}</p>
              <p><strong>Email:</strong> {giftData?.recipientEmail}</p>
              <p><strong>Subscription:</strong> {giftData?.subscriptionType} (${giftData?.pricePaid})</p>
            </div>
          </div>

          <p className="text-xs" style={{ color: theme.textLight }}>
            Please check your payment method and try again, or contact support if the issue persists.
          </p>
        </div>
      </Modal>
    )}
    </>
  );
};

export default GiftPurchaseModal;