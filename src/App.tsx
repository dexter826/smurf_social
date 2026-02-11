import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { AppLayout } from './components/layout/AppLayout';
import { ScreenLoader, ToastContainer, ConnectionStatus, ErrorBoundary } from './components/ui';
import { ReportModal } from './components/ui/ReportModal';
import { UserStatus } from './types';
import { AdminLayout } from './components/layout/AdminLayout';
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

const ProtectedRoute: React.FC<{ children: React.ReactNode; requireAdmin?: boolean }> = ({ children, requireAdmin }) => {
  const { user, isPendingVerification, isInitialized } = useAuthStore();

  if (!isInitialized) {
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

import { ref, onValue, onDisconnect, set, serverTimestamp } from 'firebase/database';
import { rtdb } from './firebase/config';

const App: React.FC = () => {
  const { user } = useAuthStore();
  const initializeAuth = useAuthStore(state => state.initialize);

  useEffect(() => {
    const unsubscribeAuth = initializeAuth();
    return () => unsubscribeAuth();
  }, [initializeAuth]);

  // Thiết lập hệ thống Presence (Trạng thái hoạt động)
  useEffect(() => {
    if (!user) return;

    const userStatusRef = ref(rtdb, `/status/${user.id}`);
    const connectedRef = ref(rtdb, '.info/connected');

    // Lắng nghe trạng thái kết nối của Firebase
    const unsubscribeConnected = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // Khi kết nối thành công, thiết lập "di chúc" onDisconnect
        onDisconnect(userStatusRef).set({
          status: UserStatus.OFFLINE,
          lastSeen: serverTimestamp()
        }).then(() => {
          // Sau khi thiết lập di chúc, mới set trạng thái online
          set(userStatusRef, {
            status: UserStatus.ONLINE,
            lastSeen: serverTimestamp()
          });
        });
      }
    });

    return () => {
      unsubscribeConnected();
      // Khi component unmount (ví dụ đổi user), cập nhật offline
      set(userStatusRef, {
        status: UserStatus.OFFLINE,
        lastSeen: serverTimestamp()
      });
    };
  }, [user]);

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
};

export default App;