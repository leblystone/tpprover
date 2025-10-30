import React, { useState } from 'react';
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
      
      // Create Stripe checkout session for gift (one-time payment)
      // Use the actual Stripe price ID for the selected gift option
      await createCheckoutSession(
        selectedOption.priceId,
        user.email,
        user.uid,
        '/gift-success',
        true, // isGift flag
        {
          cancelPath: window.location.pathname + window.location.search,
          successPath: '/gift-success',
          giftData: {
            recipientEmail: formData.recipientEmail,
            recipientName: formData.recipientName,
            giftGiverName: formData.giftGiverName,
            giftMessage: formData.giftMessage,
            subscriptionType: formData.subscriptionType,
            pricePaid: selectedOption.price
          }
        }
      );

    } catch (error) {
      console.error('Error creating gift:', error);
      setError(error.message || 'Failed to create gift. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="🎁 Give the Gift of Research"
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
          <label className="block text-sm font-medium mb-2 text-gray-700">Your Name *</label>
          <input
            type="text"
            name="giftGiverName"
            value={formData.giftGiverName}
            onChange={handleInputChange}
            required
            className={`w-full px-4 py-3 rounded-xl border-2 ${theme.border} bg-gray-50 text-gray-800 focus:border-green-500 focus:outline-none transition-colors`}
            placeholder="Enter your name"
          />
        </div>

        {/* Recipient Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Recipient Email *</label>
            <input
              type="email"
              name="recipientEmail"
              value={formData.recipientEmail}
              onChange={handleInputChange}
              required
              className={`w-full px-4 py-3 rounded-xl border-2 ${theme.border} bg-gray-50 text-gray-800 focus:border-green-500 focus:outline-none transition-colors`}
              placeholder="friend@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-700">Recipient Name (Optional)</label>
            <input
              type="text"
              name="recipientName"
              value={formData.recipientName}
              onChange={handleInputChange}
              className={`w-full px-4 py-3 rounded-xl border-2 ${theme.border} bg-gray-50 text-gray-800 focus:border-green-500 focus:outline-none transition-colors`}
              placeholder="Their name"
            />
          </div>
        </div>

        {/* Gift Message */}
        <div>
          <label className="block text-sm font-medium mb-2 text-gray-700">Personal Message (Optional)</label>
          <textarea
            name="giftMessage"
            value={formData.giftMessage}
            onChange={handleInputChange}
            rows={3}
            className={`w-full px-4 py-3 rounded-xl border-2 ${theme.border} bg-gray-50 text-gray-800 focus:border-green-500 focus:outline-none transition-colors resize-none`}
            placeholder="I thought you'd love organizing your research with The Pep Planner..."
          />
        </div>

        {/* Subscription Options */}
        <div>
          <label className="block text-sm font-medium mb-4 text-gray-800">Choose Gift Duration</label>
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
                      <div className="text-2xl font-bold" style={{ color: theme.success }}>${option.price}</div>
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-6 p-4 bg-gray-50 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="text-2xl">🎁</div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">How it works:</h4>
              <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
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
  );
};

export default GiftPurchaseModal;