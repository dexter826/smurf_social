import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, MessageCircle, User as UserIcon, Clock, Check, XCircle } from 'lucide-react';
import { Button, Input, Loading, Modal, UserAvatar } from '../ui';
import { useContactStore } from '../../store/contactStore';
import { useAuthStore } from '../../store/authStore';
import { useLoadingStore } from '../../store/loadingStore';
import { useRtdbChatStore } from '../../store';
import { User, FriendStatus } from '../../../shared/types';

interface AddFriendModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddFriendModal: React.FC<AddFriendModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { 
    searchUsers, 
    clearSearchResults, 
    friends, 
    sentRequests, 
    receivedRequests,
    sendFriendRequest,
    cancelFriendRequest,
    acceptFriendRequest
  } = useContactStore();
  const { getOrCreateConversation } = useRtdbChatStore();
  const isLoading = useLoadingStore(state => state.loadingStates['contacts.search']);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [foundUser, setFoundUser] = useState<User | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Xác định mối quan hệ với người dùng tìm thấy
  const relationship = useMemo(() => {
    if (!foundUser || !currentUser) return FriendStatus.NOT_FRIEND;
    
    if (friends.some(f => f.id === foundUser.id)) return FriendStatus.FRIEND;
    
    const sent = sentRequests.find(r => r.receiverId === foundUser.id);
    if (sent) return FriendStatus.PENDING_SENT;
    
    const received = receivedRequests.find(r => r.senderId === foundUser.id);
    if (received) return FriendStatus.PENDING_RECEIVED;
    
    return FriendStatus.NOT_FRIEND;
  }, [foundUser, currentUser, friends, sentRequests, receivedRequests]);

  const handleSearch = async () => {
    if (!currentUser || !searchTerm.trim()) return;

    setNotFound(false);
    setFoundUser(null);
    const results = await searchUsers(searchTerm, currentUser.id);

    if (results.length > 0) {
      setFoundUser(results[0]);
    } else {
      setNotFound(true);
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setFoundUser(null);
    setNotFound(false);
    clearSearchResults();
    onClose();
  };

  const handleAddFriend = async () => {
    if (!foundUser || !currentUser) return;
    setActionLoading(true);
    try {
      await sendFriendRequest(currentUser.id, foundUser.id);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!foundUser || !currentUser) return;
    const request = sentRequests.find(r => r.receiverId === foundUser.id);
    if (!request) return;
    
    setActionLoading(true);
    try {
      await cancelFriendRequest(request.id);
    } finally {
      setActionLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!foundUser || !currentUser) return;
    const request = receivedRequests.find(r => r.senderId === foundUser.id);
    if (!request) return;
    
    setActionLoading(true);
    try {
      await acceptFriendRequest(request.id, request.senderId, currentUser.id);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMessage = async () => {
    if (!foundUser || !currentUser) return;
    const convId = await getOrCreateConversation(currentUser.id, foundUser.id);
    handleClose();
    navigate(`/?conv=${convId}`);
  };

  const handleViewProfile = () => {
    if (!foundUser) return;
    handleClose();
    navigate(`/profile/${foundUser.id}`);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Tìm kiếm người dùng"
      maxWidth="md"
    >
      <div className="space-y-6">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Nhập địa chỉ email chính xác..."
            icon={<Search size={18} />}
            containerClassName="flex-1"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setNotFound(false);
              setFoundUser(null);
            }}
            onKeyPress={(e: React.KeyboardEvent) => e.key === 'Enter' && handleSearch()}
          />
          <Button
            variant="primary"
            onClick={handleSearch}
            disabled={isLoading || !searchTerm.trim()}
            isLoading={isLoading}
          >
            Tìm
          </Button>
        </div>

        <div className="min-h-[160px] flex flex-col items-center justify-center border-2 border-dashed border-border-light rounded-2xl p-6 bg-bg-secondary/30">
          {isLoading ? (
            <Loading variant="inline" size="lg" />
          ) : foundUser ? (
            <div className="w-full flex flex-col items-center animate-fade-in">
              <UserAvatar
                userId={foundUser.id}
                size="xl"
                className="mb-4 ring-4 ring-bg-primary shadow-lg"
              />
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold text-text-primary mb-1">
                  {foundUser.fullName}
                </h3>
                <p className="text-sm text-text-tertiary mb-2">{foundUser.email}</p>
                {foundUser.bio && (
                  <p className="text-sm text-text-secondary max-w-xs mx-auto line-clamp-2 italic">
                    "{foundUser.bio}"
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 w-full">
                {relationship === FriendStatus.FRIEND ? (
                  <Button
                    variant="ghost"
                    className="bg-success-light text-success hover:bg-success-light/80 border-none px-4"
                    icon={<Check size={18} />}
                    onClick={handleMessage}
                  >
                    Bạn bè
                  </Button>
                ) : relationship === FriendStatus.PENDING_SENT ? (
                  <Button
                    variant="ghost"
                    className="bg-warning-light text-warning hover:bg-error-light hover:text-error border-none px-4 transition-all group"
                    icon={<Clock size={18} className="group-hover:hidden" />}
                    onClick={handleCancelRequest}
                    isLoading={actionLoading}
                  >
                    <span className="group-hover:hidden">Đã gửi lời mời</span>
                    <span className="hidden group-hover:flex items-center gap-1">
                      <XCircle size={18} /> Hủy yêu cầu
                    </span>
                  </Button>
                ) : relationship === FriendStatus.PENDING_RECEIVED ? (
                  <Button
                    variant="primary"
                    className="px-4"
                    icon={<UserPlus size={18} />}
                    onClick={handleAcceptRequest}
                    isLoading={actionLoading}
                  >
                    Chấp nhận kết bạn
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    className="px-6"
                    icon={<UserPlus size={18} />}
                    onClick={handleAddFriend}
                    isLoading={actionLoading}
                  >
                    Thêm bạn bè
                  </Button>
                )}

                <Button
                  variant="secondary"
                  className="px-4"
                  icon={<MessageCircle size={18} />}
                  onClick={handleMessage}
                >
                  Nhắn tin
                </Button>

                <Button
                  variant="ghost"
                  className="px-4 text-text-secondary hover:text-primary"
                  icon={<UserIcon size={18} />}
                  onClick={handleViewProfile}
                >
                  Trang cá nhân
                </Button>
              </div>
            </div>
          ) : notFound ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search size={32} className="text-error opacity-50" />
              </div>
              <p className="text-lg font-bold text-text-primary">Không tìm thấy người dùng</p>
              <p className="text-sm text-text-tertiary mt-1">Vui lòng kiểm tra lại địa chỉ email</p>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Search size={32} className="text-primary opacity-50" />
              </div>
              <p className="text-lg font-medium text-text-secondary">Tìm kiếm bạn bè</p>
              <p className="text-sm text-text-tertiary mt-1">Nhập email để tìm kiếm và kết nối</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
