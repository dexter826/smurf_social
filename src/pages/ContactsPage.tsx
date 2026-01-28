import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, Search, Bell, ArrowUpDown } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useContactStore } from '../store/contactStore';
import { useUserCache } from '../store/userCacheStore';
import { User } from '../types';
import { Button, Input, ConfirmDialog } from '../components/ui';
import { FriendRequestItem, FriendItem, AddFriendModal } from '../components/contacts';

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

  const handleFetchFriends = useCallback(() => {
    if (!currentUser) return;
    fetchFriends(currentUser.id);
  }, [currentUser, fetchFriends]);

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
      if (!groups[firstLetter]) groups[firstLetter] = [];
      groups[firstLetter].push(friend);
    });

    const sortedGroups = Object.keys(groups).sort();
    if (sortOrder === 'desc') sortedGroups.reverse();

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
    <div className="flex h-full w-full bg-bg-secondary">
      {/* Sidebar */}
      <div className="hidden md:flex flex-col w-[300px] border-r border-border-light bg-bg-primary pt-4">
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
          <div className="px-4 py-2 text-sm font-semibold text-text-tertiary uppercase tracking-wider">Danh sách</div>
          
          <div
            className={`flex items-center gap-3 px-4 py-3 mx-2 my-0.5 cursor-pointer rounded-xl transition-all ${
              activeTab === 'all' ? 'bg-primary-light text-primary' : 'hover:bg-bg-hover text-text-secondary'
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
              activeTab === 'requests' ? 'bg-primary-light text-primary' : 'hover:bg-bg-hover text-text-secondary'
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
              activeTab === 'sent' ? 'bg-primary-light text-primary' : 'hover:bg-bg-hover text-text-secondary'
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
      <div className="flex-1 flex flex-col h-full bg-bg-primary md:bg-bg-secondary">
        {/* Header */}
        <div className="p-4 border-b border-border-light bg-bg-primary">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-text-primary">
              {activeTab === 'all' && `Tất cả bạn bè (${friends.length})`}
              {activeTab === 'requests' && `Lời mời kết bạn (${receivedRequests.length})`}
              {activeTab === 'sent' && `Lời mời đã gửi (${sentRequests.length})`}
            </h2>
            <div className="md:hidden">
              <Button variant="primary" size="sm" icon={<UserPlus size={16} />} onClick={() => setShowAddModal(true)}>
                Thêm
              </Button>
            </div>
          </div>

          {activeTab === 'all' && (
            <div className="flex items-center gap-2">
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
                className="px-3"
                icon={<ArrowUpDown size={18} />}
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              >
                {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
              </Button>
            </div>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-2 md:p-4">
          {isLoading ? (
            <div className="space-y-1">
              {[...Array(8)].map((_, i) => (
                <FriendItem.Skeleton key={i} />
              ))}
            </div>
          ) : (
            <>
              {activeTab === 'all' && (
                <>
                  {filteredFriends.length === 0 ? (
                    <div className="text-center py-20 text-text-tertiary">
                      <Users size={48} className="mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium">Không tìm thấy bạn bè nào</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {groupedFriends.map(group => (
                        <div key={group.letter}>
                          <div className="text-sm font-bold text-primary mb-2 px-2 uppercase tracking-wider">
                            {group.letter}
                          </div>
                          <div className="bg-bg-primary rounded-xl shadow-sm border border-border-light overflow-hidden">
                            {group.friends.map(friend => (
                              <FriendItem
                                key={friend.id}
                                friend={friend}
                                onUnfriend={(id) => setUnfriendId(id)}
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
                <div className="bg-bg-primary rounded-xl shadow-sm border border-border-light overflow-hidden">
                  {receivedRequests.length === 0 ? (
                    <div className="text-center py-20 text-text-tertiary">
                      <Bell size={48} className="mx-auto mb-4 opacity-20" />
                      <p>Không có lời mời kết bạn nào</p>
                    </div>
                  ) : (
                    receivedRequests.map(request => {
                      const sender = userCache[request.senderId];
                      return sender ? (
                        <FriendRequestItem
                          key={request.id}
                          request={request}
                          user={sender}
                          type="received"
                          onAccept={handleAcceptRequest}
                          onReject={handleRejectRequest}
                        />
                      ) : null;
                    })
                  )}
                </div>
              )}

              {activeTab === 'sent' && (
                <div className="bg-bg-primary rounded-xl shadow-sm border border-border-light overflow-hidden">
                  {sentRequests.length === 0 ? (
                    <div className="text-center py-20 text-text-tertiary">
                      <UserPlus size={48} className="mx-auto mb-4 opacity-20" />
                      <p>Chưa gửi lời mời kết bạn nào</p>
                    </div>
                  ) : (
                    sentRequests.map(request => {
                      const receiver = userCache[request.receiverId];
                      return receiver ? (
                        <FriendRequestItem
                          key={request.id}
                          request={request}
                          user={receiver}
                          type="sent"
                          onCancel={handleCancelRequest}
                        />
                      ) : null;
                    })
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AddFriendModal isOpen={showAddModal} onClose={() => setShowAddModal(false)} />

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
        message="Bạn có chắc muốn chặn người dùng này?"
        confirmLabel="Chặn ngay"
        variant="danger"
      />
    </div>
  );
};

export default ContactsPage;