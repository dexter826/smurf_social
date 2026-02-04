import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { MessageCircle, Users, LayoutGrid, Settings, LogOut, User as UserIcon, Moon, Sun, Bell, Flag, Menu, Shield } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useChatStore } from '../../store/chatStore';
import { useContactStore } from '../../store/contactStore';
import { Avatar, UserAvatar, ConfirmDialog, Button, IconButton } from '../ui';
import { PostViewModal } from '../feed';
import { usePostStore } from '../../store/postStore';
import { useUserCache } from '../../store/userCacheStore';
import { useNotificationStore } from '../../store/notificationStore';
import { NotificationDropdown } from '../notifications/NotificationDropdown';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { mode, toggleTheme } = useThemeStore();
  const { conversations, subscribeToConversations } = useChatStore();
  const { receivedRequests, subscribeToRequests } = useContactStore();
  const { initialize: initNotifications } = useNotificationStore();
  
  const { selectedPost, setSelectedPost, isModalLoading, reactToPost } = usePostStore();
  const { users: usersMap, fetchUsers } = useUserCache();

  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (!user) return;
    const unsubscribeChat = subscribeToConversations(user.id);
    const unsubscribeContacts = subscribeToRequests(user.id);
    const unsubscribeNotifications = initNotifications(user.id);
    return () => {
      unsubscribeChat();
      unsubscribeContacts();
      unsubscribeNotifications();
    };
  }, [user, subscribeToConversations, subscribeToRequests, initNotifications]);

  useEffect(() => {
    if (selectedPost && !usersMap[selectedPost.userId]) {
      fetchUsers([selectedPost.userId]);
    }
  }, [selectedPost, usersMap, fetchUsers]);

  const totalUnread = user ? conversations.reduce((total, conv) => {
    const count = conv.unreadCount?.[user.id] || 0;
    return total + (count > 0 || conv.markedUnread ? (count || 1) : 0);
  }, 0) : 0;

  const hasNewRequests = receivedRequests.length > 0;

  const handleConfirmLogout = () => {
    logout();
    navigate('/login');
  };

  const handlePostLike = async (postId: string) => {
    if (user) {
      await reactToPost(postId, user.id, '👍');
    }
  };

  const navItems = [
    { to: '/feed', Icon: LayoutGrid, label: 'Nhật ký' },
    { to: '/', Icon: MessageCircle, label: 'Tin nhắn' },
    { to: '/contacts', Icon: Users, label: 'Bạn bè' },
    ...(isAdmin ? [
      { to: '/admin/reports', Icon: Flag, label: 'Báo cáo' },
      { to: '/admin/users', Icon: Shield, label: 'Người dùng' }
    ] : []),
  ];

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-bg-secondary overflow-hidden transition-theme">
      {/* Desktop Navbar */}
      <header className="hidden md:flex h-16 w-full items-center bg-bg-primary px-6 z-50 shadow-sm border-b border-border-light transition-theme">
        {/* Left: Logo */}
        <div 
          className="flex-1 flex items-center cursor-pointer transition-transform duration-200" 
          onClick={() => navigate('/feed')}
        >
          <img 
            src="/logo_text_blue.png" 
            alt="Smurf Social" 
            className="h-9 object-contain" 
          />
        </div>

        {/* Center: Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `px-5 h-11 flex items-center justify-center rounded-xl transition-all duration-200 relative group ${
                  isActive 
                  ? 'bg-bg-secondary text-primary shadow-sm' 
                  : 'text-text-tertiary hover:bg-bg-secondary/70 hover:text-text-primary'
                }`
              }
              title={item.label}
            >
              <div className="flex items-center gap-2.5">
                <item.Icon size={20} />
                <span className="text-sm font-bold">{item.label}</span>
                {item.to === '/' && totalUnread > 0 && (
                  <span className="absolute top-2 right-3 w-2 h-2 bg-red-500 rounded-full ring-2 ring-bg-primary" />
                )}
                {item.to === '/contacts' && hasNewRequests && (
                  <span className="absolute top-2 right-3 w-2 h-2 bg-red-500 rounded-full ring-2 ring-bg-primary" />
                )}
              </div>
            </NavLink>
          ))}
        </nav>

        {/* Right: User Actions */}
        <div className="flex-1 flex items-center justify-end gap-2">
          <div className="flex items-center gap-1">
            <NotificationDropdown />
            
            <button
              onClick={toggleTheme} 
              className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 text-text-tertiary hover:bg-bg-secondary hover:text-primary"
              title="Chế độ tối"
            >
              {mode === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
          </div>

          <div className="w-px h-6 bg-border-light mx-1" />

          <div className="flex items-center gap-2">
             <NavLink 
                to="/settings"
                className={({ isActive }) => 
                  `w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
                    isActive 
                      ? 'bg-bg-secondary text-primary shadow-sm' 
                      : 'text-text-tertiary hover:bg-bg-secondary hover:text-primary'
                  }`
                }
                title="Cài đặt"
              >
                <Settings size={20} />
               </NavLink>



              <div className="group relative ml-1" onClick={() => navigate('/profile')}>
                {user && (
                  <UserAvatar 
                    userId={user.id}
                    src={user.avatar} 
                    size="sm" 
                    className="cursor-pointer ring-2 ring-transparent group-hover:ring-primary transition-all" 
                    initialStatus={user.status}
                  />
                )}
              </div>

              <button
                onClick={() => setShowLogoutConfirm(true)} 
                className="w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 text-text-tertiary hover:bg-red-50 dark:hover:bg-red-900/10 hover:text-red-500" 
                title="Đăng xuất"
              >
                <LogOut size={20} />
              </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative flex flex-col h-full overflow-hidden transition-theme pb-[60px] md:pb-0">
        <Outlet />
      </main>

      {/* Mobile Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-primary border-t border-border-light flex justify-around items-center h-[60px] z-50 pb-safe transition-theme shadow-[0_-1px_3px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95 ${
                isActive ? 'text-primary' : 'text-text-tertiary hover:text-text-secondary'
              }`
            }
          >
            <div className="relative">
              <item.Icon size={24} />
              {item.to === '/' && totalUnread > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-bg-primary" />
              )}
              {item.to === '/contacts' && hasNewRequests && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-bg-primary" />
              )}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
        
        {/* Mobile Notification Icon */}
        <NavLink
            to="/notifications"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95 ${
                isActive ? 'text-primary' : 'text-text-tertiary hover:text-text-secondary'
              }`
            }
          >
            <div className="relative">
              <Bell size={24} />
              {useNotificationStore.getState().unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-bg-primary" />
              )}
            </div>
            <span className="text-[10px] font-medium">Thông báo</span>
          </NavLink>
          
         {/* Mobile Menu Button */}
         <NavLink
           to="/menu"
           className={({ isActive }) =>
             `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors active:scale-95 ${
               isActive ? 'text-primary' : 'text-text-tertiary hover:text-text-secondary'
             }`
           }
         >
           <Menu size={24} />
           <span className="text-[10px] font-medium">Menu</span>
         </NavLink>
      </nav>

      <ConfirmDialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
        title="Đăng xuất"
        message="Bạn có chắc chắn muốn rời khỏi phiên làm việc này?"
        confirmLabel="Đăng xuất"
      />

      {user && (
        <PostViewModal
          isOpen={!!selectedPost || isModalLoading}
          onClose={() => setSelectedPost(null)}
          post={selectedPost}
          author={selectedPost ? usersMap[selectedPost.userId] : null}
          currentUser={user}
          onLike={handlePostLike}
          isLoading={isModalLoading}
        />
      )}
    </div>
  );
};
