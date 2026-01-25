import React, { useEffect, useState } from 'react';
import { UserPlus, Users, Search } from 'lucide-react';
import { userService } from '../services/userService';
import { useAuthStore } from '../store/authStore';
import { useContactStore } from '../store/contactStore';
import { User } from '../types';
import { Avatar, Button } from '../components/ui';

const ContactsPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const { friends, isLoading, fetchFriends } = useContactStore();

  useEffect(() => {
    if (currentUser) {
      fetchFriends(currentUser.id);
    }
  }, [currentUser, fetchFriends]);

  return (
    <div className="flex h-full w-full bg-white">
      {/* Sidebar List */}
      <div className="hidden md:flex flex-col w-[300px] border-r border-gray-200 bg-white pt-4">
        <div className="px-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Tìm kiếm bạn bè" 
              className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2 text-sm font-semibold text-gray-500">Danh sách bạn bè</div>
          <div className="flex items-center gap-3 px-4 py-3 bg-primary-50 text-primary-600 border-l-4 border-primary-500 cursor-pointer">
            <Users size={20} />
            <span className="font-medium">Tất cả bạn bè</span>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-gray-700 cursor-pointer">
            <UserPlus size={20} />
            <span className="font-medium">Lời mời kết bạn</span>
          </div>
        </div>
      </div>

      {/* Main Content: Contact List */}
      <div className="flex-1 flex flex-col h-full bg-white">
        <div className="p-4 border-b border-gray-200 flex items-center gap-2 bg-white">
          <Users size={24} className="text-gray-700" />
          <h2 className="text-lg font-semibold text-gray-800">Danh sách bạn bè ({friends.length})</h2>
        </div>
        
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">Đang tải...</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-1">
              <div className="text-sm font-bold text-gray-500 mb-2 px-2">A-Z</div>
              {friends.map(user => (
                <div key={user.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-4">
                    <Avatar src={user.avatar} name={user.name} size="md" status={user.status} />
                    <div>
                      <h3 className="font-semibold text-gray-900">{user.name}</h3>
                      <p className="text-xs text-gray-500">{user.phone ? user.phone : 'Chưa cập nhật số điện thoại'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="secondary" size="sm">Nhắn tin</Button>
                    <Button variant="ghost" size="sm"><MoreHorizontalIcon /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MoreHorizontalIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
)

export default ContactsPage;