import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Clock, Copy, CheckCircle2, AlertCircle, Eye, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function GhostWorkerWorkQueue() {
  const { theme } = useTheme();
  const [workQueue, setWorkQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedTicket, setExpandedTicket] = useState(null);
  const [copySuccess, setCopySuccess] = useState({});
  const [stats, setStats] = useState({
    totalPending: 0,
    markedFixed: 0,
    totalCost: 0
  });

  // Load all Ghosty-processed tickets
  useEffect(() => {
    const logsRef = collection(db, 'ai_worker_logs');
    const q = query(logsRef, orderBy('timestamp', 'asc')); // Oldest first (FIFO)

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const tickets = [];
      let pending = 0;
      let fixed = 0;
      let cost = 0;

      for (const logDoc of snapshot.docs) {
        const log = logDoc.data();
        
        // Get ticket details
        const ticketRef = doc(db, 'supportTickets', log.ticketId);
        const ticketDoc = await getDoc(ticketRef);
        const ticket = ticketDoc.exists() ? ticketDoc.data() : null;

        if (ticket) {
          const item = {
            logId: logDoc.id,
            ticketId: log.ticketId,
            ticketNumber: ticket.ticketNumber || log.ticketId,
            subject: ticket.subject || 'No Subject',
            type: ticket.type || 'support',
            userName: ticket.userName || 'Unknown',
            userEmail: ticket.userEmail || '',
            timestamp: log.timestamp,
            route: log.route,
            confidence: log.confidence,
            responseContent: log.responseContent || '',
            markedFixed: log.markedFixed || false,
            markedFixedAt: log.markedFixedAt || null,
            executionCost: log.executionCost || 0,
            executionModel: log.executionModel || log.route
          };

          tickets.push(item);

          if (item.markedFixed) {
            fixed++;
          } else {
            pending++;
          }

          cost += item.executionCost;
        }
      }

      setWorkQueue(tickets);
      setStats({
        totalPending: pending,
        markedFixed: fixed,
        totalCost: cost
      });
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Copy admin notes to clipboard
  const copyAdminNotes = async (ticket) => {
    try {
      // Extract admin notes from response content
      const match = ticket.responseContent.match(/---\s*##\s*ADMIN NOTES[\s\S]*$/i);
      const adminNotes = match ? match[0].replace(/^---\s*##\s*ADMIN NOTES.*?\n+/i, '') : ticket.responseContent;

      // Try to extract just the CURSOR PROMPT section for easy copy
      const cursorPromptMatch = adminNotes.match(/💡\s*CURSOR PROMPT:?\s*\n(.+?)(?=\n\n|🧪|$)/is);
      const textToCopy = cursorPromptMatch ? cursorPromptMatch[1].trim() : adminNotes;

      await navigator.clipboard.writeText(textToCopy);
      setCopySuccess({ [ticket.ticketId]: true });
      setTimeout(() => setCopySuccess({ [ticket.ticketId]: false }), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      alert('Failed to copy to clipboard');
    }
  };

  // Mark ticket as fixed
  const markAsFixed = async (ticket) => {
    try {
      const logRef = doc(db, 'ai_worker_logs', ticket.logId);
      await updateDoc(logRef, {
        markedFixed: true,
        markedFixedAt: new Date()
      });
    } catch (error) {
      console.error('Failed to mark as fixed:', error);
      alert('Failed to update status');
    }
  };

  // Toggle ticket expansion
  const toggleExpand = (ticketId) => {
    setExpandedTicket(expandedTicket === ticketId ? null : ticketId);
  };

  if (loading) {
    return (
      <div style={{ 
        padding: '40px', 
        textAlign: 'center',
        color: theme.textLight 
      }}>
        Loading work queue...
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Stats Bar */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div style={{
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: theme.cardBackground,
          border: `1px solid ${theme.border}`
        }}>
          <div style={{ fontSize: '12px', color: theme.textLight, marginBottom: '4px' }}>
            ⏰ Pending Work
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: theme.text }}>
            {stats.totalPending}
          </div>
          <div style={{ fontSize: '11px', color: theme.textLight, marginTop: '4px' }}>
            Oldest first • Just start from top
          </div>
        </div>

        <div style={{
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: theme.cardBackground,
          border: `1px solid ${theme.border}`
        }}>
          <div style={{ fontSize: '12px', color: theme.textLight, marginBottom: '4px' }}>
            ✅ Marked Fixed Today
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4CAF50' }}>
            {stats.markedFixed}
          </div>
          <div style={{ fontSize: '11px', color: theme.textLight, marginTop: '4px' }}>
            Keep going!
          </div>
        </div>

        <div style={{
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: theme.cardBackground,
          border: `1px solid ${theme.border}`
        }}>
          <div style={{ fontSize: '12px', color: theme.textLight, marginBottom: '4px' }}>
            💰 Total AI Cost
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: theme.text }}>
            ${stats.totalCost.toFixed(4)}
          </div>
          <div style={{ fontSize: '11px', color: theme.textLight, marginTop: '4px' }}>
            All time
          </div>
        </div>
      </div>

      {/* Work Queue List */}
      <div style={{
        backgroundColor: theme.cardBackground,
        borderRadius: '12px',
        border: `1px solid ${theme.border}`,
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px',
          borderBottom: `1px solid ${theme.border}`,
          fontWeight: '600',
          color: theme.text
        }}>
          📋 Work Queue
        </div>

        {workQueue.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: theme.textLight }}>
            🎉 All caught up! No tickets in the queue.
          </div>
        ) : (
          <div>
            {workQueue.map((ticket, index) => (
              <div 
                key={ticket.ticketId}
                style={{
                  borderBottom: index < workQueue.length - 1 ? `1px solid ${theme.border}` : 'none',
                  backgroundColor: ticket.markedFixed ? theme.background : theme.cardBackground,
                  opacity: ticket.markedFixed ? 0.6 : 1
                }}
              >
                {/* Ticket Header (Always Visible) */}
                <div style={{
                  padding: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  cursor: 'pointer'
                }}
                onClick={() => toggleExpand(ticket.ticketId)}
                >
                  {/* Status Icon */}
                  <div style={{ flexShrink: 0 }}>
                    {ticket.markedFixed ? (
                      <CheckCircle2 size={20} style={{ color: '#4CAF50' }} />
                    ) : (
                      <AlertCircle size={20} style={{ color: '#FF9800' }} />
                    )}
                  </div>

                  {/* Ticket Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      <span style={{ 
                        fontWeight: '600', 
                        color: theme.text,
                        fontSize: '14px'
                      }}>
                        #{ticket.ticketNumber}
                      </span>
                      <span style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: ticket.route === 'gemini-pro' ? '#E3F2FD' : '#F3E5F5',
                        color: ticket.route === 'gemini-pro' ? '#1976D2' : '#7B1FA2'
                      }}>
                        {ticket.route === 'gemini-pro' ? '🎨 Gemini' : '🔧 Claude'}
                      </span>
                      <span style={{ fontSize: '12px', color: theme.textLight }}>
                        {ticket.confidence}% conf
                      </span>
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      color: theme.text,
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {ticket.subject}
                    </div>
                    <div style={{ fontSize: '12px', color: theme.textLight }}>
                      {ticket.userName} • {new Date(ticket.timestamp?.toDate?.() || ticket.timestamp).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Expand/Collapse Icon */}
                  <div style={{ flexShrink: 0 }}>
                    {expandedTicket === ticket.ticketId ? (
                      <ChevronUp size={20} style={{ color: theme.textLight }} />
                    ) : (
                      <ChevronDown size={20} style={{ color: theme.textLight }} />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedTicket === ticket.ticketId && (
                  <div style={{
                    padding: '16px',
                    paddingTop: '0',
                    borderTop: `1px solid ${theme.border}`
                  }}>
                    {/* Admin Notes */}
                    <div style={{
                      padding: '16px',
                      backgroundColor: theme.background,
                      borderRadius: '8px',
                      marginBottom: '16px',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      lineHeight: '1.6',
                      whiteSpace: 'pre-wrap',
                      color: theme.text,
                      maxHeight: '400px',
                      overflowY: 'auto'
                    }}>
                      {ticket.responseContent}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyAdminNotes(ticket);
                        }}
                        style={{
                          padding: '10px 16px',
                          backgroundColor: copySuccess[ticket.ticketId] ? '#4CAF50' : theme.primary,
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {copySuccess[ticket.ticketId] ? (
                          <>
                            <CheckCircle2 size={16} />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy size={16} />
                            Copy Cursor Prompt
                          </>
                        )}
                      </button>

                      {!ticket.markedFixed && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Mark this ticket as fixed?')) {
                              markAsFixed(ticket);
                            }
                          }}
                          style={{
                            padding: '10px 16px',
                            backgroundColor: '#4CAF50',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s'
                          }}
                        >
                          <CheckCircle2 size={16} />
                          Mark Fixed
                        </button>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/app/admin/feedback`, '_blank');
                        }}
                        style={{
                          padding: '10px 16px',
                          backgroundColor: theme.cardBackground,
                          color: theme.text,
                          border: `1px solid ${theme.border}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s'
                        }}
                      >
                        <ExternalLink size={16} />
                        View in Support
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Text */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        backgroundColor: theme.cardBackground,
        border: `1px solid ${theme.border}`,
        borderRadius: '12px',
        fontSize: '13px',
        color: theme.textLight
      }}>
        <strong style={{ color: theme.text }}>💡 How to use:</strong><br/>
        1. Start from the top (oldest first)<br/>
        2. Click ticket to expand and see admin notes<br/>
        3. Click "Copy Cursor Prompt" to copy the fix instructions<br/>
        4. Paste into Cursor AI to fix the issue<br/>
        5. Click "Mark Fixed" when done<br/>
        6. Move to next ticket
      </div>
    </div>
  );
}
