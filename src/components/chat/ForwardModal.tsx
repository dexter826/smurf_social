import React, { useState } from 'react';
import { Search, Send } from 'lucide-react';
import { Modal, Avatar, UserAvatar, Input, Button } from '../ui';
import { Message, Conversation, User } from '../../types';
import { useChatStore } from '../../store/chatStore';

interface ForwardModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
  currentUserId: string;
  conversations: Conversation[];
  usersMap: Record<string, User>;
}

export const ForwardModal: React.FC<ForwardModalProps> = ({
  isOpen,
  onClose,
  message,
  currentUserId,
  conversations,
  usersMap
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const forwardMessage = useChatStore(state => state.forwardMessage);

  if (!message) return null;

  const filteredConversations = conversations.filter(conv => {
    const name = conv.isGroup 
      ? conv.groupName 
      : conv.participants.find(p => p.id !== currentUserId)?.name || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleForward = async (conversationId: string) => {
    try {
      setSendingTo(conversationId);
      await forwardMessage(conversationId, currentUserId, message);
      setSentIds(prev => new Set(prev).add(conversationId));
    } catch (error) {
      console.error("Lỗi khi chuyển tiếp:", error);
    } finally {
      setSendingTo(null);
    }
  };

  const handleClose = () => {
    setSearchTerm('');
    setSentIds(new Set());
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Chuyển tiếp tin nhắn"
      maxWidth="sm"
      footer={
        <Button onClick={handleClose} variant="primary" className="w-full">
          Xong
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" size={18} />
          <Input
            placeholder="Tìm kiếm người dùng hoặc nhóm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {/* Message Preview */}
        <div className="p-3 bg-bg-secondary rounded-lg border border-border-light">
          <p className="text-xs text-text-tertiary mb-1 font-medium">Nội dung chuyển tiếp:</p>
          <p className="text-sm text-text-primary line-clamp-2 italic">
            {message.type === 'text' ? message.content : `[${message.type}]`}
          </p>
        </div>

        {/* List */}
        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const partner = conv.participants.find(p => p.id !== currentUserId);
              const name = conv.isGroup ? conv.groupName : partner?.name || 'Unknown';
              const avatar = conv.isGroup ? conv.groupAvatar : partner?.avatar;
              const hasSent = sentIds.has(conv.id);

              return (
                <div
                  key={conv.id}
                  className="flex items-center justify-between p-2 hover:bg-bg-hover rounded-xl transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <UserAvatar
                      userId={conv.isGroup ? '' : partner?.id || ''}
                      src={avatar}
                      name={name}
                      size="sm"
                      isGroup={conv.isGroup}
                    />
                    <span className="text-sm font-medium text-text-primary truncate">{name}</span>
                  </div>
                  <Button
                    size="sm"
                    variant={hasSent ? "secondary" : "ghost"}
                    isLoading={sendingTo === conv.id}
                    disabled={hasSent}
                    onClick={() => handleForward(conv.id)}
                    icon={!hasSent && <Send size={14} className="text-primary" />}
                    className={hasSent ? "" : "opacity-0 group-hover:opacity-100 transition-opacity"}
                  >
                    {hasSent ? 'Đã gửi' : 'Gửi'}
                  </Button>
                </div>
              );
            })
          ) : (
            <div className="py-8 text-center text-text-tertiary text-sm">
              Không tìm thấy kết quả
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
