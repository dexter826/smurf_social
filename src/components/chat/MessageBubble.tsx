import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatTimeOnly } from '../../utils/dateUtils';
import { FileText, Download, MoreVertical, Trash2, Image as ImageIcon, X, Reply, Forward, RotateCcw, Edit2, CornerUpRight, Smile } from 'lucide-react';
import { Message, User } from '../../types';
import { Avatar, UserAvatar, ConfirmDialog, Button, IconButton, Modal, UserStatusText, ReactionDisplay, ReactionSelector } from '../ui';
import { chatService } from '../../services/chatService';
import { useChatStore } from '../../store/chatStore';


interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  sender?: User;
  showAvatar: boolean;
  showName: boolean;
  isLastMessage?: boolean;
  onRecall?: (messageId: string) => void;
  onDeleteForMe?: (messageId: string) => void;
  onForward?: (message: Message) => void;
  onReply?: (message: Message) => void;
  onEdit?: (message: Message) => void;
  currentUserId: string;
  usersMap: Record<string, User>;
  isGroup?: boolean;
  lastReadByUsers?: User[];
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isMe, 
  sender, 
  showAvatar, 
  showName,
  isLastMessage,
  onRecall,
  onDeleteForMe,
  onForward,
  onReply,
  onEdit,
  currentUserId,
  usersMap,
  isGroup = false,
  lastReadByUsers = []
}) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [showRecallConfirm, setShowRecallConfirm] = useState(false);
  const [showReaders, setShowReaders] = useState(false);
  const [showReactionSelector, setShowReactionSelector] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<'top' | 'bottom'>('bottom');
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { toggleReaction } = useChatStore();

  const handleProfileClick = () => {
    if (sender?.id) {
      navigate(`/profile/${sender.id}`);
    }
  };

  const toggleMenu = () => {
    if (!showMenu && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setMenuPlacement(spaceBelow < 250 ? 'top' : 'bottom');
    }
    setShowMenu(!showMenu);
  };

  const otherReaders = (message.readBy || []).filter(uid => uid !== currentUserId);
  const isRead = otherReaders.length > 0;
  const isDelivered = !!message.deliveredAt;

  // Giới hạn sửa tin nhắn (10 phút)
  const canEdit = isMe && !message.isRecalled && (
    (new Date().getTime() - new Date(message.timestamp).getTime()) / (1000 * 60) <= 10
  );
  
  const hasReactions = message.reactions && Object.keys(message.reactions).length > 0;

  const renderContent = () => {
    if (message.isRecalled) {
      return (
        <div className={`italic text-sm ${isMe ? 'text-white/80' : 'text-text-tertiary'}`}>
          Tin nhắn đã được thu hồi
        </div>
      );
    }

    switch (message.type) {
      case 'image':
        return (
          <div className="rounded-lg overflow-hidden max-w-[280px] cursor-pointer group relative">
            <img 
              src={message.fileUrl || message.content} 
              alt="sent" 
              className="w-full h-auto"
              onClick={() => setShowFullImage(true)}
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
              <ImageIcon className="opacity-0 group-hover:opacity-100 text-white" size={32} />
            </div>
          </div>
        );
        
      case 'file':
        const fileSize = message.fileSize 
          ? `${(message.fileSize / 1024).toFixed(1)} KB`
          : 'N/A';
          
        return (
          <div className={`flex items-center gap-3 p-3 rounded-lg border min-w-[220px] ${
            isMe ? 'bg-primary-light border-primary' : 'bg-bg-primary border-border-light'
          }`}>
            <div className={`p-2 rounded ${isMe ? 'bg-primary-light' : 'bg-secondary'}`}>
              <FileText size={24} className={isMe ? 'text-primary' : 'text-text-secondary'} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate text-sm">{message.fileName || 'Tài liệu'}</div>
              <div className="text-xs opacity-70">{fileSize}</div>
            </div>
            <a
              href={message.fileUrl}
              download={message.fileName}
              className="p-1 hover:bg-black/10 rounded-full transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Download size={18} />
            </a>
          </div>
        );
        
      case 'sticker':
        return (
          <img src={message.content} alt="sticker" className="w-24 h-24 object-contain" />
        );
        
      case 'system':
        return (
          <div className="flex flex-col items-center w-full my-1">
            <span className="bg-bg-secondary/50 px-3 py-1 rounded-full text-[11px] text-text-tertiary italic text-center max-w-[90%]">
              {message.content}
            </span>
          </div>
        );
        
      default:
        // Format thẻ tag: @[Name]
        const renderTextWithMentions = (text: string) => {
          const parts = text.split(/(@\[[^\]]+\])/g);
          return parts.map((part, index) => {
            if (part.startsWith('@[') && part.endsWith(']')) {
              const name = part.slice(2, -1);
              return (
                <span key={index} className={`font-bold ${isMe ? 'text-white' : 'text-primary'}`}>
                  @{name}
                </span>
              );
            }
            return <span key={index}>{part}</span>;
          });
        };

        return (
          <div className="flex flex-col">
            <div className="whitespace-pre-wrap break-all">
              {renderTextWithMentions(message.content)}
            </div>
            {message.isEdited && !message.isRecalled && (
              <span className="text-[10px] opacity-70 mt-0.5">(đã chỉnh sửa)</span>
            )}
          </div>
        );
    }
  };

  if (message.type === 'system') {
    return (
      <div className="w-full flex justify-center mb-3">
        {renderContent()}
      </div>
    );
  }

  return (
    <>
      <div 
        id={`msg-${message.id}`}
        className={`flex w-full mb-1 group ${isMe ? 'justify-end' : 'justify-start gap-3'}`}
      >
        {/* Avatar người nhận */}
        {!isMe && (
          <div className="w-8 flex-shrink-0 flex items-end">
            {showAvatar && (
              <UserAvatar 
                userId={sender?.id!} 
                src={sender?.avatar} 
                size="sm" 
                initialStatus={sender?.status} 
                showStatus={false} 
                onClick={handleProfileClick}
              />
            )}
          </div>
        )}

        <div className={`flex flex-col max-w-[75%] min-w-0 ${isMe ? 'items-end' : 'items-start'} relative ${hasReactions ? 'mb-4' : 'mb-1'}`}>
          {/* Tên người gửi trong nhóm */}
          {!isMe && showName && (
            <span 
              className="text-[11px] text-text-secondary ml-1 mb-1 font-medium cursor-pointer hover:underline"
              onClick={handleProfileClick}
            >
              {sender?.name}
            </span>
          )}

          <div className="relative group/message">
            {/* Nội dung tin nhắn */}
            <div 
              className={`
                relative px-3 ${hasReactions ? 'pb-3.5 pt-1.5' : 'py-1.5'} text-sm shadow-sm
                ${message.type === 'text' ? 'rounded-2xl' : 'rounded-lg bg-transparent shadow-none p-0'}
                ${isMe 
                  ? (message.type === 'text' ? 'bg-bg-message-sent text-text-on-primary rounded-br-sm break-all' : '') 
                  : (message.type === 'text' ? 'bg-bg-message-received text-text-primary border border-border-light rounded-bl-sm break-all' : '')
                }
              `}
            >
                {message.replyToId && message.replyToMessage && (
                <div className={`mb-2 p-2 rounded border-l-4 text-xs ${
                  isMe 
                    ? 'bg-white/10 border-white/50 text-white/90' 
                    : 'bg-bg-secondary border-primary text-text-secondary'
                } max-w-full overflow-hidden truncate opacity-90 cursor-pointer`}
                onClick={() => {
                  const element = document.getElementById(`msg-${message.replyToId}`);
                  element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  element?.classList.add('animate-highlight');
                  setTimeout(() => element?.classList.remove('animate-highlight'), 2000);
                }}
                >
                  <div className={`font-bold mb-1 ${isMe ? 'text-white' : 'text-primary'}`}>
                    {message.replyToMessage.senderId === currentUserId 
                      ? 'Bạn' 
                      : usersMap[message.replyToMessage.senderId]?.name || 'Người dùng'}
                  </div>
                  <div className="truncate">
                    {message.replyToMessage.type === 'text' 
                      ? message.replyToMessage.content.replace(/@\[([^\]]+)\]/g, '@$1')
                      : `[${message.replyToMessage.type}]`}
                  </div>
                </div>
              )}
              {renderContent()}
              
              {/* Thời gian & Trạng thái */}
              {message.type === 'text' && (
                <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${
                  isMe ? 'text-white/80' : 'text-text-tertiary'
                }`}>
                  <span>{formatTimeOnly(message.timestamp)}</span>
                </div>
              )}

              {/* Hiển thị cảm xúc & Bộ chọn Emoji */}
              {!message.isRecalled && (
                <div className={`absolute -bottom-2 z-10 flex items-center ${isMe ? 'right-1' : 'left-1'}`}>
                    {hasReactions ? (
                      <ReactionDisplay 
                        reactions={message.reactions} 
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
                          onSelect={(emoji) => toggleReaction(message.id, currentUserId, emoji)}
                          onClose={() => setShowReactionSelector(false)}
                          className={`bottom-full mb-1 ${isMe ? 'right-0' : 'left-0'}`}
                          currentReaction={message.reactions?.[currentUserId]}
                        />
                      </>
                    )}
                </div>
              )}
            </div>

             {/* Menu chức năng (đã bỏ nút Emoji) */}
            {!message.isRecalled && (
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
                          onReply?.(message);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2 transition-colors"
                      >
                        <Reply size={14} /> Trả lời
                      </button>
                      <button
                        onClick={() => {
                          onForward?.(message);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2 transition-colors"
                      >
                        <Forward size={14} /> Chuyển tiếp
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => {
                            onEdit?.(message);
                            setShowMenu(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-bg-hover flex items-center gap-2 transition-colors"
                        >
                          <Edit2 size={14} /> Chỉnh sửa
                        </button>
                      )}
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
                          onDeleteForMe?.(message.id);
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
            )}
          </div>

          {/* Thời gian cho file media */}
          {message.type !== 'text' && (
            <span className="text-[10px] text-text-tertiary mt-1">
              {formatTimeOnly(message.timestamp)}
              {/* Status moved to separate line below */}
            </span>
          )}
          {isMe && (isLastMessage || lastReadByUsers.length > 0) && (
            <div className="flex flex-col items-end mt-0.5">
              {/* Hiển thị "Đã gửi/Đã nhận" nếu là tin nhắn cuối cùng và chưa ai đọc */}
              {isLastMessage && lastReadByUsers.length === 0 && (
                <div className="text-[11px] font-medium text-text-tertiary select-none">
                  {isDelivered ? 'Đã nhận' : 'Đã gửi'}
                </div>
              )}

              {/* Danh sách avatar người đã đọc tin nhắn này (đây là tin cuối cùng họ xem) */}
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
              
              {/* Danh sách người xem chi tiết khi click (chỉ cho group) */}
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
            </div>
          )}
        </div>
      </div>

      {/* Modal xem ảnh full */}
      {showFullImage && message.type === 'image' && (
        <div
          className="fixed inset-0 z-50 bg-bg-overlay backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <img
            src={message.fileUrl || message.content}
            alt="full"
            className="max-w-full max-h-full object-contain"
          />
          <IconButton
            className="absolute top-4 right-4 text-white hover:text-text-tertiary"
            onClick={() => setShowFullImage(false)}
            icon={<X size={24} />}
            size="lg"
          />
        </div>
      )}



      <ConfirmDialog
        isOpen={showRecallConfirm}
        onClose={() => setShowRecallConfirm(false)}
        onConfirm={() => onRecall?.(message.id)}
        title="Thu hồi tin nhắn"
        message="Tin nhắn này sẽ bị thu hồi đối với tất cả mọi người trong cuộc trò chuyện."
        confirmLabel="Thu hồi"
        variant="warning"
      />
    </>
  );
};
