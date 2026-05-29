import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Star, Clock, CheckCircle, CurrencyDollar } from '@phosphor-icons/react';
import { useAdmin } from '../../context/AdminContext';

export default function AdminUsersGifts() {
  const { theme } = useOutletContext();
  const { giftAnalytics } = useAdmin();
  const g = giftAnalytics || {};
  const byType = g.byType || { monthly: 0, quarterly: 0, annual: 0 };
  const recent = g.recentGifts || [];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-6 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: theme.textLight }}>Total Gifts</p>
              <p className="text-lg font-bold" style={{ color: theme.primary }}>{g.total ?? 0}</p>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.primary + '15' }}>
              <Star size={24} style={{ color: theme.primary }} />
            </div>
          </div>
        </div>
        <div className="p-6 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: theme.textLight }}>Pending</p>
              <p className="text-lg font-bold text-yellow-600">{g.pending ?? 0}</p>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-yellow-100">
              <Clock size={24} className="text-yellow-600" />
            </div>
          </div>
        </div>
        <div className="p-6 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: theme.textLight }}>Redeemed</p>
              <p className="text-lg font-bold text-green-600">{g.redeemed ?? 0}</p>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100">
              <CheckCircle size={24} className="text-green-600" />
            </div>
          </div>
        </div>
        <div className="p-6 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium" style={{ color: theme.textLight }}>Revenue</p>
              <p className="text-lg font-bold text-green-600">${((g.totalRevenue ?? 0)).toFixed(2)}</p>
            </div>
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-green-100">
              <CurrencyDollar size={24} className="text-green-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text }}>Gift Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: theme.background }}>
            <p className="text-sm font-medium" style={{ color: theme.textLight }}>Monthly</p>
            <p className="text-xl font-bold" style={{ color: theme.primary }}>{byType.monthly ?? 0}</p>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: theme.background }}>
            <p className="text-sm font-medium" style={{ color: theme.textLight }}>Quarterly</p>
            <p className="text-xl font-bold" style={{ color: theme.primary }}>{byType.quarterly ?? 0}</p>
          </div>
          <div className="text-center p-4 rounded-lg" style={{ backgroundColor: theme.background }}>
            <p className="text-sm font-medium" style={{ color: theme.textLight }}>Annual</p>
            <p className="text-xl font-bold" style={{ color: theme.primary }}>{byType.annual ?? 0}</p>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-lg border" style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}>
        <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text }}>Recent Gifts</h3>
        {recent.length > 0 ? (
          <div className="space-y-3">
            {recent.map((gift, i) => (
              <div
                key={gift.id || i}
                className="flex items-center justify-between p-3 rounded-lg border"
                style={{ borderColor: theme.border, backgroundColor: theme.background }}
              >
                <div>
                  <p className="font-medium" style={{ color: theme.text }}>
                    {gift.giftGiverName} → {gift.recipientEmail}
                  </p>
                  <p className="text-sm" style={{ color: theme.textLight }}>
                    {gift.subscriptionType === 'monthly' ? '1 Month' : gift.subscriptionType === 'quarterly' ? '3 Months' : '1 Year'} • ${gift.pricePaid ?? '0'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${
                      gift.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      gift.status === 'redeemed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {gift.status}
                  </span>
                  <span className="text-xs" style={{ color: theme.textLight }}>
                    {gift.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center py-8" style={{ color: theme.textLight }}>No gifts found</p>
        )}
      </div>
    </div>
  );
}
