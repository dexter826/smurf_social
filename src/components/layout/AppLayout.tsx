import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { MessageCircle, Users, LayoutGrid, Settings, LogOut, User as UserIcon, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useChatStore } from '../../store/chatStore';
import { useContactStore } from '../../store/contactStore';
import { Avatar, UserAvatar, ConfirmDialog, Button, IconButton } from '../ui';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { mode, toggleTheme } = useThemeStore();
  const { conversations, subscribeToConversations } = useChatStore();
  const { receivedRequests, subscribeToRequests } = useContactStore();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsubscribeChat = subscribeToConversations(user.id);
    const unsubscribeContacts = subscribeToRequests(user.id);
    return () => {
      unsubscribeChat();
      unsubscribeContacts();
    };
  }, [user, subscribeToConversations, subscribeToRequests]);

  const totalUnread = user ? conversations.reduce((total, conv) => {
    const count = conv.unreadCount?.[user.id] || 0;
    return total + (count > 0 || conv.markedUnread ? (count || 1) : 0);
  }, 0) : 0;

  const hasNewRequests = receivedRequests.length > 0;

  const handleConfirmLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: <MessageCircle size={28} />, label: 'Tin nhắn' },
    { to: '/contacts', icon: <Users size={28} />, label: 'Danh bạ' },
    { to: '/feed', icon: <LayoutGrid size={28} />, label: 'Nhật ký' },
  ];

  return (
    <div className="flex h-screen w-full bg-bg-secondary overflow-hidden transition-theme">
      <aside className="hidden md:flex w-[72px] flex-col items-center bg-sidebar-bg py-6 z-50 shadow-md">
        <div className="mb-8" onClick={() => navigate('/profile')}>
          {user && (
            <UserAvatar 
              userId={user.id}
              src={user.avatar} 
              size="md" 
              className="cursor-pointer ring-2 ring-white/20 hover:ring-white/40 transition-all" 
              initialStatus={user.status}
            />
          )}
        </div>
        
        <nav className="flex-1 flex flex-col gap-2 w-full items-center">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `w-14 h-14 flex items-center justify-center rounded-xl transition-all duration-200 ${
                  isActive 
                  ? 'bg-sidebar-item-active text-white' 
                  : 'text-sidebar-item hover:bg-sidebar-item-hover hover:text-white'
                }`
              }
              title={item.label}
            >
              <div className="relative">
                {item.icon}
                {item.to === '/' && totalUnread > 0 && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-sidebar-bg" />
                )}
                {item.to === '/contacts' && hasNewRequests && (
                  <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-sidebar-bg" />
                )}
              </div>
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-2 mt-auto w-full items-center">
           <button
                onClick={toggleTheme} 
                className="w-14 h-14 flex items-center justify-center rounded-xl transition-all duration-200 text-sidebar-item hover:bg-sidebar-item-hover hover:text-white"
                title="Chế độ tối"
           >
             {mode === 'light' ? <Moon size={28} /> : <Sun size={28} />}
           </button>
           <NavLink 
              to="/settings"
              className={({ isActive }) => 
                `w-14 h-14 flex items-center justify-center rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'bg-sidebar-item-active text-white' 
                    : 'text-sidebar-item hover:bg-sidebar-item-hover hover:text-white'
                }`
              }
              title="Cài đặt"
           >
             <Settings size={28} />
           </NavLink>
           <button
                onClick={() => setShowLogoutConfirm(true)} 
                className="w-14 h-14 flex items-center justify-center rounded-xl transition-all duration-200 text-sidebar-item hover:bg-sidebar-item-hover hover:text-white" 
                title="Đăng xuất"
           >
             <LogOut size={28} />
           </button>
        </div>
      </aside>

      <main className="flex-1 relative flex flex-col h-full overflow-hidden bg-bg-secondary">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-bg-primary border-t border-border-light flex justify-around items-center h-[60px] z-50 pb-safe transition-theme shadow-sm">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-primary' : 'text-text-tertiary'
              }`
            }
          >
            <div className="relative">
              {item.icon}
              {item.to === '/' && totalUnread > 0 && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full ring-1 ring-bg-primary" />
              )}
              {item.to === '/contacts' && hasNewRequests && (
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full ring-1 ring-bg-primary" />
              )}
            </div>
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
         <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 transition-colors ${
                isActive ? 'text-primary' : 'text-text-tertiary'
              }`
            }
          >
            <UserIcon size={24} />
            <span className="text-[10px] font-medium">Cá nhân</span>
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
    </div>
  );
};