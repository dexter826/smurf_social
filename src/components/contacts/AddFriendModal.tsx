import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, MessageCircle, User as UserIcon, Clock, Check } from 'lucide-react';
import { Button, Input, Modal, UserAvatar, EmptyState, Skeleton } from '../ui';
import { useContactStore } from '../../store/contactStore';
import { useAuthStore } from '../../store/authStore';
import { useLoadingStore } from '../../store/loadingStore';
import { useRtdbChatStore } from '../../store';
import { toast } from '../../store/toastStore';
import { User, FriendStatus } from '../../../shared/types';
import { TOAST_MESSAGES } from '../../constants';

/**
 * Skeleton hiển thị khi đang tìm kiếm người dùng
 */
const SearchResultSkeleton = () => (
  <div className="w-full flex flex-col items-center animate-pulse gap-5">
    <Skeleton variant="circle" width={96} height={96} />
    <div className="flex flex-col items-center gap-3 w-full">
      <Skeleton width="40%" height={20} />
      <Skeleton width="30%" height={12} />
      <Skeleton width="60%" height={32} className="mt-2" />
    </div>
    <div className="flex gap-2 w-full justify-center mt-2">
      <Skeleton width={90} height={36} className="rounded-xl" />
      <Skeleton width={90} height={36} className="rounded-xl" />
    </div>
  </div>
);

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const {
    searchUsers, clearSearchResults, friends,
    sentRequests, receivedRequests,
    sendFriendRequest, cancelFriendRequest, acceptFriendRequest,
  } = useContactStore();
  const { getOrCreateConversation } = useRtdbChatStore();
  const isLoading = useLoadingStore(state => state.loadingStates['contacts.search']);

  const [searchTerm, setSearchTerm] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Xác định trạng thái quan hệ giữa người dùng hiện tại và người dùng tìm thấy
  const relationship = useMemo(() => {
    if (!foundUser || !currentUser) return FriendStatus.NOT_FRIEND;
    if (friends.some(f => f.id === foundUser.id)) return FriendStatus.FRIEND;
    if (sentRequests.find(r => r.receiverId === foundUser.id)) return FriendStatus.PENDING_SENT;
    if (receivedRequests.find(r => r.senderId === foundUser.id)) return FriendStatus.PENDING_RECEIVED;
    return FriendStatus.NOT_FRIEND;
  }, [foundUser, currentUser, friends, sentRequests, receivedRequests]);

  const handleSearch = async () => {
    if (!currentUser || !searchTerm.trim()) return;
    setNotFound(false);
    setFoundUser(null);
    const results = await searchUsers(searchTerm, currentUser.id);
    if (results.length > 0) setFoundUser(results[0]);
    else setNotFound(true);
  };

  const handleClose = useCallback(() => {
    setSearchTerm('');
    setFoundUser(null);
    setNotFound(false);
    clearSearchResults();
    onClose();
  }, [onClose, clearSearchResults]);

  const withLoading = async (fn: () => Promise<void>) => {
    setActionLoading(true);
    try { await fn(); } finally { setActionLoading(false); }
  };

  const handleAddFriend = () => withLoading(async () => {
    if (!foundUser || !currentUser) return;
    try {
      await sendFriendRequest(currentUser.id, foundUser.id);
      toast.success(TOAST_MESSAGES.FRIEND.SEND_SUCCESS);
    } catch (error: any) {
      toast.error(TOAST_MESSAGES.FRIEND.ACTION_FAILED(error.message));
    }
  });

  const handleCancelRequest = () => withLoading(async () => {
    if (!foundUser || !currentUser) return;
    const request = sentRequests.find(r => r.receiverId === foundUser.id);
    if (request) {
      try {
        await cancelFriendRequest(request.id);
        toast.success(TOAST_MESSAGES.FRIEND.CANCEL_SUCCESS);
      } catch (error: any) {
        toast.error(TOAST_MESSAGES.FRIEND.ACTION_FAILED(error.message));
      }
    }
  });

  const handleAcceptRequest = () => withLoading(async () => {
    if (!foundUser || !currentUser) return;
    const request = receivedRequests.find(r => r.senderId === foundUser.id);
    if (request) {
      try {
        await acceptFriendRequest(request.id, request.senderId, currentUser.id);
        toast.success(TOAST_MESSAGES.FRIEND.ACCEPT_SUCCESS);
      } catch (error: any) {
        toast.error(TOAST_MESSAGES.FRIEND.ACTION_FAILED(error.message));
      }
    }
  });

  const handleMessage = () => {
    if (!foundUser || !currentUser) return;
    try {
      const convId = getOrCreateConversation(currentUser.id, foundUser.id);
      handleClose();
      navigate(`/?conv=${convId}`);
    } catch (error: any) {
      toast.error(TOAST_MESSAGES.CHAT.INIT_FAILED);
    }
  };

  const handleViewProfile = () => {
    if (!foundUser) return;
    handleClose();
    navigate(`/profile/${foundUser.id}`);
  };

  /**
   * Render nội dung chính dựa trên trạng thái tìm kiếm
   */
  const renderResultContent = () => {
    if (isLoading) return <SearchResultSkeleton />;
    
    if (foundUser) {
      return (
        <div className="w-full flex flex-col items-center animate-fade-in gap-5">
          <UserAvatar
            userId={foundUser.id}
            size="xl"
            className="ring-2 ring-bg-primary shadow-lg"
          />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-text-primary mb-0.5">
              {foundUser.fullName}
            </h3>
            <p className="text-xs text-text-tertiary">{foundUser.email}</p>
            {foundUser.bio && (
              <p className="text-xs text-text-secondary mt-2 max-w-xs mx-auto line-clamp-2 italic">
                "{foundUser.bio}"
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 w-full">
            {relationship === FriendStatus.FRIEND ? (
              <Button
                variant="secondary"
                icon={<Check size={16} />}
                className="bg-success/10 text-success border-success/20 hover:bg-success/15"
                onClick={handleMessage}
              >
                Bạn bè
              </Button>
            ) : relationship === FriendStatus.PENDING_SENT ? (
              <Button
                variant="secondary"
                icon={<Clock size={16} />}
                onClick={handleCancelRequest}
                isLoading={actionLoading}
                className="hover:bg-error/10 hover:text-error hover:border-error/20 transition-colors"
              >
                Đã gửi lời mời
              </Button>
            ) : relationship === FriendStatus.PENDING_RECEIVED ? (
              <Button
                icon={<UserPlus size={16} />}
                onClick={handleAcceptRequest}
                isLoading={actionLoading}
              >
                Chấp nhận kết bạn
              </Button>
            ) : (
              <Button
                icon={<UserPlus size={16} />}
                onClick={handleAddFriend}
                isLoading={actionLoading}
              >
                Thêm bạn bè
              </Button>
            )}

            <Button
              variant="secondary"
              icon={<MessageCircle size={16} />}
              onClick={handleMessage}
            >
              Nhắn tin
            </Button>

            <Button
              variant="ghost"
              icon={<UserIcon size={16} />}
              onClick={handleViewProfile}
              className="text-text-secondary hover:text-primary"
            >
              Trang cá nhân
            </Button>
          </div>
        </div>
      );
    }

    if (notFound) {
      return (
        <EmptyState
          icon={Search}
          title="Không tìm thấy người dùng"
          description="Vui lòng kiểm tra lại chính xác địa chỉ email."
          size="sm"
        />
      );
    }

    return (
      <EmptyState
        icon={Search}
        title="Tìm kiếm bạn bè"
        description="Nhập địa chỉ email để tìm kiếm và kết nối."
        size="sm"
      />
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Tìm kiếm người dùng" maxWidth="md" fullScreen="mobile">
      <div className="space-y-5">
        <div className="flex gap-2">
          <Input
            placeholder="Nhập địa chỉ email chính xác..."
            icon={<Search size={16} />}
            containerClassName="flex-1"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setNotFound(false);
              setFoundUser(null);
            }}
            onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
          />
          <Button
            onClick={handleSearch}
            disabled={isLoading || !searchTerm.trim()}
          >
            Tìm
          </Button>
        </div>

        <div className={`min-h-[220px] flex flex-col items-center justify-center rounded-2xl p-6 transition-all duration-300 ${
          foundUser ? 'bg-bg-primary border border-border-light shadow-sm' : 'border border-dashed border-border-light bg-bg-secondary/40'
        }`}>
          {renderResultContent()}
        </div>
      </div>
    </Modal>
  );
};
