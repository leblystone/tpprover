import React, { Suspense, useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import {
  Book,
  LayoutDashboard,
  LogOut,
  Loader,
  Coffee,
  Wine,
  Sparkles,
  Users,
  Layers,
  MailOpen,
  Sliders,
} from 'lucide-react';
import { auth } from '../../config/firebase';
import { loginUser } from '../../services/firebase';
import { themes } from '../../theme/themes';
import { ADMIN_BASE, adminPrimaryTabs } from '../../config/adminRoutes';
import { AdminProvider, useAdmin } from '../../context/AdminContext';
import UserDetailModal from '../../components/admin/UserDetailModal';

const ADMIN_EMAILS = [
  'lebrockmaldonado@gmail.com',
  'contact@thepepplanner.com',
  'thepepplanner@gmail.com',
];

const theme = themes.sage;

function AdminLayout() {
  const location = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    const authStatus = localStorage.getItem('tpp_admin_auth');
    if (authStatus === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);
    try {
      if (!email.trim()) {
        setLoginError('Please enter your email address');
        setIsLoggingIn(false);
        return;
      }
      const emailLower = email.trim().toLowerCase();
      if (!ADMIN_EMAILS.includes(emailLower)) {
        setLoginError('This email is not authorized for admin access');
        setIsLoggingIn(false);
        return;
      }
      await loginUser(emailLower, password);
      if (!auth.currentUser || auth.currentUser.email?.toLowerCase() !== emailLower) {
        setLoginError('Authentication failed - please try again');
        setIsLoggingIn(false);
        return;
      }
      setIsAuthenticated(true);
      localStorage.setItem('tpp_admin_auth', 'true');
      setEmail('');
      setPassword('');
    } catch (err) {
      console.error('Admin login error:', err);
      if (err.code === 'auth/user-not-found') {
        setLoginError('Account not found. Create an account with this email first, then try again.');
      } else if (err.code === 'auth/wrong-password') {
        setLoginError('Incorrect password. Use your Firebase account password.');
      } else {
        setLoginError(err.message || 'Login failed. Please try again.');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('tpp_admin_auth');
    sessionStorage.clear();
    auth.signOut().catch(() => {});
    window.location.href = ADMIN_BASE;
  };

  const pathname = location.pathname;
  const hour = new Date().getHours();
  const isEvening = hour >= 18;
  const isMorning = hour < 12;
  const TimeIcon = isMorning ? Coffee : isEvening ? Wine : Sparkles;
  const timeMessage = isMorning ? 'Good morning' : isEvening ? 'Good evening' : 'Good afternoon';
  const timeColor = theme.primary;

  if (!isAuthenticated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center relative overflow-hidden"
        style={{ backgroundColor: theme.background }}
      >
        <div className="absolute top-10 right-10 opacity-[0.04]">
          <Book size={120} style={{ color: theme.primary }} />
        </div>
        <div className="absolute bottom-10 left-10 opacity-[0.04]">
          <LayoutDashboard size={100} style={{ color: theme.primaryLight }} />
        </div>
        <div
          className="max-w-md w-full p-8 rounded-lg border shadow-lg relative z-10"
          style={{
            borderColor: theme.border,
            backgroundColor: theme.cardBackground,
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          }}
        >
          <div className="text-center mb-8">
            <div className="mx-auto mb-2">
              <img src="/tpp_logo.png" alt="The Pep Planner" className="w-16 h-16 object-contain" />
            </div>
            <h1 className="text-lg font-bold mb-2" style={{ color: theme.text }}>
              The Pep Planner
            </h1>
            <p className="text-sm" style={{ color: theme.textLight }}>
              Admin Panel
            </p>
            <p className="text-xs mt-2" style={{ color: theme.textLight }}>
              Enter your email and Firebase account password to access the admin panel
            </p>
          </div>
          <form onSubmit={handleLogin} className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Admin email"
              className="w-full p-4 rounded-lg border mb-3 focus:outline-none focus:ring-2"
              style={{
                borderColor: loginError && !email.trim() ? theme.error : theme.border,
                backgroundColor: theme.cardBackground,
                color: theme.text,
              }}
              required
              disabled={isLoggingIn}
              autoComplete="email"
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Firebase account password"
              className="w-full p-4 rounded-lg border focus:outline-none focus:ring-2"
              style={{
                borderColor: loginError && email.trim() ? theme.error : theme.border,
                backgroundColor: theme.cardBackground,
                color: theme.text,
              }}
              required
              disabled={isLoggingIn}
              autoComplete="current-password"
            />
            {loginError && (
              <div
                className="px-4 py-3 rounded-lg text-sm"
                style={{
                  backgroundColor: theme.error + '15',
                  color: theme.error,
                  border: `1px solid ${theme.error}30`,
                }}
              >
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full p-4 rounded-lg font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%)`,
                color: '#FFF',
                border: `1px solid ${theme.border}`,
              }}
            >
              {isLoggingIn ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  <span>Authenticating...</span>
                </>
              ) : (
                'Enter Admin Panel'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const currentGroup = adminPrimaryTabs.find((g) =>
    g.children?.some((c) => c.path === pathname || pathname.startsWith(c.path + '/'))
  );
  const secondaryTabs = currentGroup?.children ?? [];

  return (
    <AdminProvider>
      <AdminAuthenticatedLayout
        theme={theme}
        pathname={pathname}
        secondaryTabs={secondaryTabs}
        timeColor={timeColor}
        TimeIcon={TimeIcon}
        timeMessage={timeMessage}
        handleLogout={handleLogout}
      />
    </AdminProvider>
  );
}

function AdminAuthenticatedLayout({
  theme,
  pathname,
  secondaryTabs,
  timeColor,
  TimeIcon,
  timeMessage,
  handleLogout,
}) {
  const {
    isUserModalOpen,
    selectedUser,
    handleCloseUserModal,
    handleExtendTrial,
    isLoadingUserDetails,
    isExtendingTrial,
    ADMIN_PASSWORD,
  } = useAdmin();

  return (
    <div
      className="min-h-screen w-screen flex flex-col"
      style={{ backgroundColor: theme.background }}
    >
      <header
        className="border-b flex-shrink-0 relative z-10"
        style={{
          borderColor: theme.border,
          backgroundColor: theme.cardBackground,
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        <div className="px-4 lg:px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div>
                <img src="/tpp_logo.png" alt="The Pep Planner" className="w-10 h-10 object-contain" />
              </div>
              <div>
                <h1 className="text-lg font-bold" style={{ color: theme.text }}>
                  The Pep Planner
                </h1>
                <p className="text-xs hidden sm:block" style={{ color: theme.textLight }}>
                  Admin Panel
                </p>
              </div>
            </div>

            <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center max-w-4xl">
              {adminPrimaryTabs.map((tab) => {
                const defaultPath = tab.children?.length
                  ? tab.children[0].path
                  : tab.path;
                const isActive = tab.children
                  ? tab.children.some((c) => c.path === pathname)
                  : pathname === tab.path;
                return (
                  <NavLink
                    key={tab.id}
                    to={defaultPath}
                    end={!tab.children?.length}
                    className="px-3 py-2 rounded-lg flex items-center gap-2 transition-all relative"
                    style={{
                      backgroundColor: isActive ? theme.primary + '15' : 'transparent',
                      border: `1px solid ${isActive ? theme.primary + '30' : 'transparent'}`,
                      color: isActive ? theme.primary : theme.text,
                      fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    <span className="text-sm font-medium">{tab.label}</span>
                    {isActive && (
                      <span
                        className="absolute bottom-0 left-0 right-0 rounded-full"
                        style={{
                          backgroundColor: theme.primary,
                          height: 3,
                          boxShadow: `0 0 8px ${theme.primary}60`,
                        }}
                      />
                    )}
                  </NavLink>
                );
              })}
            </nav>

            <div className="flex items-center gap-2">
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                style={{
                  backgroundColor: timeColor + '15',
                  border: `1px solid ${timeColor}30`,
                  color: timeColor,
                }}
              >
                <TimeIcon size={14} />
                <span className="text-xs font-semibold hidden sm:inline">{timeMessage}</span>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="p-2 rounded-lg flex items-center justify-center hover:opacity-80 transition-opacity"
                style={{
                  backgroundColor: theme.error + '15',
                  border: `1px solid ${theme.error}30`,
                  color: theme.error,
                }}
                title="Sign Out"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>

          {/* Mobile: primary tabs as horizontal scroll */}
          <div
            className="lg:hidden mt-3 flex items-center gap-1.5 overflow-x-auto pb-2 px-1"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {adminPrimaryTabs.map((tab) => {
              const defaultPath = tab.children?.length
                ? tab.children[0].path
                : tab.path;
              const isActive = tab.children
                ? tab.children.some((c) => c.path === pathname)
                : pathname === tab.path;
              return (
                <NavLink
                  key={tab.id}
                  to={defaultPath}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
                  style={{
                    backgroundColor: isActive ? theme.primary + '15' : 'transparent',
                    color: isActive ? theme.primary : theme.textLight,
                    border: `1px solid ${isActive ? theme.primary + '30' : 'transparent'}`,
                  }}
                >
                  {tab.label}
                </NavLink>
              );
            })}
          </div>
        </div>

        {/* Secondary nav when in a group */}
        {secondaryTabs.length > 0 && (
          <div
            className="px-3 lg:px-6 flex-shrink-0 border-t overflow-x-auto"
            style={{
              backgroundColor: theme.cardBackground,
              borderColor: theme.border,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            <div className="flex items-center gap-6 py-2">
              {secondaryTabs.map((t) => {
                const isActive = pathname === t.path;
                return (
                  <NavLink
                    key={t.id}
                    to={t.path}
                    className="px-2 pb-1 pt-1 text-sm font-medium whitespace-nowrap relative"
                    style={{
                      color: isActive ? theme.text : theme.textLight,
                      fontWeight: isActive ? 600 : 500,
                    }}
                  >
                    {t.label}
                    {isActive && (
                      <span
                        className="absolute bottom-0 left-0 right-0 rounded-full"
                        style={{
                          backgroundColor: theme.primary,
                          height: 3,
                          boxShadow: `0 0 8px ${theme.primary}60`,
                        }}
                      />
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col min-w-0 relative z-10 overflow-y-auto">
        <div className="flex-1 p-3 lg:p-4">
          <Suspense fallback={<div className="p-4" style={{ color: theme.textLight }}>Loading…</div>}>
            <Outlet context={{ theme }} />
          </Suspense>
        </div>
      </main>

      {isUserModalOpen && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={handleCloseUserModal}
          theme={theme}
          onExtendTrial={handleExtendTrial}
          isExtendingTrial={isExtendingTrial}
          isLoadingDetails={isLoadingUserDetails}
          adminPassword={ADMIN_PASSWORD}
        />
      )}
    </div>
  );
}

export default AdminLayout;
