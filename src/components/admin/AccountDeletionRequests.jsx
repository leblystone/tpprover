import React, { useState, useEffect } from 'react';
import { 
  Trash, ArrowsClockwise, MagnifyingGlass, Calendar, User, Envelope, WarningCircle, 
  CheckCircle, X, Info, CircleNotch, CreditCard, Clock
} from '@phosphor-icons/react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, functions } from '../../config/firebase';
import { httpsCallable } from 'firebase/functions';
import { formatDateTime } from '../../utils/date';

function formatScheduledDate(value) {
  if (!value) return 'Unknown';
  const date = value?.toDate ? value.toDate() : value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'America/New_York',
  });
}

function providerBadgeStyle(provider, theme) {
  const p = (provider || '').toLowerCase();
  if (p === 'stripe') return { bg: '#ede9fe', color: '#5b21b6' };
  if (p === 'google_play') return { bg: '#dcfce7', color: '#166534' };
  if (p === 'apple') return { bg: '#f3f4f6', color: '#111827' };
  return { bg: theme.secondary, color: theme.textLight };
}

function getScheduleConfirmMessage(request, preview) {
  const email = request.userEmail;
  const date =
    preview?.displayDate ||
    (preview?.currentPeriodEnd ? formatScheduledDate(preview.currentPeriodEnd) : null) ||
    (request.subscriptionInfo?.currentPeriodEnd
      ? formatScheduledDate(request.subscriptionInfo.currentPeriodEnd)
      : 'the end of their billing period');
  const provider = preview?.provider || request.subscriptionInfo?.paymentProvider;

  if (provider === 'apple') {
    return `Schedule deletion for ${email}?\n\n• Deletion date: ${date}\n• Apple: User MUST cancel auto-renew in Settings → Apple ID → Subscriptions\n• Deletion completes after their App Store subscription ends\n• User receives scheduled-deletion email with App Store steps\n• Final goodbye email when account is deleted`;
  }
  if (provider === 'google_play') {
    return `Schedule deletion for ${email}?\n\n• Google Play: renewals stop at period end (access until ${date})\n• Account fully deleted around ${date}\n• User receives scheduled-deletion email\n• Final goodbye email when deletion runs`;
  }
  return `Schedule deletion for ${email}?\n\n• Stripe: cancel at period end (no new charges)\n• Account fully deleted around ${date}\n• User receives scheduled-deletion email\n• Final goodbye email when deletion runs`;
}

function getPreviewForRequest(schedulePreviews, requestId) {
  return schedulePreviews[requestId] || null;
}

function canShowScheduleButton(request, preview) {
  if (request.status !== 'pending') return false;
  if (preview) return preview.canSchedule === true;
  return request.subscriptionInfo?.canSchedule === true || request.subscriptionInfo?.hasSubscription === true;
}

export default function AccountDeletionRequests({ theme }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [schedulePreviews, setSchedulePreviews] = useState({});
  const [previewsLoading, setPreviewsLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [stats, setStats] = useState({
    pending: 0,
    scheduled: 0,
    approved: 0,
    rejected: 0
  });
  const [manualDeleteEmail, setManualDeleteEmail] = useState('');
  const [isManualDeleting, setIsManualDeleting] = useState(false);

  useEffect(() => {
    const unsubscribe = loadRequests();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  useEffect(() => {
    const pending = requests.filter((r) => r.status === 'pending');
    if (pending.length === 0) {
      setSchedulePreviews({});
      return;
    }

    let cancelled = false;
    const loadPreviews = async () => {
      setPreviewsLoading(true);
      const previewFn = httpsCallable(functions, 'adminPreviewDeletionSchedule');
      const next = {};

      await Promise.all(
        pending.map(async (req) => {
          try {
            const res = await previewFn({ requestId: req.id });
            if (res.data?.success) {
              next[req.id] = res.data;
            }
          } catch (err) {
            console.warn('Preview failed for', req.id, err);
            next[req.id] = {
              canSchedule: req.subscriptionInfo?.canSchedule === true,
              scheduleBlockReason: err.message || 'Could not load live subscription',
              provider: req.subscriptionInfo?.paymentProvider,
              providerLabel: null,
              status: req.subscriptionInfo?.status,
              currentPeriodEnd: req.subscriptionInfo?.currentPeriodEnd,
            };
          }
        })
      );

      if (!cancelled) {
        setSchedulePreviews(next);
        setPreviewsLoading(false);
      }
    };

    loadPreviews();
    return () => {
      cancelled = true;
    };
  }, [requests]);

  const loadRequests = () => {
    setLoading(true);
    try {
      const requestsRef = collection(db, 'accountDeletionRequests');
      const q = query(requestsRef, orderBy('requestedAt', 'desc'));

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const requestData = [];
          let pending = 0, scheduled = 0, approved = 0, rejected = 0;
          
          snapshot.forEach((doc) => {
            const data = {
              id: doc.id,
              ...doc.data()
            };
            requestData.push(data);
            
            if (data.status === 'pending') pending++;
            else if (data.status === 'scheduled') scheduled++;
            else if (data.status === 'approved') approved++;
            else if (data.status === 'rejected') rejected++;
          });

          setRequests(requestData);
          setStats({ pending, scheduled, approved, rejected });
          setLoading(false);
        },
        (error) => {
          console.error('Error loading deletion requests:', error);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (error) {
      console.error('Error setting up deletion requests listener:', error);
      setLoading(false);
      return null;
    }
  };

  const handleApprove = async (request) => {
    // No confirm dialog — user already requested deletion (privacy); one click to approve.
    setProcessingId(request.id);

    try {
      const adminTerminateUser = httpsCallable(functions, 'adminTerminateUser');

      const result = await adminTerminateUser({
        userId: request.userId,
        email: request.userEmail
      });

      if (result.data.success) {
        const now = new Date();
        // Optimistically move request out of pending so the list updates immediately
        setRequests((prev) =>
          prev.map((r) =>
            r.id === request.id
              ? { ...r, status: 'approved', processedAt: now, processedBy: 'admin' }
              : r
          )
        );

        // Persist status in Firestore (best-effort; list already updated above)
        try {
          const requestRef = doc(db, 'accountDeletionRequests', request.id);
          await updateDoc(requestRef, {
            status: 'approved',
            processedAt: now,
            processedBy: 'admin'
          });
        } catch (updateErr) {
          console.warn('Could not update deletion request status in Firestore:', updateErr);
        }

        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: {
            message: `✅ Account deleted. ${request.userEmail} has been removed and sent a confirmation email.`,
            type: 'success',
            duration: 5000
          }
        }));
      } else {
        throw new Error(result.data.message || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error approving deletion:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: {
          message: `❌ Error deleting account: ${error.message}`,
          type: 'error',
          duration: 7000
        }
      }));
    } finally {
      setProcessingId(null);
    }
  };

  const handleSchedule = async (request) => {
    const preview = getPreviewForRequest(schedulePreviews, request.id);

    if (preview && !preview.canSchedule) {
      window.dispatchEvent(
        new CustomEvent('tpp:toast', {
          detail: {
            message: preview.scheduleBlockReason || 'Cannot schedule this request',
            type: 'warning',
            duration: 6000,
          },
        })
      );
      return;
    }

    if (!window.confirm(getScheduleConfirmMessage(request, preview))) {
      return;
    }

    setProcessingId(request.id);

    try {
      const scheduleDeletion = httpsCallable(functions, 'adminScheduleAccountDeletion');
      const result = await scheduleDeletion({ requestId: request.id });

      if (result.data?.success) {
        window.dispatchEvent(
          new CustomEvent('tpp:toast', {
            detail: {
              message: `📅 Scheduled: ${request.userEmail} — deletion on ${result.data.displayDate || result.data.scheduledDeleteAt}. Scheduled email sent.`,
              type: 'success',
              duration: 7000,
            },
          })
        );
      } else {
        throw new Error(result.data?.message || 'Failed to schedule deletion');
      }
    } catch (error) {
      console.error('Error scheduling deletion:', error);
      window.dispatchEvent(
        new CustomEvent('tpp:toast', {
          detail: {
            message: `❌ Could not schedule: ${error.message}`,
            type: 'error',
            duration: 7000,
          },
        })
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleRetryBilling = async (request) => {
    setProcessingId(request.id);
    try {
      const retryBilling = httpsCallable(functions, 'adminRetryScheduledBilling');
      const result = await retryBilling({ requestId: request.id });
      if (result.data?.success) {
        window.dispatchEvent(
          new CustomEvent('tpp:toast', {
            detail: {
              message: `✅ Billing updated for ${request.userEmail}`,
              type: 'success',
              duration: 5000,
            },
          })
        );
      } else {
        throw new Error(result.data?.message || result.data?.platformSchedule?.warning || 'Retry failed');
      }
    } catch (error) {
      console.error('Error retrying billing:', error);
      window.dispatchEvent(
        new CustomEvent('tpp:toast', {
          detail: {
            message: `❌ ${error.message}`,
            type: 'error',
            duration: 7000,
          },
        })
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelSchedule = async (request) => {
    if (
      !window.confirm(
        `Cancel scheduled deletion for ${request.userEmail}?\n\nTheir request will return to pending. Stripe cancel-at-period-end will be reverted if applicable.`
      )
    ) {
      return;
    }

    setProcessingId(request.id);

    try {
      const cancelScheduled = httpsCallable(functions, 'adminCancelScheduledDeletion');
      const result = await cancelScheduled({ requestId: request.id });

      if (result.data?.success) {
        window.dispatchEvent(
          new CustomEvent('tpp:toast', {
            detail: {
              message: `Scheduled deletion cancelled for ${request.userEmail}. Request is pending again.`,
              type: 'info',
              duration: 5000,
            },
          })
        );
      } else {
        throw new Error(result.data?.message || 'Failed to cancel schedule');
      }
    } catch (error) {
      console.error('Error cancelling scheduled deletion:', error);
      window.dispatchEvent(
        new CustomEvent('tpp:toast', {
          detail: {
            message: `❌ Error: ${error.message}`,
            type: 'error',
            duration: 7000,
          },
        })
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (request) => {
    const reason = window.prompt('Optional: Enter a reason for rejecting this deletion request (will be shown to the user):');
    if (reason === null) return; // User cancelled

    setProcessingId(request.id);

    try {
      const requestRef = doc(db, 'accountDeletionRequests', request.id);
      await updateDoc(requestRef, {
        status: 'rejected',
        processedAt: new Date(),
        processedBy: 'admin',
        rejectionReason: reason || 'No reason provided'
      });

      // Clear localStorage flag if exists
      localStorage.removeItem('tpp_deletion_request_submitted');

      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          message: `Deletion request rejected. You may want to email ${request.userEmail} to explain.`, 
          type: 'info',
          duration: 5000
        }
      }));
    } catch (error) {
      console.error('Error rejecting deletion:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          message: `Error rejecting request: ${error.message}`, 
          type: 'error',
          duration: 5000
        }
      }));
    } finally {
      setProcessingId(null);
    }
  };

  const handleManualDelete = async () => {
    if (!manualDeleteEmail || !manualDeleteEmail.includes('@')) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          message: 'Please enter a valid email address', 
          type: 'warning'
        }
      }));
      return;
    }

    if (!window.confirm(`⚠️ ARE YOU ABSOLUTELY SURE?\n\nThis will PERMANENTLY DELETE the account for:\n${manualDeleteEmail}\n\nThis action:\n• Sends a goodbye email to the user\n• Cancels their subscription (if any)\n• Deletes ALL their data from Firestore\n• Deletes their Firebase Auth account\n• CANNOT BE UNDONE\n\nType the email again to confirm.`)) {
      return;
    }

    const confirmEmail = window.prompt(`Type the email address to confirm deletion:\n\n${manualDeleteEmail}`);
    if (confirmEmail !== manualDeleteEmail) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          message: 'Email mismatch. Deletion cancelled for safety.', 
          type: 'warning'
        }
      }));
      return;
    }

    setIsManualDeleting(true);

    try {
      const adminTerminateUser = httpsCallable(functions, 'adminTerminateUser');
      
      const result = await adminTerminateUser({
        email: manualDeleteEmail
      });

      if (result.data.success) {
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { 
            message: `✅ Account ${manualDeleteEmail} deleted successfully! Goodbye email sent to user.`, 
            type: 'success',
            duration: 7000
          }
        }));
        
        // Clear the input
        setManualDeleteEmail('');
      } else {
        throw new Error(result.data.message || 'Failed to delete account');
      }
    } catch (error) {
      console.error('Error manually deleting account:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { 
          message: `❌ Error: ${error.message}`, 
          type: 'error',
          duration: 7000
        }
      }));
    } finally {
      setIsManualDeleting(false);
    }
  };

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.userName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const pendingRequests = filteredRequests.filter(r => r.status === 'pending');
  const scheduledRequests = filteredRequests.filter(r => r.status === 'scheduled');
  const processedRequests = filteredRequests.filter(
    r => !['pending', 'scheduled'].includes(r.status)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <ArrowsClockwise className="animate-spin" size={24} style={{ color: theme.primary }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Manual Deletion Section */}
      <div className="p-4 rounded-lg border" style={{ borderColor: '#dc2626', backgroundColor: theme.cardBackground }}>
        <div className="flex items-start gap-3 mb-3">
          <WarningCircle size={20} style={{ color: '#dc2626', flexShrink: 0, marginTop: 2 }} />
          <div className="flex-1">
            <h3 className="font-bold text-sm mb-1" style={{ color: '#dc2626' }}>
              Manual User Deletion (Emergency Use Only)
            </h3>
            <p className="text-xs mb-3" style={{ color: theme.textLight }}>
              Delete a user account by email address. Use this for legacy requests or emergency deletions. 
              The user will receive a goodbye email confirmation.
            </p>
            
            <div className="flex items-center gap-2">
              <input
                type="email"
                placeholder="Enter user email address..."
                value={manualDeleteEmail}
                onChange={(e) => setManualDeleteEmail(e.target.value)}
                disabled={isManualDeleting}
                className="flex-1 px-3 py-2 rounded-lg border text-sm"
                style={{ 
                  borderColor: theme.border, 
                  backgroundColor: theme.background, 
                  color: theme.text 
                }}
              />
              <button
                onClick={handleManualDelete}
                disabled={isManualDeleting || !manualDeleteEmail}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
                style={{ backgroundColor: '#dc2626' }}
              >
                {isManualDeleting ? (
                  <>
                    <CircleNotch size={14} className="animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash size={14} />
                    Delete User
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: theme.textLight }}>Pending Requests</p>
              <p className="text-2xl font-bold mt-1" style={{ color: theme.text }}>{stats.pending}</p>
            </div>
            <Clock size={24} style={{ color: '#f59e0b' }} />
          </div>
        </div>

        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: theme.textLight }}>Scheduled</p>
              <p className="text-2xl font-bold mt-1" style={{ color: theme.text }}>{stats.scheduled}</p>
            </div>
            <Calendar size={24} style={{ color: '#6366f1' }} />
          </div>
        </div>
        
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: theme.textLight }}>Approved</p>
              <p className="text-2xl font-bold mt-1" style={{ color: theme.text }}>{stats.approved}</p>
            </div>
            <CheckCircle size={24} style={{ color: '#10b981' }} />
          </div>
        </div>
        
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: theme.textLight }}>Rejected</p>
              <p className="text-2xl font-bold mt-1" style={{ color: theme.text }}>{stats.rejected}</p>
            </div>
            <X size={24} style={{ color: '#ef4444' }} />
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="flex items-start gap-2">
          <Info size={20} style={{ color: theme.primary }} />
          <div className="flex-1">
            <p className="text-sm font-semibold mb-1" style={{ color: theme.text }}>
              Manual Account Deletion Management
            </p>
            <p className="text-xs" style={{ color: theme.textLight }}>
              Users submit deletion requests from settings and other flows. For paid subscribers on
              <strong> Stripe</strong>, <strong>Google Play</strong>, or <strong>Apple</strong>, use
              <strong> Schedule after billing</strong> — billing stops at period end (platform-specific), account deletes automatically, scheduled-date email, then final goodbye email.
              <strong> Apple:</strong> user must cancel in App Store. Use <strong>Delete now</strong> for trial, expired, or no active paid period.
            </p>
          </div>
        </div>
      </div>

      {/* MagnifyingGlass */}
      <div className="flex items-center gap-2">
        <MagnifyingGlass size={20} style={{ color: theme.textLight }} />
        <input
          type="text"
          placeholder="Search by email or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border"
          style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
        />
        <button
          onClick={loadRequests}
          className="px-4 py-2 rounded-lg border flex items-center gap-2 transition-all hover:opacity-80"
          style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
        >
          <ArrowsClockwise size={16} />
          <span className="text-sm">Refresh</span>
        </button>
      </div>

      {/* Pending Requests */}
      <div>
        <h3 className="text-lg font-bold mb-3" style={{ color: theme.text }}>
          Pending Requests ({pendingRequests.length})
        </h3>
        
        {pendingRequests.length === 0 ? (
          <div className="p-8 text-center rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <CheckCircle size={48} className="mx-auto mb-3" style={{ color: theme.primary, opacity: 0.3 }} />
            <p className="text-sm" style={{ color: theme.textLight }}>
              No pending deletion requests. All caught up! 🎉
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingRequests.map(request => {
              const preview = getPreviewForRequest(schedulePreviews, request.id);
              const provider =
                preview?.provider || request.subscriptionInfo?.paymentProvider;
              const providerLabel =
                preview?.providerLabel ||
                (provider === 'stripe'
                  ? 'Stripe'
                  : provider === 'google_play'
                    ? 'Google Play'
                    : provider === 'apple'
                      ? 'Apple'
                      : null);
              const badge = providerBadgeStyle(provider, theme);
              const showSchedule = canShowScheduleButton(request, preview);
              const periodEnd =
                preview?.currentPeriodEnd || request.subscriptionInfo?.currentPeriodEnd;

              return (
              <div 
                key={request.id} 
                className="p-4 rounded-lg border"
                style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Envelope size={16} style={{ color: theme.primary }} />
                      <span className="font-semibold" style={{ color: theme.text }}>
                        {request.userEmail}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                        Pending
                      </span>
                      {providerLabel && (
                        <span
                          className="text-xs px-2 py-0.5 rounded font-semibold"
                          style={{ backgroundColor: badge.bg, color: badge.color }}
                        >
                          {providerLabel}
                        </span>
                      )}
                      {previewsLoading && !preview && (
                        <span className="text-xs" style={{ color: theme.textLight }}>
                          Loading billing…
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm" style={{ color: theme.textLight }}>
                      <User size={14} />
                      <span>{request.userName || 'Unknown'}</span>
                    </div>
                    
                    <div className="flex items-center gap-3 text-sm" style={{ color: theme.textLight }}>
                      <Calendar size={14} />
                      <span>Requested: {request.requestedAt?.toDate ? formatDateTime(request.requestedAt.toDate()) : 'Unknown'}</span>
                    </div>

                    <div className="flex items-center gap-3 text-sm" style={{ color: theme.textLight }}>
                      <Info size={14} />
                      <span>Source: {request.source || 'unknown'}</span>
                    </div>

                    {/* Subscription: always show status at request time so you can verify paid vs trial */}
                    {request.subscriptionInfo != null && (
                      <div className="flex flex-col gap-1 mt-2 text-xs" style={{ color: theme.textLight }}>
                        <div className="flex items-center gap-2 flex-wrap">
                          <CreditCard size={14} style={{ opacity: 0.8 }} />
                          <span>
                            Subscription:{' '}
                            <strong style={{ color: theme.text, textTransform: 'capitalize' }}>
                              {preview?.status || request.subscriptionInfo.status || 'none'}
                            </strong>
                            {showSchedule && (
                              <span className="ml-2 font-semibold" style={{ color: '#4f46e5' }}>
                                — Schedule recommended
                              </span>
                            )}
                            {periodEnd && (
                              <span className="ml-2">
                                · Period ends {formatScheduledDate(periodEnd)}
                                {preview?.displayDate ? ' (live)' : ''}
                              </span>
                            )}
                          </span>
                        </div>
                        {preview && !preview.canSchedule && preview.scheduleBlockReason && (
                          <span style={{ color: '#b45309' }}>
                            Cannot schedule: {preview.scheduleBlockReason}
                          </span>
                        )}
                        {provider === 'apple' && showSchedule && (
                          <span
                            className="px-2 py-1 rounded"
                            style={{ backgroundColor: '#fef3c7', color: '#92400e' }}
                          >
                            Apple: user must cancel subscription in App Store before deletion can complete.
                          </span>
                        )}
                      </div>
                    )}

                    {request.dataSummary?.totalItems > 0 && (
                      <div className="text-xs mt-2" style={{ color: theme.textLight }}>
                        Data to delete: {request.dataSummary.totalItems} items
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 min-w-[200px]">
                    <button
                      onClick={() => handleSchedule(request)}
                      disabled={
                        processingId === request.id ||
                        previewsLoading ||
                        (preview && !preview.canSchedule)
                      }
                      title={
                        preview && !preview.canSchedule
                          ? preview.scheduleBlockReason
                          : 'Schedule deletion after billing period ends'
                      }
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      style={{
                        backgroundColor: showSchedule ? '#4f46e5' : theme.secondary,
                        color: showSchedule ? '#fff' : theme.textLight,
                      }}
                    >
                      {processingId === request.id ? (
                        <>
                          <CircleNotch size={14} className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Calendar size={14} />
                          Schedule after billing
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => handleApprove(request)}
                      disabled={processingId === request.id}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 border"
                      style={{
                        backgroundColor: showSchedule ? theme.background : '#dc2626',
                        color: showSchedule ? theme.text : '#fff',
                        borderColor: showSchedule ? theme.border : '#dc2626',
                      }}
                    >
                      {processingId === request.id ? (
                        <>
                          <CircleNotch size={14} className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Trash size={14} />
                          {showSchedule ? 'Delete now' : 'Approve & Delete'}
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleReject(request)}
                      disabled={processingId === request.id}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      style={{ backgroundColor: theme.secondary, color: theme.text }}
                    >
                      <X size={14} />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            );
            })}
          </div>
        )}
      </div>

      {/* Scheduled Requests */}
      {scheduledRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-3" style={{ color: theme.text }}>
            Scheduled Deletions ({scheduledRequests.length})
          </h3>
          <div className="space-y-3">
            {scheduledRequests.map((request) => (
              <div
                key={request.id}
                className="p-4 rounded-lg border"
                style={{ borderColor: '#c7d2fe', backgroundColor: theme.cardBackground }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Envelope size={16} style={{ color: theme.primary }} />
                      <span className="font-semibold" style={{ color: theme.text }}>
                        {request.userEmail}
                      </span>
                      <span
                        className="text-xs px-2 py-0.5 rounded font-semibold"
                        style={{ backgroundColor: '#e0e7ff', color: '#3730a3' }}
                      >
                        Scheduled
                      </span>
                    </div>
                    <div className="text-sm" style={{ color: theme.textLight }}>
                      <Calendar size={14} className="inline mr-1" />
                      Deletes on:{' '}
                      <strong style={{ color: theme.text }}>
                        {formatScheduledDate(request.scheduledDeleteAt)}
                      </strong>
                    </div>
                    {request.subscriptionInfo?.status && (
                      <div className="text-xs space-y-1" style={{ color: theme.textLight }}>
                        <div>
                          Subscription: {request.subscriptionInfo.status}
                          {request.platformSchedule?.provider && (
                            <span className="ml-2 font-semibold" style={{ color: theme.text }}>
                              · {request.platformSchedule.provider === 'google_play'
                                ? 'Google Play'
                                : request.platformSchedule.provider === 'apple'
                                  ? 'Apple'
                                  : 'Stripe'}
                              {request.platformSchedule.ok ? ' — renewals stopped' : ' — action pending'}
                            </span>
                          )}
                          {!request.platformSchedule && request.stripeCancelAtPeriodEnd && (
                            <span> · Stripe cancel at period end</span>
                          )}
                        </div>
                        {request.platformSchedule?.warning && (
                          <div className="px-2 py-1 rounded" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                            {request.platformSchedule.warning}
                          </div>
                        )}
                        {(request.platformSchedule?.provider === 'apple' ||
                          request.subscriptionInfo?.paymentProvider === 'apple') && (
                          <div className="px-2 py-1 rounded" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                            App Store cancel required: user must disable auto-renew in Settings → Apple ID → Subscriptions.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 min-w-[160px]">
                    {(!request.platformSchedule?.ok || request.platformSchedule?.action === 'unsupported_provider') && (
                      <button
                        onClick={() => handleRetryBilling(request)}
                        disabled={processingId === request.id}
                        className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ backgroundColor: '#4f46e5' }}
                      >
                        {processingId === request.id ? (
                          <>
                            <CircleNotch size={14} className="animate-spin" />
                            Retrying...
                          </>
                        ) : (
                          'Retry billing setup'
                        )}
                      </button>
                    )}
                    <button
                      onClick={() => handleCancelSchedule(request)}
                      disabled={processingId === request.id}
                      className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-80 disabled:opacity-50"
                      style={{ backgroundColor: theme.secondary, color: theme.text }}
                    >
                      Cancel schedule
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-3" style={{ color: theme.text }}>
            Processed Requests ({processedRequests.length})
          </h3>
          
          <div className="space-y-2">
            {processedRequests.slice(0, 10).map(request => (
              <div 
                key={request.id} 
                className="p-3 rounded-lg border opacity-60"
                style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium" style={{ color: theme.text }}>
                      {request.userEmail}
                    </span>
                    <span 
                      className="text-xs px-2 py-0.5 rounded font-semibold"
                      style={{ 
                        backgroundColor:
                          request.status === 'approved'
                            ? '#dcfce7'
                            : request.status === 'failed'
                              ? '#fef3c7'
                              : '#fee2e2',
                        color:
                          request.status === 'approved'
                            ? '#166534'
                            : request.status === 'failed'
                              ? '#92400e'
                              : '#991b1b',
                      }}
                    >
                      {request.status === 'approved'
                        ? '✅ Approved'
                        : request.status === 'failed'
                          ? '⚠️ Failed'
                          : '❌ Rejected'}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: theme.textLight }}>
                    {request.processedAt ? formatDateTime(request.processedAt?.toDate ? request.processedAt.toDate() : request.processedAt) : 'Unknown'}
                  </span>
                </div>
                {request.rejectionReason && (
                  <p className="text-xs mt-1" style={{ color: theme.textLight }}>
                    Reason: {request.rejectionReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
