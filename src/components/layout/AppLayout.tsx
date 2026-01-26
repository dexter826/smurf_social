import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { MessageCircle, Users, LayoutGrid, Settings, LogOut, User as UserIcon, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { Avatar } from '../ui';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { mode, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (confirm('Bạn có chắc chắn muốn đăng xuất?')) {
      logout();
      navigate('/login');
    }
  };

  const navItems = [
    { to: '/', icon: <MessageCircle size={24} />, label: 'Tin nhắn' },
    { to: '/contacts', icon: <Users size={24} />, label: 'Danh bạ' },
    { to: '/feed', icon: <LayoutGrid size={24} />, label: 'Nhật ký' },
  ];

  return (
    <div className="flex h-screen w-full bg-bg-secondary overflow-hidden transition-theme">
      <aside className="hidden md:flex w-[64px] flex-col items-center bg-sidebar-bg py-6 z-50 shadow-md">
        <div className="mb-6" onClick={() => navigate('/profile')}>
          <Avatar 
             src={user?.avatar} 
             size="md" 
             className="cursor-pointer ring-2 ring-white/20 hover:ring-white/40 transition-all" 
          />
        </div>
        
        <nav className="flex-1 flex flex-col gap-2 w-full items-center">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-200 ${
                  isActive 
                  ? 'bg-sidebar-item-active text-white' 
                  : 'text-sidebar-item hover:bg-sidebar-item-hover hover:text-white'
                }`
              }
              title={item.label}
            >
              {item.icon}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-2 mt-auto w-full items-center mb-4">
           <button 
                onClick={toggleTheme} 
                className="w-12 h-12 flex items-center justify-center text-sidebar-item hover:bg-sidebar-item-hover hover:text-white rounded-xl transition-all"
                title="Chế độ tối"
           >
               {mode === 'light' ? <Moon size={22} /> : <Sun size={22} />}
           </button>
           <button className="w-12 h-12 flex items-center justify-center text-sidebar-item hover:bg-sidebar-item-hover hover:text-white rounded-xl transition-all" title="Cài đặt">
             <Settings size={22} />
           </button>
           <button 
                onClick={handleLogout} 
                className="w-12 h-12 flex items-center justify-center text-sidebar-item hover:bg-sidebar-item-hover hover:text-white rounded-xl transition-all" 
                title="Đăng xuất"
           >
             <LogOut size={22} />
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
            {item.icon}
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
    </div>
  );
};