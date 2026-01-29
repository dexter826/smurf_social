import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Check, X } from 'lucide-react';
import { Avatar, UserAvatar, Button } from '../ui';
import { User, UserStatus } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { friendService } from '../../services/friendService';

interface SearchUserItemProps {
  user: User;
  onSendRequest: (userId: string, message?: string) => void;
  isRequestSent?: boolean;
}

export const SearchUserItem: React.FC<SearchUserItemProps> = ({
  user,
  onSendRequest,
  isRequestSent: initialRequestSent = false
}) => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();

  const handleProfileClick = () => {
    if (user?.id) {
      navigate(`/profile/${user.id}`);
    }
  };

  const [isRequestSent, setIsRequestSent] = useState(initialRequestSent);
  const [isFriend, setIsFriend] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkRelationship();
  }, [user.id, currentUser]);

  const checkRelationship = async () => {
    if (!currentUser) return;

    const friendIds = currentUser.friendIds || [];
    setIsFriend(friendIds.includes(user.id));

    if (!friendIds.includes(user.id)) {
      const requestExists = await friendService.checkFriendRequestExists(
        currentUser.id,
        user.id
      );
      setIsRequestSent(requestExists);
    }
  };

  const handleSendRequest = async () => {
    setIsLoading(true);
    try {
      await onSendRequest(user.id);
      setIsRequestSent(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-4 hover:bg-bg-hover rounded-lg transition-colors border-b border-divider last:border-0 group">
      <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
        <UserAvatar 
          userId={user.id} 
          src={user.avatar} 
          name={user.name} 
          size="md" 
          initialStatus={user.status} 
          onClick={handleProfileClick}
        />
        <div className="flex-1 min-w-0">
          <h3 
            className="font-semibold text-text-primary truncate cursor-pointer hover:underline"
            onClick={handleProfileClick}
          >
            {user.name}
          </h3>
          <p className="text-xs text-text-secondary truncate">
            {user.email || 'Người dùng Smurf Social'}
          </p>
        </div>
      </div>

      <div className="flex-shrink-0">
        {isFriend ? (
          <div className="flex items-center gap-2 text-success text-sm font-medium bg-success/10 px-3 py-1.5 rounded-full">
            <Check size={14} />
            <span className="hidden sm:inline">Bạn bè</span>
          </div>
        ) : isRequestSent ? (
          <div className="flex items-center gap-2 text-text-tertiary text-sm font-medium bg-bg-secondary px-3 py-1.5 rounded-full">
            <Check size={14} />
            <span className="hidden sm:inline">Đã gửi</span>
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            icon={<UserPlus size={16} />}
            onClick={handleSendRequest}
            disabled={isLoading}
            isLoading={isLoading}
            className="shadow-sm active:scale-95"
          >
            <span className="hidden sm:inline">Kết bạn</span>
          </Button>
        )}
      </div>
    </div>
  );
};
