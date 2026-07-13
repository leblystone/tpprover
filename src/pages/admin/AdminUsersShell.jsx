import React, { useEffect, useState } from 'react';
import { Outlet, useOutletContext, useSearchParams } from 'react-router-dom';
import { useAdmin } from '../../context/AdminContext';
import { UserDetailPanel } from '../../components/admin/UserDetailModal';
import UsersEmptyDetail from '../../components/admin/UsersEmptyDetail';
import { AdminSpinner } from '../../components/admin/adminUi';
import { X, CaretLeft } from '@phosphor-icons/react';

export default function AdminUsersShell() {
  const { theme, setFullBleed } = useOutletContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileShowDetail, setMobileShowDetail] = useState(false);
  const {
    selectedUser,
    hasSelectedUser,
    isLoadingUserDetails,
    userSelectionError,
    activeReportContext,
    selectUserByUid,
    selectUserByEmail,
    clearSelectedUser,
    handleExtendTrial,
    isExtendingTrial,
    loadLifetimeUsers,
  } = useAdmin();

  useEffect(() => {
    if (setFullBleed) setFullBleed(true);
    return () => {
      if (setFullBleed) setFullBleed(false);
    };
  }, [setFullBleed]);

  useEffect(() => {
    const uid = searchParams.get('uid');
    const email = searchParams.get('email');
    const ticketId = searchParams.get('ticketId');
    const reportContext = ticketId
      ? { ticketId, source: 'deeplink' }
      : null;
    if (uid) {
      selectUserByUid(uid, { reportContext });
      setMobileShowDetail(true);
    } else if (email) {
      selectUserByEmail(email, { reportContext });
      setMobileShowDetail(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount / param change
  }, [searchParams.get('uid'), searchParams.get('email'), searchParams.get('ticketId')]);

  useEffect(() => {
    if (hasSelectedUser) setMobileShowDetail(true);
  }, [hasSelectedUser]);

  const handleCloseDetail = () => {
    clearSelectedUser();
    setMobileShowDetail(false);
    if (searchParams.get('uid') || searchParams.get('email')) {
      const next = new URLSearchParams(searchParams);
      next.delete('uid');
      next.delete('email');
      next.delete('ticketId');
      setSearchParams(next, { replace: true });
    }
  };

  const selectedUid = selectedUser?.uid || selectedUser?.id;

  return (
    <div className="flex-1 min-h-0 h-full max-h-full overflow-hidden grid lg:grid-cols-[minmax(280px,1fr)_minmax(0,2fr)]">
      {/* Left: list scrolls independently */}
      <div
        className={`min-h-0 h-full flex flex-col border-r overflow-hidden ${
          mobileShowDetail ? 'hidden lg:flex' : 'flex'
        }`}
        style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
      >
        <Outlet context={{ theme, selectedUid, onUserSelect: () => setMobileShowDetail(true) }} />
      </div>

      {/* Right: detail scrolls independently */}
      <div
        className={`min-h-0 h-full flex flex-col overflow-hidden ${
          mobileShowDetail ? 'flex' : 'hidden lg:flex'
        }`}
        style={{ backgroundColor: theme.background }}
      >
        <div
          className="lg:hidden flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b"
          style={{ borderColor: theme.border, backgroundColor: theme.cardBackground }}
        >
          <button
            type="button"
            onClick={() => {
              if (hasSelectedUser) handleCloseDetail();
              else setMobileShowDetail(false);
            }}
            className="p-2 rounded-lg"
            style={{ color: theme.text }}
          >
            <CaretLeft size={18} />
          </button>
          <span className="text-sm font-semibold" style={{ color: theme.text }}>
            {hasSelectedUser ? 'Account' : 'Back to list'}
          </span>
          {hasSelectedUser && (
            <button
              type="button"
              onClick={handleCloseDetail}
              className="ml-auto p-2 rounded-lg"
              style={{ color: theme.textLight }}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {userSelectionError && !hasSelectedUser && (
          <div className="p-4 text-sm" style={{ color: theme.error }}>
            {userSelectionError}
          </div>
        )}

        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {isLoadingUserDetails && !selectedUser?.subscription && (
            <div className="flex items-center justify-center py-16">
              <AdminSpinner size={28} />
            </div>
          )}

          {hasSelectedUser ? (
            <UserDetailPanel
              user={selectedUser}
              onClose={handleCloseDetail}
              theme={theme}
              onExtendTrial={handleExtendTrial}
              isExtendingTrial={isExtendingTrial}
              isLoadingDetails={isLoadingUserDetails}
              compact
              reportContext={activeReportContext}
            />
          ) : (
            !isLoadingUserDetails && (
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-y-contain">
                <UsersEmptyDetail theme={theme} onLoadLifetime={loadLifetimeUsers} />
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
