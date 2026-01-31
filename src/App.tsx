import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useChatStore } from './store/chatStore';
import { AppLayout } from './components/layout/AppLayout';
import { Loading, ScreenLoader, ToastContainer } from './components/ui';
import { ReportModal } from './components/ui/ReportModal';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import FeedPage from './pages/FeedPage';
import ContactsPage from './pages/ContactsPage';
import ProfilePage from './pages/ProfilePage';
import SettingsPage from './pages/SettingsPage';
import NotificationsPage from './pages/NotificationsPage';
import AdminReportsPage from './pages/AdminReportsPage';
import ReportDetailPage from './pages/ReportDetailPage';
import { MobileMenuPage } from './pages/MobileMenuPage';
import { userService } from './services/userService';
import { UserStatus } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return <ScreenLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  const { user } = useAuthStore();
  const initializeAuth = useAuthStore(state => state.initialize);
  const subscribeToConversations = useChatStore(state => state.subscribeToConversations);

  useEffect(() => {
    const unsubscribe = initializeAuth();
    return () => unsubscribe();
  }, [initializeAuth]);

  // Lắng nghe tin nhắn toàn cục sau khi đăng nhập
  useEffect(() => {
    if (!user) return;
    const unsubscribe = subscribeToConversations(user.id);
    return () => unsubscribe();
  }, [user, subscribeToConversations]);

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
          <Route path="admin/reports" element={<AdminReportsPage />} />
          <Route path="admin/reports/:id" element={<ReportDetailPage />} />
        </Route>

        {/* Mobile Menu - không dùng AppLayout */}
        <Route path="/menu" element={
          <ProtectedRoute>
            <MobileMenuPage />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <ToastContainer />
      <ReportModal />
    </HashRouter>
  );
};

export default App;