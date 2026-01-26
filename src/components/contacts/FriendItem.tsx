import React, { useState } from 'react';
import { MessageCircle, MoreVertical, UserMinus, User as UserIcon } from 'lucide-react';
import { Avatar, Button, Dropdown, DropdownItem } from '../ui';
import { User } from '../../types';
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
        <Avatar src={friend.avatar} name={friend.name} size="md" status={friend.status} />
        <div>
          <h3 className="font-semibold text-text-primary">{friend.name}</h3>
        </div>
      </div>

      <div className="flex gap-2">
        <div onClick={(e) => e.stopPropagation()}>
          <Dropdown
            trigger={
              <Button variant="ghost" size="sm">
                <MoreVertical size={16} />
              </Button>
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
