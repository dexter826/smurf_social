import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Clock } from 'lucide-react';
import { Avatar, UserAvatar, Button } from '../ui';
import { FriendRequest, User, UserStatus } from '../../types';

interface FriendRequestItemProps {
  request: FriendRequest;
  user: User;
  type: 'received' | 'sent';
  onAccept?: (requestId: string, friendId: string) => void;
  onReject?: (requestId: string) => void;
  onCancel?: (requestId: string) => void;
  isLoading?: boolean;
}

export const FriendRequestItem: React.FC<FriendRequestItemProps> = ({
  request,
  user,
  type,
  onAccept,
  onReject,
  onCancel,
  isLoading = false
}) => {
  const navigate = useNavigate();

  const handleProfileClick = () => {
    if (user?.id) {
      navigate(`/profile/${user.id}`);
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes} phút trước`;
    if (hours < 24) return `${hours} giờ trước`;
    return `${days} ngày trước`;
  };

  return (
    <div className="flex items-center justify-between p-4 hover:bg-bg-hover rounded-lg transition-colors border-b border-divider last:border-0">
      <div className="flex items-center gap-3 flex-1">
        <UserAvatar 
          userId={user.id} 
          src={user.avatar} 
          name={user.name} 
          size="lg" 
          initialStatus={user.status} 
          onClick={handleProfileClick}
        />
        <div className="flex-1">
          <h3 
            className="font-semibold text-text-primary cursor-pointer hover:underline"
            onClick={handleProfileClick}
          >
            {user.name}
          </h3>
          {request.message && (
            <p className="text-sm text-text-secondary mt-1">"{request.message}"</p>
          )}
          <p className="text-xs text-text-tertiary mt-1 flex items-center gap-1">
            <Clock size={12} />
            {formatTime(request.createdAt)}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        {type === 'received' && (
          <>
            <Button
              variant="primary"
              size="sm"
              icon={<Check size={16} />}
              onClick={() => onAccept?.(request.id, user.id)}
              disabled={isLoading}
            >
              Chấp nhận
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={<X size={16} />}
              onClick={() => onReject?.(request.id)}
              disabled={isLoading}
            >
              Từ chối
            </Button>
          </>
        )}
        {type === 'sent' && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onCancel?.(request.id)}
            disabled={isLoading}
          >
            Hủy lời mời
          </Button>
        )}
      </div>
    </div>
  );
};
