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
      
      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex w-[64px] flex-col items-center bg-primary-500 py-6 z-50 shadow-zalo">
        <div className="mb-8" onClick={() => navigate('/profile')}>
          <Avatar 
             src={user?.avatar} 
             size="md" 
             className="cursor-pointer ring-2 ring-primary-100 hover:opacity-90 transition-opacity" 
          />
        </div>
        
        <nav className="flex-1 flex flex-col gap-6 w-full items-center">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `p-3 rounded-xl transition-all duration-200 group relative ${
                  isActive 
                  ? 'bg-primary-700 text-white shadow-lg' 
                  : 'text-primary-100 hover:bg-primary-600 hover:text-white'
                }`
              }
              title={item.label}
            >
              {item.icon}
            </NavLink>
          ))}
        </nav>

        <div className="flex flex-col gap-4 mb-4 items-center">
           <button 
                onClick={toggleTheme} 
                className="text-primary-100 hover:text-white p-2 rounded-lg hover:bg-primary-600 transition-colors"
           >
               {mode === 'light' ? <Moon size={24} /> : <Sun size={24} />}
           </button>
           <button className="text-primary-100 hover:text-white p-2 rounded-lg hover:bg-primary-600 transition-colors">
             <Settings size={24} />
           </button>
           <button onClick={handleLogout} className="text-primary-100 hover:text-white p-2 rounded-lg hover:bg-primary-600 transition-colors" title="Đăng xuất">
             <LogOut size={24} />
           </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 relative flex flex-col h-full overflow-hidden bg-bg-secondary">
        <Outlet />
      </main>

      {/* --- MOBILE BOTTOM NAV --- */}
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