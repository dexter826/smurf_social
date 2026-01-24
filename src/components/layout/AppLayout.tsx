import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { MessageCircle, Users, Clock, Settings, LogOut, User as UserIcon, Moon, Sun } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Avatar } from '../Shared';

export const AppLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: <MessageCircle size={24} />, label: 'Tin nhắn' },
    { to: '/contacts', icon: <Users size={24} />, label: 'Danh bạ' },
    { to: '/feed', icon: <Clock size={24} />, label: 'Nhật ký' },
  ];

  return (
    <div className="flex h-screen w-full bg-bg-main overflow-hidden transition-colors duration-200">
      <aside className="hidden md:flex w-[64px] flex-col items-center bg-[var(--color-primary-sidebar)] py-6 z-50 shadow-zalo">
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
                `w-full flex justify-center py-4 transition-all duration-200 relative ${
                  isActive 
                  ? 'bg-black/10 text-white' 
                  : 'text-white/70 hover:bg-black/5 hover:text-white'
                }`
              }
              title={item.label}
            >
              {item.icon}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-2 mt-auto w-full items-center">
           <button 
                onClick={toggleTheme} 
                className="w-full flex justify-center py-4 text-white/70 hover:bg-black/5 hover:text-white transition-all"
                title="Chế độ tối"
           >
               {mode === 'light' ? <Moon size={22} /> : <Sun size={22} />}
           </button>
           <button className="w-full flex justify-center py-4 text-white/70 hover:bg-black/5 hover:text-white transition-all" title="Cài đặt">
             <Settings size={22} />
           </button>
           <button 
                onClick={handleLogout} 
                className="w-full flex justify-center py-4 text-white/70 hover:bg-black/5 hover:text-white transition-all" 
                title="Đăng xuất"
           >
             <LogOut size={22} />
           </button>
        </div>
      </aside>

      <main className="flex-1 relative flex flex-col h-full overflow-hidden bg-bg-secondary">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex justify-around items-center h-[60px] z-50 pb-safe">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'
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
              `flex flex-col items-center justify-center w-full h-full space-y-1 ${
                isActive ? 'text-primary-500' : 'text-gray-400 dark:text-gray-500'
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