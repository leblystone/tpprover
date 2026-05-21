import React, { useState, useEffect } from 'react';
import { Download, Users, FileText, Clock, Search, Filter } from 'lucide-react';
import { 
  getAllUserAgreements, 
  getUserAgreements, 
  getAgreementStatistics, 
  exportAllAgreements,
  getRetentionSummary,
  getExpiredAgreements,
  getRetentionStatus,
  anonymizeAgreementData,
  RETENTION_PERIODS,
  DATA_CLASSIFICATIONS
} from '../../services/agreementTracking';

export default function AgreementTracking({ theme }) {
  const [agreements, setAgreements] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [filteredAgreements, setFilteredAgreements] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Retention management state
  const [retentionSummary, setRetentionSummary] = useState(null);
  const [expiredAgreements, setExpiredAgreements] = useState([]);
  const [showRetentionTools, setShowRetentionTools] = useState(false);
  const [selectedAgreements, setSelectedAgreements] = useState([]);
  const [showRetentionDetails, setShowRetentionDetails] = useState(false);

  useEffect(() => {
    loadAgreementData();
  }, []);

  useEffect(() => {
    if (searchEmail.trim()) {
      const filtered = agreements.filter(agreement => 
        agreement.userEmail && agreement.userEmail.toLowerCase().includes(searchEmail.toLowerCase())
      );
      setFilteredAgreements(filtered);
    } else {
      setFilteredAgreements(agreements);
    }
  }, [agreements, searchEmail]);

  const loadAgreementData = async () => {
    try {
      setLoading(true);
      const [agreementsData, statsData] = await Promise.all([
        getAllUserAgreements(),
        getAgreementStatistics()
      ]);
      setAgreements(agreementsData);
      setStatistics(statsData);
      
      // Load retention data
      loadRetentionData();
      
    } catch (error) {
      console.error('Error loading agreement data:', error);
      // Set empty data on error so it doesn't load forever
      setAgreements([]);
      setStatistics({
        totalAgreements: 0,
        uniqueUsers: 0,
        agreementTypes: {},
        versions: {},
        timeRange: { earliest: null, latest: null }
      });
      window.dispatchEvent(new CustomEvent('tpp:toast', {
        detail: { message: 'No agreement data found or error loading', type: 'info' }
      }));
    } finally {
      setLoading(false);
    }
  };

  const loadRetentionData = () => {
    try {
      const retentionSummaryData = getRetentionSummary();
      const expiredAgreementsData = getExpiredAgreements();
      
      setRetentionSummary(retentionSummaryData);
      setExpiredAgreements(expiredAgreementsData);
      
      console.log('📊 Retention Summary:', retentionSummaryData);
      console.log('⏰ Expired Agreements:', expiredAgreementsData);
      
    } catch (error) {
      console.error('Error loading retention data:', error);
      setRetentionSummary(null);
      setExpiredAgreements([]);
    }
  };

  const handleExportAll = async () => {
    try {
      const exportData = await exportAllAgreements();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agreement-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  const handleUserClick = async (userEmail) => {
    if (userEmail === selectedUser) {
      setSelectedUser(null);
      return;
    }
    
    setSelectedUser(userEmail);
    try {
      const userAgreements = await getUserAgreements(userEmail);
      // Could show user-specific modal or details here
      console.log('User agreements:', userAgreements);
    } catch (error) {
      console.error('Error loading user agreements:', error);
    }
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const getAgreementTypeLabel = (type) => {
    const labels = {
      'first_launch_disclaimer': 'First Launch Disclaimer',
      'signup_terms': 'Sign-up Terms',
      'signup_privacy': 'Sign-up Privacy',
      'terms_update': 'Terms Update',
      'privacy_update': 'Privacy Update'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto mb-4" style={{ borderColor: theme.primary }}></div>
        <p>Loading agreement data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold" style={{ color: theme.primaryDark }}>User Agreement Tracking</h2>
          <p className="text-gray-600 mt-1 text-sm">Legal compliance and user agreement monitoring</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowRetentionTools(!showRetentionTools)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
              showRetentionTools 
                ? 'bg-orange-100 text-orange-700 border border-orange-300' 
                : 'bg-gray-100 text-gray-700 border border-gray-300'
            }`}
          >
            <Clock className="w-4 h-4" />
            Retention Tools
          </button>
          <button
            onClick={handleExportAll}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-white font-medium text-sm"
            style={{ backgroundColor: theme.primary }}
          >
            <Download className="w-4 h-4" />
            Export All
          </button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-600" />
              <div>
                <p className="text-sm text-gray-600">Unique Users</p>
                <p className="text-2xl font-bold">{statistics.uniqueUsers}</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg border" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-sm text-gray-600">Total Agreements</p>
                <p className="text-2xl font-bold">{statistics.totalAgreements}</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg border" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-orange-600" />
              <div>
                <p className="text-sm text-gray-600">Earliest</p>
                <p className="text-sm font-medium">
                  {statistics.timeRange.earliest ? formatDate(statistics.timeRange.earliest) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-lg border" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-purple-600" />
              <div>
                <p className="text-sm text-gray-600">Latest</p>
                <p className="text-sm font-medium">
                  {statistics.timeRange.latest ? formatDate(statistics.timeRange.latest) : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Data Retention Management */}
      {showRetentionTools && retentionSummary && (
        <div className="p-6 rounded-lg border" style={{ backgroundColor: '#fff8f0', borderColor: '#f59e0b' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-orange-900">Data Retention Management</h3>
            <button
              onClick={loadRetentionData}
              className="text-sm px-3 py-1 rounded bg-orange-100 text-orange-700 hover:bg-orange-200"
            >
              Refresh Data
            </button>
          </div>

          {/* Retention Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="text-sm text-blue-600 mb-1">Legal Agreements</div>
              <div className="text-2xl font-bold text-blue-900">{retentionSummary.classifications.legal}</div>
              <div className="text-xs text-blue-500">10 year retention</div>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-200">
              <div className="text-sm text-green-600 mb-1">User Metadata</div>
              <div className="text-2xl font-bold text-green-900">{retentionSummary.classifications.metadata}</div>
              <div className="text-xs text-green-500">5 year retention</div>
            </div>
            <div className="p-4 rounded-lg bg-purple-50 border border-purple-200">
              <div className="text-sm text-purple-600 mb-1">Technical Data</div>
              <div className="text-2xl font-bold text-purple-900">{retentionSummary.classifications.technical}</div>
              <div className="text-xs text-purple-500">3 year retention</div>
            </div>
            <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div className="text-sm text-gray-600 mb-1">Agreement Versions</div>
              <div className="text-2xl font-bold text-gray-900">{retentionSummary.classifications.versions}</div>
              <div className="text-xs text-gray-500">Permanent retention</div>
            </div>
          </div>

          {/* Expiration Status */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-3 rounded bg-red-50 border border-red-200">
              <div className="text-sm text-red-600">Expired Records</div>
              <div className="text-xl font-bold text-red-900">{retentionSummary.expirationStatus.expired}</div>
            </div>
            <div className="p-3 rounded bg-yellow-50 border border-yellow-200">
              <div className="text-sm text-yellow-600">Expiring (30 days)</div>
              <div className="text-xl font-bold text-yellow-900">{retentionSummary.expirationStatus.expiring30Days}</div>
            </div>
            <div className="p-3 rounded bg-amber-50 border border-amber-200">
              <div className="text-sm text-amber-600">Expiring (90 days)</div>
              <div className="text-xl font-bold text-amber-900">{retentionSummary.expirationStatus.expiring90Days}</div>
            </div>
            <div className="p-3 rounded bg-green-50 border border-green-200">
              <div className="text-sm text-green-600">Indefinite</div>
              <div className="text-xl font-bold text-green-900">{retentionSummary.expirationStatus.indefinite}</div>
            </div>
          </div>

          {/* Compliance Status */}
          <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 mb-4">
            <h4 className="font-semibold text-gray-800 mb-3">Compliance Status</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{retentionSummary.complianceFlags.medicalResearch}</div>
                <div className="text-sm text-gray-600">Medical/Research</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{retentionSummary.complianceFlags.fdaRegulatory}</div>
                <div className="text-sm text-gray-600">FDA Regulatory</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">{retentionSummary.complianceFlags.legalProtection}</div>
                <div className="text-sm text-gray-600">Legal Protection</div>
              </div>
            </div>
          </div>

          {/* Retention Period Reference */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-3">Retention Periods (Medical/Research Compliance)</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <strong className="text-blue-900">Legal Agreements:</strong> 10 years<br/>
                <span className="text-blue-700">• Terms of Service acceptances</span><br/>
                <span className="text-blue-700">• Privacy Policy agreements</span><br/>
                <span className="text-blue-700">• User consent records</span>
              </div>
              <div>
                <strong className="text-blue-900">Technical Data:</strong> 3-5 years<br/>
                <span className="text-blue-700">• User agent strings</span><br/>
                <span className="text-blue-700">• Error logs & analytics</span><br/>
                <span className="text-blue-700">• Security logs</span>
              </div>
            </div>
            <div className="mt-3 text-xs text-blue-600">
              <strong>Note:</strong> Agreement versions are retained indefinitely for regulatory compliance.
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by email address..."
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg"
            style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredAgreements.length} of {agreements.length} agreements
        </div>
      </div>

      {/* Agreement Types Breakdown */}
      {statistics && (
        <div className="p-4 rounded-lg border" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
          <h3 className="font-semibold mb-3">Agreement Types</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(statistics.agreementTypes).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm">{getAgreementTypeLabel(type)}</span>
                <span className="font-semibold text-sm">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agreements Table */}
      <div className="rounded-lg border overflow-hidden" style={{ backgroundColor: theme.cardBackground, borderColor: theme.border }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: theme.secondary }}>
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">User Email</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Agreement Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Version</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Date/Time</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAgreements.map((agreement, index) => (
                <tr key={agreement.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleUserClick(agreement.userEmail)}
                      className={`text-sm font-medium hover:underline ${
                        selectedUser === agreement.userEmail ? 'text-blue-600' : 'text-gray-900'
                      }`}
                    >
                      {agreement.userEmail || 'Anonymous'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {getAgreementTypeLabel(agreement.type)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {agreement.version || 'N/A'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {formatDate(agreement.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => console.log('Agreement details:', agreement)}
                      className="text-xs px-2 py-1 rounded text-blue-600 hover:bg-blue-50"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredAgreements.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No agreement data found.
        </div>
      )}
    </div>
  );
}
