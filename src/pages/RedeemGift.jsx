import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { httpsCallable } from 'firebase/functions';
import { getFunctions } from 'firebase/functions';
import { registerUser } from '../services/firebase';

const RedeemGiftPage = () => {
  const { giftId } = useParams();
  const navigate = useNavigate();
  const { user, setUser } = useAppContext();
  const functions = getFunctions();
  
  const [giftData, setGiftData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [showSignupForm, setShowSignupForm] = useState(false);
  
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });

  useEffect(() => {
    if (giftId) {
      loadGiftData();
    }
  }, [giftId]);

  const loadGiftData = async () => {
    try {
      const getGiftAccess = httpsCallable(functions, 'getGiftAccess');
      const result = await getGiftAccess({ giftId });
      
      if (result.data.success) {
        setGiftData(result.data.giftData);
        
        // Check if user is already logged in with the correct email
        if (user && user.email.toLowerCase() === result.data.giftData.recipientEmail.toLowerCase()) {
          // User is already logged in with the correct email, can redeem immediately
          setShowSignupForm(false);
        } else if (user && user.email.toLowerCase() !== result.data.giftData.recipientEmail.toLowerCase()) {
          // User is logged in with different email
          setError('This gift is for a different email address. Please log out and sign in with the correct email.');
        } else {
          // User is not logged in, show signup form
          setSignupData(prev => ({
            ...prev,
            email: result.data.giftData.recipientEmail
          }));
          setShowSignupForm(true);
        }
      } else {
        setError('Gift not found or invalid');
      }
    } catch (error) {
      console.error('Error loading gift:', error);
      setError(error.message || 'Failed to load gift');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsRedeeming(true);
    setError('');

    try {
      // Validate passwords match
      if (signupData.password !== signupData.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Create user account
      const result = await registerUser(signupData.email, signupData.password);
      
      // Set user in context
      const newUser = {
        email: result.user.email,
        name: signupData.name || signupData.email.split('@')[0],
        uid: result.user.uid,
        createdAt: new Date().toISOString(),
        termsAgreed: { date: new Date().toISOString() }
      };
      
      setUser(newUser);
      localStorage.setItem('tpprover_user', JSON.stringify(newUser));
      localStorage.setItem('tpprover_auth_token', 'firebase_token');
      
      // Now redeem the gift
      await redeemGift(result.user.uid, result.user.email);
      
    } catch (error) {
      console.error('Error during signup:', error);
      setError(error.message || 'Failed to create account');
    } finally {
      setIsRedeeming(false);
    }
  };

  const redeemGift = async (userId, userEmail) => {
    try {
      const redeemGiftAccess = httpsCallable(functions, 'redeemGiftAccess');
      const result = await redeemGiftAccess({
        giftId,
        userId,
        userEmail
      });

      if (result.data.success) {
        // Redirect to dashboard with success message
        navigate('/app/dashboard?giftRedeemed=true');
      } else {
        throw new Error('Failed to redeem gift');
      }
    } catch (error) {
      console.error('Error redeeming gift:', error);
      throw error;
    }
  };

  const handleRedeemExistingAccount = async () => {
    setIsRedeeming(true);
    setError('');

    try {
      await redeemGift(user.uid, user.email);
    } catch (error) {
      console.error('Error redeeming gift:', error);
      setError(error.message || 'Failed to redeem gift');
    } finally {
      setIsRedeeming(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSignupData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your gift...</p>
        </div>
      </div>
    );
  }

  if (error && !giftData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="text-6xl mb-4">😞</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Gift Not Found</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-8 text-center text-white">
          <div className="text-6xl mb-4">🎁</div>
          <h1 className="text-3xl font-bold mb-2">You've Received a Gift!</h1>
          <p className="text-green-100">Someone special has gifted you access to The Pep Planner</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {giftData && (
            <div className="mb-8">
              {/* Gift Details */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                <h2 className="text-xl font-semibold text-green-800 mb-4">Gift Details</h2>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">From:</span>
                    <span className="font-medium">{giftData.giftGiverName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">
                      {giftData.subscriptionType === 'monthly' ? '1 Month' :
                       giftData.subscriptionType === 'quarterly' ? '3 Months' : '1 Year'}
                    </span>
                  </div>
                  {giftData.expiresAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expires:</span>
                      <span className="font-medium text-gray-800">
                        {new Date(giftData.expiresAt.toDate()).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Status:</span>
                    <span className={`font-medium ${
                      giftData.status === 'pending' ? 'text-green-600' :
                      giftData.status === 'redeemed' ? 'text-blue-600' : 'text-red-600'
                    }`}>
                      {giftData.status === 'pending' ? 'Ready to Redeem' :
                       giftData.status === 'redeemed' ? 'Already Redeemed' : 'Expired'}
                    </span>
                  </div>
                </div>
                
                {giftData.giftMessage && (
                  <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                    <p className="text-gray-700 italic">"{giftData.giftMessage}"</p>
                    <p className="text-sm text-gray-500 mt-2">- {giftData.giftGiverName}</p>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl mb-6">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Expiration Warning */}
              {giftData.status === 'pending' && giftData.expiresAt && (() => {
                const expiresDate = new Date(giftData.expiresAt.toDate());
                const now = new Date();
                const daysLeft = Math.ceil((expiresDate - now) / (1000 * 60 * 60 * 24));
                const isExpiringSoon = daysLeft <= 3 && daysLeft > 0;
                
                if (isExpiringSoon) {
                  return (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-6">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">⚠️</span>
                        <h3 className="font-semibold text-yellow-800">Gift Expiring Soon</h3>
                      </div>
                      <p className="text-sm text-yellow-700">
                        This gift expires in {daysLeft} {daysLeft === 1 ? 'day' : 'days'}. Please redeem it soon!
                      </p>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Redeem Options */}
              {giftData.status === 'pending' && (
                <div>
                  {!user ? (
                    // User not logged in - show signup form
                    <div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Create Your Account</h3>
                      <p className="text-gray-600 mb-6">
                        Create a free account to redeem your gift and start organizing your research.
                      </p>
                      
                      <form onSubmit={handleSignup} className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
                          <input
                            type="email"
                            name="email"
                            value={signupData.email}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="your@email.com"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
                          <input
                            type="text"
                            name="name"
                            value={signupData.name}
                            onChange={handleInputChange}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="Your name"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                          <input
                            type="password"
                            name="password"
                            value={signupData.password}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="Create a password"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                          <input
                            type="password"
                            name="confirmPassword"
                            value={signupData.confirmPassword}
                            onChange={handleInputChange}
                            required
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            placeholder="Confirm your password"
                          />
                        </div>
                        
                        <button
                          type="submit"
                          disabled={isRedeeming}
                          className="w-full py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isRedeeming ? 'Creating Account...' : 'Create Account & Redeem Gift'}
                        </button>
                      </form>
                    </div>
                  ) : (
                    // User is logged in - show redeem button
                    <div className="text-center">
                      <h3 className="text-lg font-semibold text-gray-800 mb-4">Ready to Redeem!</h3>
                      <p className="text-gray-600 mb-6">
                        You're logged in as <strong>{user.email}</strong>. Click below to redeem your gift.
                      </p>
                      
                      <button
                        onClick={handleRedeemExistingAccount}
                        disabled={isRedeeming}
                        className="px-8 py-4 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRedeeming ? 'Redeeming...' : '🎁 Redeem My Gift'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {giftData.status === 'redeemed' && (
                <div className="text-center">
                  <div className="text-4xl mb-4">✅</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Gift Already Redeemed</h3>
                  <p className="text-gray-600 mb-6">This gift has already been redeemed.</p>
                  <button
                    onClick={() => navigate('/app/dashboard')}
                    className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 transition-colors"
                  >
                    Go to Dashboard
                  </button>
                </div>
              )}

              {giftData.status === 'expired' && (
                <div className="text-center">
                  <div className="text-4xl mb-4">⏰</div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Gift Expired</h3>
                  <p className="text-gray-600 mb-6">This gift has expired and can no longer be redeemed.</p>
                  <button
                    onClick={() => navigate('/')}
                    className="px-6 py-3 bg-gray-600 text-white rounded-xl font-medium hover:bg-gray-700 transition-colors"
                  >
                    Go Home
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Features Preview */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">What you'll get with The Pep Planner:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">Research protocol management</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">Vendor tracking & analytics</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">Order history & reporting</span>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-green-600 font-bold">✓</span>
                <span className="text-gray-700">Priority support</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RedeemGiftPage;
