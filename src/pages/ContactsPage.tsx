import React, { useEffect, useState } from 'react';
import { UserPlus, Users, Search, Bell } from 'lucide-react';
import { userService } from '../services/userService';
import { useAuthStore } from '../store/authStore';
import { useContactStore } from '../store/contactStore';
import { User } from '../types';
import { Avatar, Button } from '../components/ui';
import { FriendRequestItem, FriendItem, AddFriendModal } from '../components/contacts';

type TabType = 'all' | 'requests' | 'sent';

const ContactsPage: React.FC = () => {
  const { user: currentUser } = useAuthStore();
  const { 
    friends, 
    receivedRequests, 
    sentRequests,
    isLoading, 
    fetchFriends,
    subscribeToRequests,
    acceptFriendRequest,
    rejectFriendRequest,
    cancelFriendRequest,
    unfriend,
    blockUser
  } = useContactStore();

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [userCache, setUserCache] = useState<Record<string, User>>({});

  useEffect(() => {
    if (!currentUser) return;
    
    fetchFriends(currentUser.id);
    
    const unsubscribe = subscribeToRequests(currentUser.id);
    
    return () => {
      unsubscribe();
    };
  }, [currentUser, fetchFriends, subscribeToRequests]);

  useEffect(() => {
    const loadUsers = async () => {
      const userIds = [
        ...receivedRequests.map(r => r.senderId),
        ...sentRequests.map(r => r.receiverId)
      ];

      const uniqueIds = [...new Set(userIds)];
      const cache: Record<string, User> = {};

      for (const id of uniqueIds) {
        if (!userCache[id]) {
          const user = await userService.getUserById(id);
          if (user) cache[id] = user;
        }
      }

      setUserCache(prev => ({ ...prev, ...cache }));
    };

    if (receivedRequests.length > 0 || sentRequests.length > 0) {
      loadUsers();
    }
  }, [receivedRequests, sentRequests]);

  const handleAcceptRequest = async (requestId: string, friendId: string) => {
    if (!currentUser) return;
    
    try {
      await acceptFriendRequest(requestId, currentUser.id, friendId);
      await fetchFriends(currentUser.id);
    } catch (error) {
      console.error('Lỗi chấp nhận kết bạn:', error);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
    } catch (error) {
      console.error('Lỗi từ chối kết bạn:', error);
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    try {
      await cancelFriendRequest(requestId);
    } catch (error) {
      console.error('Lỗi hủy lời mời:', error);
    }
  };

  const handleUnfriend = async (friendId: string) => {
    if (!currentUser) return;
    
    if (confirm('Bạn có chắc chắn muốn hủy kết bạn?')) {
      try {
        await unfriend(currentUser.id, friendId);
      } catch (error) {
        console.error('Lỗi hủy kết bạn:', error);
      }
    }
  };

  const handleBlockUser = async (friendId: string) => {
    if (!currentUser) return;
    
    if (confirm('Bạn có chắc chắn muốn chặn người dùng này?')) {
      try {
        await blockUser(currentUser.id, friendId);
      } catch (error) {
        console.error('Lỗi chặn người dùng:', error);
      }
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.phone?.includes(searchTerm)
  );

  const groupFriendsByLetter = () => {
    const groups: Record<string, User[]> = {};
    
    filteredFriends.forEach(friend => {
      const firstLetter = friend.name.charAt(0).toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(friend);
    });

    return Object.keys(groups)
      .sort()
      .map(letter => ({
        letter,
        friends: groups[letter].sort((a, b) => a.name.localeCompare(b.name))
      }));
  };

  const groupedFriends = groupFriendsByLetter();

  return (
    <div className="flex h-full w-full bg-white">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-[300px] border-r border-gray-200 bg-white pt-4">
        <div className="px-4 mb-4">
          <Button
            variant="primary"
            className="w-full"
            icon={<UserPlus size={18} />}
            onClick={() => setShowAddModal(true)}
          >
            Thêm bạn bè
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2 text-sm font-semibold text-gray-500">Danh sách</div>
          
          <div
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-primary-50 text-primary-600 border-l-4 border-primary-500'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
            onClick={() => setActiveTab('all')}
          >
            <Users size={20} />
            <span className="font-medium">Tất cả bạn bè</span>
            <span className="ml-auto text-xs bg-gray-200 px-2 py-0.5 rounded-full">
              {friends.length}
            </span>
          </div>

          <div
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${
              activeTab === 'requests'
                ? 'bg-primary-50 text-primary-600 border-l-4 border-primary-500'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
            onClick={() => setActiveTab('requests')}
          >
            <Bell size={20} />
            <span className="font-medium">Lời mời kết bạn</span>
            {receivedRequests.length > 0 && (
              <span className="ml-auto text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                {receivedRequests.length}
              </span>
            )}
          </div>

          <div
            className={`flex items-center gap-3 px-4 py-3 cursor-pointer ${
              activeTab === 'sent'
                ? 'bg-primary-50 text-primary-600 border-l-4 border-primary-500'
                : 'hover:bg-gray-50 text-gray-700'
            }`}
            onClick={() => setActiveTab('sent')}
          >
            <UserPlus size={20} />
            <span className="font-medium">Lời mời đã gửi</span>
            {sentRequests.length > 0 && (
              <span className="ml-auto text-xs bg-gray-200 px-2 py-0.5 rounded-full">
                {sentRequests.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full bg-white">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {activeTab === 'all' && <Users size={24} className="text-gray-700" />}
              {activeTab === 'requests' && <Bell size={24} className="text-gray-700" />}
              {activeTab === 'sent' && <UserPlus size={24} className="text-gray-700" />}
              <h2 className="text-lg font-semibold text-gray-800">
                {activeTab === 'all' && `Danh sách bạn bè (${friends.length})`}
                {activeTab === 'requests' && `Lời mời kết bạn (${receivedRequests.length})`}
                {activeTab === 'sent' && `Lời mời đã gửi (${sentRequests.length})`}
              </h2>
            </div>

            <div className="md:hidden">
              <Button
                variant="primary"
                size="sm"
                icon={<UserPlus size={16} />}
                onClick={() => setShowAddModal(true)}
              >
                Thêm
              </Button>
            </div>
          </div>

          {activeTab === 'all' && (
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Tìm kiếm bạn bè"
                className="w-full pl-10 pr-4 py-2 bg-gray-100 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'all' && (
              <>
                {filteredFriends.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">
                      {searchTerm ? 'Không tìm thấy bạn bè nào' : 'Chưa có bạn bè nào'}
                    </p>
                    <p className="text-sm mt-2">
                      {searchTerm
                        ? 'Hãy thử tìm kiếm với từ khóa khác'
                        : 'Hãy thêm bạn bè để bắt đầu kết nối'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupedFriends.map(group => (
                      <div key={group.letter}>
                        <div className="text-sm font-bold text-gray-500 mb-2 px-2">
                          {group.letter}
                        </div>
                        <div className="space-y-1">
                          {group.friends.map(friend => (
                            <FriendItem
                              key={friend.id}
                              friend={friend}
                              onUnfriend={handleUnfriend}
                              onBlock={handleBlockUser}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'requests' && (
              <>
                {receivedRequests.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Bell size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Không có lời mời kết bạn nào</p>
                    <p className="text-sm mt-2">Các lời mời kết bạn sẽ hiển thị ở đây</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {receivedRequests.map(request => {
                      const sender = userCache[request.senderId];
                      if (!sender) return null;
                      
                      return (
                        <FriendRequestItem
                          key={request.id}
                          request={request}
                          user={sender}
                          type="received"
                          onAccept={handleAcceptRequest}
                          onReject={handleRejectRequest}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}

            {activeTab === 'sent' && (
              <>
                {sentRequests.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <UserPlus size={48} className="mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Chưa gửi lời mời kết bạn nào</p>
                    <p className="text-sm mt-2">Các lời mời bạn đã gửi sẽ hiển thị ở đây</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {sentRequests.map(request => {
                      const receiver = userCache[request.receiverId];
                      if (!receiver) return null;
                      
                      return (
                        <FriendRequestItem
                          key={request.id}
                          request={request}
                          user={receiver}
                          type="sent"
                          onCancel={handleCancelRequest}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <AddFriendModal 
        isOpen={showAddModal} 
        onClose={() => setShowAddModal(false)} 
      />
    </div>
  );
};

export default ContactsPage;