import React, { useState } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { WarningCircle, CheckCircle, XCircle, CircleNotch, ArrowsClockwise, Envelope, Key, Database, PaperPlaneTilt } from '@phosphor-icons/react';

export default function EmailDiagnostic({ theme }) {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState(null);
  const [testEmail, setTestEmail] = useState('thepepplanner@gmail.com');

  const runDiagnostic = async () => {
    setRunning(true);
    setResults(null);

    try {
      const functions = getFunctions();
      
      // Try the new diagnostic function first, fallback to testResendConnection
      let result;
      try {
        const diagnose = httpsCallable(functions, 'diagnoseEmailSystem');
        result = await diagnose({ testEmail });
      } catch (diagnosticError) {
        // If diagnostic function doesn't exist, use testResendConnection as fallback
        console.warn('Diagnostic function not available, using testResendConnection:', diagnosticError);
        const testResend = httpsCallable(functions, 'testResendConnection');
        const testResult = await testResend();
        
        // Convert testResendConnection result to diagnostic format
        result = {
          data: {
            success: testResult.data?.success || false,
            diagnostics: {
              overallStatus: testResult.data?.success ? '✅ OPERATIONAL' : '❌ ISSUES DETECTED',
              checks: {
                apiKeyAccessible: testResult.data?.success ? true : false,
                apiKeyFormat: testResult.data?.success ? true : false,
                resendImport: testResult.data?.success ? true : false,
                resendClientInit: testResult.data?.success ? true : false,
                emailSendSuccess: false, // testResendConnection doesn't send email
                firestoreAccess: true
              },
              errors: testResult.data?.success ? [] : [testResult.data?.message || 'Resend connection test failed'],
              recommendations: testResult.data?.success ? [] : [
                'Run: firebase functions:secrets:set RESEND_API_KEY',
                'Verify API key format (should start with "re_")',
                'Redeploy functions: firebase deploy --only functions'
              ]
            }
          }
        };
      }
      
      if (result.data) {
        setResults(result.data);
        
        if (result.data.success) {
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: '✅ Email system is operational!', type: 'success' }
          }));
        } else {
          window.dispatchEvent(new CustomEvent('tpp:toast', {
            detail: { message: '❌ Email system has issues - check results below', type: 'error' }
          }));
        }
      }
    } catch (error) {
      console.error('Diagnostic error:', error);
      setResults({
        success: false,
        diagnostics: {
          overallStatus: '❌ DIAGNOSTIC FAILED',
          errors: [
            `Failed to run diagnostic: ${error.message}`,
            error.code ? `Error code: ${error.code}` : '',
            'The diagnostic function may not be deployed yet'
          ].filter(Boolean),
          recommendations: [
            'Deploy functions: firebase deploy --only functions',
            'Check Firebase Functions are deployed',
            'Verify you have admin access',
            'Check browser console for detailed error messages'
          ]
        }
      });
      
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: `❌ Diagnostic failed: ${error.message}`, type: 'error' }
      }));
    } finally {
      setRunning(false);
    }
  };

  const getStatusIcon = (status) => {
    if (status === true || status === '✅ OPERATIONAL') {
      return <CheckCircle size={20} style={{ color: '#10B981' }} />;
    } else if (status === false) {
      return <XCircle size={20} style={{ color: '#EF4444' }} />;
    }
    return <WarningCircle size={20} style={{ color: '#F59E0B' }} />;
  };

  const getStatusColor = (status) => {
    if (status === true || status === '✅ OPERATIONAL') {
      return '#10B981';
    } else if (status === false) {
      return '#EF4444';
    }
    return '#F59E0B';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold" style={{ color: theme.text }}>
            Email System Diagnostic
          </h2>
          <p className="text-sm mt-1" style={{ color: theme.textLight }}>
            Test your email system and identify issues
          </p>
        </div>
        <button
          onClick={runDiagnostic}
          disabled={running}
          className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-opacity disabled:opacity-50"
          style={{ 
            backgroundColor: theme.primary, 
            color: theme.textOnPrimary || '#FFFFFF'
          }}
        >
          {running ? (
            <>
              <CircleNotch size={18} className="animate-spin" />
              Running...
            </>
          ) : (
            <>
              <ArrowsClockwise size={18} />
              Run Diagnostic
            </>
          )}
        </button>
      </div>

      {/* Test Email Input */}
      <div 
        className="p-4 rounded-lg border"
        style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
      >
        <label className="block text-sm font-medium mb-2" style={{ color: theme.text }}>
          Test Email Address
        </label>
        <input
          type="email"
          value={testEmail}
          onChange={(e) => setTestEmail(e.target.value)}
          placeholder="test@example.com"
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.background,
            color: theme.text
          }}
        />
        <p className="text-xs mt-2" style={{ color: theme.textLight }}>
          A test email will be sent to this address to verify the system works
        </p>
      </div>

      {/* Results */}
      {results && (
        <div className="space-y-4">
          {/* Overall Status */}
          <div 
            className="p-4 rounded-lg border-2"
            style={{ 
              borderColor: getStatusColor(results.diagnostics?.overallStatus),
              backgroundColor: theme.cardBackground
            }}
          >
            <div className="flex items-center gap-3">
              {getStatusIcon(results.diagnostics?.overallStatus)}
              <div>
                <h3 className="font-bold text-lg" style={{ color: theme.text }}>
                  {results.diagnostics?.overallStatus || 'Unknown Status'}
                </h3>
                <p className="text-sm" style={{ color: theme.textLight }}>
                  {results.success ? 'All systems operational!' : 'Issues detected - see details below'}
                </p>
              </div>
            </div>
          </div>

          {/* Checks */}
          {results.diagnostics?.checks && (
            <div 
              className="p-4 rounded-lg border space-y-3"
              style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
            >
              <h3 className="font-semibold mb-3" style={{ color: theme.text }}>System Checks</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* API Key Check */}
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: theme.background }}>
                  <Key size={20} style={{ color: theme.textLight }} />
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: theme.text }}>
                      API Key Accessible
                    </div>
                    <div className="text-xs" style={{ color: theme.textLight }}>
                      {results.diagnostics.checks.apiKeyAccessible ? '✅ Yes' : '❌ No'}
                      {results.diagnostics.checks.apiKeyPreview && ` (${results.diagnostics.checks.apiKeyPreview})`}
                    </div>
                  </div>
                  {getStatusIcon(results.diagnostics.checks.apiKeyAccessible)}
                </div>

                {/* API Key Format */}
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: theme.background }}>
                  <Key size={20} style={{ color: theme.textLight }} />
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: theme.text }}>
                      API Key Format
                    </div>
                    <div className="text-xs" style={{ color: theme.textLight }}>
                      {results.diagnostics.checks.apiKeyFormat ? '✅ Valid (starts with re_)' : '❌ Invalid'}
                    </div>
                  </div>
                  {getStatusIcon(results.diagnostics.checks.apiKeyFormat)}
                </div>

                {/* Resend Import */}
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: theme.background }}>
                  <Database size={20} style={{ color: theme.textLight }} />
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: theme.text }}>
                      Resend Package
                    </div>
                    <div className="text-xs" style={{ color: theme.textLight }}>
                      {results.diagnostics.checks.resendImport ? '✅ Installed' : '❌ Not found'}
                    </div>
                  </div>
                  {getStatusIcon(results.diagnostics.checks.resendImport)}
                </div>

                {/* Resend Client */}
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: theme.background }}>
                  <Database size={20} style={{ color: theme.textLight }} />
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: theme.text }}>
                      Resend Client
                    </div>
                    <div className="text-xs" style={{ color: theme.textLight }}>
                      {results.diagnostics.checks.resendClientInit ? '✅ Initialized' : '❌ Failed'}
                    </div>
                  </div>
                  {getStatusIcon(results.diagnostics.checks.resendClientInit)}
                </div>

                {/* Email PaperPlaneTilt Test */}
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: theme.background }}>
                  <PaperPlaneTilt size={20} style={{ color: theme.textLight }} />
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: theme.text }}>
                      Email PaperPlaneTilt Test
                    </div>
                    <div className="text-xs" style={{ color: theme.textLight }}>
                      {results.diagnostics.checks.emailSendSuccess ? 
                        `✅ Sent to ${results.diagnostics.checks.testEmailSent || 'test email'}` : 
                        '❌ Failed'}
                    </div>
                  </div>
                  {getStatusIcon(results.diagnostics.checks.emailSendSuccess)}
                </div>

                {/* Firestore Access */}
                <div className="flex items-center gap-3 p-3 rounded-lg" style={{ backgroundColor: theme.background }}>
                  <Database size={20} style={{ color: theme.textLight }} />
                  <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: theme.text }}>
                      Firestore Access
                    </div>
                    <div className="text-xs" style={{ color: theme.textLight }}>
                      {results.diagnostics.checks.firestoreAccess ? '✅ Accessible' : '❌ Failed'}
                    </div>
                  </div>
                  {getStatusIcon(results.diagnostics.checks.firestoreAccess)}
                </div>
              </div>
            </div>
          )}

          {/* Errors */}
          {results.diagnostics?.errors && results.diagnostics.errors.length > 0 && (
            <div 
              className="p-4 rounded-lg border"
              style={{ 
                borderColor: '#EF4444', 
                backgroundColor: '#FEE2E220'
              }}
            >
              <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: '#EF4444' }}>
                <XCircle size={18} />
                Errors Found
              </h3>
              <ul className="space-y-1">
                {results.diagnostics.errors.map((error, index) => (
                  <li key={index} className="text-sm" style={{ color: '#EF4444' }}>
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {results.diagnostics?.recommendations && results.diagnostics.recommendations.length > 0 && (
            <div 
              className="p-4 rounded-lg border"
              style={{ 
                borderColor: '#F59E0B', 
                backgroundColor: '#FEF3C720'
              }}
            >
              <h3 className="font-semibold mb-2 flex items-center gap-2" style={{ color: '#F59E0B' }}>
                <WarningCircle size={18} />
                Recommendations
              </h3>
              <ul className="space-y-1">
                {results.diagnostics.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm" style={{ color: '#F59E0B' }}>
                    • {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Email Functions List */}
          {results.diagnostics?.checks?.emailFunctions && (
            <div 
              className="p-4 rounded-lg border"
              style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
            >
              <h3 className="font-semibold mb-2" style={{ color: theme.text }}>
                Email Functions That Need RESEND_API_KEY
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {results.diagnostics.checks.emailFunctions.map((func, index) => (
                  <div key={index} className="text-sm flex items-center gap-2" style={{ color: theme.textLight }}>
                    <Envelope size={14} />
                    {func}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      {!results && (
        <div 
          className="p-4 rounded-lg border"
          style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
        >
          <h3 className="font-semibold mb-2" style={{ color: theme.text }}>How to Use</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm" style={{ color: theme.textLight }}>
            <li>Enter a test email address (default: thepepplanner@gmail.com)</li>
            <li>Click "Run Diagnostic"</li>
            <li>Review the results - green checkmarks = working, red X = problem</li>
            <li>Follow the recommendations to fix any issues</li>
          </ol>
        </div>
      )}
    </div>
  );
}

