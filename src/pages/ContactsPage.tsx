import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Users, Search, Bell, ArrowUpDown } from 'lucide-react';
import { useContacts } from '../hooks';
import { Button, Input, ConfirmDialog } from '../components/ui';
import { FriendRequestItem, FriendItem, AddFriendModal } from '../components/contacts';

const ContactsPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    friends,
    receivedRequests,
    sentRequests,
    groupedFriends,
    userCache,
    isLoading,
    isRevalidating,
    activeTab,
    setActiveTab,
    searchTerm,
    setSearchTerm,
    sortOrder,
    toggleSortOrder,
    handleAcceptRequest,
    handleRejectRequest,
    handleCancelRequest,
    handleUnfriend,
    handleBlockUser,
    handleMessage,
  } = useContacts();

  const [showAddModal, setShowAddModal] = useState(false);
  const [unfriendId, setUnfriendId] = useState<string | null>(null);
  const [blockUserId, setBlockUserId] = useState<string | null>(null);

  const onUnfriendConfirm = async () => {
    if (!unfriendId) return;
    await handleUnfriend(unfriendId);
    setUnfriendId(null);
  };

  const onBlockConfirm = async () => {
    if (!blockUserId) return;
    await handleBlockUser(blockUserId);
    setBlockUserId(null);
  };

  const onMessageClick = async (friendId: string) => {
    const convId = await handleMessage(friendId);
    if (convId) {
      navigate(`/?conv=${convId}`);
    }
  };

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
                onClick={toggleSortOrder}
              >
                {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
              </Button>
            </div>
          )}
          
          {/* Nhãn đồng bộ danh sách */}
          {isRevalidating && (
            <div className="px-4 py-1 bg-primary/5 border-t border-primary/10 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <span className="text-[10px] text-primary font-bold uppercase tracking-widest italic">
                Đang đồng bộ danh sách...
              </span>
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
                  {groupedFriends.length === 0 ? (
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
                                onMessage={onMessageClick}
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
        onConfirm={onUnfriendConfirm}
        title="Hủy kết bạn"
        message="Bạn có chắc muốn hủy kết bạn với người này?"
        confirmLabel="Hủy kết bạn"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={!!blockUserId}
        onClose={() => setBlockUserId(null)}
        onConfirm={onBlockConfirm}
        title="Chặn người dùng"
        message="Bạn có chắc muốn chặn người dùng này?"
        confirmLabel="Chặn ngay"
        variant="danger"
      />
    </div>
  );
};

export default ContactsPage;
