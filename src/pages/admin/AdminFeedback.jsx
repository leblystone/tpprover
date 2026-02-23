import React, { useState, useEffect, useRef } from 'react';
import { useOutletContext, useNavigate, useSearchParams } from 'react-router-dom';
import {
  MessageSquare,
  MessagesSquare,
  CheckCircle,
  Loader,
  AlertTriangle,
  Lightbulb,
  Send,
  ArrowLeft,
  Mail,
  Copy,
  Bot,
  Clock,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  StickyNote,
  X,
  User,
  Calendar,
  CreditCard,
} from 'lucide-react';
import { useAdmin } from '../../context/AdminContext';

const statusFilters = [
  { id: 'new', label: 'New' },
  { id: 'reviewed', label: 'Reviewed' },
  { id: 'resolved', label: 'Resolved' },
  { id: 'all', label: 'All History' },
];

export default function AdminFeedback() {
  const { theme } = useOutletContext();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    feedback,
    tickets,
    loading,
    handleRespondToFeedback,
    handleUpdateFeedback,
    handleDeleteFeedback,
    getTicketWithMessages,
    subscribeToTicketMessages,
    handleTicketReply,
    handleUpdateTicketStatus,
  } = useAdmin();
  const [supportView, setSupportView] = useState('feedback');
  const [statusFilter, setStatusFilter] = useState('new');
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [feedbackView, setFeedbackView] = useState('list');
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [ticketView, setTicketView] = useState('list');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketMessages, setTicketMessages] = useState([]);
  const [ticketResponseText, setTicketResponseText] = useState('');
  const [loadingTicket, setLoadingTicket] = useState(false);
  const [expandedTickets, setExpandedTickets] = useState({});
  const [adminNote, setAdminNote] = useState('');
  const [viewingUserAccount, setViewingUserAccount] = useState(null);
  const ticketUnsubRef = useRef(null);

  // Handle URL parameter for initial view
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam && ['feedback', 'open-tickets', 'closed-tickets'].includes(viewParam)) {
      setSupportView(viewParam);
      // Clear URL parameter after reading
      setSearchParams({});
    }
  }, []);

  // Handle URL parameter for direct ticket opening
  useEffect(() => {
    const ticketIdParam = searchParams.get('ticketId');
    if (ticketIdParam && tickets.length > 0) {
      // Find the ticket by ID
      const ticketToOpen = tickets.find(t => t.id === ticketIdParam);
      if (ticketToOpen) {
        // Switch to the correct view (open or closed)
        if (ticketToOpen.status === 'resolved' || ticketToOpen.status === 'closed') {
          setSupportView('closed-tickets');
        } else {
          setSupportView('open-tickets');
        }
        // Open the ticket
        handleOpenTicket(ticketToOpen);
        // Clear the URL parameter
        setSearchParams({});
      }
    }
  }, [tickets, searchParams]);

  const filteredFeedback = statusFilter === 'all'
    ? feedback
    : feedback.filter((f) => f.status === statusFilter);
  const openTickets = tickets.filter((t) => t.status === 'new' || t.status === 'in-progress');
  const closedTickets = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed');

  useEffect(() => {
    return () => {
      if (ticketUnsubRef.current) ticketUnsubRef.current();
    };
  }, []);

  const handleOpenTicket = async (t) => {
    setLoadingTicket(true);
    setSelectedTicket(null);
    setTicketMessages([]);
    try {
      const ticket = await getTicketWithMessages(t.id);
      setSelectedTicket(ticket);
      setTicketMessages(ticket.messages || []);
      setTicketView('chat');
      ticketUnsubRef.current = subscribeToTicketMessages(t.id, (msgs) => setTicketMessages(msgs));
    } catch (err) {
      console.error('Error loading ticket:', err);
      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Failed to load ticket', type: 'error' } }));
    } finally {
      setLoadingTicket(false);
    }
  };

  const handleBackToTickets = () => {
    if (ticketUnsubRef.current) {
      ticketUnsubRef.current();
      ticketUnsubRef.current = null;
    }
    setTicketView('list');
    setSelectedTicket(null);
    setTicketMessages([]);
    setTicketResponseText('');
  };

  const handleSubmitTicketReply = async () => {
    if (!selectedTicket || !ticketResponseText.trim()) return;
    await handleTicketReply(selectedTicket.id, ticketResponseText);
    setTicketResponseText('');
  };

  const handleAddAdminNote = async (ticketId) => {
    if (!adminNote.trim()) return;
    
    try {
      const noteData = {
        note: adminNote,
        timestamp: new Date(),
        addedBy: 'admin',
      };
      
      // Get current ticket
      const ticketRef = await getTicketWithMessages(ticketId);
      const currentNotes = ticketRef.adminNotes || [];
      
      // Update ticket with new note
      await handleUpdateTicketStatus(ticketId, ticketRef.status, {
        adminNotes: [...currentNotes, noteData]
      });
      
      // Update local state
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(prev => ({
          ...prev,
          adminNotes: [...(prev.adminNotes || []), noteData]
        }));
      }
      
      setAdminNote('');
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Admin note added', type: 'success' } 
      }));
    } catch (err) {
      console.error('Error adding admin note:', err);
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: 'Failed to add note', type: 'error' } 
      }));
    }
  };

  const handleStatusChange = async (ticketId, newStatus) => {
    await handleUpdateTicketStatus(ticketId, newStatus);
    if (selectedTicket?.id === ticketId) {
      try {
        const updated = await getTicketWithMessages(ticketId);
        setSelectedTicket(updated);
      } catch (_) {}
    }
  };

  const toggleTicketExpanded = async (ticketId) => {
    const wasExpanded = expandedTickets[ticketId];
    
    setExpandedTickets(prev => ({
      ...prev,
      [ticketId]: !prev[ticketId]
    }));
    
    // Load messages when expanding
    if (!wasExpanded) {
      setLoadingTicket(true);
      try {
        const ticket = await getTicketWithMessages(ticketId);
        setSelectedTicket(ticket);
        setTicketMessages(ticket.messages || []);
        
        // Subscribe to real-time updates
        if (ticketUnsubRef.current) {
          ticketUnsubRef.current();
        }
        ticketUnsubRef.current = subscribeToTicketMessages(ticketId, (msgs) => setTicketMessages(msgs));
      } catch (err) {
        console.error('Error loading ticket:', err);
        window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Failed to load messages', type: 'error' } }));
      } finally {
        setLoadingTicket(false);
      }
    } else {
      // Clean up when collapsing
      if (selectedTicket?.id === ticketId) {
        setSelectedTicket(null);
        setTicketMessages([]);
        setTicketResponseText('');
        if (ticketUnsubRef.current) {
          ticketUnsubRef.current();
          ticketUnsubRef.current = null;
        }
      }
    }
  };

  const renderStatusBadge = (ticket) => {
    const isNew = ticket.status === 'new';
    const isInProgress = ticket.status === 'in-progress';
    
    return (
      <div className="flex items-center gap-1">
        {isNew && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(ticket.id, 'in-progress');
              }}
              disabled={loading.submitting}
              className="text-xs px-2 py-1 rounded-full font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: theme.warning + '20', color: theme.warning }}
              title="Click to mark as in-progress"
            >
              <Clock size={12} className="inline mr-1" />
              In Progress
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(ticket.id, 'resolved');
              }}
              disabled={loading.submitting}
              className="text-xs px-2 py-1 rounded-full font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: theme.success + '20', color: theme.success }}
              title="Click to close ticket"
            >
              <CheckCheck size={12} className="inline mr-1" />
              Close
            </button>
          </>
        )}
        {isInProgress && (
          <>
            <span className="text-xs px-2 py-1 rounded-full font-medium" style={{ backgroundColor: theme.warning + '20', color: theme.warning }}>
              In Progress
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleStatusChange(ticket.id, 'resolved');
              }}
              disabled={loading.submitting}
              className="text-xs px-2 py-1 rounded-full font-medium hover:opacity-80 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: theme.success + '20', color: theme.success }}
              title="Click to close ticket"
            >
              <CheckCheck size={12} className="inline mr-1" />
              Close
            </button>
          </>
        )}
      </div>
    );
  };

  const handleSubmitResponse = async () => {
    const target = selectedFeedback || respondingTo;
    if (!target || !responseText.trim()) return;
    await handleRespondToFeedback(target, responseText);
    setRespondingTo(null);
    setResponseText('');
    if (selectedFeedback) setResponseText('');
  };

  const handleOpenFeedback = (item) => {
    setSelectedFeedback(item);
    setFeedbackView('detail');
    setResponseText('');
    setRespondingTo(null);
  };

  const handleBackToFeedbackList = () => {
    setFeedbackView('list');
    setSelectedFeedback(null);
    setResponseText('');
    setRespondingTo(null);
  };

  const handleDeleteFeedbackAndBack = async (item) => {
    const deleted = await handleDeleteFeedback(item.id);
    if (deleted) handleBackToFeedbackList();
  };

  return (
    <div className="space-y-3">
      <div className="rounded-lg border p-4 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSupportView('feedback')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
              supportView === 'feedback' ? '' : 'opacity-60 hover:opacity-80'
            }`}
            style={{
              backgroundColor: supportView === 'feedback' ? theme.error + '20' : 'transparent',
              color: supportView === 'feedback' ? theme.error : theme.textLight,
              border: `2px solid ${supportView === 'feedback' ? theme.error : theme.border}`,
            }}
          >
            <AlertTriangle size={18} />
            Bugs
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: supportView === 'feedback' ? theme.error : theme.textLight + '30', color: supportView === 'feedback' ? '#fff' : theme.textLight }}>
              {feedback.filter(f => f.type === 'bug').length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSupportView('open-tickets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
              supportView === 'open-tickets' ? '' : 'opacity-60 hover:opacity-80'
            }`}
            style={{
              backgroundColor: supportView === 'open-tickets' ? theme.warning + '20' : 'transparent',
              color: supportView === 'open-tickets' ? theme.warning : theme.textLight,
              border: `2px solid ${supportView === 'open-tickets' ? theme.warning : theme.border}`,
            }}
          >
            <MessagesSquare size={18} />
            Tickets
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: supportView === 'open-tickets' ? theme.warning : theme.textLight + '30', color: supportView === 'open-tickets' ? '#fff' : theme.textLight }}>
              {openTickets.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setSupportView('closed-tickets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
              supportView === 'closed-tickets' ? '' : 'opacity-60 hover:opacity-80'
            }`}
            style={{
              backgroundColor: supportView === 'closed-tickets' ? theme.success + '20' : 'transparent',
              color: supportView === 'closed-tickets' ? theme.success : theme.textLight,
              border: `2px solid ${supportView === 'closed-tickets' ? theme.success : theme.border}`,
            }}
          >
            <CheckCircle size={18} />
            Closed
            <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ backgroundColor: supportView === 'closed-tickets' ? theme.success : theme.textLight + '30', color: supportView === 'closed-tickets' ? '#fff' : theme.textLight }}>
              {closedTickets.length}
            </span>
          </button>
        </div>
      </div>

      {supportView === 'feedback' && (
        feedbackView === 'detail' && selectedFeedback ? (
          <FeedbackDetailView
            theme={theme}
            item={selectedFeedback}
            responseText={responseText}
            setResponseText={setResponseText}
            loading={loading}
            onBack={handleBackToFeedbackList}
            onSubmitResponse={handleSubmitResponse}
            onUpdateFeedback={async (id, updates) => {
              await handleUpdateFeedback(id, updates);
              if (selectedFeedback?.id === id && updates.status) {
                setSelectedFeedback((prev) => (prev ? { ...prev, status: updates.status } : null));
              }
            }}
            onDelete={() => handleDeleteFeedbackAndBack(selectedFeedback)}
          />
        ) : (
          <>
            <div className="rounded-lg border p-4 shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <h3 className="text-xs font-semibold mb-3" style={{ color: theme.textLight }}>Filter by status</h3>
              <div className="flex flex-wrap gap-2">
                {statusFilters.map((f) => {
                  const count = f.id === 'all' ? feedback.length : feedback.filter((x) => x.status === f.id).length;
                  const isActive = statusFilter === f.id;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setStatusFilter(f.id)}
                      className="px-4 py-2 rounded-lg text-sm font-medium"
                      style={{
                        backgroundColor: isActive ? theme.primary + '20' : theme.background,
                        color: isActive ? theme.primary : theme.text,
                        border: `1px solid ${isActive ? theme.primary : theme.border}`,
                      }}
                    >
                      {f.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-lg border shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
              <div className="p-4 border-b" style={{ borderColor: theme.border }}>
                <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Feedback</h2>
                <p className="text-sm mt-1" style={{ color: theme.textLight }}>Click a feedback or bug report to view and respond</p>
              </div>
              <div className="p-4 space-y-3">
                {loading.feedback ? (
                  <div className="text-center py-8">
                    <Loader size={24} className="animate-spin mx-auto" style={{ color: theme.primary }} />
                  </div>
                ) : filteredFeedback.length === 0 ? (
                  <p className="text-center py-8" style={{ color: theme.textLight }}>No feedback in this filter.</p>
                ) : (
                  filteredFeedback.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleOpenFeedback(item)}
                      className="w-full p-3 rounded-lg border text-left hover:opacity-90 transition-opacity flex items-start justify-between gap-2"
                      style={{ borderColor: theme.border, backgroundColor: theme.background }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {item.type === 'bug' && <AlertTriangle size={14} style={{ color: theme.error }} />}
                          {item.type === 'suggestion' && <Lightbulb size={14} style={{ color: theme.warning }} />}
                          <span className="text-xs font-medium" style={{ color: theme.textLight }}>{item.userEmail}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
                            {item.status}
                          </span>
                        </div>
                        <p className="text-sm line-clamp-2" style={{ color: theme.text }}>{item.message || item.feedback || '(No message provided)'}</p>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )
      )}

      {supportView === 'open-tickets' && (
        ticketView === 'chat' && selectedTicket ? (
          <TicketChatView
            theme={theme}
            selectedTicket={selectedTicket}
            ticketMessages={ticketMessages}
            ticketResponseText={ticketResponseText}
            setTicketResponseText={setTicketResponseText}
            loading={loading}
            loadingTicket={loadingTicket}
            onBack={handleBackToTickets}
            onUpdateStatus={handleStatusChange}
            onSendReply={handleSubmitTicketReply}
            onTestWithGhosty={(ticketId) => navigate(`/admin/overview/automation?ticketId=${ticketId}`)}
          />
        ) : (
          <div className="rounded-lg border shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <div className="p-4 border-b" style={{ borderColor: theme.border }}>
              <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Open Tickets</h2>
              <p className="text-sm mt-1" style={{ color: theme.textLight }}>Your support ticket dashboard</p>
            </div>
            <div className="p-4 space-y-3">
              {loading.feedback ? (
                <div className="text-center py-8">
                  <Loader size={24} className="animate-spin mx-auto" style={{ color: theme.primary }} />
                </div>
              ) : openTickets.length === 0 ? (
                <p className="text-center py-8" style={{ color: theme.textLight }}>No open tickets.</p>
              ) : (
                openTickets.map((t) => {
                  const isExpanded = expandedTickets[t.id];
                  return (
                    <div
                      key={t.id}
                      className="rounded-lg border"
                      style={{ borderColor: theme.border, backgroundColor: theme.background }}
                    >
                      <div className="p-3">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium mb-1" style={{ color: theme.text }}>{t.subject}</p>
                            <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: theme.textLight }}>
                              <span className="flex items-center gap-1">
                                <Mail size={12} />
                                {t.userEmail}
                              </span>
                              <span>#{t.ticketNumber || t.id?.slice(0, 8)}{t.requestNumbers?.length > 1 ? ` (${t.requestNumbers.join(', ')})` : ''}</span>
                              {t.userAccountInfo && (
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingUserAccount(t.userAccountInfo);
                                  }}
                                  className="px-1.5 py-0.5 rounded text-[10px] font-semibold hover:opacity-80 transition-opacity"
                                  style={{ 
                                    backgroundColor: t.userAccountInfo.subscriptionStatus === 'active' ? theme.success + '20' : 
                                                     t.userAccountInfo.subscriptionStatus === 'canceled' ? theme.error + '20' :
                                                     theme.textLight + '20',
                                    color: t.userAccountInfo.subscriptionStatus === 'active' ? theme.success : 
                                           t.userAccountInfo.subscriptionStatus === 'canceled' ? theme.error :
                                           theme.textLight
                                  }}
                                  title={`Click to view account: ${t.userAccountInfo.subscriptionStatus} ${t.userAccountInfo.subscriptionType || ''}`}
                                >
                                  👤 {t.userAccountInfo.subscriptionType || t.userAccountInfo.subscriptionStatus}
                                </button>
                              )}
                              {!t.userAccountInfo && (
                                <span 
                                  className="px-1.5 py-0.5 rounded text-[10px]"
                                  style={{ backgroundColor: theme.textLight + '15', color: theme.textLight }}
                                  title="No account found"
                                >
                                  👤 No account
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigator.clipboard.writeText(t.id || '');
                                  window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Ticket ID copied!', type: 'success' } }));
                                }}
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:opacity-80"
                                style={{ color: theme.primary }}
                                title="Copy ticket ID"
                              >
                                <Copy size={10} />
                                ID
                              </button>
                            </div>
                          </div>
                          {renderStatusBadge(t)}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/overview/automation?ticketId=${t.id}`);
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                            style={{ backgroundColor: theme.primary + '15', color: theme.primary }}
                            title="Test this ticket with Ghosty"
                          >
                            <Bot size={14} />
                            Ghosty
                          </button>
                          
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleTicketExpanded(t.id);
                            }}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity ml-auto"
                            style={{ backgroundColor: theme.background, color: theme.textLight, border: `1px solid ${theme.border}` }}
                            title={isExpanded ? "Hide details" : "Show more options"}
                          >
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                            {isExpanded ? 'Less' : 'More'}
                          </button>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t" style={{ borderColor: theme.border }}>
                          <div className="pt-3">
                            {loadingTicket && expandedTickets[t.id] ? (
                              <div className="text-center py-4">
                                <Loader size={16} className="animate-spin mx-auto" style={{ color: theme.primary }} />
                              </div>
                            ) : ticketMessages.length === 0 ? (
                              <p className="text-xs text-center py-2" style={{ color: theme.textLight }}>No messages yet</p>
                            ) : (
                              <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
                                {ticketMessages.map((msg) => (
                                  <div
                                    key={msg.id}
                                    className={`flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                                  >
                                    <div
                                      className="max-w-[80%] rounded-lg p-2 text-xs"
                                      style={{
                                        backgroundColor: msg.senderType === 'admin' ? theme.primary + '20' : theme.background,
                                        color: theme.text,
                                        border: `1px solid ${theme.border}`,
                                      }}
                                    >
                                      <div className="font-semibold mb-1 text-[10px] opacity-75">
                                        {msg.senderType === 'user' ? '👤 User' : '🛡️ Admin'}
                                      </div>
                                      <div className="whitespace-pre-wrap">{msg.message || msg.text}</div>
                                      <div className="text-[9px] opacity-50 mt-1">
                                        {msg.timestamp?.toDate?.()?.toLocaleString() || ''}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Quick reply section */}
                            {selectedTicket?.id === t.id && (
                              <div className="space-y-3">
                                <div className="border-t pt-3" style={{ borderColor: theme.border }}>
                                  <label className="text-xs font-semibold mb-2 block" style={{ color: theme.textLight }}>
                                    Reply to User
                                  </label>
                                  <textarea
                                    value={ticketResponseText}
                                    onChange={(e) => setTicketResponseText(e.target.value)}
                                    placeholder="Type your reply..."
                                    rows={2}
                                    className="w-full p-2 rounded-lg border text-xs mb-2"
                                    style={{ borderColor: theme.border, backgroundColor: theme.cardBackground, color: theme.text }}
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSubmitTicketReply();
                                    }}
                                    disabled={loading.submitting || !ticketResponseText.trim()}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                                    style={{ backgroundColor: theme.primary, color: '#fff' }}
                                  >
                                    <Send size={14} />
                                    Send Reply
                                  </button>
                                </div>
                                
                                {/* Admin Notes Section */}
                                <div className="border-t pt-3" style={{ borderColor: theme.border }}>
                                  <div className="flex items-center gap-2 mb-2">
                                    <StickyNote size={14} style={{ color: theme.warning }} />
                                    <label className="text-xs font-semibold" style={{ color: theme.textLight }}>
                                      Admin Notes (Internal Only)
                                    </label>
                                  </div>
                                  
                                  {/* Display existing notes */}
                                  {selectedTicket?.adminNotes && selectedTicket.adminNotes.length > 0 && (
                                    <div className="space-y-2 mb-3 max-h-32 overflow-y-auto">
                                      {selectedTicket.adminNotes.map((note, idx) => (
                                        <div
                                          key={idx}
                                          className="p-2 rounded-lg text-xs"
                                          style={{ backgroundColor: theme.warning + '10', border: `1px solid ${theme.warning}30` }}
                                        >
                                          <div className="whitespace-pre-wrap mb-1" style={{ color: theme.text }}>
                                            {note.note}
                                          </div>
                                          <div className="text-[9px] opacity-60" style={{ color: theme.textLight }}>
                                            {note.timestamp?.toDate?.()?.toLocaleString() || new Date(note.timestamp).toLocaleString()}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {/* Add new note */}
                                  <textarea
                                    value={adminNote}
                                    onChange={(e) => setAdminNote(e.target.value)}
                                    placeholder="Add internal note (e.g., 'Fix applied, pending deployment', 'Bug reproduced', 'Waiting for more info')..."
                                    rows={2}
                                    className="w-full p-2 rounded-lg border text-xs mb-2"
                                    style={{ borderColor: theme.border, backgroundColor: theme.cardBackground, color: theme.text }}
                                  />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddAdminNote(t.id);
                                    }}
                                    disabled={!adminNote.trim()}
                                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                                    style={{ backgroundColor: theme.warning + '20', color: theme.warning, border: `1px solid ${theme.warning}40` }}
                                  >
                                    <StickyNote size={14} />
                                    Add Note
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )
      )}

      {supportView === 'closed-tickets' && (
        ticketView === 'chat' && selectedTicket ? (
          <TicketChatView
            theme={theme}
            selectedTicket={selectedTicket}
            ticketMessages={ticketMessages}
            ticketResponseText={ticketResponseText}
            setTicketResponseText={setTicketResponseText}
            loading={loading}
            loadingTicket={loadingTicket}
            onBack={handleBackToTickets}
            onUpdateStatus={handleStatusChange}
            onSendReply={handleSubmitTicketReply}
            onTestWithGhosty={(ticketId) => navigate(`/admin/overview/automation?ticketId=${ticketId}`)}
          />
        ) : (
          <div className="rounded-lg border shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
            <div className="p-4 border-b" style={{ borderColor: theme.border }}>
              <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>Closed Tickets</h2>
              <p className="text-sm mt-1" style={{ color: theme.textLight }}>Resolved support tickets</p>
            </div>
            <div className="p-4 space-y-3">
              {loading.feedback ? (
                <div className="text-center py-8">
                  <Loader size={24} className="animate-spin mx-auto" style={{ color: theme.primary }} />
                </div>
              ) : closedTickets.length === 0 ? (
                <p className="text-center py-8" style={{ color: theme.textLight }}>No closed tickets.</p>
              ) : (
                closedTickets.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-lg border opacity-75"
                    style={{ borderColor: theme.border, backgroundColor: theme.background }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium mb-1" style={{ color: theme.text }}>{t.subject}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs" style={{ color: theme.textLight }}>
                          <span className="flex items-center gap-1">
                            <Mail size={12} />
                            {t.userEmail}
                          </span>
                          <span>#{t.ticketNumber || t.id?.slice(0, 8)}{t.requestNumbers?.length > 1 ? ` (${t.requestNumbers.join(', ')})` : ''}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(t.id || '');
                              window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Ticket ID copied!', type: 'success' } }));
                            }}
                            className="flex items-center gap-1 px-1.5 py-0.5 rounded hover:opacity-80"
                            style={{ color: theme.primary }}
                            title="Copy ticket ID"
                          >
                            <Copy size={10} />
                            ID
                          </button>
                        </div>
                      </div>
                      <span className="text-xs px-2 py-1 rounded-full shrink-0 font-medium" style={{ backgroundColor: theme.success + '20', color: theme.success }}>
                        Closed
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenTicket(t);
                        }}
                        disabled={loadingTicket}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                        style={{ backgroundColor: theme.background, color: theme.text, border: `1px solid ${theme.border}` }}
                        title="View conversation"
                      >
                        <MessageSquare size={14} />
                        View
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      )}

      {/* User Account Modal */}
      {viewingUserAccount && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => setViewingUserAccount(null)}
        >
          <div 
            className="max-w-md w-full rounded-lg border shadow-xl"
            style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: theme.border }}>
              <div className="flex items-center gap-2">
                <User size={20} style={{ color: theme.primary }} />
                <h3 className="font-semibold" style={{ color: theme.text }}>User Account Details</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingUserAccount(null)}
                className="p-1 rounded hover:opacity-70 transition-opacity"
                style={{ color: theme.textLight }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
              {/* Email */}
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: theme.textLight }}>
                  <Mail size={12} className="inline mr-1" />
                  Email
                </label>
                <p className="text-sm" style={{ color: theme.text }}>{viewingUserAccount.email}</p>
              </div>

              {/* Display Name */}
              {viewingUserAccount.displayName && (
                <div>
                  <label className="text-xs font-semibold mb-1 block" style={{ color: theme.textLight }}>
                    <User size={12} className="inline mr-1" />
                    Display Name
                  </label>
                  <p className="text-sm" style={{ color: theme.text }}>{viewingUserAccount.displayName}</p>
                </div>
              )}

              {/* Subscription Status */}
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: theme.textLight }}>
                  <CreditCard size={12} className="inline mr-1" />
                  Subscription Status
                </label>
                <div className="flex items-center gap-2">
                  <span 
                    className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                    style={{ 
                      backgroundColor: viewingUserAccount.subscriptionStatus === 'active' ? theme.success + '20' : 
                                       viewingUserAccount.subscriptionStatus === 'canceled' ? theme.error + '20' :
                                       viewingUserAccount.subscriptionStatus === 'trialing' ? theme.warning + '20' :
                                       theme.textLight + '20',
                      color: viewingUserAccount.subscriptionStatus === 'active' ? theme.success : 
                             viewingUserAccount.subscriptionStatus === 'canceled' ? theme.error :
                             viewingUserAccount.subscriptionStatus === 'trialing' ? theme.warning :
                             theme.textLight
                    }}
                  >
                    {viewingUserAccount.subscriptionStatus || 'none'}
                  </span>
                  {viewingUserAccount.subscriptionType && (
                    <span 
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold"
                      style={{ backgroundColor: theme.primary + '20', color: theme.primary }}
                    >
                      {viewingUserAccount.subscriptionType}
                    </span>
                  )}
                </div>
              </div>

              {/* Account Created */}
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: theme.textLight }}>
                  <Calendar size={12} className="inline mr-1" />
                  Account Created
                </label>
                <p className="text-sm" style={{ color: theme.text }}>
                  {viewingUserAccount.createdAt?.toDate?.()?.toLocaleString() || 
                   (viewingUserAccount.createdAt ? new Date(viewingUserAccount.createdAt).toLocaleString() : 'Unknown')}
                </p>
              </div>

              {/* Last Login */}
              {viewingUserAccount.lastLoginAt && (
                <div>
                  <label className="text-xs font-semibold mb-1 block" style={{ color: theme.textLight }}>
                    <Clock size={12} className="inline mr-1" />
                    Last Login
                  </label>
                  <p className="text-sm" style={{ color: theme.text }}>
                    {viewingUserAccount.lastLoginAt?.toDate?.()?.toLocaleString() || 
                     new Date(viewingUserAccount.lastLoginAt).toLocaleString()}
                  </p>
                </div>
              )}

              {/* User ID */}
              <div>
                <label className="text-xs font-semibold mb-1 block" style={{ color: theme.textLight }}>
                  User ID
                </label>
                <div className="flex items-center gap-2">
                  <code 
                    className="text-xs px-2 py-1 rounded flex-1 font-mono"
                    style={{ backgroundColor: theme.background, color: theme.text }}
                  >
                    {viewingUserAccount.userId}
                  </code>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(viewingUserAccount.userId);
                      window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'User ID copied!', type: 'success' } }));
                    }}
                    className="p-1.5 rounded hover:opacity-80"
                    style={{ color: theme.primary }}
                    title="Copy user ID"
                  >
                    <Copy size={14} />
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t" style={{ borderColor: theme.border }}>
              <button
                type="button"
                onClick={() => setViewingUserAccount(null)}
                className="w-full px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeedbackDetailView({
  theme,
  item,
  responseText,
  setResponseText,
  loading,
  onBack,
  onSubmitResponse,
  onUpdateFeedback,
  onDelete,
}) {
  return (
    <div className="rounded-lg border shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
      <div className="p-4 lg:p-6 border-b" style={{ borderColor: theme.border }}>
        <button
          type="button"
          onClick={onBack}
          className="mb-2 text-sm flex items-center gap-2 hover:opacity-70 transition-opacity"
          style={{ color: theme.primary }}
        >
          <ArrowLeft size={16} />
          Back to Feedback
        </button>
        <div className="flex items-center gap-2 mb-2">
          {item.type === 'bug' && <AlertTriangle size={18} style={{ color: theme.error }} />}
          {item.type === 'suggestion' && <Lightbulb size={18} style={{ color: theme.warning }} />}
          <h2 className="text-lg font-semibold" style={{ color: theme.primaryDark }}>
            {item.type === 'bug' ? 'Bug report' : 'Suggestion'}
          </h2>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: theme.primary + '20', color: theme.primary }}>
            {item.status}
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm mb-3" style={{ color: theme.textLight }}>
          <Mail size={14} />
          {item.userEmail}
        </div>
        <p className="text-sm whitespace-pre-wrap" style={{ color: theme.text }}>{item.message || item.feedback || '(No message provided)'}</p>
      </div>
      <div className="p-4 lg:p-6 space-y-4">
        <div>
          <label className="text-xs font-semibold mb-2 block" style={{ color: theme.textLight }}>Your response</label>
          <textarea
            value={responseText}
            onChange={(e) => setResponseText(e.target.value)}
            placeholder="Type your response to the user…"
            rows={4}
            className="w-full p-3 rounded-lg border mb-2 text-sm"
            style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSubmitResponse}
              disabled={loading.submitting || !responseText.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              {loading.submitting ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
              Send response
            </button>
            <button
              type="button"
              onClick={() => onUpdateFeedback(item.id, { status: item.status === 'reviewed' ? 'resolved' : 'reviewed' })}
              disabled={loading.submitting}
              className="px-4 py-2 rounded-lg border text-sm font-medium"
              style={{ borderColor: theme.border, color: theme.text }}
            >
              {item.status === 'reviewed' ? 'Mark resolved' : 'Mark reviewed'}
            </button>
            <button
              type="button"
              onClick={onDelete}
              disabled={loading.submitting}
              className="px-4 py-2 rounded-lg border text-sm font-medium"
              style={{ borderColor: theme.error, color: theme.error }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketChatView({
  theme,
  selectedTicket,
  ticketMessages,
  ticketResponseText,
  setTicketResponseText,
  loading,
  loadingTicket,
  onBack,
  onUpdateStatus,
  onSendReply,
  onTestWithGhosty,
}) {
  const isClosed = selectedTicket?.status === 'resolved' || selectedTicket?.status === 'closed';

  return (
    <div className="rounded-lg border shadow-sm" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
      <div className="p-4 lg:p-6 border-b" style={{ borderColor: theme.border }}>
        <button
          type="button"
          onClick={onBack}
          className="mb-2 text-sm flex items-center gap-2 hover:opacity-70 transition-opacity"
          style={{ color: theme.primary }}
        >
          <ArrowLeft size={16} />
          Back to Tickets
        </button>
        <h2 className="text-lg font-semibold mb-2" style={{ color: theme.primaryDark }}>
          {selectedTicket?.subject}
        </h2>
        <div className="flex flex-wrap items-center gap-3 text-sm mb-3" style={{ color: theme.textLight }}>
          <span className="flex items-center gap-1">
            <Mail size={14} />
            {selectedTicket?.userEmail}
          </span>
          <span>#{selectedTicket?.ticketNumber || selectedTicket?.id?.slice(0, 8)}{selectedTicket?.requestNumbers?.length > 1 ? ` (${selectedTicket.requestNumbers.join(', ')})` : ''}</span>
          <span className="flex items-center gap-2 font-mono text-xs px-2 py-1 rounded border" style={{ backgroundColor: theme.background, borderColor: theme.border }}>
            <span style={{ color: theme.primary }}>ID:</span>
            <span style={{ color: theme.text }}>{selectedTicket?.id?.slice(0, 12)}…</span>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(selectedTicket?.id || '');
                window.dispatchEvent(new CustomEvent('tpp:toast', { detail: { message: 'Ticket ID copied!', type: 'success' } }));
              }}
              className="p-1 rounded hover:opacity-80"
              style={{ color: theme.primary }}
              title="Copy document ID"
            >
              <Copy size={12} />
            </button>
          </span>
        </div>
        
        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            type="button"
            onClick={() => onTestWithGhosty(selectedTicket?.id)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: theme.primary + '15', color: theme.primary }}
            title="Test this ticket with Ghosty"
          >
            <Bot size={16} />
            Test with Ghosty
          </button>
          
          {selectedTicket?.status === 'new' && (
            <button
              type="button"
              onClick={() => onUpdateStatus(selectedTicket?.id, 'in-progress')}
              disabled={loading.submitting}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: theme.warning + '15', color: theme.warning }}
              title="Mark as in progress"
            >
              <Clock size={16} />
              In Progress
            </button>
          )}
          
          {(selectedTicket?.status === 'new' || selectedTicket?.status === 'in-progress') && (
            <button
              type="button"
              onClick={() => onUpdateStatus(selectedTicket?.id, 'resolved')}
              disabled={loading.submitting}
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              style={{ backgroundColor: theme.success + '15', color: theme.success }}
              title="Mark as resolved/closed"
            >
              <CheckCheck size={16} />
              Close Ticket
            </button>
          )}
        </div>
        
        {/* Status Indicators */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold mr-1" style={{ color: theme.textLight }}>Status:</span>
          {['new', 'in-progress', 'resolved'].map((status) => {
            const active = status === 'new' ? selectedTicket?.status === 'new'
              : status === 'in-progress' ? selectedTicket?.status === 'in-progress'
              : selectedTicket?.status === 'resolved' || selectedTicket?.status === 'closed';
            const color = status === 'new' ? theme.success : status === 'in-progress' ? theme.warning : theme.error;
            return (
              <button
                key={status}
                type="button"
                onClick={() => onUpdateStatus(selectedTicket?.id, status === 'resolved' ? 'resolved' : status)}
                disabled={loading.submitting}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${active ? 'ring-2' : 'opacity-50 hover:opacity-75'}`}
                style={{
                  backgroundColor: active ? color + '20' : theme.background,
                  color,
                  ringColor: color,
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                {status === 'new' ? 'New' : status === 'in-progress' ? 'In Progress' : 'Closed'}
              </button>
            );
          })}
        </div>
      </div>
      <div className="p-4 lg:p-6">
        <div className="space-y-2 mb-4 max-h-[360px] overflow-y-auto pr-2">
          {loadingTicket ? (
            <div className="text-center py-8">
              <Loader size={24} className="animate-spin mx-auto" style={{ color: theme.primary }} />
            </div>
          ) : ticketMessages.length === 0 ? (
            <p className="text-center py-8" style={{ color: theme.textLight }}>No messages yet.</p>
          ) : (
            ticketMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-[85%] rounded-lg p-3"
                  style={{
                    backgroundColor: msg.senderType === 'admin' ? theme.primary : theme.background,
                    color: msg.senderType === 'admin' ? theme.textOnPrimary : theme.text,
                    border: msg.senderType === 'user' ? `2px solid ${theme.primary}30` : 'none',
                  }}
                >
                  <div className="text-xs mb-1 opacity-80 font-semibold">
                    {msg.senderType === 'user' ? '👤 ' : '🛡️ '}
                    {msg.senderName} • {msg.createdAt?.toDate ? new Date(msg.createdAt.toDate()).toLocaleString() : 'Recently'}
                  </div>
                  <div className="text-sm whitespace-pre-wrap">{msg.message || msg.text}</div>
                  
                  {/* Display screenshots if present */}
                  {msg.imageUrls && msg.imageUrls.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.imageUrls.map((url, idx) => (
                        <div key={idx} className="relative">
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block hover:opacity-90 transition-opacity"
                          >
                            <img
                              src={url}
                              alt={`Screenshot ${idx + 1}`}
                              className="rounded-lg border max-w-full"
                              style={{
                                maxHeight: '300px',
                                objectFit: 'contain',
                                borderColor: theme.border
                              }}
                              loading="lazy"
                            />
                          </a>
                          <p className="text-xs mt-1 opacity-70">
                            📸 Screenshot {idx + 1} • Click to open
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        {!isClosed && (
          <div className="border-t pt-4" style={{ borderColor: theme.border }}>
            <textarea
              value={ticketResponseText}
              onChange={(e) => setTicketResponseText(e.target.value)}
              placeholder="Type your response…"
              rows={4}
              className="w-full p-3 rounded-lg border mb-2 text-sm"
              style={{ borderColor: theme.border, backgroundColor: theme.background, color: theme.text }}
            />
            <button
              type="button"
              onClick={onSendReply}
              disabled={loading.submitting || !ticketResponseText.trim()}
              className="px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              style={{ backgroundColor: theme.primary, color: theme.textOnPrimary }}
            >
              {loading.submitting ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
              Send Reply
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
