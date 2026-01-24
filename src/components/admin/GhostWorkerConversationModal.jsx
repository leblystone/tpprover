/**
 * 🤖 Ghost Worker Conversation Modal
 * 
 * Shows the full conversation between user and Ghost Worker for a specific ticket
 * Includes routing decisions, responses, and all messages
 */

import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';

export default function GhostWorkerConversationModal({ ticketId, onClose }) {
  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [ghostWorkerLog, setGhostWorkerLog] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConversationData();
  }, [ticketId]);

  const loadConversationData = async () => {
    try {
      // Load ticket
      const ticketDoc = await getDoc(doc(db, 'supportTickets', ticketId));
      if (ticketDoc.exists()) {
        setTicket({ id: ticketDoc.id, ...ticketDoc.data() });
      }

      // Load messages
      const messagesRef = collection(db, 'supportTickets', ticketId, 'messages');
      const messagesQuery = query(messagesRef, orderBy('createdAt', 'asc'));
      const messagesSnapshot = await getDocs(messagesQuery);
      const msgs = messagesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);

      // Load Ghost Worker log
      const logsRef = collection(db, 'ai_worker_logs');
      const logsQuery = query(logsRef, where('ticketId', '==', ticketId), orderBy('timestamp', 'desc'));
      const logsSnapshot = await getDocs(logsQuery);
      if (!logsSnapshot.empty) {
        setGhostWorkerLog({ id: logsSnapshot.docs[0].id, ...logsSnapshot.docs[0].data() });
      }

    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-gray-200 rounded w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="text-center text-gray-600">
            Ticket not found
          </div>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition w-full"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold">Ticket Conversation: {ticket.ticketNumber}</h3>
            <p className="text-sm text-gray-600 mt-1">
              {ticket.userName} ({ticket.userEmail}) • {ticket.type}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Ticket Overview */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-gray-500 mb-1">Status</div>
                <div className="font-medium capitalize">{ticket.status}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Priority</div>
                <div className="font-medium capitalize">{ticket.priority}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Created</div>
                <div className="font-medium">{formatTimestamp(ticket.createdAt)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Last Updated</div>
                <div className="font-medium">{formatTimestamp(ticket.updatedAt)}</div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200">
              <div className="text-xs text-gray-500 mb-1">Subject</div>
              <div className="font-medium">{ticket.subject}</div>
            </div>
          </div>

          {/* Ghost Worker Analysis (if exists) */}
          {ghostWorkerLog && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="font-bold text-blue-900 mb-3">🤖 Ghost Worker Analysis</div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <div className="text-xs text-blue-600 mb-1">Route Decision</div>
                  <div className="font-medium">
                    {ghostWorkerLog.route === 'gemini-pro' ? '🎨 Gemini Pro' : '🔧 Claude Sonnet'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-blue-600 mb-1">Confidence</div>
                  <div className="font-medium">{ghostWorkerLog.confidence}%</div>
                </div>
                <div>
                  <div className="text-xs text-blue-600 mb-1">Cost</div>
                  <div className="font-medium">${ghostWorkerLog.totalCost?.toFixed(5) || 'N/A'}</div>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs text-blue-600 mb-1">Routing Reasoning</div>
                <div className="text-sm bg-white p-2 rounded">{ghostWorkerLog.reasoning}</div>
              </div>

              {ghostWorkerLog.keywords && ghostWorkerLog.keywords.length > 0 && (
                <div>
                  <div className="text-xs text-blue-600 mb-2">Keywords Detected</div>
                  <div className="flex flex-wrap gap-2">
                    {ghostWorkerLog.keywords.map((keyword, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-blue-200 grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-blue-600">Response Posted:</span>{' '}
                  <span className="font-medium">
                    {ghostWorkerLog.responsePosted ? '✅ Yes' : '❌ No'}
                  </span>
                </div>
                <div>
                  <span className="text-blue-600">Human Override:</span>{' '}
                  <span className="font-medium">
                    {ghostWorkerLog.humanOverride ? '⚠️ Yes' : '✅ No'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Conversation Thread */}
          <div className="space-y-4">
            <h4 className="font-bold text-gray-900 mb-4">💬 Conversation Thread</h4>
            
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No messages in this ticket
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg ${
                    message.senderType === 'user'
                      ? 'bg-gray-100 border-l-4 border-gray-400'
                      : message.senderType === 'ghost-worker'
                      ? 'bg-blue-50 border-l-4 border-blue-400'
                      : 'bg-green-50 border-l-4 border-green-400'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-semibold text-sm">
                        {message.senderType === 'user' && '👤 '}
                        {message.senderType === 'ghost-worker' && '🤖 '}
                        {message.senderType === 'admin' && '👨‍💼 '}
                        {message.senderName || 'Unknown'}
                      </div>
                      <div className="text-xs text-gray-500">{message.senderEmail}</div>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimestamp(message.createdAt)}
                    </div>
                  </div>
                  
                  <div className="text-sm whitespace-pre-wrap">{message.message}</div>

                  {message.imageUrls && message.imageUrls.length > 0 && (
                    <div className="mt-3 flex gap-2 flex-wrap">
                      {message.imageUrls.map((url, idx) => (
                        <img
                          key={idx}
                          src={url}
                          alt={`Attachment ${idx + 1}`}
                          className="h-20 w-20 object-cover rounded border border-gray-300"
                        />
                      ))}
                    </div>
                  )}

                  {message.metadata && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                          Technical Details
                        </summary>
                        <pre className="mt-2 bg-gray-100 p-2 rounded overflow-x-auto text-xs">
                          {JSON.stringify(message.metadata, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Ghost Worker Metadata */}
          {ticket.metadata?.ghostWorker && (
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="font-bold text-yellow-900 mb-2">⚠️ Ghost Worker Metadata</div>
              <pre className="text-xs bg-white p-3 rounded overflow-x-auto">
                {JSON.stringify(ticket.metadata.ghostWorker, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={() => window.open(`#/admin/tickets/${ticketId}`, '_blank')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Open in Admin Panel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
