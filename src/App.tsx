import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AppLayout } from './components/layout/AppLayout';
import { Loading, ScreenLoader, ToastContainer, ConnectionStatus } from './components/ui';
import { ReportModal } from './components/ui/ReportModal';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import FeedPage from './pages/FeedPage';
import ContactsPage from './pages/ContactsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
// Admins pages are now lazy loaded below
import BannedPage from './pages/BannedPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import { MobileMenuPage } from './pages/MobileMenuPage';
import { userService } from './services/userService';
import { UserStatus } from './types';
import { AdminLayout } from './components/layout/AdminLayout';

// Lazy load admin pages
const AdminReportsPage = React.lazy(() => import('./pages/AdminReportsPage'));
const AdminUsersPage = React.lazy(() => import('./pages/AdminUsersPage'));

const ProtectedRoute: React.FC<{ children: React.ReactNode; requireAdmin?: boolean }> = ({ children, requireAdmin }) => {
  const { user, isPendingVerification, isLoading } = useAuthStore();

  if (isLoading) {
    return <ScreenLoader />;
  }

  if (isPendingVerification) {
    return <Navigate to="/verify-email" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (user.status === UserStatus.BANNED) {
    return <Navigate to="/banned" replace />;
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { user } = useAuthStore();
  const initializeAuth = useAuthStore(state => state.initialize);

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => unsubscribe();
  }, [initializeAuth]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (user) {
        userService.updateUserStatus(user.id, UserStatus.OFFLINE);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user]);

  return (
    <HashRouter>
      <React.Suspense fallback={<ScreenLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Main App Routes */}
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
          </Route>

          {/* Admin Routes with Sidebar in Layout */}
          <Route path="/admin" element={
            <ProtectedRoute requireAdmin>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="/admin/reports" replace />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="users" element={<AdminUsersPage />} />
          </Route>

          <Route path="/menu" element={
            <ProtectedRoute>
              <MobileMenuPage />
            </ProtectedRoute>
          } />

          <Route path="/verify-email" element={<EmailVerificationPage />} />
          <Route path="/banned" element={<BannedPage />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </React.Suspense>
      <ConnectionStatus />
      <ToastContainer />
      <ReportModal />
    </HashRouter>
  );
};

export default App;