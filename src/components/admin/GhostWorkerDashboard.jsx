/**
 * 👻 Ghosty Dashboard
 * 
 * Admin panel to monitor Ghosty AI routing and performance
 */

import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { db } from '../../config/firebase';
import { collection, query, where, orderBy, limit, getDocs, Timestamp } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Bot, Play, Pause, RefreshCw, Sparkles, Target, DollarSign, TrendingUp, Palette, Wrench, User, AlertCircle, CheckCircle, Clock, Hash } from 'lucide-react';
import GhostWorkerConversationModal from './GhostWorkerConversationModal';

export default function GhostWorkerDashboard() {
  const [searchParams, setSearchParams] = useSearchParams();
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
  const [timePeriod, setTimePeriod] = useState('allTime'); // 'today', 'week', 'month', 'allTime'

  useEffect(() => {
    loadDashboardData();
    checkGhostWorkerStatus();
    
    // Check for ticketId URL parameter
    const ticketIdFromUrl = searchParams.get('ticketId');
    if (ticketIdFromUrl) {
      setTestTicketId(ticketIdFromUrl);
      // Clear the URL parameter after reading
      setSearchParams({});
      // Show toast notification
      window.dispatchEvent(new CustomEvent('tpp:toast', { 
        detail: { message: '🤖 Ticket ID loaded! Ready to test with Ghosty', type: 'success' } 
      }));
    }
  }, []);

  const checkGhostWorkerStatus = async () => {
    try {
      const configDoc = await getDocs(query(collection(db, '_config'), where('__name__', '==', 'ghostWorker')));
      if (!configDoc.empty) {
        const config = configDoc.docs[0].data();
        setGhostWorkerEnabled(config.enabled !== false);
      }
    } catch (error) {
      console.error('Error checking Ghosty status:', error);
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const logsRef = collection(db, 'ai_worker_logs');
      
      // Get ALL logs for cumulative stats (no time filter)
      const allLogsQuery = query(logsRef, orderBy('timestamp', 'desc'));
      const allLogsSnapshot = await getDocs(allLogsQuery);
      
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      
      let allLogs = [];
      let todayLogs = [];
      let weekLogs = [];
      let monthLogs = [];
      
      allLogsSnapshot.docs.forEach(doc => {
        const logData = doc.data();
        const logDate = logData.timestamp?.toDate();
        
        allLogs.push({ id: doc.id, ...logData });
        
        if (logDate >= todayStart) {
          todayLogs.push({ id: doc.id, ...logData });
        }
        if (logDate >= weekStart) {
          weekLogs.push({ id: doc.id, ...logData });
        }
        if (logDate >= monthStart) {
          monthLogs.push({ id: doc.id, ...logData });
        }
      });
      
      // Get last 20 logs with ticket numbers for display
      const recentLogsWithTickets = await Promise.all(
        allLogs.slice(0, 20).map(async (log) => {
          let ticketNumber = 'Unknown';
          
          try {
            const ticketRef = collection(db, 'supportTickets');
            const ticketDoc = await getDocs(query(ticketRef, where('__name__', '==', log.ticketId), limit(1)));
            if (!ticketDoc.empty) {
              ticketNumber = ticketDoc.docs[0].data().ticketNumber || `ID: ${log.ticketId.substring(0, 8)}`;
            }
          } catch (err) {
            console.warn('Could not fetch ticket number:', err);
          }
          
          return {
            ...log,
            ticketNumber
          };
        })
      );
      
      setRecentLogs(recentLogsWithTickets);

      // Calculate stats from ALL logs (cumulative)
      const calculateStats = (logs) => {
        const totalProcessed = logs.length;
        const avgConfidence = logs.reduce((sum, log) => sum + (log.routing?.confidence || 0), 0) / totalProcessed || 0;
        // Cost can be in log.cost.total OR log.totalCost (different structures)
        const totalCost = logs.reduce((sum, log) => sum + (log.cost?.total || log.totalCost || 0), 0);
        const routedToGemini = logs.filter(log => log.routing?.route === 'gemini-pro').length;
        const routedToClaude = logs.filter(log => log.routing?.route === 'claude-sonnet').length;
        
        return {
          totalProcessed,
          averageConfidence: avgConfidence,
          totalCost,
          averageCostPerTicket: totalCost / totalProcessed || 0,
          routedToGeminiPro: routedToGemini,
          routedToClaudeSonnet: routedToClaude,
          humanOverrides: 0
        };
      };

      setStats({
        allTime: calculateStats(allLogs),
        today: calculateStats(todayLogs),
        week: calculateStats(weekLogs),
        month: calculateStats(monthLogs)
      });

    } catch (error) {
      console.error('Error loading Ghosty dashboard:', error);
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

      alert('✅ Override recorded. Ghosty will learn from this.');
      loadDashboardData(); // Refresh
      
    } catch (error) {
      console.error('Error overriding routing:', error);
      alert('❌ Failed to record override');
    }
  };

  const handleEmergencyStop = async () => {
    if (!confirm('⚠️ This will immediately pause Ghosty👻. Are you sure?')) {
      return;
    }

    try {
      const functions = getFunctions();
      const pauseFunc = httpsCallable(functions, 'pauseGhostWorker');
      
      const reason = prompt('Reason for pause (optional):') || 'Emergency stop';
      await pauseFunc({ reason });

      alert('🛑 Ghosty has been paused.');
      setGhostWorkerEnabled(false);
      
    } catch (error) {
      console.error('Error pausing Ghosty:', error);
      alert('❌ Failed to pause Ghosty');
    }
  };

  const handleResume = async () => {
    if (!confirm('Resume Ghosty👻 automation?')) {
      return;
    }

    try {
      const functions = getFunctions();
      const resumeFunc = httpsCallable(functions, 'resumeGhostWorker');
      
      await resumeFunc({});

      alert('▶️ Ghosty has been resumed.');
      setGhostWorkerEnabled(true);
      
    } catch (error) {
      console.error('Error resuming Ghosty:', error);
      alert('❌ Failed to resume Ghosty');
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
    <div className="space-y-3">
      {/* Header - Match Admin Theme */}
      <div 
        className="rounded-lg p-3 border flex items-center justify-between"
        style={{
          backgroundColor: '#fafafa',
          borderColor: '#d4d4d4',
        }}
      >
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, #4a7c59 0%, #3d6b4d 100%)',
            }}
          >
            <Bot className="w-5 h-5" style={{ color: '#fafafa' }} />
          </div>
          <div>
            <h2 className="text-base font-semibold" style={{ color: '#3d6b4d' }}>Ghosty👻</h2>
            <p className="text-xs" style={{ color: '#7a7a7a' }}>Multi-model support automation</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-lg text-xs font-medium ${ghostWorkerEnabled ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {ghostWorkerEnabled ? (
              <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Active
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <Pause className="w-3 h-3" />
                Paused
              </span>
            )}
          </div>
          {!ghostWorkerEnabled && (
            <button
              onClick={handleResume}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-xs font-medium flex items-center gap-1"
            >
              <Play className="w-3 h-3" />
              Resume
            </button>
          )}
          {ghostWorkerEnabled && (
            <button
              onClick={handleEmergencyStop}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-xs font-medium flex items-center gap-1"
            >
              <Pause className="w-3 h-3" />
              Stop
            </button>
          )}
          <button
            onClick={loadDashboardData}
            className="px-3 py-1.5 rounded-lg transition text-xs font-medium flex items-center gap-1"
            style={{
              backgroundColor: '#e8e8e8',
              color: '#5a5a5a'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d8d8d8'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e8e8e8'}
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* Test Section */}
      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: '#fafafa', borderColor: '#d4d4d4' }}>
        <div className="border-b px-4 py-2.5" style={{ backgroundColor: '#f5f5f5', borderColor: '#d4d4d4' }}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded" style={{ background: 'linear-gradient(135deg, #c9a961 0%, #b89654 100%)' }}>
              <Sparkles className="w-4 h-4" style={{ color: '#fafafa' }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: '#4a4a4a' }}>Test Ghosty</h3>
              <p className="text-xs" style={{ color: '#7a7a7a' }}>Test on existing tickets (safe - won't post anything)</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter Ticket ID or Number (e.g., Z048)"
              value={testTicketId}
              onChange={(e) => setTestTicketId(e.target.value)}
              className="flex-1 px-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1"
              style={{
                border: '1px solid #e8e8e8',
                backgroundColor: '#fafafa',
                color: '#4a4a4a'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#c8c8c8'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e8e8e8'}
            />
            <button
              onClick={handleTestTicket}
              disabled={testingTicket || !testTicketId.trim()}
              className="px-4 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium flex items-center gap-1.5"
              style={{
                background: 'linear-gradient(135deg, #4a7c59 0%, #3d6b4d 100%)',
                color: '#fafafa'
              }}
              onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.background = 'linear-gradient(135deg, #3d6b4d 0%, #2f5a3d 100%)')}
              onMouseLeave={(e) => !e.currentTarget.disabled && (e.currentTarget.style.background = 'linear-gradient(135deg, #4a7c59 0%, #3d6b4d 100%)')}
            >
              {testingTicket ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  Test
                </>
              )}
            </button>
          </div>

          {/* Test Results */}
          {testResult && (
            <div className="mt-3 border rounded-lg overflow-hidden" style={{ borderColor: '#e8e8e8' }}>
              {/* Header */}
              <div className="px-4 py-2 border-b" style={{ backgroundColor: '#f5f5f5', borderColor: '#e8e8e8' }}>
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold flex items-center gap-1.5" style={{ color: '#4a4a4a' }}>
                    <Hash className="w-3.5 h-3.5" style={{ color: '#8b8b8b' }} />
                    Test Results: {testResult.ticketNumber}
                  </h4>
                  <span className="text-xs font-mono" style={{ color: '#8b8b8b' }}>ID: {testResult.ticketId?.substring(0, 12)}</span>
                </div>
              </div>

              <div className="p-4 space-y-3" style={{ backgroundColor: '#fafafa' }}>
                {/* Routing Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="border rounded-lg p-3" style={{ backgroundColor: '#f5f5f5', borderColor: '#e8e8e8' }}>
                    <div className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: '#8b8b8b' }}>
                      <Target className="w-3 h-3" />
                      Route Decision
                    </div>
                    <div className="text-sm font-semibold flex items-center gap-1.5" style={{ color: '#4a4a4a' }}>
                      {testResult.routing.route === 'gemini-pro' ? (
                        <>
                          <Palette className="w-3.5 h-3.5" style={{ color: '#8b8b8b' }} />
                          Gemini Pro
                        </>
                      ) : (
                        <>
                          <Wrench className="w-3.5 h-3.5" style={{ color: '#8b8b8b' }} />
                          Claude Sonnet
                        </>
                      )}
                    </div>
                  </div>
                  <div className="border rounded-lg p-3" style={{ backgroundColor: '#f5f5f5', borderColor: '#e8e8e8' }}>
                    <div className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: '#8b8b8b' }}>
                      <Target className="w-3 h-3" />
                      Confidence Level
                    </div>
                    <div className="text-sm font-semibold" style={{ color: '#4a4a4a' }}>{testResult.routing.confidence}%</div>
                  </div>
                </div>

                {/* Reasoning */}
                <div>
                  <div className="text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: '#4a4a4a' }}>
                    <AlertCircle className="w-3 h-3" />
                    Why This Route?
                  </div>
                  <div className="text-xs border p-3 rounded-lg leading-relaxed" style={{ backgroundColor: '#ffffff', borderColor: '#e8e8e8', color: '#5a5a5a' }}>
                    {testResult.routing.reasoning}
                  </div>
                </div>

                {/* Response Preview */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs font-semibold flex items-center gap-1" style={{ color: '#4a4a4a' }}>
                      <Sparkles className="w-3 h-3" />
                      Response Preview
                    </div>
                    <button
                      onClick={() => setExpandedResponse(!expandedResponse)}
                      className="text-xs px-2 py-1 rounded transition font-medium"
                      style={{
                        background: 'linear-gradient(135deg, #4a7c59 0%, #3d6b4d 100%)',
                        color: '#fafafa'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #3d6b4d 0%, #2f5a3d 100%)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #4a7c59 0%, #3d6b4d 100%)'}
                    >
                      {expandedResponse ? '▼ Collapse' : '▶ Expand'}
                    </button>
                  </div>
                  <div className={`text-xs border p-3 rounded-lg ${expandedResponse ? 'max-h-80' : 'max-h-32'} overflow-y-auto whitespace-pre-wrap leading-relaxed`} style={{ backgroundColor: '#ffffff', borderColor: '#e8e8e8', color: '#5a5a5a' }}>
                    {testResult.response.preview}
                  </div>
                </div>

                {/* Status Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className={`border rounded-lg p-2.5 ${testResult.safety.passed ? 'bg-white' : 'bg-red-50'}`} style={{ borderColor: testResult.safety.passed ? '#e8e8e8' : '#ffcccc' }}>
                    <div className="text-xs font-medium mb-1" style={{ color: '#8b8b8b' }}>Safety</div>
                    <div className={`text-xs font-semibold ${testResult.safety.passed ? '' : 'text-red-700'}`} style={{ color: testResult.safety.passed ? '#5a5a5a' : undefined }}>
                      {testResult.safety.passed ? '✓ Passed' : '✗ Failed'}
                    </div>
                  </div>
                  <div className={`border rounded-lg p-2.5 ${testResult.wouldPost ? 'bg-white' : 'bg-yellow-50'}`} style={{ borderColor: testResult.wouldPost ? '#e8e8e8' : '#ffe8cc' }}>
                    <div className="text-xs font-medium mb-1" style={{ color: '#8b8b8b' }}>Auto-Post</div>
                    <div className={`text-xs font-semibold ${testResult.wouldPost ? '' : 'text-yellow-700'}`} style={{ color: testResult.wouldPost ? '#5a5a5a' : undefined }}>
                      {testResult.wouldPost ? '✓ Yes' : '⚠ Review'}
                    </div>
                  </div>
                  <div className="border rounded-lg p-2.5" style={{ borderColor: '#e8e8e8', backgroundColor: '#ffffff' }}>
                    <div className="text-xs font-medium mb-1 flex items-center gap-1" style={{ color: '#8b8b8b' }}>
                      <Clock className="w-3 h-3" />
                      Time
                    </div>
                    <div className="text-xs font-semibold" style={{ color: '#5a5a5a' }}>{testResult.performance.totalDuration}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div>
          {/* Time Period Selector */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-medium text-gray-700">Time Period:</span>
            <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
              <button
                onClick={() => setTimePeriod('today')}
                className={`px-3 py-1 text-xs font-medium rounded transition ${
                  timePeriod === 'today' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setTimePeriod('week')}
                className={`px-3 py-1 text-xs font-medium rounded transition ${
                  timePeriod === 'week' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setTimePeriod('month')}
                className={`px-3 py-1 text-xs font-medium rounded transition ${
                  timePeriod === 'month' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                This Month
              </button>
              <button
                onClick={() => setTimePeriod('allTime')}
                className={`px-3 py-1 text-xs font-medium rounded transition ${
                  timePeriod === 'allTime' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Time
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              title="Total Processed"
              subtitle={`Tickets analyzed ${timePeriod === 'today' ? 'today' : timePeriod === 'week' ? 'this week' : timePeriod === 'month' ? 'this month' : 'all time'}`}
              value={stats[timePeriod].totalProcessed}
              icon={<TrendingUp className="w-4 h-4" />}
              color="blue"
            />
            <StatCard
              title="Avg Confidence"
              subtitle="How certain Ghosty👻 is"
              value={`${Math.round(stats[timePeriod].averageConfidence)}%`}
              icon={<Target className="w-4 h-4" />}
              color="green"
            />
            <StatCard
              title="Total Cost"
              subtitle={`API costs ${timePeriod === 'today' ? 'today' : timePeriod === 'week' ? 'this week' : timePeriod === 'month' ? 'this month' : 'all time'}`}
              value={`$${stats[timePeriod].totalCost.toFixed(3)}`}
              icon={<DollarSign className="w-4 h-4" />}
              color="yellow"
            />
            <StatCard
              title="Avg Cost/Ticket"
              subtitle="Average AI cost per ticket"
              value={`$${stats[timePeriod].averageCostPerTicket.toFixed(4)}`}
              icon={<DollarSign className="w-4 h-4" />}
              color="purple"
            />
          </div>
        </div>
      )}

      {/* Routing Breakdown */}
      {stats && (
        <div className="rounded-lg border p-4" style={{ backgroundColor: '#fafafa', borderColor: '#d4d4d4' }}>
          <h3 className="text-sm font-semibold mb-4" style={{ color: '#3d6b4d' }}>
            AI Model Distribution 
            {timePeriod === 'today' && ' (Today)'}
            {timePeriod === 'week' && ' (Last 7 Days)'}
            {timePeriod === 'month' && ' (This Month)'}
            {timePeriod === 'allTime' && ' (All Time)'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center border rounded-lg p-4" style={{ borderColor: '#d4d4d4', backgroundColor: '#ffffff' }}>
              <div className="inline-flex items-center justify-center p-2 rounded-lg mb-2" style={{ background: 'linear-gradient(135deg, #5a8c69 0%, #4a7c59 100%)' }}>
                <Palette className="w-4 h-4" style={{ color: '#fafafa' }} />
              </div>
              <div className="text-2xl font-bold mb-0.5" style={{ color: '#4a7c59' }}>{stats[timePeriod].routedToGeminiPro}</div>
              <div className="text-xs font-medium mb-0.5" style={{ color: '#5a5a5a' }}>Gemini Pro</div>
              <div className="text-xs" style={{ color: '#8b8b8b' }}>UI/UX & Simple Issues</div>
            </div>
            <div className="text-center border rounded-lg p-4" style={{ borderColor: '#d4d4d4', backgroundColor: '#ffffff' }}>
              <div className="inline-flex items-center justify-center p-2 rounded-lg mb-2" style={{ background: 'linear-gradient(135deg, #8a9590 0%, #758a7f 100%)' }}>
                <Wrench className="w-4 h-4" style={{ color: '#fafafa' }} />
              </div>
              <div className="text-2xl font-bold mb-0.5" style={{ color: '#758a7f' }}>{stats[timePeriod].routedToClaudeSonnet}</div>
              <div className="text-xs font-medium mb-0.5" style={{ color: '#5a5a5a' }}>Claude Sonnet</div>
              <div className="text-xs" style={{ color: '#8b8b8b' }}>Complex & Business Logic</div>
            </div>
            <div className="text-center border rounded-lg p-4" style={{ borderColor: '#d4d4d4', backgroundColor: '#ffffff' }}>
              <div className="inline-flex items-center justify-center p-2 rounded-lg mb-2" style={{ background: 'linear-gradient(135deg, #c9a961 0%, #b89654 100%)' }}>
                <User className="w-4 h-4" style={{ color: '#fafafa' }} />
              </div>
              <div className="text-2xl font-bold mb-0.5" style={{ color: '#b89654' }}>{stats[timePeriod].humanOverrides}</div>
              <div className="text-xs font-medium mb-0.5" style={{ color: '#5a5a5a' }}>Human Overrides</div>
              <div className="text-xs" style={{ color: '#8b8b8b' }}>
                {stats[timePeriod].totalProcessed > 0
                  ? `${Math.round((stats[timePeriod].humanOverrides / stats[timePeriod].totalProcessed) * 100)}% error rate`
                  : '0% error rate'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: '#fafafa', borderColor: '#e8e8e8' }}>
        <div className="border-b px-3 py-2" style={{ backgroundColor: '#f5f5f5', borderColor: '#e8e8e8' }}>
          <h3 className="text-sm font-semibold" style={{ color: '#4a4a4a' }}>Recent Activity</h3>
          <p className="text-xs mt-0.5" style={{ color: '#8b8b8b' }}>Last 20 tickets processed by Ghosty👻</p>
        </div>
        <div>
          {recentLogs.length === 0 ? (
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center bg-gray-100 p-2.5 rounded-full mb-2">
                <Bot className="w-5 h-5 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 font-medium">No Ghosty activity yet👻</p>
              <p className="text-xs text-gray-500 mt-1">Create a support ticket to test</p>
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

function StatCard({ title, subtitle, value, icon, color }) {
  const colorStyles = {
    blue: {
      iconBg: 'linear-gradient(135deg, #4a7c59 0%, #3d6b4d 100%)', // Sage green
      valueColor: '#3d6b4d'
    },
    green: {
      iconBg: 'linear-gradient(135deg, #5a8c69 0%, #4a7c59 100%)', // Lighter sage
      valueColor: '#4a7c59'
    },
    yellow: {
      iconBg: 'linear-gradient(135deg, #c9a961 0%, #b89654 100%)', // Gold
      valueColor: '#b89654'
    },
    purple: {
      iconBg: 'linear-gradient(135deg, #8a9590 0%, #758a7f 100%)', // Taupe-green
      valueColor: '#758a7f'
    }
  };

  const colors = colorStyles[color];

  return (
    <div className="border rounded-lg p-3" style={{ borderColor: '#d4d4d4', backgroundColor: '#fafafa' }}>
      <div className="flex items-start justify-between mb-2">
        <div className="p-1.5 rounded" style={{ background: colors.iconBg, color: '#fafafa' }}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold mb-0.5" style={{ color: colors.valueColor }}>{value}</div>
      <div className="font-medium text-xs mb-0.5" style={{ color: '#5a5a5a' }}>{title}</div>
      <div className="text-xs" style={{ color: '#8b8b8b' }}>{subtitle}</div>
    </div>
  );
}

function LogEntry({ log, onViewDetails, onOverride }) {
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString();
  };

  const getRouteInfo = (route) => {
    if (route === 'gemini-pro') {
      return {
        color: 'text-gray-600',
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        icon: <Palette className="w-3 h-3" />,
        label: 'Gemini Pro'
      };
    }
    return {
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      icon: <Wrench className="w-3 h-3" />,
      label: 'Claude Sonnet'
    };
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 90) return '#4a4a4a';
    if (confidence >= 75) return '#6a6a6a';
    return '#8b8b8b';
  };

  const routeInfo = getRouteInfo(log.routing?.route || 'gemini-pro');
  const confidence = log.routing?.confidence || 0;

  return (
    <div 
      onClick={() => onViewDetails(log)}
      className="p-2 transition cursor-pointer border-b last:border-b-0"
      style={{ 
        backgroundColor: '#ffffff',
        borderColor: '#e8e8e8'
      }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9f9f9'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-semibold flex items-center gap-1" style={{ color: '#4a4a4a' }}>
              <Hash className="w-3.5 h-3.5" style={{ color: '#9a9a9a' }} />
              {log.ticketNumber}
            </span>
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${routeInfo.bg} ${routeInfo.color} flex items-center gap-1`} style={{ borderColor: '#e8e8e8', backgroundColor: '#f5f5f5', color: '#6a6a6a' }}>
              {routeInfo.icon}
              {routeInfo.label}
            </span>
            <span className="text-xs font-bold" style={{ color: getConfidenceColor(confidence) }}>
              {confidence}%
            </span>
            {log.responsePosted && (
              <span className="px-2 py-0.5 border rounded text-xs font-medium flex items-center gap-1" style={{ borderColor: '#e8e8e8', backgroundColor: '#f5f5f5', color: '#5a5a5a' }}>
                <CheckCircle className="w-3 h-3" />
                Posted
              </span>
            )}
          </div>

          {/* Reasoning */}
          <p className="text-xs mb-1.5 leading-relaxed" style={{ color: '#6a6a6a' }}>
            {log.routing?.reasoning || log.reasoning || 'No reasoning available'}
          </p>

          {/* Metadata */}
          <div className="flex items-center gap-3 text-xs" style={{ color: '#9a9a9a' }}>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatTimestamp(log.timestamp)}
            </span>
            {(log.cost?.total || log.totalCost) && (
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                ${(log.cost?.total || log.totalCost).toFixed(4)}
              </span>
            )}
            {log.tokensUsed && (
              <span className="flex items-center gap-1">
                <Hash className="w-3 h-3" />
                {log.tokensUsed.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LogDetailModal({ log, onClose, onOverride, onViewConversation }) {
  const getRouteInfo = (route) => {
    if (route === 'gemini-pro') {
      return {
        color: 'text-gray-600',
        bg: 'bg-gray-50',
        icon: <Palette className="w-4 h-4" />,
        label: 'Gemini Pro - UI/UX Specialist'
      };
    }
    return {
      color: 'text-gray-600',
      bg: 'bg-gray-50',
      icon: <Wrench className="w-4 h-4" />,
      label: 'Claude Sonnet - Complex Logic'
    };
  };

  const routeInfo = getRouteInfo(log.routing?.route || log.route);
  const confidence = log.routing?.confidence || log.confidence;
  const reasoning = log.routing?.reasoning || log.reasoning;

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ background: 'linear-gradient(135deg, #4a7c59 0%, #3d6b4d 100%)', color: '#fafafa' }}>
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)' }}>
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-lg font-bold">Ghosty Log👻</h3>
              <p className="text-xs flex items-center gap-1" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                <Hash className="w-3 h-3" />
                {log.ticketNumber || `ID: ${log.ticketId.substring(0, 12)}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 transition"
            style={{ color: 'rgba(255, 255, 255, 0.8)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#ffffff';
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span className="text-2xl">×</span>
          </button>
        </div>
        
        {/* Content */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1" style={{ backgroundColor: '#fafafa' }}>
          {/* Routing Decision */}
          <div className="border rounded-xl p-3" style={{ backgroundColor: '#f5f5f5', borderColor: '#e8e8e8' }}>
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm" style={{ color: '#4a4a4a' }}>
              <Target className="w-4 h-4" style={{ color: '#8b8b8b' }} />
              Routing Decision
            </h4>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className={`${routeInfo.bg} border rounded-lg p-3`} style={{ borderColor: '#e8e8e8', backgroundColor: '#ffffff' }}>
                <div className="text-xs font-medium mb-1.5" style={{ color: '#8b8b8b' }}>Routed To</div>
                <div className="font-semibold flex items-center gap-2 text-sm" style={{ color: '#5a5a5a' }}>
                  {routeInfo.icon}
                  {routeInfo.label}
                </div>
              </div>
              <div className="border rounded-lg p-3" style={{ backgroundColor: '#ffffff', borderColor: '#e8e8e8' }}>
                <div className="text-xs font-medium mb-1.5" style={{ color: '#8b8b8b' }}>Confidence Level</div>
                <div className="font-semibold text-sm" style={{ color: '#4a4a4a' }}>{confidence}%</div>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold mb-1.5 flex items-center gap-1" style={{ color: '#4a4a4a' }}>
                <AlertCircle className="w-3 h-3" />
                Why This Route?
              </div>
              <div className="text-sm border p-3 rounded-lg font-medium" style={{ backgroundColor: '#ffffff', borderColor: '#e8e8e8', color: '#5a5a5a' }}>
                {reasoning}
              </div>
            </div>
          </div>

          {/* Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border rounded-lg p-3" style={{ backgroundColor: '#ffffff', borderColor: '#e8e8e8' }}>
              <div className="text-xs font-medium mb-1.5" style={{ color: '#8b8b8b' }}>Complexity</div>
              <div className="text-sm font-semibold capitalize" style={{ color: '#5a5a5a' }}>{log.complexity || 'N/A'}</div>
            </div>
            <div className="border rounded-lg p-3" style={{ backgroundColor: '#ffffff', borderColor: '#e8e8e8' }}>
              <div className="text-xs font-medium mb-1.5" style={{ color: '#8b8b8b' }}>Urgency</div>
              <div className="text-sm font-semibold capitalize" style={{ color: '#5a5a5a' }}>{log.urgency || 'N/A'}</div>
            </div>
            <div className="border rounded-lg p-3" style={{ backgroundColor: '#ffffff', borderColor: '#e8e8e8' }}>
              <div className="text-xs font-medium mb-1.5" style={{ color: '#8b8b8b' }}>Status</div>
              <div className="text-sm font-semibold" style={{ color: log.responsePosted ? '#5a5a5a' : '#7a7a7a' }}>
                {log.responsePosted ? '✓ Posted' : '○ Observed'}
              </div>
            </div>
          </div>

          {/* Keywords */}
          {log.keywords && log.keywords.length > 0 && (
            <div>
              <div className="text-xs font-semibold mb-2" style={{ color: '#4a4a4a' }}>Keywords Detected</div>
              <div className="flex flex-wrap gap-2">
                {log.keywords.map((keyword, idx) => (
                  <span key={idx} className="px-2.5 py-1 text-xs font-medium rounded-full border" style={{ backgroundColor: '#f5f5f5', borderColor: '#e8e8e8', color: '#5a5a5a' }}>
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cost Info */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="border rounded-lg p-3" style={{ backgroundColor: '#ffffff', borderColor: '#e8e8e8' }}>
              <div className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: '#8b8b8b' }}>
                <Hash className="w-3 h-3" />
                Tokens Used
              </div>
              <div className="text-sm font-semibold" style={{ color: '#5a5a5a' }}>
                {log.tokensUsed?.toLocaleString() || 'N/A'}
              </div>
            </div>
            <div className="border rounded-lg p-3" style={{ backgroundColor: '#ffffff', borderColor: '#e8e8e8' }}>
              <div className="text-xs font-medium mb-1.5 flex items-center gap-1" style={{ color: '#8b8b8b' }}>
                <DollarSign className="w-3 h-3" />
                API Cost
              </div>
              <div className="text-sm font-semibold" style={{ color: '#5a5a5a' }}>
                ${log.cost?.total?.toFixed(5) || log.totalCost?.toFixed(5) || 'N/A'}
              </div>
            </div>
            <div className="border rounded-lg p-3" style={{ backgroundColor: '#ffffff', borderColor: '#e8e8e8' }}>
              <div className="text-xs font-medium mb-1.5" style={{ color: '#8b8b8b' }}>Model Used</div>
              <div className="text-xs font-semibold font-mono" style={{ color: '#5a5a5a' }}>
                {log.executionModel || log.triageModel || 'N/A'}
              </div>
            </div>
          </div>

          {/* Human Override Notice */}
          {log.humanOverride && (
            <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-3">
              <div className="font-semibold text-orange-900 mb-1.5 flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                Human Override Applied
              </div>
              <div className="text-sm text-orange-800 font-medium">
                Correct route should have been: <span className="font-bold">{log.correctRoute}</span>
              </div>
              {log.feedback && (
                <div className="text-sm text-orange-700 mt-2 bg-white/50 p-2.5 rounded-lg">
                  Feedback: {log.feedback}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t p-3 flex gap-2" style={{ borderColor: '#d4d4d4', backgroundColor: '#f5f5f5' }}>
          <button
            onClick={() => {
              onViewConversation();
            }}
            className="flex-1 px-3 py-2 rounded-lg transition font-medium flex items-center justify-center gap-2 text-sm"
            style={{
              background: 'linear-gradient(135deg, #4a7c59 0%, #3d6b4d 100%)',
              color: '#fafafa'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #3d6b4d 0%, #2f5a3d 100%)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'linear-gradient(135deg, #4a7c59 0%, #3d6b4d 100%)'}
          >
            <Sparkles className="w-4 h-4" />
            View Full Conversation
          </button>
          {!log.humanOverride && (
            <>
              <button
                onClick={() => {
                  onOverride(log.id, log.ticketId, 'gemini-pro');
                  onClose();
                }}
                className="flex-1 px-3 py-2 rounded-lg transition font-medium flex items-center justify-center gap-2 text-sm"
                style={{
                  backgroundColor: '#e8e8e8',
                  color: '#5a5a5a'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d8d8d8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e8e8e8'}
              >
                <Palette className="w-4 h-4" />
                Mark as Gemini Pro
              </button>
              <button
                onClick={() => {
                  onOverride(log.id, log.ticketId, 'claude-sonnet');
                  onClose();
                }}
                className="flex-1 px-3 py-2 rounded-lg transition font-medium flex items-center justify-center gap-2 text-sm"
                style={{
                  backgroundColor: '#e8e8e8',
                  color: '#5a5a5a'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d8d8d8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#e8e8e8'}
              >
                <Wrench className="w-4 h-4" />
                Mark as Claude Sonnet
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
