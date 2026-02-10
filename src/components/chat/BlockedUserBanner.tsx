import React from 'react';
import { Ban } from 'lucide-react';
import { Button } from '../ui';

interface BlockedUserBannerProps {
  partnerName: string;
  onUnblock: () => void;
}

export const BlockedUserBanner: React.FC<BlockedUserBannerProps> = ({
  partnerName,
  onUnblock,
}) => {
  return (
    <div className="flex-shrink-0 bg-bg-primary border-b border-border-light px-4 py-3 transition-theme">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-9 h-9 bg-error-light rounded-full flex items-center justify-center">
          <Ban size={18} className="text-error" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-text-primary">
            Đã chặn người dùng
          </p>
          <p className="text-xs text-text-secondary truncate">
            Bạn đã chặn {partnerName}. Bỏ chặn để nhắn tin
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            onClick={onUnblock}
            variant="primary"
            size="sm"
          >
            Bỏ chặn
          </Button>
        </div>
      </div>
    </div>
  );
};
