import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Smile, Check, CheckCheck } from 'lucide-react';

import { Message, User, MessageType } from '../../../types';
import {
  Avatar,
  UserAvatar,
  IconButton,
  ReactionDisplay,
  ReactionSelector,
  Modal,
  UserStatusText,
  ConfirmDialog,
  MediaViewer,
  BannedBadge,
  ReactionDetailsModal
} from '../../ui';
import { useChatStore } from '../../../store/chatStore';
import { TIME_LIMITS } from '../../../constants/appConfig';
import { formatTimeOnly } from '../../../utils/dateUtils';
import { scrollToMessage } from '../../../utils';
import { MessageContent } from './MessageContent';
import { MessageActions } from './MessageActions';


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
  isBlocked?: boolean;
  onCall?: () => void;
}

const MessageBubbleInner: React.FC<MessageBubbleProps> = ({
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
  lastReadByUsers = [],
  isBlocked = false,
  onCall,
}) => {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [showRecallConfirm, setShowRecallConfirm] = useState(false);
  const [showReaders, setShowReaders] = useState(false);
  const [showReactionSelector, setShowReactionSelector] = useState(false);
  const [showReactionDetails, setShowReactionDetails] = useState(false);
  const [menuPlacement, setMenuPlacement] = useState<'top' | 'bottom'>('bottom');
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const { toggleReaction, uploadProgress } = useChatStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const handleProfileClick = useCallback(() => {
    if (sender?.id) {
      navigate(`/profile/${sender.id}`);
    }
  }, [sender?.id, navigate]);

  const toggleMenu = useCallback(() => {
    if (!showMenu && menuButtonRef.current) {
      const rect = menuButtonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setMenuPlacement(spaceBelow < 250 ? 'top' : 'bottom');
    }
    setShowMenu(!showMenu);
  }, [showMenu]);

  const otherReaders = (message.readBy || []).filter(uid => uid !== currentUserId);
  const isRead = otherReaders.length > 0;
  const isDelivered = !!message.deliveredAt;

  const canEdit = isMe && !message.isRecalled && message.type !== MessageType.CALL && (
    (new Date().getTime() - new Date(message.createdAt).getTime()) <= TIME_LIMITS.MESSAGE_EDIT_WINDOW
  );

  const hasReactions = (message.reactionCount ?? 0) > 0;

  const handleToggleVoice = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) {
      audioRef.current = new Audio(message.fileUrl || message.content);
      audioRef.current.onended = () => setIsPlaying(false);
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  if (message.type === 'system') {
    return (
      <div className="w-full flex justify-center mb-3">
        <div className="flex flex-col items-center w-full my-1">
          <span className="bg-bg-secondary/50 px-3 py-1 rounded-full text-[11px] text-text-tertiary italic text-center max-w-[90%]">
            {message.content}
          </span>
        </div>
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
                userId={sender?.id ?? ''}
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
            <ReactionDetailsModal
        isOpen={showReactionDetails}
        onClose={() => setShowReactionDetails(false)}
        sourceId={message.id}
        sourceType="message"
        currentUserId={currentUserId}
      />

            {/* Nội dung tin nhắn */}
            <div
              className={`
                relative px-3 ${hasReactions ? 'pb-3.5 pt-1.5' : 'py-1.5'} text-sm shadow-sm
                ${(message.type === 'text' || message.isRecalled || message.replyToId || message.type === 'call') ? 'rounded-2xl' : 'rounded-lg bg-transparent shadow-none p-0'}
                ${isMe
                  ? ((message.type === 'text' || message.isRecalled || message.replyToId) ? 'bg-bg-message-sent text-text-on-primary rounded-br-sm break-all' : (message.type === 'call' ? 'bg-bg-message-sent text-text-on-primary rounded-br-sm' : ''))
                  : ((message.type === 'text' || message.isRecalled || message.replyToId) ? 'bg-bg-message-received text-text-primary border border-border-light rounded-bl-sm break-all' : (message.type === 'call' ? 'bg-bg-message-received text-text-primary border border-border-light rounded-bl-sm' : ''))
                }
                ${message.type === 'call' && !message.isRecalled && onCall ? 'cursor-pointer hover:opacity-90 active:scale-[0.98] transition-all duration-base' : ''}
              `}
              onClick={() => {
                if (message.type === 'call' && !message.isRecalled && onCall) {
                  onCall();
                }
              }}
            >
              {message.replyToId && message.replyToSnippet && (
                <div className={`mb-2 p-2 rounded border-l-4 text-xs ${isMe
                  ? 'bg-white/10 border-white/50 text-white/90'
                  : 'bg-bg-secondary border-primary text-text-secondary'
                  } max-w-full overflow-hidden truncate opacity-90 cursor-pointer`}
                  onClick={() => scrollToMessage(message.replyToId!)}
                >
                  <div className={`font-bold mb-1 ${isMe ? 'text-white' : 'text-primary'}`}>
                    {message.replyToSnippet.senderId === currentUserId
                      ? 'Bạn'
                      : usersMap[message.replyToSnippet.senderId]?.name || 'Người dùng'}
                  </div>
                  <div className="truncate">
                    {message.replyToSnippet.type === 'text'
                      ? message.replyToSnippet.content.replace(/@\[([^\]]+)\]/g, '@$1')
                      : `[${message.replyToSnippet.type}]`}
                  </div>
                </div>
              )}

              <MessageContent
                message={message}
                isMe={isMe}
                uploadProgress={uploadProgress}
                isPlaying={isPlaying}
                onToggleVoice={handleToggleVoice}
                setShowFullImage={setShowFullImage}
              />

              {/* Thời gian & Trạng thái */}
              {(message.type === 'text' || message.type === 'call' || message.isRecalled) && (
                <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${isMe ? 'text-white/80' : 'text-text-tertiary'
                  }`}>
                  <span>{formatTimeOnly(message.createdAt)}</span>
                </div>
              )}

              {/* Hiển thị cảm xúc & Bộ chọn Emoji */}
              {!message.isRecalled && message.type !== MessageType.CALL && (
                <div className={`absolute -bottom-3.5 z-10 flex items-center gap-1 ${isMe ? 'left-1' : 'right-1'}`}>
                  {hasReactions && (
                    <ReactionDisplay
                      reactionSummary={message.reactionSummary}
                      reactionCount={message.reactionCount}
                      onClick={() => setShowReactionDetails(true)}
                    />
                  )}

                  <div className={`${hasReactions ? 'opacity-100' : 'opacity-0 group-hover/message:opacity-100'} transition-all duration-base flex items-center`}>
                    <button
                      className="flex items-center justify-center w-8 h-[26px] bg-bg-secondary rounded-full border border-divider shadow-sm text-text-secondary hover:text-primary hover:border-primary hover:shadow-md transition-all duration-base"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowReactionSelector(!showReactionSelector);
                      }}
                    >
                      <Smile size={12} strokeWidth={2.5} />
                    </button>
                  </div>

                  {showReactionSelector && (
                    <>
                      <div
                        className="fixed inset-0 z-[var(--z-dropdown)] bg-transparent"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowReactionSelector(false);
                        }}
                      />
                      <ReactionSelector
                        onSelect={(emoji) => toggleReaction(message.id, currentUserId, emoji)}
                        onClose={() => setShowReactionSelector(false)}
                        autoClose={false}
                        className={`bottom-full mb-1 ${isMe ? 'right-0' : 'left-0'}`}
                        currentReaction={message.myReaction}
                      />
                    </>
                  )}
                </div>
              )}
            </div>

            {!message.isRecalled && (
              <MessageActions
                message={message}
                isMe={isMe}
                canEdit={canEdit}
                showMenu={showMenu}
                setShowMenu={setShowMenu}
                menuPlacement={menuPlacement}
                menuButtonRef={menuButtonRef}
                toggleMenu={toggleMenu}
                onReply={onReply}
                onForward={onForward}
                onEdit={onEdit}
                setShowRecallConfirm={setShowRecallConfirm}
                onDeleteForMe={onDeleteForMe}
                isBlocked={isBlocked}
              />
            )}
          </div>

          {/* Thời gian cho file media */}
          {message.type !== 'text' && message.type !== 'call' && !message.isRecalled && (
            <span className="text-[10px] text-text-tertiary mt-1">
              {formatTimeOnly(message.createdAt)}
            </span>
          )}
          {isMe && (isLastMessage || lastReadByUsers.length > 0) && (
            <div className="flex flex-col items-end mt-0.5">
              {/* Hiển thị "Đã gửi/Đã nhận" nếu là tin nhắn cuối cùng và chưa ai đọc */}
              {isLastMessage && lastReadByUsers.length === 0 && (
                <div className={`mt-0.5 select-none ${isDelivered ? 'text-primary' : 'text-text-tertiary'}`}>
                  {isDelivered ? <CheckCheck size={14} strokeWidth={2.5} /> : <Check size={14} strokeWidth={2.5} />}
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
                      <div key={reader.id} className="flex items-center gap-3 p-2 hover:bg-bg-hover active:bg-bg-active rounded-lg transition-all duration-base">
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

      <MediaViewer
        media={[{ type: 'image', url: message.fileUrl || message.content }]}
        initialIndex={0}
        isOpen={showFullImage}
        onClose={() => setShowFullImage(false)}
      />



      <ConfirmDialog
        isOpen={showRecallConfirm}
        onClose={() => setShowRecallConfirm(false)}
        onConfirm={() => onRecall?.(message.id)}
        title="Thu hồi tin nhắn"
        message="Tin nhắn này sẽ bị thu hồi đối với tất cả mọi người trong cuộc trò chuyện."
        confirmLabel="Thu hồi"
        variant="danger"
      />
    </>
  );
};

export const MessageBubble = React.memo(MessageBubbleInner);