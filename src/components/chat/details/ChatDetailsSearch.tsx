import React, { useState, useMemo } from 'react';
import { Message, User } from '../../../types';
import { Search, X, MessageCircle } from 'lucide-react';
import { formatTimeOnly } from '../../../utils/dateUtils';
import { Input, IconButton } from '../../ui';
import { PAGINATION } from '../../../constants';

interface ChatDetailsSearchProps {
  messages: Message[];
  usersMap: Record<string, User>;
  onMessageClick?: (messageId: string) => void;
}

export const ChatDetailsSearch: React.FC<ChatDetailsSearchProps> = ({
  messages,
  usersMap,
  onMessageClick
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    
    const term = searchTerm.toLowerCase();
    return messages
      .filter((msg) => {
        const contentMatch = msg.content?.toLowerCase().includes(term);
        const fileNameMatch = msg.type === 'file' && msg.fileName?.toLowerCase().includes(term);
        return contentMatch || fileNameMatch;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, PAGINATION.MESSAGES);
  }, [messages, searchTerm]);

  const highlightText = (text: string, term: string) => {
    if (!term.trim()) return text;
    
    const parts = text.split(new RegExp(`(${term})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === term.toLowerCase() 
        ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-600/50 rounded px-0.5">{part}</mark>
        : part
    );
  };

  return (
    <div className="py-4">
      <h3 className="px-4 text-sm font-semibold text-text-secondary mb-3">
        Tìm kiếm tin nhắn
      </h3>

      {/* Search Input */}
      <div className="px-4 mb-3">
        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setIsSearching(true)}
          placeholder="Tìm trong cuộc trò chuyện..."
          icon={<Search size={16} />}
          rightElement={searchTerm ? (
            <IconButton
              onClick={() => setSearchTerm('')}
              icon={<X size={16} />}
              size="sm"
            />
          ) : undefined}
        />
      </div>

      {/* Search Results */}
      {isSearching && searchTerm && (
        <div className="flex flex-col">
          {searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
              <MessageCircle size={32} className="mb-2 opacity-50" />
              <p className="text-sm">Không tìm thấy tin nhắn</p>
            </div>
          ) : (
            <div className="space-y-1 px-2 pb-4">
              <p className="px-2 text-xs text-text-tertiary mb-2">
                Tìm thấy {searchResults.length} tin nhắn
              </p>
              {searchResults.map((msg) => {
                const sender = usersMap[msg.senderId];
                return (
                  <button
                    key={msg.id}
                    onClick={() => onMessageClick?.(msg.id)}
                    className="w-full text-left p-3 rounded-lg hover:bg-bg-hover transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-text-secondary">
                        {sender?.name || 'Unknown'}
                      </span>
                      <span className="text-xs text-text-tertiary">
                        {formatTimeOnly(msg.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-text-primary line-clamp-2">
                      {msg.type === 'file' ? (
                        <span className="flex items-center gap-1">
                          <span className="text-primary font-medium shrink-0">[File]</span>
                          {highlightText(msg.fileName || msg.content, searchTerm)}
                        </span>
                      ) : (
                        highlightText(msg.content, searchTerm)
                      )}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {!isSearching && !searchTerm && (
        <div className="flex flex-col items-center justify-center py-6 text-text-tertiary">
          <Search size={24} className="mb-2 opacity-50" />
          <p className="text-sm">Nhập từ khóa để tìm kiếm</p>
        </div>
      )}
    </div>
  );
};
