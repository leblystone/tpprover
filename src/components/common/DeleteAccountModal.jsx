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
      maxWidth="max-w-2xl"
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
        <div className="space-y-4 text-center">
          <div className="flex justify-center">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ backgroundColor: theme?.isDark ? 'rgba(34, 197, 94, 0.2)' : '#dcfce7' }}
            >
              <CheckCircle size={40} style={{ color: '#22c55e' }} />
            </div>
          </div>
          <h3 className="text-xl font-bold" style={{ color: theme?.primaryDark }}>
            Request Submitted Successfully
          </h3>
          <p className="text-sm" style={{ color: theme?.textLight }}>
            Your account deletion request has been sent. Once completed (within 48 hours), this action <strong>cannot be undone</strong>.
          </p>
          <p className="text-sm" style={{ color: theme?.textLight }}>
            A confirmation email will be sent to <strong>{firebaseUser?.email || 'your registered email'}</strong> upon completion.
          </p>
        </div>
      ) : (
        <>
        <div className="space-y-6">
          {/* Warning Banner */}
          <div 
          className="p-4 rounded-lg border-2 flex items-start gap-3"
          style={{ 
            backgroundColor: theme?.isDark ? 'rgba(220, 38, 38, 0.1)' : '#fef2f2',
            borderColor: '#dc2626'
          }}
        >
          <AlertTriangle size={24} style={{ color: '#dc2626', flexShrink: 0 }} />
          <div>
            <h3 className="font-bold text-base mb-1" style={{ color: '#dc2626' }}>
              This Action Cannot Be Undone
            </h3>
            <p className="text-sm" style={{ color: theme?.textLight }}>
              Once your account deletion request is submitted, all your research data will be permanently deleted within 48 hours. This process is irreversible.
            </p>
          </div>
        </div>

        {/* User Info */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm" style={{ color: theme?.text }}>
            Account Information
          </h4>
          <div className="p-3 rounded-lg" style={{ backgroundColor: theme?.background }}>
            <p className="text-sm" style={{ color: theme?.text }}>
              <strong>Email:</strong> {firebaseUser?.email || 'Not available'}
            </p>
            {firebaseUser?.displayName && (
              <p className="text-sm mt-1" style={{ color: theme?.text }}>
                <strong>Name:</strong> {firebaseUser.displayName}
              </p>
            )}
          </div>
        </div>

        {/* Data Summary */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm" style={{ color: theme?.text }}>
            Data That Will Be Deleted
          </h4>
          <div 
            className="p-4 rounded-lg border"
            style={{ 
              backgroundColor: theme?.background,
              borderColor: theme?.border
            }}
          >
            {dataList.length > 0 ? (
              <>
                <p className="text-xs mb-3" style={{ color: theme?.textLight }}>
                  The following data will be permanently removed for <strong>{firebaseUser?.email || 'your account'}</strong> within 48 hours:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {dataList.map((item, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span style={{ color: theme?.text }}>{item.label}:</span>
                      <span className="font-semibold" style={{ color: theme?.primary }}>
                        {item.count}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t" style={{ borderColor: theme?.border }}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm" style={{ color: theme?.text }}>
                      Total Items:
                    </span>
                    <span className="font-bold text-base" style={{ color: theme?.primary }}>
                      {totalItems}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm" style={{ color: theme?.textLight }}>
                No research data found. Your account will still be deleted.
              </p>
            )}
          </div>
        </div>

        {/* Additional Information */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm" style={{ color: theme?.text }}>
            What Happens Next
          </h4>
          <div className="space-y-2 text-sm" style={{ color: theme?.textLight }}>
            <p>• Your deletion request will be sent to our support team</p>
            <p>• Your account and all associated data will be permanently deleted within 48 hours</p>
            <p>• You will receive a confirmation email once the deletion is complete</p>
          </div>
        </div>

        {/* Confirmation Checkbox */}
        <div className="flex items-start gap-3 p-4 rounded-lg" style={{ backgroundColor: theme?.background }}>
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
            className="text-sm cursor-pointer"
            style={{ color: theme?.text }}
          >
            I understand that this action is permanent and cannot be undone. I confirm that I want to delete my account and all associated research data.
          </label>
        </div>
      </div>
        </>
      )}
    </Modal>
  );
}

