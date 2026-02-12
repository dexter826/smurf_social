import React from 'react';
import { Search, X, Users, UserPlus, MoreVertical, Archive, CheckCircle2 } from 'lucide-react';
import { Input, IconButton, Dropdown, Button } from '../../ui';

interface ConversationHeaderProps {
  searchTerm: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearSearch: () => void;
  isSearchFocused: boolean;
  onSearchFocus: (focused: boolean) => void;
  onCancelSearch: () => void;
  onNewGroup?: () => void;
  onNewChat?: () => void;
  viewMode: 'normal' | 'archived';
  onViewModeChange?: (mode: 'normal' | 'archived') => void;
  archivedCount: number;
  onMarkAllRead?: () => void;
}

export const ConversationHeader: React.FC<ConversationHeaderProps> = ({
  searchTerm,
  onSearchChange,
  onClearSearch,
  isSearchFocused,
  onSearchFocus,
  onCancelSearch,
  onNewGroup,
  onNewChat,
  viewMode,
  onViewModeChange,
  archivedCount,
  onMarkAllRead,
}) => {
  return (
    <div className="flex-shrink-0 px-3 h-16 flex items-center border-b border-border-light gap-1.5">
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <div className="relative flex-1 flex items-center">
          <Input
            icon={<Search size={16} />}
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={onSearchChange}
            onFocus={() => onSearchFocus(true)}
            className="bg-bg-secondary text-sm pr-10"
            containerClassName="flex-1"
          />
          {searchTerm && (
            <IconButton
              onClick={onClearSearch}
              className="absolute right-3"
              icon={<X size={16} />}
              size="sm"
            />
          )}
        </div>
        {isSearchFocused && (
          <Button
            onClick={onCancelSearch}
            variant="ghost"
            size="md"
            className="text-primary flex-shrink-0"
          >
            Hủy
          </Button>
        )}
      </div>

      <div className="flex items-center">
        {!isSearchFocused && !searchTerm && (
          <>
            {onNewGroup && (
              <IconButton
                onClick={onNewGroup}
                variant="ghost"
                size="md"
                icon={<Users size={20} />}
                title="Tạo nhóm mới"
                className="text-primary hover:bg-primary-light"
              />
            )}
            {onNewChat && (
              <IconButton
                onClick={onNewChat}
                variant="ghost"
                size="md"
                icon={<UserPlus size={20} />}
                title="Tạo cuộc trò chuyện mới"
                className="text-primary hover:bg-primary-light"
              />
            )}
          </>
        )}

        <Dropdown
          align="right"
          trigger={
            <IconButton 
              icon={<MoreVertical size={20} />} 
              variant="ghost" 
              className="text-text-secondary hover:bg-bg-secondary"
            />
          }
        >
          <div className="py-1">
            <button
              onClick={() => onViewModeChange?.(viewMode === 'archived' ? 'normal' : 'archived')}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
            >
              <Archive size={18} className="text-text-tertiary" />
              {viewMode === 'archived' ? 'Quay lại tin nhắn' : 'Tin nhắn đã lưu trữ'}
              {archivedCount > 0 && (
                <span className="ml-auto text-xs bg-bg-tertiary px-1.5 py-0.5 rounded text-text-secondary">
                  {archivedCount}
                </span>
              )}
            </button>
            {onMarkAllRead && (
              <button
                onClick={onMarkAllRead}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-text-primary hover:bg-bg-secondary transition-colors"
              >
                <CheckCircle2 size={18} className="text-text-tertiary" />
                Đánh dấu tất cả đã đọc
              </button>
            )}
          </div>
        </Dropdown>
      </div>
    </div>
  );
};
