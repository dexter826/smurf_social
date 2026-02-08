import React from 'react';
import { FileText, Download, Image as ImageIcon, Play, Pause, Mic } from 'lucide-react';

import { Message } from '../../../types';
import { LazyVideo } from '../../ui';

interface MessageContentProps {
  message: Message;
  isMe: boolean;
  uploadProgress: Record<string, { progress: number; error?: boolean }>;
  isPlaying: boolean;
  onToggleVoice: (e: React.MouseEvent) => void;
  setShowFullImage: (show: boolean) => void;
}

export const MessageContent: React.FC<MessageContentProps> = ({
  message,
  isMe,
  uploadProgress,
  isPlaying,
  onToggleVoice,
  setShowFullImage,
}) => {
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
        <div 
          className="rounded-lg overflow-hidden max-w-[280px] cursor-pointer group relative"
          onClick={() => setShowFullImage(true)}
        >
          <img 
            src={message.fileUrl || message.content} 
            alt="sent" 
            className="w-full h-auto"
          />
          {isMe && uploadProgress[message.id] && (
             <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4">
                <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden mb-2">
                   <div 
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${uploadProgress[message.id].progress}%` }}
                   />
                </div>
                <span className="text-[10px] text-white font-medium">
                  {uploadProgress[message.id].error ? 'Lỗi tải lên' : `Đang tải ${Math.round(uploadProgress[message.id].progress)}%`}
                </span>
             </div>
          )}
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
          {isMe && uploadProgress[message.id] && (
             <div className="absolute inset-0 bg-bg-primary/80 flex flex-col items-center justify-center p-2 rounded-lg">
                <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden mb-1">
                   <div 
                      className="bg-primary h-full transition-all duration-300"
                      style={{ width: `${uploadProgress[message.id].progress}%` }}
                   />
                </div>
                <span className="text-[10px] text-text-secondary">
                  {uploadProgress[message.id].error ? 'Lỗi' : `${Math.round(uploadProgress[message.id].progress)}%`}
                </span>
             </div>
          )}
        </div>
      );
      
    case 'sticker':
      return (
        <img src={message.content} alt="sticker" className="w-24 h-24 object-contain" />
      );
      
    case 'video':
      const videoUrl = message.fileUrl || message.content;
      return (
        <div className="rounded-lg overflow-hidden max-w-[300px] border border-border-light shadow-sm">
          <LazyVideo 
            src={videoUrl} 
            thumbnail={message.videoThumbnails?.[videoUrl]}
            className="w-full h-auto max-h-[400px] object-contain"
          />
        </div>
      );

    case 'voice':
      return (
        <div 
          className={`flex items-center gap-3 p-3 rounded-2xl min-w-[200px] cursor-pointer transition-all active:scale-95 ${
            isMe 
              ? 'bg-bg-message-sent text-text-on-primary shadow-md' 
              : 'bg-bg-message-received text-text-primary border border-border-light'
          }`}
          onClick={onToggleVoice}
        >
          <div className={`p-2.5 rounded-full shadow-sm transition-colors ${
            isMe ? 'bg-bg-primary text-primary' : 'bg-primary text-white'
          }`}>
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} className="ml-0.5" fill="currentColor" />}
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-bold mb-0.5">Tin nhắn thoại</div>
            <div className={`flex items-center gap-1.5 opacity-80 ${isMe ? 'text-text-on-primary' : 'text-text-tertiary'}`}>
              <Mic size={12} />
              <span className="text-[11px]">Click để nghe</span>
            </div>
          </div>
        </div>
      );
      
    default:
      const renderTextWithMentions = (text: string) => {
        const combinedRegex = /(@\[[^\]]+\]|(?:https?:\/\/|www\.)[^\s]+)/g;
        const parts = text.split(combinedRegex);
        
        return parts.map((part, index) => {
          if (part.startsWith('@[') && part.endsWith(']')) {
            const name = part.slice(2, -1);
            return (
              <span key={index} className={`font-bold ${isMe ? 'text-white' : 'text-primary'}`}>
                @{name}
              </span>
            );
          }
          
          if (/^(https?:\/\/|www\.)/.test(part)) {
            const href = part.startsWith('www.') ? `https://${part}` : part;
            return (
              <a 
                key={index} 
                href={href} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={`underline break-all transition-opacity hover:opacity-80 ${isMe ? 'text-blue-200' : 'text-primary'}`}
                onClick={(e) => e.stopPropagation()}
              >
                {part}
              </a>
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
