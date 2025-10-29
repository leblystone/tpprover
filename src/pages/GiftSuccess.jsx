import React from 'react';
import { useNavigate } from 'react-router-dom';

const GiftSuccessPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        {/* Success Icon */}
        <div className="text-6xl mb-6">🎉</div>
        
        {/* Success Message */}
        <h1 className="text-3xl font-bold text-gray-800 mb-4">Gift Purchase Successful!</h1>
        <p className="text-gray-600 mb-6">
          Your gift has been sent! The recipient will receive an email with instructions to claim their gift.
        </p>
        
        {/* What Happens Next */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-green-800 mb-3">What happens next:</h3>
          <ul className="text-sm text-green-700 space-y-2 text-left">
            <li>• Recipient receives email with redemption link</li>
            <li>• They have 30 days to claim their gift</li>
            <li>• You'll be notified when they redeem it</li>
            <li>• Gift activates immediately upon redemption</li>
          </ul>
        </div>
        
        {/* Action Buttons */}
        <div className="space-y-3">
          <button
            onClick={() => navigate('/app/dashboard')}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
          >
            Go Home
          </button>
        </div>
        
        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            Thank you for sharing The Pep Planner! 🎁
          </p>
        </div>
      </div>
    </div>
  );
};

export default GiftSuccessPage;
