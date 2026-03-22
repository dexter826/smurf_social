import React from 'react';
import { Ban, Settings2, MessageSquareOff, PhoneOff, EyeOff } from 'lucide-react';
import { User, BlockOptions, BlockedUserEntry } from '../../../shared/types';
import { UserAvatar, Button, Skeleton } from '../ui';

interface BlockedUserWithOptions {
  user: User;
  options: BlockedUserEntry;
}

interface BlockedUsersSectionProps {
  isLoading: boolean;
  blockedList: BlockedUserWithOptions[];
  onManageBlock: (target: BlockedUserWithOptions) => void;
}

/**
 * Hiển thị các nhãn quyền bị chặn
 */
const BlockOptionTags: React.FC<{ options: BlockOptions }> = React.memo(({ options }) => {
  const tags: { icon: React.ReactNode; label: string; color: string }[] = [];
  if (options.blockMessages) tags.push({ icon: <MessageSquareOff size={10} />, label: 'Tin nhắn', color: 'text-error bg-error-light/10 border-error/20' });
  if (options.blockCalls) tags.push({ icon: <PhoneOff size={10} />, label: 'Cuộc gọi', color: 'text-warning bg-warning-light/10 border-warning/20' });
  if (options.blockViewMyActivity) tags.push({ icon: <EyeOff size={10} />, label: 'Xem mình', color: 'text-primary bg-primary-light/10 border-primary/20' });
  if (options.hideTheirActivity) tags.push({ icon: <EyeOff size={10} />, label: 'Ẩn họ', color: 'text-secondary bg-secondary-light/10 border-secondary/20' });

  return (
    <div className="flex gap-1.5 flex-wrap mt-1.5">
      {tags.map(t => (
        <span key={t.label} className={`flex items-center gap-1 text-[10px] sm:text-[11px] font-medium px-2 py-0.5 rounded-full border ${t.color}`}>
          {t.icon} {t.label}
        </span>
      ))}
    </div>
  );
});

/**
 * Blocked Users Settings Section
 * Hiển thị danh sách và quản lý chặn.
 */
const BlockedUsersSection: React.FC<BlockedUsersSectionProps> = ({
  isLoading,
  blockedList,
  onManageBlock,
}) => {
  if (isLoading) {
    return (
      <div className="space-y-3 animate-fade-in">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 bg-bg-primary rounded-xl border border-border-light">
            <Skeleton variant="circle" width={48} height={48} />
            <div className="flex-1 space-y-2">
              <Skeleton width="40%" height={16} />
              <Skeleton width="60%" height={12} />
            </div>
            <Skeleton width={100} height={36} className="rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (blockedList.length === 0) {
    return (
      <div className="text-center py-16 text-text-tertiary bg-bg-primary rounded-xl border-2 border-border-light animate-fade-in">
        <Ban size={48} className="mx-auto mb-4 opacity-20" />
        <p className="text-sm font-medium">Chưa có người dùng nào bị chặn</p>
      </div>
    );
  }

  return (
    <div className="bg-bg-primary rounded-xl border-2 border-border-light overflow-hidden shadow-sm animate-fade-in">
      {blockedList.map((item) => (
        <div
          key={item.user.id}
          className="flex items-center gap-4 p-4 border-b border-border-light last:border-b-0 hover:bg-bg-hover transition-colors"
        >
          <UserAvatar
            userId={item.user.id}
            src={item.user.avatar.url}
            name={item.user.fullName}
            size="lg"
            className="border-2 border-border-light"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-text-primary truncate">{item.user.fullName}</h3>
            <BlockOptionTags options={item.options} />
          </div>
          <div className="flex-shrink-0">
            <Button
              variant="secondary"
              size="md"
              onClick={() => onManageBlock(item)}
              icon={<Settings2 size={16} />}
              className="rounded-xl border-border-light hover:border-primary hover:text-primary"
            >
              Quản lý
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default React.memo(BlockedUsersSection);
