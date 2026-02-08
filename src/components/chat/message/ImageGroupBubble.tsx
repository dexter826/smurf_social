import React, { useState } from 'react';
import { MoreVertical, Reply, Forward, RotateCcw, Trash2, Smile, X, Edit2, Check, CheckCheck } from 'lucide-react';
import { Message, User } from '../../../types';
import { formatTimeOnly } from '../../../utils/dateUtils';
import { Avatar, UserAvatar, ImageViewer, IconButton, ReactionDisplay, ReactionSelector, Modal, UserStatusText, ConfirmDialog } from '../../ui';
import { useChatStore } from '../../../store/chatStore';

interface ImageGroupBubbleProps {
  messages: Message[];
  isMe: boolean;
  sender?: User;
  showAvatar: boolean;
  showName: boolean;
  currentUserId: string;
  usersMap: Record<string, User>;
  isGroup?: boolean;
  isLastMessage?: boolean;
  lastReadByUsers?: User[];
  onRecall?: (messageId: string) => void;
  onDeleteForMe?: (messageId: string) => void;
  onForward?: (message: Message) => void;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
}

export const ImageGroupBubble: React.FC<ImageGroupBubbleProps> = ({
  messages,
  sender,
  showAvatar,
  showName,
  currentUserId,
  usersMap,
  isGroup = false,
  isLastMessage,
  lastReadByUsers = [],
  onRecall,
  onDeleteForMe,
  onForward,
  onReply,
  onEdit
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [showMenu, setShowMenu] = useState(false);
  const [showRecallConfirm, setShowRecallConfirm] = useState(false);
  const [showReaders, setShowReaders] = useState(false);
  const [showReactionSelector, setShowReactionSelector] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<'top' | 'bottom'>('bottom');
  const menuButtonRef = React.useRef<HTMLButtonElement>(null);
  const { toggleReaction } = useChatStore();

  const validMessages = messages.filter(m => !m.isRecalled && !m.deletedBy?.includes(currentUserId));
  if (validMessages.length === 0) return null;

  const lastMsg = validMessages[validMessages.length - 1];
  const hasReactions = lastMsg.reactions && Object.keys(lastMsg.reactions).length > 0;

  const toggleMenu = () => {
    if (!showMenu && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setMenuPlacement(spaceBelow < 250 ? 'top' : 'bottom');
    }
    setShowMenu(!showMenu);
  };

  const isMe = lastMsg.senderId === currentUserId;
  const isDelivered = !!lastMsg.deliveredAt;

  const gridClass = validMessages.length === 1 
    ? 'grid-cols-1' 
    : validMessages.length === 2 
      ? 'grid-cols-2' 
      : 'grid-cols-2';

  const renderImages = () => {
    const count = validMessages.length;
    
    return validMessages.slice(0, 4).map((msg, index) => {
      const isOverlay = index === 3 && count > 4;
      const imageUrl = msg.fileUrl || msg.content;
      
      return (
        <div 
          key={msg.id} 
          className={`relative overflow-hidden cursor-pointer ${
            count === 3 && index === 0 ? 'col-span-2 row-span-2 aspect-video' : 'aspect-square'
          }`}
          onClick={() => setSelectedIndex(index)}
        >
          <img 
            src={imageUrl} 
            alt="sent" 
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
            loading="lazy"
          />
          {isOverlay && (
             <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xl font-bold">
               +{count - 3}
             </div>
          )}
        </div>
      );
    });
  };



  return (
    <div className={`flex w-full mb-1 group ${isMe ? 'justify-end' : 'justify-start gap-3'}`}>
      {!isMe && (
        <div className="w-8 flex-shrink-0 flex items-end">
          {showAvatar && (
            <UserAvatar 
              userId={sender?.id!} 
              src={sender?.avatar} 
              size="sm" 
              showStatus={false} 
            />
          )}
        </div>
      )}

      <div className={`flex flex-col max-w-[70%] min-w-0 ${isMe ? 'items-end' : 'items-start'} relative ${hasReactions ? 'mb-4' : 'mb-1'}`}>
        {!isMe && showName && (
          <span className="text-[11px] text-text-secondary ml-1 mb-1 font-medium">
            {sender?.name}
          </span>
        )}
        
        <div className="relative group/message">
          <div className={`rounded-xl overflow-hidden grid gap-0.5 ${gridClass} border border-border-light shadow-sm bg-bg-secondary w-full max-w-[320px]`}>
            {renderImages()}
          </div>

          {/* Cảm xúc & Emoji */}
          <div className={`absolute -bottom-2 z-10 flex items-center ${isMe ? 'left-1' : 'right-1'}`}>
            {hasReactions ? (
              <ReactionDisplay 
                reactions={lastMsg.reactions} 
                onClick={() => setShowReactionSelector(!showReactionSelector)}
              />
            ) : (
              <div className="opacity-0 group-hover/message:opacity-100 transition-opacity">
                <button
                  className="flex items-center justify-center w-6 h-5 bg-bg-secondary rounded-full ring-1 ring-border-light shadow-sm text-text-secondary hover:text-primary hover:ring-primary hover:shadow-md transition-all duration-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReactionSelector(!showReactionSelector);
                  }}
                >
                  <Smile size={12} />
                </button>
              </div>
            )}

            {showReactionSelector && (
              <>
                <div 
                  className="fixed inset-0 z-40 bg-transparent" 
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReactionSelector(false);
                  }}
                />
                <ReactionSelector 
                  onSelect={(emoji) => toggleReaction(lastMsg.id, currentUserId, emoji)}
                  onClose={() => setShowReactionSelector(false)}
                  className={`bottom-full mb-1 ${isMe ? 'right-0' : 'left-0'}`}
                  currentReaction={lastMsg.reactions?.[currentUserId]}
                />
              </>
            )}
          </div>

          {/* Menu chức năng */}
          <div 
            className={`absolute top-0 opacity-0 group-hover/message:opacity-100 transition-opacity flex items-center gap-1 ${isMe ? 'right-full mr-2' : 'left-full ml-2'}`}
          >
            <IconButton
              ref={menuButtonRef}
              onClick={toggleMenu}
              icon={<MoreVertical size={14} />}
              size="sm"
            />

            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className={`absolute z-20 bg-bg-primary border border-border-light rounded-lg shadow-dropdown py-1 w-40 ${isMe ? 'right-0' : 'left-0'} ${
                  menuPlacement === 'top' ? 'bottom-full mb-1' : 'top-8'
                }`}>
                  <button
                    onClick={() => {
                      onReply?.(lastMsg);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2 transition-colors"
                  >
                    <Reply size={14} /> Trả lời
                  </button>
                  <button
                    onClick={() => {
                      onForward?.(lastMsg);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2 transition-colors"
                  >
                    <Forward size={14} /> Chuyển tiếp
                  </button>
                  {isMe && (
                    <button
                      onClick={() => {
                        setShowRecallConfirm(true);
                        setShowMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2 transition-colors text-warning"
                    >
                      <RotateCcw size={14} /> Thu hồi
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onDeleteForMe?.(lastMsg.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2 transition-colors text-error"
                  >
                    <Trash2 size={14} /> Xóa phía tôi
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Thời gian & Trạng thái đọc */}
        <div className="flex flex-col items-end mt-1">
          <span className="text-[10px] text-text-tertiary">
            {formatTimeOnly(lastMsg.createdAt)}
          </span>

          {isMe && (isLastMessage || lastReadByUsers.length > 0) && (
            <div className="flex flex-col items-end mt-0.5">
              {isLastMessage && lastReadByUsers.length === 0 && (
                <div className={`mt-0.5 select-none ${isDelivered ? 'text-primary' : 'text-text-tertiary'}`}>
                  {isDelivered ? <CheckCheck size={14} strokeWidth={2.5} /> : <Check size={14} strokeWidth={2.5} />}
                </div>
              )}

              {lastReadByUsers.length > 0 && (
                <div 
                  className="flex items-center gap-1 mt-1 cursor-pointer"
                  onClick={() => isGroup && setShowReaders(!showReaders)}
                >
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {lastReadByUsers.slice(0, 3).map(user => (
                      <Avatar 
                        key={user.id}
                        src={user.avatar} 
                        name={user.name} 
                        size="2xs" 
                        className="ring-1 ring-bg-primary"
                      />
                    ))}
                  </div>
                  {lastReadByUsers.length > 3 && (
                    <span className="text-[10px] text-text-tertiary font-medium">
                      +{lastReadByUsers.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Viewer */}
      <ImageViewer
        images={validMessages.map(m => m.fileUrl || m.content)}
        initialIndex={selectedIndex}
        isOpen={selectedIndex !== -1}
        onClose={() => setSelectedIndex(-1)}
      />

      {/* Xem người đã đọc */}
      {isGroup && lastReadByUsers.length > 0 && (
        <Modal
          isOpen={showReaders}
          onClose={() => setShowReaders(false)}
          title="Người đã xem"
          maxWidth="sm"
        >
          <div className="space-y-3">
            {lastReadByUsers.map(reader => (
              <div key={reader.id} className="flex items-center gap-3 p-2 hover:bg-bg-hover rounded-lg transition-colors">
                <UserAvatar userId={reader.id} src={reader.avatar} size="md" initialStatus={reader.status} showStatus={true} />
                <div className="flex-1">
                  <div className="text-sm font-bold text-text-primary">{reader.name}</div>
                  <UserStatusText 
                    userId={reader.id} 
                    initialStatus={reader.status} 
                    className="text-xs text-text-tertiary"
                  />
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}

      {/* Xác nhận thu hồi */}
      <ConfirmDialog
        isOpen={showRecallConfirm}
        onClose={() => setShowRecallConfirm(false)}
        onConfirm={() => onRecall?.(lastMsg.id)}
        title="Thu hồi tin nhắn"
        message="Album ảnh này sẽ bị thu hồi đối với tất cả mọi người trong cuộc trò chuyện."
        confirmLabel="Thu hồi"
        variant="warning"
      />
    </div>
  );
};
