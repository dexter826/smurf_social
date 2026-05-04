import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { UserStatus } from '../shared/types';
import { AppLayout } from './components/layout/AppLayout';
import { Loading, ToastContainer, ConnectionStatus, ErrorBoundary, SplashScreen } from './components/ui';
import { ReportModal } from './components/ui/ReportModal';
import { AdminLayout } from './components/layout/AdminLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { useSelfPresence } from './hooks/useSelfPresence';
import { useNotifications } from './hooks/useNotifications';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';

const FeedPage = React.lazy(() => import('./pages/FeedPage'));
const ContactsPage = React.lazy(() => import('./pages/ContactsPage'));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage'));
const SettingsPage = React.lazy(() => import('./pages/SettingsPage'));
const NotificationsPage = React.lazy(() => import('./pages/NotificationsPage'));
const BannedPage = React.lazy(() => import('./pages/BannedPage'));
const EmailVerificationPage = React.lazy(() => import('./pages/EmailVerificationPage'));
const MobileMenuPage = React.lazy(() => import('./pages/MobileMenuPage'));
const AdminReportsPage = React.lazy(() => import('./pages/AdminReportsPage'));
const AdminUsersPage = React.lazy(() => import('./pages/AdminUsersPage'));
const AdminDashboardPage = React.lazy(() => import('./pages/AdminDashboardPage'));
const OnboardingPage = React.lazy(() => import('./pages/OnboardingPage'));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage'));
const JoinGroupPage = React.lazy(() => import('./pages/JoinGroupPage'));

/** Bảo vệ route khi tài khoản bị khóa. */
const BannedRoute: React.FC = () => {
  const { user, isBanned, isInitialized } = useAuthStore();
  if (!isInitialized) return <Loading variant="page" />;
  if (!isBanned && user?.status !== UserStatus.BANNED) {
    return <Navigate to={user ? '/' : '/login'} replace />;
  }
  return <BannedPage />;
};

/** Quản lý trạng thái hiện diện. */
const GlobalPresenceManager: React.FC = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin');
  
  useSelfPresence(user, isAdminRoute);
  
  return null;
};

/** Gốc ứng dụng điều phối Splash và Routes. */
const App: React.FC = () => {
  const { isInitialized } = useAuthStore();
  const initializeAuth = useAuthStore(state => state.initialize);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = initializeAuth();
    
    if (typeof window !== 'undefined') {
      import('./pages/FeedPage').catch(() => {});
      import('./pages/ProfilePage').catch(() => {});
      import('./pages/ContactsPage').catch(() => {});
    }

    return () => unsubscribeAuth();
  }, [initializeAuth]);

  useNotifications();

  if (showSplash) {
    return <SplashScreen isReady={isInitialized} onFinish={() => setShowSplash(false)} />;
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <GlobalPresenceManager />
        <React.Suspense fallback={<Loading variant="page" />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />

            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route index element={<ChatPage />} />
              <Route path="feed" element={<FeedPage />} />
              <Route path="contacts" element={<ContactsPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="profile/:userId" element={<ProfilePage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="menu" element={<MobileMenuPage />} />
            </Route>

            <Route path="/admin" element={
              <ProtectedRoute requireAdmin>
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminDashboardPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
            </Route>

            <Route path="/verify-email" element={<EmailVerificationPage />} />
            <Route path="/onboarding" element={<OnboardingPage />} />
            <Route path="/banned" element={<BannedRoute />} />
            <Route path="/join/:token" element={<JoinGroupPage />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </React.Suspense>
        <ConnectionStatus />
        <ToastContainer />
        <ReportModal />
      </BrowserRouter>
    </ErrorBoundary>
  );
};

export default App;
