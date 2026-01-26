import React, { useState } from 'react';
import { Search, Users } from 'lucide-react';
import { Conversation } from '../../types';
import { Input, Spinner } from '../ui';
import { ConversationItem } from './ConversationItem';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  currentUserId: string;
  isLoading: boolean;
  onSelectConversation: (id: string) => void;
  onSearch: (term: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onMute: (id: string, muted: boolean) => void;
  onDelete: (id: string) => void;
  onNewChat?: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  selectedId,
  currentUserId,
  isLoading,
  onSelectConversation,
  onSearch,
  onPin,
  onMute,
  onDelete,
  onNewChat
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearch(value);
  };

  // Sắp xếp: pinned trước, sau đó theo updatedAt
  const sortedConversations = [...conversations].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <div className="flex flex-col h-full w-full bg-bg-primary border-r border-border-light transition-theme">
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-border-light">
        <div className="flex items-center gap-2">
          <Input
            icon={<Search size={16} />}
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={handleSearchChange}
            className="bg-bg-secondary border-none h-9 text-sm"
            containerClassName="flex-1"
          />
          {onNewChat && (
            <button
              onClick={onNewChat}
              className="p-2 text-primary hover:bg-primary-light rounded-xl transition-all"
              title="Tạo cuộc trò chuyện mới"
            >
              <Users size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Spinner size="md" />
          </div>
        ) : sortedConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4">
              <Users size={32} className="text-text-tertiary" />
            </div>
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              {searchTerm ? 'Không tìm thấy' : 'Chưa có cuộc trò chuyện'}
            </h3>
            <p className="text-sm text-text-secondary">
              {searchTerm 
                ? 'Thử tìm kiếm với từ khóa khác' 
                : 'Bắt đầu trò chuyện với bạn bè của bạn'}
            </p>
          </div>
        ) : (
          <div className="group">
            {sortedConversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isActive={conversation.id === selectedId}
                currentUserId={currentUserId}
                onClick={() => onSelectConversation(conversation.id)}
                onPin={() => onPin(conversation.id, !conversation.pinned)}
                onMute={() => onMute(conversation.id, !conversation.muted)}
                onDelete={() => onDelete(conversation.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
