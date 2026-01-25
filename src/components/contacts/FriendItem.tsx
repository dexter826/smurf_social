import React, { useState } from 'react';
import { MessageCircle, MoreVertical, UserMinus, Ban } from 'lucide-react';
import { Avatar, Button } from '../ui';
import { User } from '../../types';
import { useNavigate } from 'react-router-dom';

interface FriendItemProps {
  friend: User;
  onUnfriend?: (friendId: string) => void;
  onBlock?: (friendId: string) => void;
  onMessage?: (friendId: string) => void;
}

export const FriendItem: React.FC<FriendItemProps> = ({
  friend,
  onUnfriend,
  onBlock,
  onMessage
}) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);

  const handleMessage = () => {
    if (onMessage) {
      onMessage(friend.id);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="relative flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg transition-colors group border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-4 flex-1">
        <Avatar src={friend.avatar} name={friend.name} size="md" status={friend.status} />
        <div>
          <h3 className="font-semibold text-gray-900">{friend.name}</h3>
          <p className="text-xs text-gray-500">
            {friend.phone || 'Chưa cập nhật số điện thoại'}
          </p>
        </div>
      </div>

      <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="secondary"
          size="sm"
          icon={<MessageCircle size={16} />}
          onClick={handleMessage}
        >
          Nhắn tin
        </Button>
        
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMenu(!showMenu)}
          >
            <MoreVertical size={16} />
          </Button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowMenu(false)}
              />
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[180px]">
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
                  onClick={() => {
                    onUnfriend?.(friend.id);
                    setShowMenu(false);
                  }}
                >
                  <UserMinus size={16} />
                  Hủy kết bạn
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                  onClick={() => {
                    onBlock?.(friend.id);
                    setShowMenu(false);
                  }}
                >
                  <Ban size={16} />
                  Chặn người dùng
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
