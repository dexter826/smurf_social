import React, { useState, useEffect } from 'react';
import { UserPlus, Check, X } from 'lucide-react';
import { Avatar, Button } from '../ui';
import { User } from '../../types';
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
  const { user: currentUser } = useAuthStore();
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
    <div className="flex items-center justify-between p-4 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3 flex-1">
        <Avatar src={user.avatar} name={user.name} size="md" status={user.status} />
        <div>
          <h3 className="font-semibold text-gray-900">{user.name}</h3>
          <p className="text-xs text-gray-500">
            {user.email || user.phone || 'Người dùng Smurf Social'}
          </p>
        </div>
      </div>

      <div>
        {isFriend ? (
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <Check size={16} />
            Bạn bè
          </div>
        ) : isRequestSent ? (
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
            <X size={16} />
            Đã gửi lời mời
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            icon={<UserPlus size={16} />}
            onClick={handleSendRequest}
            disabled={isLoading}
            isLoading={isLoading}
          >
            Kết bạn
          </Button>
        )}
      </div>
    </div>
  );
};
