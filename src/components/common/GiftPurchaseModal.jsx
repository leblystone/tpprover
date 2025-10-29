import React, { useState } from 'react';
import { useAppContext } from '../../context/AppContext';
import { createCheckoutSession } from '../../services/stripe';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';

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
    { value: 'monthly', label: '1 Month', price: 9.99, description: 'Perfect for trying out The Pep Planner' },
    { value: 'quarterly', label: '3 Months', price: 24.99, description: 'Great for ongoing research projects', savings: 'Save 17%' },
    { value: 'annual', label: '1 Year', price: 79.99, description: 'Best value for serious researchers', savings: 'Save 33%' }
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
      
      // Create Stripe checkout session for gift
      const checkoutResult = await createCheckoutSession(
        selectedOption.value === 'monthly' ? 'price_monthly_gift' : 
        selectedOption.value === 'quarterly' ? 'price_quarterly_gift' : 'price_annual_gift',
        user.email,
        user.uid,
        '/gift-success'
      );

      // Create gift access record
      const createGiftAccess = httpsCallable(functions, 'createGiftAccess');
      await createGiftAccess({
        giftGiverEmail: user.email,
        giftGiverName: formData.giftGiverName,
        recipientEmail: formData.recipientEmail,
        recipientName: formData.recipientName,
        giftMessage: formData.giftMessage,
        subscriptionType: formData.subscriptionType,
        stripePaymentIntentId: checkoutResult.paymentIntentId,
        pricePaid: selectedOption.price
      });

      // Redirect to Stripe checkout
      window.location.href = checkoutResult.url;

    } catch (error) {
      console.error('Error creating gift:', error);
      setError(error.message || 'Failed to create gift. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${theme.bg} ${theme.text} rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto`}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">🎁 Give the Gift of Research</h2>
              <p className="text-gray-600">Share The Pep Planner with someone special</p>
            </div>
            <button
              onClick={onClose}
              className={`${theme.bg} ${theme.text} p-2 rounded-full hover:bg-gray-100 transition-colors`}
            >
              ✕
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Gift Giver Info */}
            <div>
              <label className="block text-sm font-medium mb-2">Your Name *</label>
              <input
                type="text"
                name="giftGiverName"
                value={formData.giftGiverName}
                onChange={handleInputChange}
                required
                className={`w-full px-4 py-3 rounded-xl border-2 ${theme.border} ${theme.bg} ${theme.text} focus:border-green-500 focus:outline-none transition-colors`}
                placeholder="Enter your name"
              />
            </div>

            {/* Recipient Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Recipient Email *</label>
                <input
                  type="email"
                  name="recipientEmail"
                  value={formData.recipientEmail}
                  onChange={handleInputChange}
                  required
                  className={`w-full px-4 py-3 rounded-xl border-2 ${theme.border} ${theme.bg} ${theme.text} focus:border-green-500 focus:outline-none transition-colors`}
                  placeholder="friend@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Recipient Name (Optional)</label>
                <input
                  type="text"
                  name="recipientName"
                  value={formData.recipientName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 rounded-xl border-2 ${theme.border} ${theme.bg} ${theme.text} focus:border-green-500 focus:outline-none transition-colors`}
                  placeholder="Their name"
                />
              </div>
            </div>

            {/* Gift Message */}
            <div>
              <label className="block text-sm font-medium mb-2">Personal Message (Optional)</label>
              <textarea
                name="giftMessage"
                value={formData.giftMessage}
                onChange={handleInputChange}
                rows={3}
                className={`w-full px-4 py-3 rounded-xl border-2 ${theme.border} ${theme.bg} ${theme.text} focus:border-green-500 focus:outline-none transition-colors resize-none`}
                placeholder="Happy holidays! I thought you'd love organizing your research with The Pep Planner..."
              />
            </div>

            {/* Subscription Options */}
            <div>
              <label className="block text-sm font-medium mb-4">Choose Gift Duration</label>
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
                    <div className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      formData.subscriptionType === option.value
                        ? 'border-green-500 bg-green-50'
                        : `${theme.border} ${theme.bg} hover:border-green-300`
                    }`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{option.label}</h3>
                            {option.savings && (
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                                {option.savings}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">${option.price}</div>
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

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 px-6 py-3 rounded-xl border-2 ${theme.border} ${theme.bg} ${theme.text} font-medium transition-colors hover:bg-gray-50`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-xl font-medium transition-colors hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : `Purchase Gift - $${subscriptionOptions.find(opt => opt.value === formData.subscriptionType)?.price}`}
              </button>
            </div>
          </form>

          {/* Footer Info */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🎁</div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-1">How it works:</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Recipient receives email with redemption link</li>
                  <li>• They have 30 days to claim their gift</li>
                  <li>• Gift activates immediately upon redemption</li>
                  <li>• You'll be notified when they redeem it</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GiftPurchaseModal;
