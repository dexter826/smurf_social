import React, { useCallback } from 'react';
import { Send, X, Edit2, Reply, Ban } from 'lucide-react';
import { EmojiPicker, Button, IconButton, TextArea } from '../../ui';
import { MentionList } from './MentionList';
import { FilePreview } from './FilePreview';
import { RecordingUI } from './RecordingUI';
import { ActionsMenu } from './ActionsMenu';
import { GiphyPicker } from './GiphyPicker';
import { useLinkPreview } from '../../../hooks/useLinkPreview';
import { useChatInput } from '../../../hooks/chat/useChatInput';
import { insertTextAtCursor } from '../../../utils';
import { VALIDATION } from '../../../constants';
import { RtdbMessage, User } from '../../../../shared/types';
import { LinkPreviewCard } from '../../shared/LinkPreviewCard';
import { getMessageDisplayContent } from '../../../utils/chatUtils';

interface ChatInputProps {
  onSendText: (text: string, mentions?: string[], replyToId?: string) => void;
  onSendImages: (files: File[], options?: { content?: string; mentions?: string[]; replyToId?: string }) => Promise<void>;
  onSendFile: (file: File, replyToId?: string) => void;
  onSendVideo?: (file: File, replyToId?: string) => void;
  onSendVoice?: (file: File, replyToId?: string, duration?: number) => void;
  onSendGif?: (url: string, replyToId?: string) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
  blockedMessage?: string;
  replyingTo?: { id: string; data: RtdbMessage };
  editingMessage: { id: string; data: RtdbMessage } | null;
  onCancelAction: () => void;
  onEditMessage?: (text: string) => Promise<void>;
  currentUserId: string;
  usersMap: Record<string, User>;
  participants?: User[];
  isGroup?: boolean;
  isDisbanded?: boolean;
  onDeleteConversation?: () => void;
  onManageBlock?: () => void;
  isBlockedByMe?: boolean;
  conversationId?: string;
  isLoadingSettings?: boolean;
}

/** Component nhập tin nhắn chat */
export const ChatInput: React.FC<ChatInputProps> = (props) => {
  const {
    disabled = false, blockedMessage, replyingTo, editingMessage,
    onCancelAction, onSendGif, currentUserId, usersMap,
    isDisbanded = false, onDeleteConversation, onManageBlock,
    isBlockedByMe = false, isLoadingSettings = false,
  } = props;

  const chatInputState = useChatInput(props);
  const {
    inputText, setInputText, selectedFiles, isSending,
    showActions, setShowActions, showGiphy, setShowGiphy,
    playingPreview, inputRef, fileInputRef,
    isRecording, recordingDuration, startRecording, stopRecording, cancelRecording,
    mentionsProps, onSelectMention,
    handleInputChange, handleKeyDown, handleFileSelect, handlePaste,
    handleSubmit, handlePlayVoice, removeFile,
  } = chatInputState;

  const { showMentions, filteredParticipants, mentionIndex } = mentionsProps;

  const linkPreview = useLinkPreview(editingMessage ? '' : inputText);

  const renderMentionOverlay = useCallback((value: string) => (
    <>
      {value.split(/(@[^\n\u200B]+\u200B)/g).map((part, i) => {
        if (part.startsWith('@') && part.endsWith('\u200B')) {
          return (
            <span key={i} className="text-primary bg-primary/10 rounded font-medium border-b border-primary/30">
              {part.slice(0, -1)}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
      {value.endsWith('\n') && <br />}
    </>
  ), []);

  const canSend = (inputText.trim() || selectedFiles.length > 0) && !blockedMessage;

  if (isLoadingSettings) {
    return (
      <div className="flex-shrink-0 border-t border-border-light bg-bg-primary pb-safe h-[60px] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (blockedMessage || isDisbanded) {
    return (
      <div className="flex-shrink-0 border-t border-border-light bg-bg-primary pb-safe" style={{ zIndex: 'var(--z-sticky)' }}>
        <div className="flex items-center justify-between px-4 py-3 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-error/10 flex items-center justify-center flex-shrink-0">
              <Ban size={15} className="text-error" />
            </div>
            <span className="text-sm text-text-secondary font-medium truncate">
              {isDisbanded ? 'Nhóm này đã giải tán.' : blockedMessage}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isDisbanded && onDeleteConversation && (
              <Button onClick={onDeleteConversation} variant="danger" size="sm">Xóa hội thoại</Button>
            )}
            {!isDisbanded && onManageBlock && isBlockedByMe && (
              <Button onClick={onManageBlock} size="sm">Quản lý chặn</Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 border-t border-border-light bg-bg-primary transition-theme pb-safe relative" style={{ zIndex: 'var(--z-sticky)' }}>
      {/* Giphy Picker Popover */}
      {showGiphy && (
        <div className="absolute bottom-full left-0 mb-2 ml-3 z-[var(--z-popover)]">
          <div className="fixed inset-0" onClick={() => setShowGiphy(false)} />
          <div className="relative">
            <GiphyPicker
              onSelect={(url) => {
                onSendGif?.(url, replyingTo?.id);
                setShowGiphy(false);
                onCancelAction();
              }}
              onClose={() => setShowGiphy(false)}
            />
          </div>
        </div>
      )}

      {/* File Previews */}
      <FilePreview files={selectedFiles} onRemove={removeFile} onPlayVoice={handlePlayVoice} playingIndex={playingPreview} isSending={isSending} />

      {/* Link Preview */}
      {!editingMessage && linkPreview.url && !linkPreview.isDismissed && (
        <div className="px-3 pt-2">
          <LinkPreviewCard url={linkPreview.url} previewData={linkPreview.isLoading ? undefined : linkPreview.previewData} onDismiss={linkPreview.dismiss} compact />
        </div>
      )}

      {/* Reply Or Edit Banner */}
      {(replyingTo || editingMessage) && (
        <div className="px-4 py-2 border-b border-border-light bg-bg-secondary/80 backdrop-blur-md flex items-center justify-between gap-3 animate-in slide-in-from-bottom-2 duration-300">
          <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0 border-l-4 border-primary pl-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              {editingMessage ? <Edit2 size={14} className="text-primary" /> : <Reply size={14} className="text-primary" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-bold text-primary leading-none mb-1">
                {editingMessage
                  ? 'Đang chỉnh sửa tin nhắn'
                  : replyingTo?.data.senderId === currentUserId ? 'Trả lời chính bạn' : `Trả lời ${usersMap[replyingTo?.data.senderId || '']?.fullName || ''}`
                }
              </p>
              <p className="text-[11px] text-text-secondary truncate opacity-80 italic">
                {editingMessage ? editingMessage.data.content : getMessageDisplayContent(replyingTo!.data)}
              </p>
            </div>
          </div>
          <IconButton onClick={onCancelAction} icon={<X size={14} />} size="sm" variant="ghost" className="flex-shrink-0 hover:bg-black/5 dark:hover:bg-white/5" />
        </div>
      )}

      {/* Input Row */}
      <form onSubmit={handleSubmit} className="relative flex items-end gap-2 px-3 py-2.5">
        {/* Mention Dropdown */}
        {showMentions && filteredParticipants.length > 0 && (
          <MentionList users={filteredParticipants} selectedIndex={mentionIndex} onSelect={onSelectMention} />
        )}

        <ActionsMenu
          isOpen={showActions}
          onToggle={() => setShowActions(!showActions)}
          onAction={(type) => {
            setShowActions(false);
            if (type === 'media') fileInputRef.current?.click();
            else if (type === 'voice') startRecording();
            else if (type === 'gif') setShowGiphy(true);
          }}
          disabled={disabled || isSending || isRecording}
        />

        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileSelect} />

        {isRecording ? (
          <RecordingUI duration={recordingDuration} onCancel={cancelRecording} onStop={stopRecording} />
        ) : (
          <TextArea
            ref={inputRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Nhập tin nhắn..."
            disabled={disabled || isSending}
            autoResize
            maxHeight={120}
            containerClassName="flex-1"
            className="rounded-xl bg-bg-secondary border-border-light"
            renderOverlay={renderMentionOverlay}
            rightElement={
              <div className="flex items-center">
                {inputText.length >= VALIDATION.MESSAGE_MAX_LENGTH * 0.8 && (
                  <span className={`text-[9px] font-bold mr-1 px-1 rounded ${inputText.length >= VALIDATION.MESSAGE_MAX_LENGTH ? 'text-error bg-error/10' : 'text-text-tertiary'}`}>
                    {inputText.length}/{VALIDATION.MESSAGE_MAX_LENGTH}
                  </span>
                )}
                <EmojiPicker
                  onEmojiSelect={(emoji) => insertTextAtCursor(inputRef, inputText, emoji, setInputText)}
                  disabled={disabled || isSending}
                  buttonClassName="p-1.5 text-text-tertiary hover:text-primary transition-colors"
                />
              </div>
            }
          />
        )}

        {/* Send Button */}
        <button
          type="submit"
          disabled={disabled || !!blockedMessage || (!inputText.trim() && selectedFiles.length === 0) || isSending}
          className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-colors duration-200 active:brightness-95 ${canSend ? 'btn-gradient text-white shadow-accent hover:brightness-110' : 'bg-bg-tertiary text-text-tertiary cursor-not-allowed'}`}
        >
          {isSending ? <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Send size={16} className={canSend ? 'fill-current' : ''} />}
        </button>
      </form>
    </div>
  );
};
