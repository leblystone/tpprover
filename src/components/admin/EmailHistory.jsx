import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Mail, RefreshCw, Search, Filter, CheckCircle, XCircle, Clock, User, FileText, Trash2, UserPlus, Gift, Bell, AlertCircle, Send, Loader } from 'lucide-react';

const EMAIL_TYPE_LABELS = {
  account_deletion: 'Account Deletion',
  in_depth_request: 'In-Depth Request',
  invite: 'Invite',
  lifetime_access: 'Lifetime Access',
  announcement: 'Announcement',
  welcome: 'Welcome',
  verification: 'Verification',
  password_reset: 'Password Reset',
  trial_ending: 'Trial Ending',
  renewal_reminder: 'Renewal Reminder',
  payment_successful: 'Payment Successful',
  payment_failed: 'Payment Failed',
  subscription_confirmed: 'Subscription Confirmed',
  subscription_cancelled: 'Subscription Cancelled',
  gift_expiring_soon: 'Gift Expiring Soon',
  weekly_research_reminder: 'Weekly Research Reminder'
};

const EMAIL_TYPE_ICONS = {
  account_deletion: Trash2,
  in_depth_request: FileText,
  invite: UserPlus,
  lifetime_access: Gift,
  announcement: Bell,
  welcome: Mail,
  verification: Mail,
  password_reset: Mail,
  trial_ending: AlertCircle,
  renewal_reminder: Clock,
  payment_successful: CheckCircle,
  payment_failed: XCircle,
  subscription_confirmed: CheckCircle,
  subscription_cancelled: XCircle,
  gift_expiring_soon: AlertCircle,
  weekly_research_reminder: Bell
};

const EMAIL_TYPE_COLORS = {
  account_deletion: '#ef4444',
  in_depth_request: '#3b82f6',
  invite: '#10b981',
  lifetime_access: '#8b5cf6',
  announcement: '#f59e0b',
  welcome: '#06b6d4',
  verification: '#06b6d4',
  password_reset: '#06b6d4',
  trial_ending: '#f59e0b',
  renewal_reminder: '#3b82f6',
  payment_successful: '#10b981',
  payment_failed: '#ef4444',
  subscription_confirmed: '#10b981',
  subscription_cancelled: '#ef4444',
  gift_expiring_soon: '#f59e0b',
  weekly_research_reminder: '#3b82f6'
};

export default function EmailHistory({ theme }) {
  const [emailHistory, setEmailHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState(null);
  const [resendingEmailId, setResendingEmailId] = useState(null);

  useEffect(() => {
    loadEmailHistory();
  }, [showAll]);

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

  const formatDate = (date) => {
    if (!date) return 'Unknown';
    try {
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return 'Invalid date';
    }
  };

  const getEmailTypeLabel = (type) => {
    return EMAIL_TYPE_LABELS[type] || type || 'Unknown';
  };

  const getEmailTypeIcon = (type) => {
    const Icon = EMAIL_TYPE_ICONS[type] || Mail;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: theme.text }}>
            Email History
          </h2>
          <p className="text-sm mt-1" style={{ color: theme.textLight }}>
            View all sent emails from the admin panel
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs px-3 py-1.5 rounded-lg font-medium hover:opacity-80 transition-opacity"
            style={{
              background: theme.background,
              color: theme.text,
              border: `1px solid ${theme.border}`
            }}
          >
            {showAll ? 'Show Recent (50)' : 'Show All (200)'}
          </button>
          <button
            onClick={loadEmailHistory}
            disabled={loading}
            className="p-2 rounded-lg hover:opacity-80 transition-opacity"
            style={{
              background: theme.background,
              color: theme.primary,
              border: `1px solid ${theme.border}`
            }}
            title="Refresh history"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-lg border space-y-4" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        {/* Search */}
        <div className="relative">
          <Search 
            size={18} 
            className="absolute left-3 top-1/2 transform -translate-y-1/2" 
            style={{ color: theme.textLight }} 
          />
          <input
            type="text"
            placeholder="Search by recipient, subject, or type..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
            style={{
              borderColor: theme.border,
              backgroundColor: theme.background,
              color: theme.text,
              focusRingColor: theme.primary
            }}
          />
        </div>

        {/* Type and Status Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: theme.textLight }}>
              <Filter size={14} className="inline mr-1" />
              Email Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.background,
                color: theme.text,
                focusRingColor: theme.primary
              }}
            >
              <option value="all">All Types</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>
                  {getEmailTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-2" style={{ color: theme.textLight }}>
              Status
            </label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.background,
                color: theme.text,
                focusRingColor: theme.primary
              }}
            >
              <option value="all">All Statuses</option>
              <option value="sent">Sent</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="text-sm font-medium mb-1" style={{ color: theme.textLight }}>Total Emails</div>
          <div className="text-2xl font-bold" style={{ color: theme.text }}>{emailHistory.length}</div>
        </div>
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="text-sm font-medium mb-1" style={{ color: theme.textLight }}>Filtered Results</div>
          <div className="text-2xl font-bold" style={{ color: theme.text }}>{filteredEmails.length}</div>
        </div>
        <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="text-sm font-medium mb-1" style={{ color: theme.textLight }}>Success Rate</div>
          <div className="text-2xl font-bold" style={{ color: theme.text }}>
            {emailHistory.length > 0 
              ? Math.round((emailHistory.filter(e => e.status === 'sent').length / emailHistory.length) * 100)
              : 0}%
          </div>
        </div>
      </div>

      {/* Email List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="animate-spin" size={24} style={{ color: theme.primary }} />
          <span className="ml-3 text-sm" style={{ color: theme.textLight }}>Loading email history...</span>
        </div>
      ) : filteredEmails.length === 0 ? (
        <div className="text-center py-12 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <Mail size={48} className="mx-auto mb-3 opacity-30" style={{ color: theme.textLight }} />
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
          {filteredEmails.map((email) => {
            const TypeIcon = getEmailTypeIcon(email.type);
            const typeColor = getEmailTypeColor(email.type);
            const isExpanded = expandedEmail === email.id;
            
            return (
              <div
                key={email.id}
                className="rounded-lg border transition-all"
                style={{
                  borderColor: email.status === 'sent' ? theme.border : '#ef4444',
                  backgroundColor: theme.cardBackground,
                  borderLeft: `4px solid ${typeColor}`
                }}
              >
                <div
                  className="p-4 cursor-pointer hover:opacity-90 transition-opacity"
                  onClick={() => setExpandedEmail(isExpanded ? null : email.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div 
                        className="flex-shrink-0 p-2 rounded-lg"
                        style={{ backgroundColor: typeColor + '20' }}
                      >
                        <TypeIcon size={20} style={{ color: typeColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span 
                            className="text-xs px-2 py-1 rounded font-medium"
                            style={{ 
                              backgroundColor: typeColor + '20',
                              color: typeColor
                            }}
                          >
                            {getEmailTypeLabel(email.type)}
                          </span>
                          {email.status === 'sent' ? (
                            <span className="text-xs px-2 py-1 rounded font-medium flex items-center gap-1" style={{ 
                              backgroundColor: '#d1fae5', 
                              color: '#065f46'
                            }}>
                              <CheckCircle size={12} />
                              Sent
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-1 rounded font-medium flex items-center gap-1" style={{ 
                              backgroundColor: '#fee2e2', 
                              color: '#991b1b'
                            }}>
                              <XCircle size={12} />
                              Failed
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <User size={14} style={{ color: theme.textLight }} />
                          <span className="text-sm font-medium truncate" style={{ color: theme.text }}>
                            {email.recipientName || email.recipientEmail || 'Unknown'}
                          </span>
                        </div>
                        <div className="text-xs truncate mb-2" style={{ color: theme.textLight }}>
                          {email.recipientEmail || 'No email'}
                        </div>
                        <div className="text-sm font-medium truncate" style={{ color: theme.text }}>
                          {email.subject || 'No subject'}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="flex items-center gap-2 mb-2">
                        <button
                          onClick={(e) => handleResendEmail(email, e)}
                          disabled={resendingEmailId === email.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            backgroundColor: theme.primary,
                            color: theme.textOnPrimary || '#FFFFFF',
                            border: `1px solid ${theme.primary}`
                          }}
                          title="Resend this email"
                        >
                          {resendingEmailId === email.id ? (
                            <>
                              <Loader size={12} className="animate-spin" />
                              Resending...
                            </>
                          ) : (
                            <>
                              <Send size={12} />
                              Resend
                            </>
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-1 text-xs mb-1" style={{ color: theme.textLight }}>
                        <Clock size={12} />
                        <span>{formatDate(email.sentAt)}</span>
                      </div>
                      {email.sentBy && (
                        <div className="text-xs" style={{ color: theme.textLight }}>
                          by {email.sentBy}
                        </div>
                      )}
                    </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
}




