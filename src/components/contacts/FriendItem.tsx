import React from 'react';
import { MessageCircle, MoreVertical, UserMinus, User as UserIcon, Lock } from 'lucide-react';
import { Avatar, UserAvatar, UserStatusText, IconButton, Dropdown, DropdownItem, Skeleton } from '../ui';
import { User, UserStatus } from '../../types';
import { useNavigate } from 'react-router-dom';

interface FriendItemProps {
  friend: User;
  onUnfriend?: (friendId: string) => void;
  onMessage?: (friendId: string) => void;
}

export const FriendItem: React.FC<FriendItemProps> & { Skeleton: React.FC } = ({
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
      className="relative flex items-center justify-between p-3 hover:bg-bg-hover rounded-lg first:rounded-t-xl last:rounded-b-xl transition-colors group border-b border-divider last:border-0 cursor-pointer"
      onClick={handleMessage}
    >
      <div className="flex items-center gap-4 flex-1">
        <UserAvatar 
          userId={friend.id} 
          src={friend.avatar} 
          name={friend.name} 
          size="md" 
          initialStatus={friend.status} 
        />
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-text-primary">
              {friend.name}
            </h3>
            {friend.status === UserStatus.BANNED && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-error/10 text-error">
                <Lock size={10} />
                Đã khóa
              </span>
            )}
          </div>
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
  <div className="flex items-center justify-between p-3 border-b border-divider last:border-0">
    <div className="flex items-center gap-4 flex-1">
      <Skeleton variant="circle" width={40} height={40} />
      <div className="space-y-2">
        <Skeleton variant="line" width={128} height={16} />
        <Skeleton variant="line" width={80} height={12} />
      </div>
    </div>
    <Skeleton variant="rect" width={32} height={32} className="rounded-lg" />
  </div>
);
