import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Copy, Check, Loader, Download, Package, 
  CheckCircle, XCircle, Calendar, RefreshCw, Hash
} from 'lucide-react';
import {
  createAnnualCodes,
  getAnnualCodes,
  deleteAnnualCode,
  deleteAnnualCodeBatch
} from '../../services/firebase';

export default function AnnualCodeManager({ theme }) {
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [codeCount, setCodeCount] = useState(10);
  const [batchName, setBatchName] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all'); // 'all', 'unused', 'used'

  useEffect(() => {
    loadCodes();
  }, []);

  const loadCodes = async () => {
    setLoading(true);
    try {
      const fetchedCodes = await getAnnualCodes();
      setCodes(fetchedCodes);
    } catch (err) {
      setError('Failed to load codes');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCodes = async () => {
    if (codeCount < 1 || codeCount > 100) {
      setError('Please enter a number between 1 and 100');
      return;
    }

    setGenerating(true);
    setError('');
    setSuccess('');

    try {
      const newCodes = await createAnnualCodes(codeCount, batchName);
      setSuccess(`✅ Successfully generated ${newCodes.length} annual codes!`);
      setBatchName('');
      await loadCodes();
    } catch (err) {
      setError(`Failed to generate codes: ${err.message}`);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteCode = async (code) => {
    if (!confirm(`Are you sure you want to delete code ${code}?`)) return;

    try {
      await deleteAnnualCode(code);
      setSuccess(`Code ${code} deleted successfully`);
      await loadCodes();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleExportCodes = () => {
    const unusedCodes = codes.filter(c => !c.used);
    const csvContent = [
      'Code,Status,Batch,Created At',
      ...unusedCodes.map(c => 
        `${c.code},Unused,${c.batchName || c.batchId || ''},${c.createdAt?.toDate?.()?.toISOString() || ''}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annual-codes-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyAllUnused = () => {
    const unusedCodes = codes.filter(c => !c.used).map(c => c.code);
    navigator.clipboard.writeText(unusedCodes.join('\n'));
    setSuccess(`Copied ${unusedCodes.length} unused codes to clipboard!`);
    setTimeout(() => setSuccess(''), 3000);
  };

  const filteredCodes = codes.filter(code => {
    if (filter === 'unused') return !code.used;
    if (filter === 'used') return code.used;
    return true;
  });

  const stats = {
    total: codes.length,
    unused: codes.filter(c => !c.used).length,
    used: codes.filter(c => c.used).length
  };

  // Calculate expiration date for a redeemed code
  const getExpirationDisplay = (code) => {
    if (!code.used || !code.usedAt) return '-';
    const usedDate = new Date(code.usedAt.toDate?.() || code.usedAt);
    const expDate = new Date(usedDate);
    expDate.setFullYear(expDate.getFullYear() + 1);
    
    const now = new Date();
    const isExpired = expDate < now;
    
    return {
      date: expDate.toLocaleDateString(),
      isExpired
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: theme.text }}>
            Annual Code Manager
          </h2>
          <p className="text-sm mt-1" style={{ color: theme.textLight }}>
            Generate and manage redemption codes for Annual Subscription Kits
          </p>
        </div>
        <button
          onClick={loadCodes}
          className="p-2 rounded-lg transition-colors hover:opacity-80"
          style={{ backgroundColor: theme.cardBackground }}
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} style={{ color: theme.textLight }} />
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div 
          className="p-4 rounded-xl"
          style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: theme.primary + '20' }}>
              <Hash className="w-5 h-5" style={{ color: theme.primary }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: theme.text }}>{stats.total}</p>
              <p className="text-xs" style={{ color: theme.textLight }}>Total Codes</p>
            </div>
          </div>
        </div>
        <div 
          className="p-4 rounded-xl"
          style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#10B98120' }}>
              <Calendar className="w-5 h-5" style={{ color: '#10B981' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: '#10B981' }}>{stats.unused}</p>
              <p className="text-xs" style={{ color: theme.textLight }}>Available</p>
            </div>
          </div>
        </div>
        <div 
          className="p-4 rounded-xl"
          style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#6366F120' }}>
              <CheckCircle className="w-5 h-5" style={{ color: '#6366F1' }} />
            </div>
            <div>
              <p className="text-2xl font-bold" style={{ color: '#6366F1' }}>{stats.used}</p>
              <p className="text-xs" style={{ color: theme.textLight }}>Redeemed</p>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Codes Section */}
      <div 
        className="p-6 rounded-xl"
        style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}
      >
        <h3 className="font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text }}>
          <Package className="w-5 h-5" />
          Generate New Annual Codes
        </h3>

        <div className="flex flex-wrap gap-4 items-end">
          <div className="flex-1 min-w-[150px]">
            <label className="block text-xs font-medium mb-1" style={{ color: theme.textLight }}>
              Number of Codes
            </label>
            <input
              type="number"
              min="1"
              max="100"
              value={codeCount}
              onChange={(e) => setCodeCount(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ 
                backgroundColor: theme.background, 
                border: `1px solid ${theme.border}`,
                color: theme.text
              }}
            />
          </div>
          <div className="flex-[2] min-w-[200px]">
            <label className="block text-xs font-medium mb-1" style={{ color: theme.textLight }}>
              Batch Name (optional)
            </label>
            <input
              type="text"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder="e.g., Spring 2025 Annual Kits"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{ 
                backgroundColor: theme.background, 
                border: `1px solid ${theme.border}`,
                color: theme.text
              }}
            />
          </div>
          <button
            onClick={handleGenerateCodes}
            disabled={generating}
            className="px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-opacity"
            style={{ 
              backgroundColor: theme.primary, 
              color: '#FFFFFF',
              opacity: generating ? 0.7 : 1
            }}
          >
            {generating ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Generate Codes
              </>
            )}
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mt-4 p-3 rounded-lg text-sm" style={{ backgroundColor: '#EF444420', color: '#EF4444' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 p-3 rounded-lg text-sm" style={{ backgroundColor: '#10B98120', color: '#10B981' }}>
            {success}
          </div>
        )}
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: theme.textLight }}>Filter:</span>
          {['all', 'unused', 'used'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ 
                backgroundColor: filter === f ? theme.primary : theme.background,
                color: filter === f ? '#FFFFFF' : theme.textLight,
                border: `1px solid ${theme.border}`
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({f === 'all' ? stats.total : stats[f]})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAllUnused}
            disabled={stats.unused === 0}
            className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-opacity"
            style={{ 
              backgroundColor: theme.background, 
              color: theme.text,
              border: `1px solid ${theme.border}`,
              opacity: stats.unused === 0 ? 0.5 : 1
            }}
          >
            <Copy className="w-4 h-4" />
            Copy All Unused
          </button>
          <button
            onClick={handleExportCodes}
            disabled={stats.unused === 0}
            className="px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-opacity"
            style={{ 
              backgroundColor: theme.background, 
              color: theme.text,
              border: `1px solid ${theme.border}`,
              opacity: stats.unused === 0 ? 0.5 : 1
            }}
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Codes List */}
      <div 
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: theme.cardBackground, border: `1px solid ${theme.border}` }}
      >
        {loading ? (
          <div className="p-8 text-center">
            <Loader className="w-8 h-8 animate-spin mx-auto mb-2" style={{ color: theme.primary }} />
            <p style={{ color: theme.textLight }}>Loading codes...</p>
          </div>
        ) : filteredCodes.length === 0 ? (
          <div className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto mb-2" style={{ color: theme.textLight }} />
            <p style={{ color: theme.textLight }}>
              {filter === 'all' ? 'No codes generated yet' : `No ${filter} codes`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: theme.background }}>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>
                    Code
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>
                    Batch
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>
                    Redeemed By
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>
                    Redeemed
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>
                    Expires
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider" style={{ color: theme.textLight }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: theme.border }}>
                {filteredCodes.map(code => {
                  const expInfo = getExpirationDisplay(code);
                  return (
                    <tr key={code.code} className="hover:opacity-80 transition-opacity">
                      <td className="px-4 py-3">
                        <code 
                          className="font-mono text-sm font-bold px-2 py-1 rounded"
                          style={{ backgroundColor: theme.background, color: theme.text }}
                        >
                          {code.code}
                        </code>
                      </td>
                      <td className="px-4 py-3">
                        {code.used ? (
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: '#6366F120', color: '#6366F1' }}
                          >
                            <CheckCircle className="w-3 h-3" />
                            Redeemed
                          </span>
                        ) : (
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                            style={{ backgroundColor: '#10B98120', color: '#10B981' }}
                          >
                            <Calendar className="w-3 h-3" />
                            Available
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: theme.textLight }}>
                        {code.batchName || 'Unnamed'}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: theme.textLight }}>
                        {code.usedBy || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: theme.textLight }}>
                        {code.used && code.usedAt ? (
                          new Date(code.usedAt.toDate?.() || code.usedAt).toLocaleDateString()
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {expInfo !== '-' ? (
                          <span 
                            className="inline-flex items-center gap-1"
                            style={{ color: expInfo.isExpired ? '#EF4444' : theme.textLight }}
                          >
                            {expInfo.isExpired && <XCircle className="w-3 h-3" />}
                            {expInfo.date}
                          </span>
                        ) : (
                          <span style={{ color: theme.textLight }}>-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleCopyCode(code.code)}
                            className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                            style={{ backgroundColor: theme.background }}
                            title="Copy code"
                          >
                            {copiedCode === code.code ? (
                              <Check className="w-4 h-4" style={{ color: '#10B981' }} />
                            ) : (
                              <Copy className="w-4 h-4" style={{ color: theme.textLight }} />
                            )}
                          </button>
                          {!code.used && (
                            <button
                              onClick={() => handleDeleteCode(code.code)}
                              className="p-1.5 rounded-lg transition-colors hover:opacity-80"
                              style={{ backgroundColor: '#EF444420' }}
                              title="Delete code"
                            >
                              <Trash2 className="w-4 h-4" style={{ color: '#EF4444' }} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Redemption URL Info */}
      <div 
        className="p-4 rounded-xl"
        style={{ backgroundColor: theme.primary + '10', border: `1px solid ${theme.primary}40` }}
      >
        <h4 className="font-medium mb-2 flex items-center gap-2" style={{ color: theme.text }}>
          <Calendar className="w-4 h-4" style={{ color: theme.primary }} />
          Redemption URL
        </h4>
        <code 
          className="text-sm block p-2 rounded"
          style={{ backgroundColor: theme.cardBackground, color: theme.textLight }}
        >
          https://thepepplanner.app/research-annual
        </code>
        <p className="text-xs mt-2" style={{ color: theme.textLight }}>
          Include this URL in your Annual Subscription Kit packaging. Customers will enter their 6-character code to redeem 1 year of access.
        </p>
      </div>

      {/* Annual Kit Info */}
      <div 
        className="p-4 rounded-xl"
        style={{ backgroundColor: '#F59E0B10', border: `1px solid #F59E0B40` }}
      >
        <h4 className="font-medium mb-2 flex items-center gap-2" style={{ color: theme.text }}>
          <Calendar className="w-4 h-4" style={{ color: '#F59E0B' }} />
          Annual Subscription Notes
        </h4>
        <ul className="text-xs space-y-1" style={{ color: theme.textLight }}>
          <li>• Annual codes grant <strong>1 year of access</strong> from redemption date</li>
          <li>• When expired, users can purchase another code or switch to Stripe billing</li>
          <li>• These are for external purchases (Etsy, Amazon, etc.) not Stripe</li>
        </ul>
      </div>
    </div>
  );
}

