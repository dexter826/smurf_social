import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, Search, Bell, ArrowUpDown } from 'lucide-react';
import { userService } from '../services/userService';
import { useAuthStore } from '../store/authStore';
import { useContactStore } from '../store/contactStore';
import { useUserCache } from '../store/userCacheStore';
import { User } from '../types';
import { Avatar, Button, Input, Loading, ConfirmDialog } from '../components/ui';
import { FriendRequestItem, FriendItem, AddFriendModal } from '../components/contacts';
import { debounce } from '../utils/batchUtils';

type TabType = 'all' | 'requests' | 'sent';

const ContactsPage: React.FC = () => {
  const navigate = useNavigate();
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
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [unfriendId, setUnfriendId] = useState<string | null>(null);
  const [blockUserId, setBlockUserId] = useState<string | null>(null);
  const { users: userCache, fetchUsers } = useUserCache();

  // Stable callback cho fetch friends
  const handleFetchFriends = useCallback(() => {
    if (!currentUser) return;
    fetchFriends(currentUser.id);
  }, [currentUser, fetchFriends]);

  // Stable callback cho subscribe
  const handleSubscribeToRequests = useCallback(() => {
    if (!currentUser) return () => {};
    return subscribeToRequests(currentUser.id);
  }, [currentUser, subscribeToRequests]);

  useEffect(() => {
    handleFetchFriends();
    const unsubscribe = handleSubscribeToRequests();
    
    return () => {
      unsubscribe();
    };
  }, [handleFetchFriends, handleSubscribeToRequests]);

  // Tự động load users cho requests
  useEffect(() => {
    const userIds = [
      ...receivedRequests.map(r => r.senderId),
      ...sentRequests.map(r => r.receiverId)
    ];

    const uniqueIds = [...new Set(userIds)];
    if (uniqueIds.length > 0) {
      fetchUsers(uniqueIds);
    }
  }, [receivedRequests, sentRequests, fetchUsers]);

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

  const handleUnfriend = async () => {
    if (!currentUser || !unfriendId) return;
    try {
      await unfriend(currentUser.id, unfriendId);
      setUnfriendId(null);
    } catch (error) {
      console.error('Lỗi hủy kết bạn:', error);
    }
  };

  const handleBlockUser = async () => {
    if (!currentUser || !blockUserId) return;
    try {
      await blockUser(currentUser.id, blockUserId);
      setBlockUserId(null);
    } catch (error) {
      console.error('Lỗi chặn người dùng:', error);
    }
  };

  const handleMessage = async (friendId: string) => {
    if (!currentUser) return;
    
    try {
      const { useChatStore } = await import('../store/chatStore');
      const conversationId = await useChatStore.getState().getOrCreateConversation(
        currentUser.id,
        friendId
      );
      navigate('/');
    } catch (error) {
      console.error('Lỗi mở chat:', error);
    }
  };

  const filteredFriends = friends.filter(friend =>
    friend.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    friend.email?.toLowerCase().includes(searchTerm.toLowerCase())
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

    const sortedGroups = Object.keys(groups).sort();
    if (sortOrder === 'desc') {
      sortedGroups.reverse();
    }

    return sortedGroups.map(letter => ({
      letter,
      friends: groups[letter].sort((a, b) => {
        return sortOrder === 'asc' 
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      })
    }));
  };

  const groupedFriends = groupFriendsByLetter();

  return (
    <div className="flex h-full w-full">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-[300px] border-r border-border-light bg-bg-primary pt-4 transition-theme">
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
          <div className="px-4 py-2 text-sm font-semibold text-text-tertiary">Danh sách</div>
          
          <div
            className={`flex items-center gap-3 px-4 py-3 mx-2 my-0.5 cursor-pointer rounded-xl transition-all ${
              activeTab === 'all'
                ? 'bg-primary-light text-primary'
                : 'hover:bg-bg-hover text-text-secondary'
            }`}
            onClick={() => setActiveTab('all')}
          >
            <Users size={20} />
            <span className="font-medium">Tất cả bạn bè</span>
            <span className="ml-auto text-xs bg-bg-secondary px-2 py-0.5 rounded-full border border-border-light">
              {friends.length}
            </span>
          </div>

          <div
            className={`flex items-center gap-3 px-4 py-3 mx-2 my-0.5 cursor-pointer rounded-xl transition-all ${
              activeTab === 'requests'
                ? 'bg-primary-light text-primary'
                : 'hover:bg-bg-hover text-text-secondary'
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
            className={`flex items-center gap-3 px-4 py-3 mx-2 my-0.5 cursor-pointer rounded-xl transition-all ${
              activeTab === 'sent'
                ? 'bg-primary-light text-primary'
                : 'hover:bg-bg-hover text-text-secondary'
            }`}
            onClick={() => setActiveTab('sent')}
          >
            <UserPlus size={20} />
            <span className="font-medium">Lời mời đã gửi</span>
            {sentRequests.length > 0 && (
              <span className="ml-auto text-xs bg-bg-secondary px-2 py-0.5 rounded-full border border-border-light">
                {sentRequests.length}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-divider bg-bg-primary transition-theme">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {activeTab === 'all' && <Users size={24} className="text-text-primary" />}
              {activeTab === 'requests' && <Bell size={24} className="text-text-primary" />}
              {activeTab === 'sent' && <UserPlus size={24} className="text-text-primary" />}
              <h2 className="text-lg font-semibold text-text-primary">
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
            <div className="relative flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Tìm kiếm bạn bè"
                  icon={<Search size={18} />}
                  className="bg-bg-secondary h-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  containerClassName="flex-1"
                />
              <Button
                variant="ghost"
                size="md"
                className="flex-shrink-0 px-3 font-bold text-primary hover:bg-primary-light"
                icon={<ArrowUpDown size={18} />}
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                title={sortOrder === 'asc' ? 'Sắp xếp Z-A' : 'Sắp xếp A-Z'}
              >
                {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
              </Button>
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex-1 overflow-y-auto p-4">
            {[...Array(5)].map((_, i) => (
              <FriendItem.Skeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'all' && (
              <>
                {filteredFriends.length === 0 ? (
                  <div className="text-center py-12 text-secondary">
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
                        <div className="text-sm font-bold text-text-tertiary mb-2 px-2">
                          {group.letter}
                        </div>
                        <div className="space-y-1">
                          {group.friends.map(friend => (
                            <FriendItem
                              key={friend.id}
                              friend={friend}
                              onUnfriend={(id) => setUnfriendId(id)}
                              onBlock={(id) => setBlockUserId(id)}
                              onMessage={handleMessage}
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
                  <div className="text-center py-12 text-secondary">
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
                  <div className="text-center py-12 text-secondary">
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

      <ConfirmDialog
        isOpen={!!unfriendId}
        onClose={() => setUnfriendId(null)}
        onConfirm={handleUnfriend}
        title="Hủy kết bạn"
        message="Bạn có chắc muốn hủy kết bạn với người này?"
        confirmLabel="Hủy kết bạn"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={!!blockUserId}
        onClose={() => setBlockUserId(null)}
        onConfirm={handleBlockUser}
        title="Chặn người dùng"
        message="Bạn có chắc muốn chặn người dùng này? Họ sẽ không thể gửi tin nhắn cho bạn."
        confirmLabel="Chặn người dùng"
        variant="danger"
      />
    </div>
  );
};

export default ContactsPage;