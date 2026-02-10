import React from 'react';
import { UserPlus, Ban, MessageCircle, Clock, UserCheck } from 'lucide-react';
import { Button } from '../../ui';

type FriendRequestStatus = 'none' | 'sent' | 'received';

interface MessageRequestBannerProps {
  partnerName: string;
  friendRequestStatus?: FriendRequestStatus;
  onAddFriend: () => void;
  onAcceptFriend?: () => void;
  onBlock: () => void;
}

export const MessageRequestBanner: React.FC<MessageRequestBannerProps> = ({
  partnerName,
  friendRequestStatus = 'none',
  onAddFriend,
  onAcceptFriend,
  onBlock
}) => {
  const renderActions = () => {
    switch (friendRequestStatus) {
      case 'sent':
        return (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="flex items-center gap-1.5 text-xs text-text-secondary bg-bg-secondary px-3 py-1.5 rounded-full">
              <Clock size={14} />
              Đã gửi lời mời
            </span>
            <Button
              onClick={onBlock}
              variant="ghost"
              size="sm"
              icon={<Ban size={16} />}
              className="text-text-secondary hover:text-error hover:bg-error-light"
            >
              Chặn
            </Button>
          </div>
        );
      case 'received':
        return (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={onAcceptFriend}
              variant="primary"
              size="sm"
              icon={<UserCheck size={16} />}
            >
              Chấp nhận
            </Button>
            <Button
              onClick={onBlock}
              variant="ghost"
              size="sm"
              icon={<Ban size={16} />}
              className="text-text-secondary hover:text-error hover:bg-error-light"
            >
              Chặn
            </Button>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              onClick={onAddFriend}
              variant="primary"
              size="sm"
              icon={<UserPlus size={16} />}
            >
              Kết bạn
            </Button>
            <Button
              onClick={onBlock}
              variant="ghost"
              size="sm"
              icon={<Ban size={16} />}
              className="text-text-secondary hover:text-error hover:bg-error-light"
            >
              Chặn
            </Button>
          </div>
        );
    }
  };

  const getMessage = () => {
    switch (friendRequestStatus) {
      case 'sent':
        return `Đang chờ ${partnerName} chấp nhận lời mời kết bạn`;
      case 'received':
        return `${partnerName} đã gửi lời mời kết bạn cho bạn`;
      default:
        return `${partnerName} chưa có trong danh sách bạn bè của bạn`;
    }
  };

  return (
    <div className="flex-shrink-0 bg-bg-primary border-b border-border-light px-4 py-3 transition-theme">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-9 h-9 bg-primary-light rounded-full flex items-center justify-center">
          <MessageCircle size={18} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">
            Tin nhắn từ người lạ
          </p>
          <p className="text-xs text-text-secondary truncate">
            {getMessage()}
          </p>
        </div>
        {renderActions()}
      </div>
    </div>
  );
};
