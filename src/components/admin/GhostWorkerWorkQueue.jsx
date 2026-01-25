import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Clock, Copy, CheckCircle2, AlertCircle, Eye, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

export default function GhostWorkerWorkQueue({ theme }) {
  // Fallback theme if not provided
  const defaultTheme = {
    text: '#000000',
    textLight: '#6B7280',
    background: '#F9FAFB',
    cardBackground: '#FFFFFF',
    border: '#E5E7EB',
    primary: '#4a7c59'
  };
  
  const activeTheme = theme || defaultTheme;
  
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
          // Get the original user message from the ticket
          const firstMessage = ticket.messages?.[0]?.message || ticket.message || '';
          
          const item = {
            logId: logDoc.id,
            ticketId: log.ticketId,
            ticketNumber: ticket.ticketNumber || log.ticketId,
            subject: ticket.subject || 'No Subject',
            type: ticket.type || 'support',
            userName: ticket.userName || 'Unknown',
            userEmail: ticket.userEmail || '',
            originalMessage: firstMessage,
            timestamp: log.timestamp,
            route: log.route,
            confidence: log.confidence,
            reasoning: log.reasoning || log.routingReasoning || '',
            responseContent: log.responseContent || '',
            markedFixed: log.markedFixed || false,
            markedFixedAt: log.markedFixedAt || null,
            executionCost: log.executionCost || log.cost?.total || 0,
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
        color: activeTheme.textLight 
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
          backgroundColor: activeTheme.cardBackground,
          border: `1px solid ${activeTheme.border}`
        }}>
          <div style={{ fontSize: '12px', color: activeTheme.textLight, marginBottom: '4px' }}>
            ⏰ Pending Work
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: activeTheme.text }}>
            {stats.totalPending}
          </div>
          <div style={{ fontSize: '11px', color: activeTheme.textLight, marginTop: '4px' }}>
            Oldest first • Just start from top
          </div>
        </div>

        <div style={{
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: activeTheme.cardBackground,
          border: `1px solid ${activeTheme.border}`
        }}>
          <div style={{ fontSize: '12px', color: activeTheme.textLight, marginBottom: '4px' }}>
            ✅ Marked Fixed Today
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#4CAF50' }}>
            {stats.markedFixed}
          </div>
          <div style={{ fontSize: '11px', color: activeTheme.textLight, marginTop: '4px' }}>
            Keep going!
          </div>
        </div>

        <div style={{
          padding: '16px',
          borderRadius: '12px',
          backgroundColor: activeTheme.cardBackground,
          border: `1px solid ${activeTheme.border}`
        }}>
          <div style={{ fontSize: '12px', color: activeTheme.textLight, marginBottom: '4px' }}>
            💰 Total AI Cost
          </div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: activeTheme.text }}>
            ${stats.totalCost.toFixed(4)}
          </div>
          <div style={{ fontSize: '11px', color: activeTheme.textLight, marginTop: '4px' }}>
            All time
          </div>
        </div>
      </div>

      {/* Work Queue List */}
      <div style={{
        backgroundColor: activeTheme.cardBackground,
        borderRadius: '12px',
        border: `1px solid ${activeTheme.border}`,
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '16px',
          borderBottom: `1px solid ${activeTheme.border}`,
          fontWeight: '600',
          color: activeTheme.text
        }}>
          📋 Work Queue
        </div>

        {workQueue.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: activeTheme.textLight }}>
            🎉 All caught up! No tickets in the queue.
          </div>
        ) : (
          <div>
            {workQueue.map((ticket, index) => (
              <div 
                key={ticket.ticketId}
                style={{
                  borderBottom: index < workQueue.length - 1 ? `1px solid ${activeTheme.border}` : 'none',
                  backgroundColor: ticket.markedFixed ? activeTheme.background : activeTheme.cardBackground,
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
                        color: activeTheme.text,
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
                      <span style={{ fontSize: '12px', color: activeTheme.textLight }}>
                        {ticket.confidence}% conf
                      </span>
                    </div>
                    <div style={{ 
                      fontSize: '14px', 
                      color: activeTheme.text,
                      marginBottom: '4px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {ticket.subject}
                    </div>
                    <div style={{ fontSize: '12px', color: activeTheme.textLight }}>
                      {ticket.userName} • {new Date(ticket.timestamp?.toDate?.() || ticket.timestamp).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Expand/Collapse Icon */}
                  <div style={{ flexShrink: 0 }}>
                    {expandedTicket === ticket.ticketId ? (
                      <ChevronUp size={20} style={{ color: activeTheme.textLight }} />
                    ) : (
                      <ChevronDown size={20} style={{ color: activeTheme.textLight }} />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedTicket === ticket.ticketId && (
                  <div style={{
                    padding: '16px',
                    paddingTop: '12px',
                    borderTop: `1px solid ${activeTheme.border}`
                  }}>
                    {/* Original User Message */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        color: activeTheme.textLight, 
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        📨 Original Message
                      </div>
                      <div style={{
                        padding: '12px',
                        backgroundColor: '#FEF3C7',
                        border: '1px solid #F59E0B',
                        borderRadius: '8px',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        color: '#92400E'
                      }}>
                        {ticket.originalMessage || 'No message content available'}
                      </div>
                    </div>

                    {/* Ghosty's Reasoning */}
                    {ticket.reasoning && (
                      <div style={{ marginBottom: '16px' }}>
                        <div style={{ 
                          fontSize: '12px', 
                          fontWeight: '600', 
                          color: activeTheme.textLight, 
                          marginBottom: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          🧠 Ghosty's Reasoning
                        </div>
                        <div style={{
                          padding: '12px',
                          backgroundColor: '#EDE9FE',
                          border: '1px solid #8B5CF6',
                          borderRadius: '8px',
                          fontSize: '13px',
                          lineHeight: '1.5',
                          color: '#5B21B6'
                        }}>
                          {ticket.reasoning}
                        </div>
                      </div>
                    )}

                    {/* Ghosty's Response / Admin Notes */}
                    <div style={{ marginBottom: '16px' }}>
                      <div style={{ 
                        fontSize: '12px', 
                        fontWeight: '600', 
                        color: activeTheme.textLight, 
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        👻 Ghosty's Response & Admin Notes
                      </div>
                      {ticket.responseContent ? (
                        <div style={{
                          padding: '16px',
                          backgroundColor: activeTheme.background,
                          borderRadius: '8px',
                          fontFamily: 'monospace',
                          fontSize: '13px',
                          lineHeight: '1.6',
                          whiteSpace: 'pre-wrap',
                          color: activeTheme.text,
                          maxHeight: '400px',
                          overflowY: 'auto',
                          border: `1px solid ${activeTheme.border}`
                        }}>
                          {ticket.responseContent}
                        </div>
                      ) : (
                        <div style={{
                          padding: '16px',
                          backgroundColor: '#FEE2E2',
                          border: '1px solid #EF4444',
                          borderRadius: '8px',
                          fontSize: '13px',
                          color: '#991B1B'
                        }}>
                          ⚠️ No Cursor-ready notes available for this ticket.<br/><br/>
                          This ticket was processed before we started storing detailed admin notes. 
                          To get Cursor-ready prompts, you'll need to:<br/>
                          1. Go to <strong>Ghosty👻</strong> tab<br/>
                          2. Test this ticket again with the ticket ID<br/>
                          3. Approve the new response via Telegram<br/><br/>
                          <strong>Ticket ID:</strong> {ticket.ticketId}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {ticket.responseContent && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyAdminNotes(ticket);
                          }}
                          style={{
                            padding: '10px 16px',
                            backgroundColor: copySuccess[ticket.ticketId] ? '#4CAF50' : activeTheme.primary,
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
                      )}

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
                          backgroundColor: activeTheme.cardBackground,
                          color: activeTheme.text,
                          border: `1px solid ${activeTheme.border}`,
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
        backgroundColor: activeTheme.cardBackground,
        border: `1px solid ${activeTheme.border}`,
        borderRadius: '12px',
        fontSize: '13px',
        color: activeTheme.textLight
      }}>
        <strong style={{ color: activeTheme.text }}>💡 How to use:</strong><br/>
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
