import React, { useState, useEffect } from 'react';
import { 
  Trash2, RefreshCw, Search, Calendar, User, Mail, AlertCircle, 
  CheckCircle, X, Info, Loader, CreditCard, Clock
} from 'lucide-react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { formatDateTime } from '../../utils/date';

export default function AccountDeletionRequests({ theme }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [stats, setStats] = useState({
    pending: 0,
    approved: 0,
    rejected: 0
  });

  useEffect(() => {
    const unsubscribe = loadRequests();
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const loadRequests = () => {
    setLoading(true);
    try {
      const requestsRef = collection(db, 'accountDeletionRequests');
      const q = query(requestsRef, orderBy('requestedAt', 'desc'));

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const requestData = [];
          let pending = 0, approved = 0, rejected = 0;
          
          snapshot.forEach((doc) => {
            const data = {
              id: doc.id,
              ...doc.data()
            };
            requestData.push(data);
            
            if (data.status === 'pending') pending++;
            else if (data.status === 'approved') approved++;
            else if (data.status === 'rejected') rejected++;
          });

          setRequests(requestData);
          setStats({ pending, approved, rejected });
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
    if (!window.confirm(`⚠️ Are you sure you want to DELETE this user's account?\n\nEmail: ${request.userEmail}\nThis will permanently delete all their data and cannot be undone.`)) {
      return;
    }

    setProcessingId(request.id);

    try {
      const functions = getFunctions();
      const adminTerminateUser = httpsCallable(functions, 'adminTerminateUser');
      
      const result = await adminTerminateUser({
        userId: request.userId,
        email: request.userEmail
      });

      if (result.data.success) {
        // Update request status
        const requestRef = doc(db, 'accountDeletionRequests', request.id);
        await updateDoc(requestRef, {
          status: 'approved',
          processedAt: new Date(),
          processedBy: 'admin' // You could pass the admin's email here
        });

        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { 
            message: `✅ Account deleted successfully! User ${request.userEmail} has been removed and sent a confirmation email.`, 
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

  const filteredRequests = requests.filter(request => {
    const matchesSearch = 
      request.userEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      request.userName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const pendingRequests = filteredRequests.filter(r => r.status === 'pending');
  const processedRequests = filteredRequests.filter(r => r.status !== 'pending');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="animate-spin" size={24} style={{ color: theme.primary }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              Users submit deletion requests from various places (trial lockout, subscription expired, settings). 
              Review each request and click "Approve & Delete" to permanently remove the user and all their data. 
              The user will receive a confirmation email automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Search size={20} style={{ color: theme.textLight }} />
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
          <RefreshCw size={16} />
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
            {pendingRequests.map(request => (
              <div 
                key={request.id} 
                className="p-4 rounded-lg border"
                style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <Mail size={16} style={{ color: theme.primary }} />
                      <span className="font-semibold" style={{ color: theme.text }}>
                        {request.userEmail}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                        Pending
                      </span>
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

                    {request.subscriptionInfo?.hasSubscription && (
                      <div className="flex items-center gap-2 mt-2">
                        <CreditCard size={14} style={{ color: '#ef4444' }} />
                        <span className="text-xs font-semibold" style={{ color: '#ef4444' }}>
                          Has Active Subscription (will be cancelled)
                        </span>
                      </div>
                    )}

                    {request.dataSummary?.totalItems > 0 && (
                      <div className="text-xs mt-2" style={{ color: theme.textLight }}>
                        Data to delete: {request.dataSummary.totalItems} items
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleApprove(request)}
                      disabled={processingId === request.id}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                      style={{ backgroundColor: '#dc2626' }}
                    >
                      {processingId === request.id ? (
                        <>
                          <Loader size={14} className="animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={14} />
                          Approve & Delete
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
            ))}
          </div>
        )}
      </div>

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-bold mb-3" style={{ color: theme.text }}>
            Recent History ({processedRequests.length})
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
                        backgroundColor: request.status === 'approved' ? '#dcfce7' : '#fee2e2',
                        color: request.status === 'approved' ? '#166534' : '#991b1b'
                      }}
                    >
                      {request.status === 'approved' ? '✅ Approved' : '❌ Rejected'}
                    </span>
                  </div>
                  <span className="text-xs" style={{ color: theme.textLight }}>
                    {request.processedAt?.toDate ? formatDateTime(request.processedAt.toDate()) : 'Unknown'}
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
