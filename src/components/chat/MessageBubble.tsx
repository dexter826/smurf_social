import React, { useState } from 'react';
import { format } from 'date-fns';
import { FileText, Download, CheckCheck, Check, MoreVertical, Trash2, Image as ImageIcon } from 'lucide-react';
import { Message, User } from '../../types';
import { Avatar, UserAvatar, ConfirmDialog } from '../ui';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  sender?: User;
  showAvatar: boolean;
  showName: boolean;
  onDelete?: (messageId: string, fileUrl?: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  isMe, 
  sender, 
  showAvatar, 
  showName,
  onDelete
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isRead = message.readBy && message.readBy.length > 1;
  
  const renderContent = () => {
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
              <div className="font-medium truncate text-sm">{message.fileName || 'Document'}</div>
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
        
      default:
        return <div className="whitespace-pre-wrap break-words">{message.content}</div>;
    }
  };

  return (
    <>
      <div className={`flex w-full mb-1 group ${isMe ? 'justify-end' : 'justify-start gap-3'}`}>
        {/* Avatar for receiver */}
        {!isMe && (
          <div className="w-8 flex-shrink-0 flex items-end pb-1">
            {showAvatar && <UserAvatar userId={sender?.id!} src={sender?.avatar} size="sm" initialStatus={sender?.status} />}
          </div>
        )}

        <div className={`flex flex-col max-w-[75%] ${isMe ? 'items-end' : 'items-start'} relative`}>
          {/* Sender Name in Group */}
          {!isMe && showName && (
            <span className="text-[11px] text-text-secondary ml-1 mb-1 font-medium">
              {sender?.name}
            </span>
          )}

          <div className="relative group/message">
            {/* Bubble */}
            <div 
              className={`
                relative px-3 py-2 text-[15px] shadow-sm
                ${message.type === 'text' ? 'rounded-2xl' : 'rounded-lg bg-transparent shadow-none p-0'}
                ${isMe 
                  ? (message.type === 'text' ? 'bg-bg-message-sent text-text-on-primary rounded-br-sm' : '') 
                  : (message.type === 'text' ? 'bg-bg-message-received text-text-primary border border-border-light rounded-bl-sm' : '')
                }
              `}
            >
              {renderContent()}
              
              {/* Timestamp & Status for text messages */}
              {message.type === 'text' && (
                <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 ${
                  isMe ? 'text-white/80' : 'text-text-tertiary'
                }`}>
                  <span>{format(new Date(message.timestamp), 'HH:mm')}</span>
                  {isMe && (
                    isRead 
                      ? <CheckCheck size={14} className="text-link" />
                      : <Check size={14} />
                  )}
                </div>
              )}
            </div>

            {/* Menu cho tin nhắn */}
            {isMe && onDelete && (
              <div className="absolute top-0 right-full mr-2 opacity-0 group-hover/message:opacity-100 transition-opacity">
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="p-1 hover:bg-bg-hover rounded-full"
                >
                  <MoreVertical size={14} />
                </button>

                {showMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 top-8 z-20 bg-bg-primary border border-border-light rounded-lg shadow-dropdown py-1 w-32">
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(true);
                          setShowMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-bg-hover text-error flex items-center gap-2 transition-colors"
                      >
                        <Trash2 size={14} />
                        Xóa
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Timestamp for images/files */}
          {message.type !== 'text' && (
            <span className="text-[10px] text-text-tertiary mt-1">
              {format(new Date(message.timestamp), 'HH:mm')}
              {isMe && (
                <span className="ml-1">
                  {isRead 
                    ? <CheckCheck size={12} className="inline text-info" />
                    : <Check size={12} className="inline" />
                  }
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      {/* Full Image Modal */}
      {showFullImage && message.type === 'image' && (
        <div
          className="fixed inset-0 z-50 bg-bg-overlay flex items-center justify-center p-4"
          onClick={() => setShowFullImage(false)}
        >
          <img
            src={message.fileUrl || message.content}
            alt="full"
            className="max-w-full max-h-full object-contain"
          />
          <button
            className="absolute top-4 right-4 text-white text-2xl hover:text-text-tertiary"
            onClick={() => setShowFullImage(false)}
          >
            ×
          </button>
        </div>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => onDelete?.(message.id, message.fileUrl)}
        title="Xóa tin nhắn"
        message="Bạn có chắc chắn muốn xóa tin nhắn này? Hành động này không thể hoàn tác."
        confirmLabel="Xóa ngay"
        variant="danger"
      />
    </>
  );
};
