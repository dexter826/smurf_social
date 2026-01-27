import React, { useState, useEffect } from 'react';
import { X, Info, Users, Image, Search } from 'lucide-react';
import { Conversation, Message, User } from '../../types';
import { ChatDetailsHeader } from './ChatDetailsHeader';
import { ChatDetailsMemberList } from './ChatDetailsMemberList';
import { ChatDetailsMedia } from './ChatDetailsMedia';
import { ChatDetailsSearch } from './ChatDetailsSearch';
import { ChatDetailsActions } from './ChatDetailsActions';

interface ChatDetailsPanelProps {
  conversation: Conversation;
  messages: Message[];
  currentUserId: string;
  usersMap: Record<string, User>;
  isOpen: boolean;
  isBlocked?: boolean;
  onClose: () => void;
  onToggleMute?: () => void;
  onTogglePin?: () => void;
  onToggleBlock?: () => void;
  onDelete?: () => void;
  onMemberClick?: (userId: string) => void;
  onMessageClick?: (messageId: string) => void;
}

type TabId = 'info' | 'members' | 'media' | 'search';

export const ChatDetailsPanel: React.FC<ChatDetailsPanelProps> = ({
  conversation,
  messages,
  currentUserId,
  usersMap,
  isOpen,
  isBlocked,
  onClose,
  onToggleMute,
  onTogglePin,
  onToggleBlock,
  onDelete,
  onMemberClick,
  onMessageClick
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const partner = conversation.isGroup
    ? null
    : conversation.participants.find(p => p.id !== currentUserId);

  // Animation controls
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
    } else {
      setIsAnimating(false);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 300); // Đợi animation kết thúc
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!isVisible) return null;

  const tabs: { id: TabId; icon: React.ReactNode; label: string; showFor?: 'group' | 'all' }[] = [
    { id: 'info', icon: <Info size={18} />, label: 'Thông tin', showFor: 'all' },
    { id: 'members', icon: <Users size={18} />, label: 'Thành viên', showFor: 'group' },
    { id: 'media', icon: <Image size={18} />, label: 'Media', showFor: 'all' },
    { id: 'search', icon: <Search size={18} />, label: 'Tìm kiếm', showFor: 'all' },
  ];

  const visibleTabs = tabs.filter(
    tab => tab.showFor === 'all' || (tab.showFor === 'group' && conversation.isGroup)
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'info':
        return (
          <>
            <ChatDetailsHeader
              conversation={conversation}
              currentUserId={currentUserId}
              partner={partner || undefined}
            />
            <ChatDetailsActions
              conversation={conversation}
              isBlocked={isBlocked}
              onToggleMute={onToggleMute}
              onTogglePin={onTogglePin}
              onToggleBlock={onToggleBlock}
              onDelete={onDelete}
            />
          </>
        );
      case 'members':
        return (
          <ChatDetailsMemberList
            conversation={conversation}
            currentUserId={currentUserId}
            onMemberClick={onMemberClick}
          />
        );
      case 'media':
        return <ChatDetailsMedia messages={messages} />;
      case 'search':
        return (
          <ChatDetailsSearch
            messages={messages}
            usersMap={usersMap}
            onMessageClick={onMessageClick}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      {/* Backdrop - Chỉ hiển thị trên mobile */}
      <div
        onClick={onClose}
        className={`
          fixed inset-0 bg-black/40 z-40 md:hidden
          transition-opacity duration-300
          ${isAnimating ? 'opacity-100' : 'opacity-0'}
        `}
      />

      {/* Panel */}
      <div
        className={`
          fixed md:relative right-0 top-0 h-full z-50
          w-[320px] bg-bg-primary border-l border-border-light
          flex flex-col shadow-xl
          transition-transform duration-300 ease-out
          ${isAnimating ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-[72px] border-b border-border-light flex-shrink-0">
          <h2 className="text-base font-bold text-text-primary">Chi tiết</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-bg-hover rounded-full transition-colors text-text-secondary"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border-light flex-shrink-0">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex-1 flex flex-col items-center gap-1 py-3 transition-colors relative
                ${activeTab === tab.id
                  ? 'text-primary'
                  : 'text-text-tertiary hover:text-text-secondary'
                }
              `}
            >
              {tab.icon}
              <span className="text-xs font-medium">{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {renderTabContent()}
        </div>
      </div>
    </>
  );
};
