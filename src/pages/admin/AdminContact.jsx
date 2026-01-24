import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, doc, updateDoc, where } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Mail, Clock, Check, X, ExternalLink, Filter, Search, RefreshCw } from 'lucide-react';
import { themes } from '../../theme/themes';

const theme = themes.sage;

/**
 * AdminContact Component
 * Displays general contact form submissions from landing/login/signup pages
 * Stored in `contactSubmissions` collection (not support tickets)
 */
export default function AdminContact() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState(null);

  useEffect(() => {
    fetchSubmissions();
  }, [filter]);

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const submissionsRef = collection(db, 'contactSubmissions');
      let q;

      // Use simple queries to avoid index requirements
      if (filter === 'all') {
        q = query(submissionsRef, orderBy('timestamp', 'desc'));
      } else {
        // For filtered queries, just get all and filter in memory to avoid index requirement
        q = query(submissionsRef, orderBy('timestamp', 'desc'));
      }

      const querySnapshot = await getDocs(q);
      let data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Apply status filter in memory if needed
      if (filter === 'unread') {
        data = data.filter(sub => sub.status === 'unread');
      } else if (filter === 'read') {
        data = data.filter(sub => sub.status === 'read');
      }

      setSubmissions(data);
    } catch (error) {
      console.error('Error fetching contact submissions:', error);
      alert(`Error loading contacts: ${error.message}\n\nIf you see "requires an index", please contact support.`);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (submissionId) => {
    try {
      const submissionRef = doc(db, 'contactSubmissions', submissionId);
      await updateDoc(submissionRef, { status: 'read' });
      
      // Update local state
      setSubmissions(prev =>
        prev.map(sub => (sub.id === submissionId ? { ...sub, status: 'read' } : sub))
      );
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAsUnread = async (submissionId) => {
    try {
      const submissionRef = doc(db, 'contactSubmissions', submissionId);
      await updateDoc(submissionRef, { status: 'unread' });
      
      // Update local state
      setSubmissions(prev =>
        prev.map(sub => (sub.id === submissionId ? { ...sub, status: 'unread' } : sub))
      );
    } catch (error) {
      console.error('Error marking as unread:', error);
    }
  };

  const filteredSubmissions = submissions.filter(sub => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      sub.name?.toLowerCase().includes(search) ||
      sub.email?.toLowerCase().includes(search) ||
      sub.subject?.toLowerCase().includes(search) ||
      sub.message?.toLowerCase().includes(search)
    );
  });

  const unreadCount = submissions.filter(sub => sub.status === 'unread').length;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 py-4 border-b" style={{ borderColor: theme.border }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: theme.text }}>
              General Contact
            </h1>
            <p className="text-sm mt-1" style={{ color: theme.textLight }}>
              Pre-auth inquiries from landing, login, and signup pages
            </p>
          </div>
          <button
            onClick={fetchSubmissions}
            className="p-2 rounded-lg hover:opacity-80 transition-opacity"
            style={{ backgroundColor: theme.primaryLight }}
          >
            <RefreshCw className="w-5 h-5" style={{ color: theme.primary }} />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search
              className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2"
              style={{ color: theme.textLight }}
            />
            <input
              type="text"
              placeholder="Search by name, email, or subject..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                borderColor: theme.border,
                backgroundColor: theme.cardBackground,
                color: theme.text,
              }}
            />
          </div>

          <div className="flex gap-2">
            {['all', 'unread', 'read'].map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className="px-4 py-2 rounded-lg capitalize transition-all"
                style={{
                  backgroundColor: filter === filterOption ? theme.primary : theme.cardBackground,
                  color: filter === filterOption ? '#FFFFFF' : theme.text,
                  border: `1px solid ${filter === filterOption ? theme.primary : theme.border}`,
                }}
              >
                {filterOption}
                {filterOption === 'unread' && unreadCount > 0 && ` (${unreadCount})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Submissions List */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" style={{ color: theme.primary }} />
                <p style={{ color: theme.textLight }}>Loading submissions...</p>
              </div>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Mail className="w-12 h-12 mx-auto mb-3" style={{ color: theme.textLight }} />
                <p className="text-lg font-semibold mb-1" style={{ color: theme.text }}>
                  No submissions found
                </p>
                <p className="text-sm" style={{ color: theme.textLight }}>
                  {searchTerm ? 'Try adjusting your search' : 'Contact submissions will appear here'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  onClick={() => setSelectedSubmission(submission)}
                  className="p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all"
                  style={{
                    borderColor: submission.status === 'unread' ? theme.primary : theme.border,
                    backgroundColor: submission.status === 'unread' ? `${theme.primary}08` : theme.cardBackground,
                    borderWidth: submission.status === 'unread' ? '2px' : '1px',
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold" style={{ color: theme.text }}>
                          {submission.name || 'Anonymous'}
                        </h3>
                        {submission.status === 'unread' && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full"
                            style={{
                              backgroundColor: theme.primary,
                              color: '#FFFFFF',
                            }}
                          >
                            New
                          </span>
                        )}
                      </div>
                      <p className="text-sm mb-1" style={{ color: theme.textLight }}>
                        {submission.email}
                      </p>
                      <p className="text-sm font-medium mb-2" style={{ color: theme.text }}>
                        {submission.subject}
                      </p>
                      <p className="text-sm line-clamp-2" style={{ color: theme.textLight }}>
                        {submission.message}
                      </p>
                      <div className="flex items-center gap-4 mt-3 text-xs" style={{ color: theme.textLight }}>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {submission.timestamp?.toDate?.().toLocaleString() || 'N/A'}
                        </div>
                        {submission.source && (
                          <div className="flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" />
                            {submission.source}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        {selectedSubmission && (
          <div
            className="w-1/3 border-l overflow-y-auto"
            style={{ borderColor: theme.border, backgroundColor: theme.background }}
          >
            <div className="sticky top-0 z-10 px-6 py-4 border-b" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold" style={{ color: theme.text }}>
                  Contact Details
                </h2>
                <button
                  onClick={() => setSelectedSubmission(null)}
                  className="p-2 rounded-lg hover:opacity-80"
                  style={{ backgroundColor: theme.primaryLight }}
                >
                  <X className="w-4 h-4" style={{ color: theme.primary }} />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 space-y-4">
              {/* Status Actions */}
              <div className="flex gap-2">
                {selectedSubmission.status === 'unread' ? (
                  <button
                    onClick={() => markAsRead(selectedSubmission.id)}
                    className="flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:opacity-90"
                    style={{ backgroundColor: theme.primary, color: '#FFFFFF' }}
                  >
                    <Check className="w-4 h-4" />
                    Mark as Read
                  </button>
                ) : (
                  <button
                    onClick={() => markAsUnread(selectedSubmission.id)}
                    className="flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2 hover:opacity-90 border"
                    style={{ borderColor: theme.border, color: theme.text }}
                  >
                    <Mail className="w-4 h-4" />
                    Mark as Unread
                  </button>
                )}
              </div>

              {/* Contact Info */}
              <div>
                <label className="text-xs font-semibold uppercase mb-2 block" style={{ color: theme.textLight }}>
                  From
                </label>
                <p className="font-semibold mb-1" style={{ color: theme.text }}>
                  {selectedSubmission.name || 'Anonymous'}
                </p>
                <a
                  href={`mailto:${selectedSubmission.email}`}
                  className="text-sm hover:underline"
                  style={{ color: theme.primary }}
                >
                  {selectedSubmission.email}
                </a>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase mb-2 block" style={{ color: theme.textLight }}>
                  Subject
                </label>
                <p className="font-medium" style={{ color: theme.text }}>
                  {selectedSubmission.subject}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase mb-2 block" style={{ color: theme.textLight }}>
                  Message
                </label>
                <p className="whitespace-pre-wrap" style={{ color: theme.text }}>
                  {selectedSubmission.message}
                </p>
              </div>

              <div className="pt-4 border-t" style={{ borderColor: theme.border }}>
                <div className="flex items-center gap-2 text-xs mb-2" style={{ color: theme.textLight }}>
                  <Clock className="w-4 h-4" />
                  {selectedSubmission.timestamp?.toDate?.().toLocaleString() || 'N/A'}
                </div>
                {selectedSubmission.source && (
                  <div className="flex items-center gap-2 text-xs" style={{ color: theme.textLight }}>
                    <ExternalLink className="w-4 h-4" />
                    Source: {selectedSubmission.source}
                  </div>
                )}
              </div>

              {/* Reply Button */}
              <a
                href={`mailto:${selectedSubmission.email}?subject=Re: ${selectedSubmission.subject}&body=Hi ${selectedSubmission.name || 'there'},%0D%0A%0D%0A`}
                className="block w-full px-4 py-2 rounded-lg text-center hover:opacity-90 transition-opacity"
                style={{ backgroundColor: theme.primary, color: '#FFFFFF' }}
              >
                Reply via Email
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
