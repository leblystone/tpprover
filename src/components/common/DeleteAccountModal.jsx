import React, { useState, useMemo } from 'react';
import { AlertTriangle, Trash2, Loader, CheckCircle, Mail } from 'lucide-react';
import Modal from './Modal';
import { useFirebase } from '../../context/FirebaseContext';
import { useAppContext } from '../../context/AppContext';
import { getFunctions, httpsCallable } from 'firebase/functions';

export default function DeleteAccountModal({ open, onClose, theme }) {
  const { firebaseUser } = useFirebase();
  const { 
    protocols, orders, stockpile, vendors, reconItems, reconHistory, 
    supplements, metrics, calendarNotes, scheduledBuys 
  } = useAppContext();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);

  // Calculate data summary
  const dataSummary = useMemo(() => {
    const calendarNoteCount = Object.keys(calendarNotes || {}).length;
    return {
      protocols: protocols?.length || 0,
      orders: orders?.length || 0,
      stockpile: stockpile?.length || 0,
      vendors: vendors?.length || 0,
      reconItems: reconItems?.length || 0,
      reconHistory: reconHistory?.length || 0,
      supplements: supplements?.length || 0,
      metrics: metrics?.length || 0,
      calendarNotes: calendarNoteCount,
      scheduledBuys: scheduledBuys?.length || 0
    };
  }, [protocols, orders, stockpile, vendors, reconItems, reconHistory, supplements, metrics, calendarNotes, scheduledBuys]);

  const totalItems = useMemo(() => {
    return Object.values(dataSummary).reduce((sum, count) => sum + count, 0);
  }, [dataSummary]);

  const handleSubmit = async () => {
    if (!confirmed) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Please confirm that you understand this action cannot be undone', type: 'warning' }
      }));
      return;
    }

    if (!firebaseUser?.email) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'Unable to identify your account. Please try again.', type: 'error' }
      }));
      return;
    }

    setIsSubmitting(true);

    try {
      const functions = getFunctions();
      const sendDeletionRequest = httpsCallable(functions, 'sendAccountDeletionRequestToAdmin');
      
      const result = await sendDeletionRequest({
        userEmail: firebaseUser.email,
        userName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        dataSummary: dataSummary
      });

      if (result.data.success) {
        // Save deletion request status to localStorage
        localStorage.setItem('tpprover_deletion_request_submitted', JSON.stringify({
          submitted: true,
          timestamp: new Date().toISOString(),
          email: firebaseUser.email
        }));
        setRequestSubmitted(true);
        setConfirmed(false);
      } else {
        throw new Error(result.data.message || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Error submitting deletion request:', error);
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to submit deletion request. ';
      
      if (error.code === 'functions/not-found' || error.message?.includes('CORS') || error.message?.includes('ERR_FAILED')) {
        errorMessage += 'The function may not be deployed yet. Please contact support at contact@thepepplanner.com to request account deletion.';
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please try again or contact support at contact@thepepplanner.com.';
      }
      
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          message: errorMessage, 
          type: 'error',
          duration: 7000
        }
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setRequestSubmitted(false);
    setConfirmed(false);
    // Dispatch event to notify SettingsData to check for deletion request
    window.dispatchEvent(new CustomEvent('tpp:deletion-request-submitted'));
    onClose();
  };

  const dataList = [
    { label: 'Research Protocols', count: dataSummary.protocols },
    { label: 'Orders', count: dataSummary.orders },
    { label: 'Stockpile Items', count: dataSummary.stockpile },
    { label: 'Vendors', count: dataSummary.vendors },
    { label: 'Reconstitution Items', count: dataSummary.reconItems },
    { label: 'Reconstitution History', count: dataSummary.reconHistory },
    { label: 'Supplements', count: dataSummary.supplements },
    { label: 'Body Metrics', count: dataSummary.metrics },
    { label: 'Calendar Notes', count: dataSummary.calendarNotes },
    { label: 'Scheduled Buys', count: dataSummary.scheduledBuys }
  ].filter(item => item.count > 0);

  return (
    <Modal
      open={open}
      onClose={requestSubmitted ? handleClose : onClose}
      title={
        <div className="flex items-center gap-2">
          <Trash2 size={20} />
          <span>Delete Account Permanently</span>
        </div>
      }
      theme={theme}
      maxWidth="max-w-xl"
      footer={
        !requestSubmitted ? (
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
              style={{ 
                backgroundColor: theme?.secondary || '#e5e7eb', 
                color: theme?.text 
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !confirmed}
              className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ 
                backgroundColor: confirmed ? '#dc2626' : '#9ca3af',
                color: '#ffffff'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                'Request Account Deletion'
              )}
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-3 w-full">
            <button
              onClick={handleClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80"
              style={{ 
                backgroundColor: theme?.primary || '#344E41', 
                color: '#ffffff'
              }}
            >
              Close
            </button>
          </div>
        )
      }
    >
      {requestSubmitted ? (
        <div className="space-y-4 text-center py-4">
          <div className="flex justify-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme?.isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7' }}
            >
              <CheckCircle size={36} style={{ color: '#22c55e' }} />
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-bold mb-2" style={{ color: theme?.primaryDark }}>
              Request Received!
            </h3>
            <p className="text-sm mb-1" style={{ color: theme?.text }}>
              Your account deletion request has been submitted successfully.
            </p>
          </div>

          <div 
            className="rounded-lg p-4 text-left"
            style={{ 
              backgroundColor: theme?.isDark ? 'rgba(240, 238, 231, 0.05)' : '#f9fafb',
              border: `1px solid ${theme?.border}`
            }}
          >
            <div className="flex items-start gap-2 mb-3">
              <Mail size={16} className="mt-0.5 flex-shrink-0" style={{ color: theme?.primary }} />
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: theme?.text }}>
                  Confirmation Email
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: theme?.textLight }}>
                  A confirmation email will be sent to <strong>{firebaseUser?.email}</strong> once your account and data have been permanently deleted (within 48 hours).
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" style={{ color: '#dc2626' }} />
              <div>
                <p className="text-xs font-semibold mb-1" style={{ color: '#dc2626' }}>
                  Data Cannot Be Restored
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: theme?.textLight }}>
                  Once deleted, your research data is permanently removed and cannot be recovered.
                </p>
              </div>
            </div>
          </div>

          <div 
            className="rounded-lg p-4 text-center"
            style={{ 
              backgroundColor: theme?.isDark ? 'rgba(186, 166, 142, 0.1)' : 'rgba(186, 166, 142, 0.15)',
              border: `1px solid ${theme?.isDark ? 'rgba(186, 166, 142, 0.2)' : 'rgba(165, 148, 127, 0.3)'}`
            }}
          >
            <p className="text-xs font-semibold mb-1" style={{ color: theme?.text }}>
              We'd Love to Have You Back
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: theme?.textLight }}>
              If you decide to return to The Pep Planner in the future, you're always welcome to create a new account. We'll be here whenever you're ready.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Warning Banner */}
          <div 
            className="p-3 rounded-lg border flex items-start gap-2"
            style={{ 
              backgroundColor: theme?.isDark ? 'rgba(220, 38, 38, 0.1)' : '#fef2f2',
              borderColor: '#dc2626'
            }}
          >
            <AlertTriangle size={20} style={{ color: '#dc2626', flexShrink: 0 }} />
            <div>
              <h3 className="font-bold text-sm mb-0.5" style={{ color: '#dc2626' }}>
                This Action Cannot Be Undone
              </h3>
              <p className="text-xs" style={{ color: theme?.textLight }}>
                Once submitted, all your research data will be permanently deleted within 48 hours. This process is irreversible.
              </p>
            </div>
          </div>

          {/* User Info */}
          <div className="space-y-1">
            <h4 className="font-semibold text-xs opacity-70 uppercase tracking-wider" style={{ color: theme?.text }}>
              Account Information
            </h4>
            <div className="p-2 rounded-lg" style={{ backgroundColor: theme?.background }}>
              <p className="text-xs" style={{ color: theme?.text }}>
                <strong>Email:</strong> {firebaseUser?.email || 'Not available'}
              </p>
              {firebaseUser?.displayName && (
                <p className="text-xs mt-0.5" style={{ color: theme?.text }}>
                  <strong>Name:</strong> {firebaseUser.displayName}
                </p>
              )}
            </div>
          </div>

          {/* Data Summary */}
          <div className="space-y-1">
            <h4 className="font-semibold text-xs opacity-70 uppercase tracking-wider" style={{ color: theme?.text }}>
              Data That Will Be Deleted
            </h4>
            <div 
              className="p-3 rounded-lg border"
              style={{ 
                backgroundColor: theme?.background,
                borderColor: theme?.border
              }}
            >
              {dataList.length > 0 ? (
                <>
                  <p className="text-[10px] mb-2" style={{ color: theme?.textLight }}>
                    The following data will be permanently removed:
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    {dataList.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-xs">
                        <span style={{ color: theme?.text }}>{item.label}:</span>
                        <span className="font-semibold" style={{ color: theme?.primary }}>
                          {item.count}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 pt-2 border-t" style={{ borderColor: theme?.border }}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs" style={{ color: theme?.text }}>
                        Total Items:
                      </span>
                      <span className="font-bold text-sm" style={{ color: theme?.primary }}>
                        {totalItems}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-xs" style={{ color: theme?.textLight }}>
                  No research data found. Your account will still be deleted.
                </p>
              )}
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start gap-3 p-3 rounded-lg" style={{ backgroundColor: theme?.background }}>
            <input
              type="checkbox"
              id="confirm-deletion"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 w-4 h-4 rounded"
              style={{ accentColor: '#dc2626' }}
            />
            <label 
              htmlFor="confirm-deletion" 
              className="text-xs cursor-pointer leading-relaxed"
              style={{ color: theme?.text }}
            >
              I confirm that I want to delete my account and all associated research data. I understand this is permanent.
            </label>
          </div>
        </div>
      )}
    </Modal>
  );
}
