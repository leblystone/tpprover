import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getFunctions, httpsCallable } from 'firebase/functions';
import Modal from '../components/common/Modal';

const GiftSuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [giftInfo, setGiftInfo] = useState(null);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const preview = params.get('preview');
    const sessionId = params.get('session_id');

    if (preview === '1') {
      // Preview mode: show a sample success immediately
      setGiftInfo({
        recipientEmail: 'friend@example.com',
        recipientName: 'Friend',
        giftMessage: 'Excited for you to try The Pep Planner!',
        subscriptionType: 'monthly',
        giftId: 'gift_preview',
      });
      setLoading(false);
      return;
    }

    if (!sessionId) {
      setError('No checkout session found.');
      setLoading(false);
      return;
    }
    const run = async () => {
      try {
        const functions = getFunctions();
        const complete = httpsCallable(functions, 'completeGiftFromSession');
        const result = await complete({ sessionId });
        if (!result.data?.success) {
          const status = result.data?.status;
          if (status === 'not_gift') {
            setError('This checkout is not a gift purchase.');
          } else {
            setError('Payment not completed. If you cancelled checkout, no charge was made.');
          }
        } else {
          setGiftInfo(result.data.gift);
        }
      } catch (e) {
        setError(e.message || 'Failed to verify payment.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [location.search]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Modal
        open={true}
        onClose={() => navigate(-1)}
        title={error ? 'Checkout Incomplete' : '🎉 Gift Purchase Successful!'}
        theme={{}}
        variant="modern"
        maxWidth="max-w-lg"
        footer={
          <div className="flex gap-3 w-full">
            <button
              onClick={() => navigate('/')}
              className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors"
            >
              Go Home
            </button>
            <button
              onClick={() => navigate('/app/dashboard')}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        }
      >
        {loading ? (
          <div className="py-8 text-center text-gray-600">Verifying payment...</div>
        ) : error ? (
          <div className="space-y-4">
            <p className="text-gray-700">{error}</p>
            <p className="text-sm text-gray-500">If you cancelled checkout, no gift was created and no charge was made.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-gray-700">
              Your gift has been sent! The recipient will receive an email with instructions to claim their gift.
            </p>
            {giftInfo && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
                <div className="mb-1"><span className="font-semibold">Recipient:</span> {giftInfo.recipientEmail}</div>
                {giftInfo.giftMessage && (
                  <div className="mt-2">
                    <span className="font-semibold">Your message:</span>
                    <div className="italic text-green-900 mt-1">"{giftInfo.giftMessage}"</div>
                  </div>
                )}
              </div>
            )}
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="font-semibold text-green-800 mb-2">What happens next:</h3>
              <ul className="text-sm text-green-700 space-y-1 text-left">
                <li>• Recipient receives email with redemption link</li>
                <li>• They have 60 days to claim their gift</li>
                <li>• You'll be notified when they redeem it</li>
                <li>• Gift activates immediately upon redemption</li>
              </ul>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GiftSuccessPage;
