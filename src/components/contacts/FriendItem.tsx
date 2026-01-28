import React from 'react';
import { MessageCircle, MoreVertical, UserMinus, User as UserIcon } from 'lucide-react';
import { Avatar, UserAvatar, UserStatusText, IconButton, Dropdown, DropdownItem } from '../ui';
import { User, UserStatus } from '../../types';
import { useNavigate } from 'react-router-dom';

interface FriendItemProps {
  friend: User;
  onUnfriend?: (friendId: string) => void;
  onMessage?: (friendId: string) => void;
}

export const FriendItem: React.FC<FriendItemProps> = ({
  friend,
  onUnfriend,
  onMessage
}) => {
  const navigate = useNavigate();

  const handleMessage = () => {
    if (onMessage) {
      onMessage(friend.id);
    } else {
      navigate('/');
    }
  };

  return (
    <div 
      className="relative flex items-center justify-between p-3 hover:bg-bg-hover rounded-lg transition-colors group border-b border-divider last:border-0 cursor-pointer"
      onClick={handleMessage}
    >
      <div className="flex items-center gap-4 flex-1">
        <UserAvatar userId={friend.id} src={friend.avatar} name={friend.name} size="md" initialStatus={friend.status} />
        <div>
          <h3 className="font-semibold text-text-primary">{friend.name}</h3>
          <UserStatusText userId={friend.id} className="text-xs text-text-tertiary" initialStatus={friend.status} />
        </div>
      </div>

      <div className="flex gap-2">
        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown
            trigger={
              <IconButton icon={<MoreVertical size={16} />} size="sm" />
            }
          >
          <DropdownItem
            icon={<UserIcon size={16} />}
            label="Xem trang cá nhân"
            onClick={() => navigate(`/profile/${friend.id}`)}
          />
          <DropdownItem
            icon={<UserMinus size={16} />}
            label="Hủy kết bạn"
            variant="danger"
            onClick={() => onUnfriend?.(friend.id)}
          />
        </Dropdown>
        </div>
      </div>
    </div>
  );
};

FriendItem.Skeleton = () => (
  <div className="flex items-center justify-between p-3 animate-pulse border-b border-divider">
    <div className="flex items-center gap-4 flex-1">
      <div className="w-10 h-10 rounded-full bg-bg-tertiary" />
      <div>
        <div className="h-4 bg-bg-tertiary rounded w-32 mb-1" />
        <div className="h-3 bg-bg-tertiary rounded w-20" />
      </div>
    </div>
    <div className="w-8 h-8 bg-bg-tertiary rounded" />
  </div>
);
