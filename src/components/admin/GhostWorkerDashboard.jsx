/**
 * 🤖 Ghost Worker Dashboard
 * 
 * Admin panel to monitor Ghost Worker AI routing and performance
 */

import { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import GhostWorkerConversationModal from './GhostWorkerConversationModal';

export default function GhostWorkerDashboard() {
  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const [ghostWorkerEnabled, setGhostWorkerEnabled] = useState(true);
  const [testTicketId, setTestTicketId] = useState('');
  const [testingTicket, setTestingTicket] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [showConversationModal, setShowConversationModal] = useState(null);
  const [expandedResponse, setExpandedResponse] = useState(false);

  useEffect(() => {
    loadDashboardData();
    checkGhostWorkerStatus();
  }, []);

  const checkGhostWorkerStatus = async () => {
    try {
      const configDoc = await getDocs(query(collection(db, '_config'), where('__name__', '==', 'ghostWorker')));
      if (!configDoc.empty) {
        const config = configDoc.docs[0].data();
        setGhostWorkerEnabled(config.enabled !== false);
      }
    } catch (error) {
      console.error('Error checking Ghost Worker status:', error);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch stats from Cloud Function
      const functions = getFunctions();
      const getStatsFunc = httpsCallable(functions, 'getGhostWorkerStats');
      const statsResult = await getStatsFunc();
      setStats(statsResult.data.stats);

      // Fetch recent logs from Firestore
      const logsRef = collection(db, 'ghostWorkerLogs');
      const logsQuery = query(
        logsRef,
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      const logsSnapshot = await getDocs(logsQuery);
      const logs = logsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentLogs(logs);

    } catch (error) {
      console.error('Error loading Ghost Worker dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async (logId, ticketId, correctRoute) => {
    try {
      const functions = getFunctions();
      const overrideFunc = httpsCallable(functions, 'overrideGhostWorkerRouting');
      
      await overrideFunc({
        ticketId: ticketId,
        correctRoute: correctRoute,
        feedback: prompt('Why was this routing incorrect? (optional)')
      });

      alert('✅ Override recorded. Ghost Worker will learn from this.');
      loadDashboardData(); // Refresh
      
    } catch (error) {
      console.error('Error overriding routing:', error);
      alert('❌ Failed to record override');
    }
  };

  const handleEmergencyStop = async () => {
    if (!confirm('⚠️ This will immediately pause Ghost Worker. Are you sure?')) {
      return;
    }

    try {
      const functions = getFunctions();
      const pauseFunc = httpsCallable(functions, 'pauseGhostWorker');
      
      const reason = prompt('Reason for pause (optional):') || 'Emergency stop';
      await pauseFunc({ reason });

      alert('🛑 Ghost Worker has been paused.');
      setGhostWorkerEnabled(false);
      
    } catch (error) {
      console.error('Error pausing Ghost Worker:', error);
      alert('❌ Failed to pause Ghost Worker');
    }
  };

  const handleResume = async () => {
    if (!confirm('Resume Ghost Worker automation?')) {
      return;
    }

    try {
      const functions = getFunctions();
      const resumeFunc = httpsCallable(functions, 'resumeGhostWorker');
      
      await resumeFunc({});

      alert('▶️ Ghost Worker has been resumed.');
      setGhostWorkerEnabled(true);
      
    } catch (error) {
      console.error('Error resuming Ghost Worker:', error);
      alert('❌ Failed to resume Ghost Worker');
    }
  };

  const handleTestTicket = async () => {
    if (!testTicketId.trim()) {
      alert('Please enter a ticket ID');
      return;
    }

    setTestingTicket(true);
    setTestResult(null);

    try {
      const functions = getFunctions();
      const testFunc = httpsCallable(functions, 'testGhostWorkerOnTicket');
      
      const result = await testFunc({ ticketId: testTicketId.trim() });

      setTestResult(result.data);
      alert('✅ Test complete! See results below.');
      
    } catch (error) {
      console.error('Error testing ticket:', error);
      alert(`❌ Test failed: ${error.message}`);
    } finally {
      setTestingTicket(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">🤖 Ghost Worker Dashboard</h2>
          <p className="text-sm text-gray-600 mt-1">Multi-model AI support automation</p>
        </div>
        <div className="flex gap-3">
          {!ghostWorkerEnabled && (
            <button
              onClick={handleResume}
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-medium"
            >
              ▶️ Resume
            </button>
          )}
          {ghostWorkerEnabled && (
            <button
              onClick={handleEmergencyStop}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium"
            >
              🛑 Emergency Stop
            </button>
          )}
          <button
            onClick={loadDashboardData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      {/* Status Badge */}
      {!ghostWorkerEnabled && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛑</span>
            <div>
              <div className="font-bold text-red-900">Ghost Worker is Paused</div>
              <div className="text-sm text-red-700">No automatic ticket processing until resumed</div>
            </div>
          </div>
        </div>
      )}

      {/* Test Existing Ticket Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-blue-900">🧪 Test on Existing Ticket</h3>
        <p className="text-sm text-blue-700 mb-4">
          Test Ghost Worker on an existing ticket to see how it would route and respond (safe - won't post response)
        </p>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Enter ticket ID"
            value={testTicketId}
            onChange={(e) => setTestTicketId(e.target.value)}
            className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleTestTicket}
            disabled={testingTicket || !testTicketId.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testingTicket ? '⏳ Testing...' : '🧪 Test'}
          </button>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className="mt-4 bg-white border border-blue-300 rounded-lg p-4">
            <div className="font-semibold mb-3 text-blue-900">Test Results for Ticket {testResult.ticketNumber}</div>
            
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-xs font-semibold text-gray-700 mb-1">Route Decision</div>
                <div className="font-medium text-gray-900 bg-blue-50 px-3 py-2 rounded">{testResult.routing.route}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-700 mb-1">Confidence</div>
                <div className="font-medium text-gray-900 bg-green-50 px-3 py-2 rounded">{testResult.routing.confidence}%</div>
              </div>
            </div>

            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-700 mb-1">Reasoning</div>
              <div className="text-sm text-gray-900 bg-gray-100 p-3 rounded border border-gray-200">{testResult.routing.reasoning}</div>
            </div>

            <div className="mb-4">
              <div className="text-xs font-semibold text-gray-700 mb-1 flex items-center justify-between">
                <span>Response Preview (What Ghost Worker Would Say)</span>
                <button
                  onClick={() => setExpandedResponse(!expandedResponse)}
                  className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                >
                  {expandedResponse ? '▼ Collapse' : '▶ Expand Full Response'}
                </button>
              </div>
              <div className={`text-sm text-gray-900 bg-gray-100 p-3 rounded border border-gray-200 ${expandedResponse ? 'max-h-96' : 'max-h-40'} overflow-y-auto whitespace-pre-wrap`}>
                {testResult.response.preview}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs font-semibold text-gray-700 mb-1">Safety Check</div>
                <div className={testResult.safety.passed ? 'text-green-700 font-bold bg-green-50 px-3 py-2 rounded' : 'text-red-700 font-bold bg-red-50 px-3 py-2 rounded'}>
                  {testResult.safety.passed ? '✅ Passed' : '❌ Failed'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-700 mb-1">Would Post?</div>
                <div className={testResult.wouldPost ? 'text-green-700 font-bold bg-green-50 px-3 py-2 rounded' : 'text-yellow-800 font-bold bg-yellow-50 px-3 py-2 rounded'}>
                  {testResult.wouldPost ? '✅ Yes' : '⚠️ Flagged for review'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-700 mb-1">Total Time</div>
                <div className="font-bold text-gray-900 bg-purple-50 px-3 py-2 rounded">{testResult.performance.totalDuration}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Processed"
            value={stats.totalProcessed}
            icon="📊"
            color="blue"
          />
          <StatCard
            title="Avg Confidence"
            value={`${Math.round(stats.averageConfidence)}%`}
            icon="🎯"
            color="green"
          />
          <StatCard
            title="Total Cost"
            value={`$${stats.totalCost.toFixed(3)}`}
            icon="💰"
            color="yellow"
          />
          <StatCard
            title="Avg Cost/Ticket"
            value={`$${stats.averageCostPerTicket.toFixed(4)}`}
            icon="💵"
            color="purple"
          />
        </div>
      )}

      {/* Routing Breakdown */}
      {stats && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Routing Breakdown (Last 30 Days)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl mb-2">🎨</div>
              <div className="text-2xl font-bold text-blue-600">{stats.routedToGeminiPro}</div>
              <div className="text-sm text-gray-600">Gemini Pro</div>
              <div className="text-xs text-gray-500 mt-1">UI/UX Specialist</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">🔧</div>
              <div className="text-2xl font-bold text-purple-600">{stats.routedToClaudeSonnet}</div>
              <div className="text-sm text-gray-600">Claude Sonnet</div>
              <div className="text-xs text-gray-500 mt-1">Senior Engineer</div>
            </div>
            <div className="text-center">
              <div className="text-3xl mb-2">👤</div>
              <div className="text-2xl font-bold text-orange-600">{stats.humanOverrides}</div>
              <div className="text-sm text-gray-600">Human Overrides</div>
              <div className="text-xs text-gray-500 mt-1">
                {stats.totalProcessed > 0
                  ? `${Math.round((stats.humanOverrides / stats.totalProcessed) * 100)}% error rate`
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {recentLogs.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No Ghost Worker activity yet. Create a support ticket to test!
            </div>
          ) : (
            recentLogs.map(log => (
              <LogEntry
                key={log.id}
                log={log}
                onViewDetails={() => setSelectedLog(log)}
                onOverride={handleOverride}
              />
            ))
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <LogDetailModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
          onOverride={handleOverride}
          onViewConversation={() => {
            setShowConversationModal(selectedLog.ticketId);
            setSelectedLog(null);
          }}
        />
      )}

      {/* Conversation Modal */}
      {showConversationModal && (
        <GhostWorkerConversationModal
          ticketId={showConversationModal}
          onClose={() => setShowConversationModal(null)}
        />
      )}
    </div>
  );
}

function StatCard({ title, value, icon, color }) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700'
  };

  return (
    <div className={`${colorClasses[color]} rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-xs font-medium opacity-75">{title}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

function LogEntry({ log, onViewDetails, onOverride }) {
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const getRouteColor = (route) => {
    if (route === 'gemini-pro') return 'text-blue-600 bg-blue-50';
    if (route === 'claude-sonnet') return 'text-purple-600 bg-purple-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 75) return 'text-yellow-600';
    return 'text-orange-600';
  };

  return (
    <div className="p-4 hover:bg-gray-50 transition">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-mono text-gray-500">Ticket: {log.ticketId.substring(0, 8)}...</span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRouteColor(log.route)}`}>
              {log.route === 'gemini-pro' ? '🎨 Gemini Pro' : '🔧 Claude Sonnet'}
            </span>
            <span className={`text-sm font-semibold ${getConfidenceColor(log.confidence)}`}>
              {log.confidence}%
            </span>
            {log.humanOverride && (
              <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                ⚠️ Overridden
              </span>
            )}
          </div>
          <p className="text-sm text-gray-700 mb-2">
            <strong>Reasoning:</strong> {log.reasoning}
          </p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>⏰ {formatTimestamp(log.timestamp)}</span>
            {log.totalCost && <span>💰 ${log.totalCost.toFixed(4)}</span>}
            {log.tokensUsed && <span>🔤 {log.tokensUsed.toLocaleString()} tokens</span>}
            <span className={log.responsePosted ? 'text-green-600' : 'text-gray-400'}>
              {log.responsePosted ? '✅ Posted' : '👁️ Observed'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <button
            onClick={onViewDetails}
            className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition"
          >
            Details
          </button>
          <button
            onClick={() => window.open(`#/admin/tickets/${log.ticketId}`, '_blank')}
            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition"
          >
            View Ticket
          </button>
          {!log.humanOverride && (
            <div className="flex gap-1">
              <button
                onClick={() => {
                  if (log.route === 'claude-sonnet') {
                    onOverride(log.id, log.ticketId, 'gemini-pro');
                  } else {
                    onOverride(log.id, log.ticketId, 'claude-sonnet');
                  }
                }}
                className="px-3 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition"
                title="Mark this routing as incorrect"
              >
                Wrong Route
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LogDetailModal({ log, onClose, onOverride, onViewConversation }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">Ghost Worker Log Details</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ticket ID</label>
            <div className="text-sm font-mono bg-gray-100 p-2 rounded">{log.ticketId}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
              <div className="text-sm bg-gray-100 p-2 rounded">{log.route}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confidence</label>
              <div className="text-sm bg-gray-100 p-2 rounded">{log.confidence}%</div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reasoning</label>
            <div className="text-sm bg-gray-100 p-3 rounded">{log.reasoning}</div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Complexity</label>
              <div className="text-sm bg-gray-100 p-2 rounded capitalize">{log.complexity}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Urgency</label>
              <div className="text-sm bg-gray-100 p-2 rounded capitalize">{log.urgency}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Posted</label>
              <div className="text-sm bg-gray-100 p-2 rounded">
                {log.responsePosted ? '✅ Yes' : '❌ No'}
              </div>
            </div>
          </div>

          {log.keywords && log.keywords.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keywords</label>
              <div className="flex flex-wrap gap-2">
                {log.keywords.map((keyword, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tokens Used</label>
              <div className="text-sm bg-gray-100 p-2 rounded">
                {log.tokensUsed?.toLocaleString() || 'N/A'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cost</label>
              <div className="text-sm bg-gray-100 p-2 rounded">
                ${log.totalCost?.toFixed(5) || 'N/A'}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <div className="text-sm bg-gray-100 p-2 rounded text-xs">
                {log.executionModel || log.triageModel}
              </div>
            </div>
          </div>

          {log.humanOverride && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="font-medium text-orange-900 mb-1">⚠️ Human Override</div>
              <div className="text-sm text-orange-700">
                Correct route: {log.correctRoute}
              </div>
              {log.feedback && (
                <div className="text-sm text-orange-600 mt-2">
                  Feedback: {log.feedback}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={() => {
                onViewConversation();
              }}
              className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition"
            >
              💬 View Full Conversation
            </button>
          </div>

          {!log.humanOverride && (
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  onOverride(log.id, log.ticketId, 'gemini-pro');
                  onClose();
                }}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Should be Gemini Pro
              </button>
              <button
                onClick={() => {
                  onOverride(log.id, log.ticketId, 'claude-sonnet');
                  onClose();
                }}
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition"
              >
                Should be Claude Sonnet
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
