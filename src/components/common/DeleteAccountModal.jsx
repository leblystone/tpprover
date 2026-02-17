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
      const submitDeletionRequest = httpsCallable(functions, 'submitAccountDeletionRequest');
      
      const result = await submitDeletionRequest({
        dataSummary: dataSummary,
        userName: firebaseUser?.displayName || firebaseUser?.email?.split('@')[0],
        source: 'user_settings'
      });

      if (result.data.success) {
        // Show success message
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { 
            message: result.data.alreadyExists 
              ? 'You already have a pending deletion request. An admin will review it shortly.' 
              : 'Your account deletion request has been submitted. An admin will review it within 24-48 hours and send you a confirmation email once processed.', 
            type: 'success',
            duration: 7000
          }
        }));
        
        // Store deletion request status in localStorage
        localStorage.setItem('tpp_deletion_request_submitted', JSON.stringify({
          requestId: result.data.requestId,
          submittedAt: new Date().toISOString()
        }));
        
        // Dispatch event for UI updates
        window.dispatchEvent(new CustomEvent('tpp:deletion-request-submitted'));
        
        // Close modal
        handleClose();
      } else {
        throw new Error(result.data.message || 'Failed to submit deletion request');
      }
    } catch (error) {
      console.error('Error submitting deletion request:', error);
      
      // Provide more helpful error messages
      let errorMessage = 'Failed to submit deletion request. ';
      
      if (error.code === 'functions/not-found' || error.message?.includes('CORS') || error.message?.includes('ERR_FAILED')) {
        errorMessage += 'The function may not be deployed yet. Please contact support at contact@thepepplanner.com to request account deletion.';
      } else if (error.code === 'functions/unauthenticated') {
        errorMessage += 'You must be logged in to request account deletion.';
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
    setConfirmed(false);
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
      onClose={isSubmitting ? undefined : onClose}
      title={
        <div className="flex items-center gap-2">
          <Trash2 size={20} />
          <span>Request Account Deletion</span>
        </div>
      }
      theme={theme}
      maxWidth="max-w-xl"
      footer={
        !isSubmitting ? (
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
                  Submitting Request...
                </>
              ) : (
                'Submit Deletion Request'
              )}
            </button>
          </div>
        ) : null
      }
    >
      {isSubmitting ? (
        <div className="space-y-4 text-center py-4">
          <div className="flex justify-center">
            <Loader size={48} className="animate-spin" style={{ color: theme?.primary }} />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: theme?.primaryDark }}>
              Submitting Request...
            </h3>
            <p className="text-sm" style={{ color: theme?.text }}>
              Please wait while we submit your account deletion request to our admin team.
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
              <h3 className="font-semibold text-sm mb-0.5" style={{ color: '#dc2626' }}>
                Account Deletion Request
              </h3>
              <p className="text-xs" style={{ color: theme?.textLight }}>
                Your request will be reviewed by an admin within 24-48 hours. Once approved, your account and all research data will be permanently deleted. This action cannot be undone.
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
              I confirm that I want to request deletion of my account and all associated research data. I understand this action is permanent once approved.
            </label>
          </div>
        </div>
      )}
    </Modal>
  );
}
