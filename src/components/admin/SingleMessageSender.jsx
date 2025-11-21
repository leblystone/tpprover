import React, { useState, useEffect } from 'react';
import { Send, User, Mail, Search, Loader, CheckCircle, AlertCircle, UserPlus, Trash2, MessageSquare } from 'lucide-react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getUserList } from '../../services/firebase';

export default function SingleMessageSender({ theme }) {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageType, setMessageType] = useState('accountDeletion');
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const userList = await getUserList();
      setUsers(userList);
    } catch (error) {
      console.error('Error loading users:', error);
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: '❌ Failed to load users', type: 'error' }
      }));
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const term = searchTerm.toLowerCase();
    const email = user.email?.toLowerCase() || '';
    const name = user.displayName?.toLowerCase() || '';
    return email.includes(term) || name.includes(term);
  });

  const sendMessage = async () => {
    if (!selectedUser) {
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: '⚠️ Please select a user first', type: 'warning' }
      }));
      return;
    }

    if (!confirm(`Are you sure you want to send a ${getMessageTypeLabel(messageType)} email to ${selectedUser.email}?`)) {
      return;
    }

    setIsSending(true);
    setSendResult(null);

    try {
      const functions = getFunctions();
      let sendFunction;

      switch (messageType) {
        case 'accountDeletion':
          sendFunction = httpsCallable(functions, 'sendAccountDeletionEmail');
          break;
        case 'inDepthRequest':
          sendFunction = httpsCallable(functions, 'sendInDepthRequestEmail');
          break;
        case 'inviteEmail':
          sendFunction = httpsCallable(functions, 'sendInviteEmail');
          break;
        default:
          throw new Error('Invalid message type');
      }

      const result = await sendFunction({
        userEmail: selectedUser.email,
        userName: selectedUser.displayName || selectedUser.email.split('@')[0],
        inviteLink: messageType === 'inviteEmail' ? 'https://thepepplanner.app/signup' : undefined
      });

      if (result.data.success) {
        setSendResult({ 
          success: true, 
          message: `✅ ${getMessageTypeLabel(messageType)} email sent successfully to ${selectedUser.email}!` 
        });
        window.dispatchEvent(new CustomEvent('tpp:toast', {
          detail: { message: `✅ Email sent to ${selectedUser.email}`, type: 'success' }
        }));
        // Clear selection after successful send
        setTimeout(() => {
          setSelectedUser(null);
          setSendResult(null);
        }, 3000);
      } else {
        setSendResult({ 
          success: false, 
          message: result.data.message || 'Failed to send email' 
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setSendResult({ 
        success: false, 
        message: `Error: ${error.message}` 
      });
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: `❌ Failed to send email: ${error.message}`, type: 'error' }
      }));
    } finally {
      setIsSending(false);
    }
  };

  const getMessageTypeLabel = (type) => {
    switch (type) {
      case 'accountDeletion':
        return 'Account Deletion';
      case 'inDepthRequest':
        return 'In-Depth Request';
      case 'inviteEmail':
        return 'Invite';
      default:
        return 'Message';
    }
  };

  const getMessageTypeIcon = (type) => {
    switch (type) {
      case 'accountDeletion':
        return Trash2;
      case 'inDepthRequest':
        return MessageSquare;
      case 'inviteEmail':
        return UserPlus;
      default:
        return Mail;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: theme.text }}>
            Send Single Message
          </h2>
          <p className="text-sm mt-1" style={{ color: theme.textLight }}>
            Send individual messages to users: account deletion, in-depth requests, or invites
          </p>
        </div>
      </div>

      {/* Message Type Selector */}
      <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <label className="block text-sm font-semibold mb-3" style={{ color: theme.text }}>
          Message Type
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { value: 'accountDeletion', label: 'Account Deletion', icon: Trash2, color: '#ef4444' },
            { value: 'inDepthRequest', label: 'In-Depth Request', icon: MessageSquare, color: '#3b82f6' },
            { value: 'inviteEmail', label: 'Invite Email', icon: UserPlus, color: '#10b981' }
          ].map((type) => {
            const Icon = type.icon;
            const isSelected = messageType === type.value;
            return (
              <button
                key={type.value}
                onClick={() => {
                  setMessageType(type.value);
                  setSelectedUser(null);
                  setSendResult(null);
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  isSelected ? 'ring-2' : 'hover:opacity-90'
                }`}
                style={{
                  borderColor: isSelected ? type.color : theme.border,
                  backgroundColor: isSelected ? type.color + '10' : theme.background,
                  ringColor: type.color
                }}
              >
                <div className="flex items-center gap-3">
                  <Icon 
                    size={20} 
                    style={{ color: isSelected ? type.color : theme.textLight }} 
                  />
                  <span 
                    className="font-medium text-sm"
                    style={{ color: isSelected ? type.color : theme.text }}
                  >
                    {type.label}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* User Search and Selection */}
      <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <label className="block text-sm font-semibold mb-3" style={{ color: theme.text }}>
          Select User
        </label>
        
        {/* Search Input */}
        <div className="relative mb-4">
          <Search 
            size={18} 
            className="absolute left-3 top-1/2 transform -translate-y-1/2" 
            style={{ color: theme.textLight }} 
          />
          <input
            type="text"
            placeholder="Search by email or name..."
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

        {/* User List */}
        {loading ? (
          <div className="text-center py-8">
            <Loader size={24} className="animate-spin mx-auto" style={{ color: theme.primary }} />
            <p className="text-sm mt-2" style={{ color: theme.textLight }}>Loading users...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm" style={{ color: theme.textLight }}>
              {searchTerm ? 'No users found matching your search' : 'No users available'}
            </p>
          </div>
        ) : (
          <div className="max-h-64 overflow-y-auto space-y-2">
            {filteredUsers.map((user) => {
              const isSelected = selectedUser?.uid === user.uid;
              return (
                <button
                  key={user.uid}
                  onClick={() => {
                    setSelectedUser(user);
                    setSendResult(null);
                  }}
                  className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                    isSelected ? 'ring-2' : 'hover:opacity-90'
                  }`}
                  style={{
                    borderColor: isSelected ? theme.primary : theme.border,
                    backgroundColor: isSelected ? theme.primary + '10' : theme.background,
                    ringColor: theme.primary
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <User size={20} style={{ color: theme.textLight }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm" style={{ color: theme.text }}>
                        {user.displayName || 'No Name'}
                      </div>
                      <div className="text-xs truncate" style={{ color: theme.textLight }}>
                        {user.email}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle size={18} style={{ color: theme.primary }} />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Send Button */}
      <div className="p-4 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <button
          onClick={sendMessage}
          disabled={!selectedUser || isSending}
          className="w-full px-6 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ 
            backgroundColor: theme.primary,
            color: theme.textOnPrimary,
            boxShadow: `0 2px 6px ${theme.primary}30`
          }}
        >
          {isSending ? (
            <>
              <Loader size={18} className="animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send size={18} />
              Send {getMessageTypeLabel(messageType)} Email
            </>
          )}
        </button>

        {selectedUser && (
          <p className="text-xs mt-3 text-center" style={{ color: theme.textLight }}>
            Will send to: <strong style={{ color: theme.text }}>{selectedUser.email}</strong>
          </p>
        )}
      </div>

      {/* Send Result */}
      {sendResult && (
        <div className={`px-4 py-3 rounded-lg text-sm ${
          sendResult.success 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center gap-2">
            {sendResult.success ? (
              <CheckCircle size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span>{sendResult.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}


