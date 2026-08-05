import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Envelope, ArrowsClockwise, MagnifyingGlass, Funnel, CheckCircle, XCircle, Clock, FileText, Trash, UserPlus, Gift, Bell, WarningCircle, PaperPlaneTilt, CircleNotch } from '@phosphor-icons/react';
import CustomDropdown from '../common/inputs/CustomDropdown';

const EMAIL_TYPE_LABELS = {
  winBack: 'Win-Back Campaign',
  trialExpiredSurvey: 'Trial Expired Survey',
  account_deletion: 'Account Deletion',
  in_depth_request: 'In-Depth Request',
  invite: 'Invite',
  lifetime_access: 'Lifetime Access',
  announcement: 'Announcement',
  welcome: 'Welcome',
  verification: 'Verification',
  password_reset: 'Password Reset',
  magic_link: 'Passwordless Sign In',
  trial_ending: 'Trial Ending',
  renewal_reminder: 'Renewal Reminder',
  payment_successful: 'Payment Successful',
  payment_failed: 'Payment Failed',
  subscription_confirmed: 'Subscription Confirmed',
  subscription_cancelled: 'Subscription Cancelled',
  gift_expiring_soon: 'Gift Expiring Soon',
  weekly_research_reminder: 'Weekly Research Reminder',
  email_change_notification: 'Email Change (Security Alert)',
  email_change_verification: 'Email Change (Verify New Email)',
  email_change_verification_resend: 'Email Change (Resend Verify Link)',
  dispute_notification: 'Dispute – Notification',
  dispute_status_update: 'Dispute – Status Update',
  dispute_resolution: 'Dispute – Resolution',
  account_deletion_request_confirmation: 'Account Deletion Request – Confirmation'
};

const EMAIL_TYPE_ICONS = {
  winBack: Gift,
  trialExpiredSurvey: WarningCircle,
  account_deletion: Trash,
  in_depth_request: FileText,
  invite: UserPlus,
  lifetime_access: Gift,
  announcement: Bell,
  welcome: Envelope,
  verification: Envelope,
  password_reset: Envelope,
  magic_link: Envelope,
  trial_ending: WarningCircle,
  renewal_reminder: Clock,
  payment_successful: CheckCircle,
  payment_failed: XCircle,
  subscription_confirmed: CheckCircle,
  subscription_cancelled: XCircle,
  gift_expiring_soon: WarningCircle,
  weekly_research_reminder: Bell,
  email_change_notification: Bell,
  email_change_verification: Envelope,
  email_change_verification_resend: Envelope,
  dispute_notification: WarningCircle,
  dispute_status_update: WarningCircle,
  dispute_resolution: CheckCircle,
  account_deletion_request_confirmation: Trash
};

const EMAIL_TYPE_COLORS = {
  winBack: '#ec4899',
  trialExpiredSurvey: '#f97316',
  account_deletion: '#ef4444',
  in_depth_request: '#3b82f6',
  invite: '#10b981',
  lifetime_access: '#8b5cf6',
  announcement: '#f59e0b',
  welcome: '#06b6d4',
  verification: '#06b6d4',
  password_reset: '#06b6d4',
  magic_link: '#6366f1',
  trial_ending: '#f59e0b',
  renewal_reminder: '#3b82f6',
  payment_successful: '#10b981',
  payment_failed: '#ef4444',
  subscription_confirmed: '#10b981',
  subscription_cancelled: '#ef4444',
  gift_expiring_soon: '#f59e0b',
  weekly_research_reminder: '#3b82f6',
  email_change_notification: '#f59e0b',
  email_change_verification: '#06b6d4',
  email_change_verification_resend: '#8b5cf6',
  dispute_notification: '#ef4444',
  dispute_status_update: '#f59e0b',
  dispute_resolution: '#10b981',
  account_deletion_request_confirmation: '#6b7280'
};

const INITIAL_VISIBLE = 6;

export default function EmailHistory({ theme }) {
  const [emailHistory, setEmailHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState(null);
  const [resendingEmailId, setResendingEmailId] = useState(null);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  useEffect(() => {
    loadEmailHistory();
  }, [showAll]);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [searchTerm, filterType, filterStatus]);

  const loadEmailHistory = async () => {
    try {
      setLoading(true);
      
      // Debug logging
      console.log('🔍 Loading email history...');
      console.log('📊 showAll:', showAll);
      
      const historyQuery = query(
        collection(db, 'emailHistory'),
        orderBy('sentAt', 'desc'),
        limit(showAll ? 200 : 50)
      );
      
      const snapshot = await getDocs(historyQuery);
      
      console.log('✅ Email history loaded:', {
        totalDocs: snapshot.docs.length,
        empty: snapshot.empty,
        size: snapshot.size
      });
      
      const history = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        sentAt: doc.data().sentAt?.toDate ? doc.data().sentAt.toDate() : (doc.data().sentAt ? new Date(doc.data().sentAt) : new Date())
      }));
      
      console.log('📧 Parsed email history:', history);
      
      setEmailHistory(history);
    } catch (error) {
      console.error('❌ Error loading email history:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Check for specific errors
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: '❌ Firestore index required. Check console for link.', type: 'error' }
        }));
      } else if (error.code === 'permission-denied') {
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: '❌ Permission denied. Make sure you\'re logged in as admin.', type: 'error' }
        }));
      } else {
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: '❌ Failed to load email history', type: 'error' }
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredEmails = emailHistory.filter(email => {
    const matchesSearch = !searchTerm || 
      email.recipientEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.recipientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      email.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      EMAIL_TYPE_LABELS[email.type]?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === 'all' || email.type === filterType;
    const matchesStatus = filterStatus === 'all' || email.status === filterStatus;
    
    return matchesSearch && matchesType && matchesStatus;
  });

  const uniqueTypes = [...new Set(emailHistory.map(e => e.type))].sort();
  const visibleEmails = filteredEmails.slice(0, visibleCount);
  const remainingCount = Math.max(0, filteredEmails.length - visibleCount);

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    try {
      return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getEmailTypeLabel = (type) => {
    return EMAIL_TYPE_LABELS[type] || type || 'Unknown';
  };

  const getEmailTypeIcon = (type) => {
    const Icon = EMAIL_TYPE_ICONS[type] || Envelope;
    return Icon;
  };

  const getEmailTypeColor = (type) => {
    return EMAIL_TYPE_COLORS[type] || theme.primary;
  };

  const handleResendEmail = async (email, e) => {
    e.stopPropagation(); // Prevent expanding the email card
    
    if (!confirm(`Resend ${getEmailTypeLabel(email.type)} email to ${email.recipientEmail}?`)) {
      return;
    }

    setResendingEmailId(email.id);
    
    try {
      const functions = getFunctions();
      const resendEmail = httpsCallable(functions, 'resendEmail');
      
      const result = await resendEmail({
        emailHistoryId: email.id,
        type: email.type,
        recipientEmail: email.recipientEmail,
        recipientName: email.recipientName,
        subject: email.subject,
        customContent: email.customContent,
        inviteLink: email.inviteLink,
        reason: email.reason
      });

      if (result.data?.success) {
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: `✅ Email resent successfully to ${email.recipientEmail}`, type: 'success' }
        }));
        // Reload email history to show the new entry
        await loadEmailHistory();
      } else {
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: `❌ Failed to resend email: ${result.data?.message || 'Unknown error'}`, type: 'error' }
        }));
      }
    } catch (error) {
      console.error('Error resending email:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: `❌ Failed to resend email: ${error.message}`, type: 'error' }
      }));
    } finally {
      setResendingEmailId(null);
    }
  };

  const typeOptions = [
    {
      value: 'all',
      label: 'All Types',
      icon: <Funnel size={18} weight="duotone" style={{ color: theme.primary }} />,
    },
    ...uniqueTypes.map((type) => {
      const TypeIcon = getEmailTypeIcon(type);
      return {
        value: type,
        label: getEmailTypeLabel(type),
        icon: <TypeIcon size={18} weight="duotone" style={{ color: getEmailTypeColor(type) }} />,
      };
    }),
  ];

  const statusOptions = [
    {
      value: 'all',
      label: 'All Statuses',
      icon: <Funnel size={18} weight="duotone" style={{ color: theme.primary }} />,
    },
    {
      value: 'sent',
      label: 'Sent',
      icon: <CheckCircle size={18} weight="duotone" style={{ color: '#059669' }} />,
    },
    {
      value: 'failed',
      label: 'Failed',
      icon: <XCircle size={18} weight="duotone" style={{ color: '#dc2626' }} />,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Filters — matches Triggers tab controls */}
      <section className="space-y-3">
        <div className="relative">
          <MagnifyingGlass
            size={18}
            weight="duotone"
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: theme.textLight }}
          />
          <input
            type="text"
            placeholder="Search by recipient, subject, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm focus:outline-none"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.cardBackground,
              color: theme.text,
              boxShadow: theme.isDark ? '0 1px 4px rgba(0,0,0,0.25)' : '0 1px 4px rgba(0,0,0,0.06)',
            }}
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <CustomDropdown
              value={filterType}
              onChange={setFilterType}
              options={typeOptions}
              theme={theme}
              outlined
              customShadow
              placeholder="Email type…"
            />
          </div>
          <div className="flex-1 min-w-0">
            <CustomDropdown
              value={filterStatus}
              onChange={setFilterStatus}
              options={statusOptions}
              theme={theme}
              outlined
              customShadow
              placeholder="Status…"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="px-4 py-2 rounded-full text-sm font-semibold tracking-wide transition-all hover:brightness-105 active:scale-[0.97] shrink-0"
            style={{
              backgroundColor: theme.cardBackground,
              color: theme.text,
              border: `1px solid ${theme.border}`,
              boxShadow: theme.isDark ? '0 2px 8px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.08)',
            }}
          >
            {showAll ? 'Recent (50)' : 'All (200)'}
          </button>
          <button
            type="button"
            onClick={loadEmailHistory}
            disabled={loading}
            className="p-2.5 rounded-full transition-all hover:brightness-105 active:scale-[0.97] shrink-0 disabled:opacity-50"
            style={{
              backgroundColor: theme.cardBackground,
              color: theme.primary,
              border: `1px solid ${theme.border}`,
              boxShadow: theme.isDark ? '0 2px 8px rgba(0,0,0,0.35)' : '0 2px 8px rgba(0,0,0,0.08)',
            }}
            title="Refresh history"
          >
            <ArrowsClockwise size={18} weight="duotone" className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </section>

      {/* Sent Emails */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold flex items-center gap-2 pb-1 border-b" style={{ color: theme.text, borderColor: theme.border }}>
          <Envelope size={16} style={{ color: theme.primary }} />
          Sent Emails
          <span className="font-normal text-[11px]" style={{ color: theme.textLight }}>
            {filteredEmails.length === 0
              ? '0 results'
              : `Showing ${visibleEmails.length} of ${filteredEmails.length}`}
          </span>
        </h2>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <ArrowsClockwise className="animate-spin" size={24} style={{ color: theme.primary }} />
          <span className="ml-3 text-sm" style={{ color: theme.textLight }}>Loading email history...</span>
        </div>
      ) : filteredEmails.length === 0 ? (
        <div className="text-center py-12 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <Envelope size={48} className="mx-auto mb-3 opacity-30" style={{ color: theme.textLight }} />
          <p className="text-sm font-medium mb-1" style={{ color: theme.text }}>
            {emailHistory.length === 0 ? 'No email history yet' : 'No emails match your filters'}
          </p>
          <p className="text-xs" style={{ color: theme.textLight }}>
            {emailHistory.length === 0 
              ? 'Sent emails will appear here' 
              : 'Try adjusting your search or filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleEmails.map((email) => {
            const TypeIcon = getEmailTypeIcon(email.type);
            const typeColor = getEmailTypeColor(email.type);
            const isExpanded = expandedEmail === email.id;
            const name = (email.recipientName || '').trim();
            const addr = (email.recipientEmail || '').trim();
            const nameIsEmail = name && addr && name.toLowerCase() === addr.toLowerCase();
            const recipientPrimary = nameIsEmail ? addr : (name || addr || 'Unknown');
            const recipientSecondary = !nameIsEmail && name && addr ? addr : null;
            const isFailed = email.status !== 'sent';

            return (
              <div
                key={email.id}
                className="rounded-2xl border overflow-hidden transition-all cursor-pointer hover:brightness-[0.99] active:scale-[0.995]"
                style={{
                  borderColor: isFailed ? '#ef4444' : theme.border,
                  backgroundColor: theme.cardBackground,
                  boxShadow: theme.isDark ? '0 4px 16px rgba(0,0,0,0.2)' : '0 4px 16px rgba(47,59,58,0.05)',
                }}
                onClick={() => setExpandedEmail(isExpanded ? null : email.id)}
              >
                <div className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div
                      className="flex-shrink-0 p-2.5 rounded-xl"
                      style={{ backgroundColor: typeColor + '18' }}
                    >
                      <TypeIcon size={20} weight="duotone" style={{ color: typeColor }} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-semibold text-sm truncate" style={{ color: theme.text }}>
                            {email.subject || 'No subject'}
                          </h4>
                          <p className="text-xs mt-0.5 truncate" style={{ color: theme.textLight }}>
                            {recipientPrimary}
                            {recipientSecondary ? ` · ${recipientSecondary}` : ''}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => handleResendEmail(email, e)}
                          disabled={resendingEmailId === email.id}
                          className="px-3.5 py-1.5 rounded-full text-[11px] font-semibold tracking-wide flex items-center gap-1.5 shrink-0 transition-all hover:brightness-105 active:scale-[0.97] disabled:opacity-50"
                          style={{
                            backgroundColor: theme.primary,
                            color: theme.textOnPrimary || '#FFFFFF',
                            boxShadow: theme.isDark
                              ? '0 2px 8px rgba(0,0,0,0.35)'
                              : `0 2px 8px ${theme.primary}45`,
                          }}
                          title="Resend this email"
                        >
                          {resendingEmailId === email.id ? (
                            <>
                              <CircleNotch size={14} weight="duotone" className="animate-spin" />
                              Sending…
                            </>
                          ) : (
                            <>
                              <PaperPlaneTilt size={14} weight="duotone" />
                              Resend
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium"
                      style={{
                        backgroundColor: typeColor + '18',
                        color: typeColor,
                      }}
                    >
                      <TypeIcon size={14} weight="duotone" />
                      {getEmailTypeLabel(email.type)}
                    </span>
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium"
                      style={
                        isFailed
                          ? { backgroundColor: '#fee2e2', color: '#991b1b' }
                          : { backgroundColor: '#d1fae5', color: '#065f46' }
                      }
                    >
                      {isFailed ? (
                        <XCircle size={14} weight="duotone" />
                      ) : (
                        <CheckCircle size={14} weight="duotone" />
                      )}
                      {isFailed ? 'Failed' : 'Sent'}
                    </span>
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium"
                      style={{
                        backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.05)',
                        color: theme.text,
                      }}
                    >
                      <Clock size={14} weight="duotone" style={{ color: theme.primary }} />
                      {formatDate(email.sentAt)}
                    </span>
                  </div>
                </div>

                {/* Expanded Details */}
                <div 
                  className="overflow-hidden transition-all duration-300 ease-in-out"
                  style={{
                    maxHeight: isExpanded ? '2000px' : '0',
                    opacity: isExpanded ? 1 : 0,
                    transform: isExpanded ? 'translateY(0)' : 'translateY(-10px)'
                  }}
                >
                  {isExpanded && (
                    <div 
                      className="px-4 pb-4 pt-0 border-t"
                      style={{ borderColor: theme.border }}
                    >
                    <div className="mt-4 space-y-3">
                      {email.customContent && (
                        <div>
                          <div className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: theme.textLight }}>
                            Custom Content:
                          </div>
                          <div className="p-3 rounded text-sm space-y-2" style={{ backgroundColor: theme.background }}>
                            {email.customContent.greeting && (
                              <div>
                                <strong style={{ color: theme.textLight }}>Greeting:</strong>
                                <div style={{ color: theme.text }}>{email.customContent.greeting}</div>
                              </div>
                            )}
                            {email.customContent.mainMessage && (
                              <div>
                                <strong style={{ color: theme.textLight }}>Message:</strong>
                                <div style={{ color: theme.text }} className="whitespace-pre-line">{email.customContent.mainMessage}</div>
                              </div>
                            )}
                            {email.customContent.signature && (
                              <div>
                                <strong style={{ color: theme.textLight }}>Signature:</strong>
                                <div style={{ color: theme.text }} className="whitespace-pre-line">{email.customContent.signature}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {email.trialExtended && (
                        <div>
                          <div className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: theme.textLight }}>
                            Win-Back Details:
                          </div>
                          <div className="p-3 rounded text-sm space-y-1" style={{ backgroundColor: '#fdf2f8' }}>
                            <div style={{ color: '#9d174d' }}>
                              <strong>14-day trial granted</strong>
                            </div>
                            {email.trialEndDate && (
                              <div style={{ color: '#be185d' }}>
                                Trial ends: {new Date(email.trialEndDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {email.reason && (
                        <div>
                          <div className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: theme.textLight }}>
                            Reason:
                          </div>
                          <div className="text-sm" style={{ color: theme.text }}>{email.reason}</div>
                        </div>
                      )}
                      {email.inviteLink && (
                        <div>
                          <div className="text-xs font-semibold mb-1 uppercase tracking-wide" style={{ color: theme.textLight }}>
                            Invite Link:
                          </div>
                          <a 
                            href={email.inviteLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm hover:underline"
                            style={{ color: theme.primary }}
                          >
                            {email.inviteLink}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                  )}
                </div>
              </div>
            );
          })}
          {remainingCount > 0 && (
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + INITIAL_VISIBLE)}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:brightness-105 active:scale-[0.99]"
              style={{
                backgroundColor: theme.isDark ? 'rgba(255,255,255,0.06)' : 'rgba(47,59,58,0.05)',
                color: theme.primary,
                border: `1px dashed ${theme.border}`,
              }}
            >
              + Show more ({remainingCount} left)
            </button>
          )}
        </div>
      )}
      </section>
    </div>
  );
}




