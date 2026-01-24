import React from 'react';
import { format } from 'date-fns';
import { FileText, Download, CheckCheck } from 'lucide-react';
import { Message, User } from '../../types';
import { Avatar } from '../ui';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  sender?: User;
  showAvatar: boolean;
  showName: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message, isMe, sender, showAvatar, showName }) => {
  
  const renderContent = () => {
    switch (message.type) {
        case 'image':
            return (
                <div className="rounded-lg overflow-hidden max-w-[280px]">
                    <img src={message.content} alt="sent" className="w-full h-auto" />
                </div>
            );
        case 'file':
            return (
                <div className="flex items-center gap-3 p-3 bg-white/10 rounded border border-current/20 min-w-[200px]">
                    <div className="bg-gray-100 p-2 rounded">
                        <FileText size={24} className="text-primary-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-sm">{message.fileName || 'Document'}</div>
                        <div className="text-xs opacity-70">{message.fileSize}</div>
                    </div>
                    <button className="p-1 hover:bg-black/10 rounded-full transition-colors">
                        <Download size={18} />
                    </button>
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
    <div className={`flex w-full mb-1 group ${isMe ? 'justify-end' : 'justify-start'}`}>
      
      {/* Avatar for receiver */}
      {!isMe && (
        <div className="w-[42px] flex-shrink-0 flex items-end pb-1 mr-2">
            {showAvatar && <Avatar src={sender?.avatar} size="sm" />}
        </div>
      )}

      <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
        
        {/* Sender Name in Group */}
        {!isMe && showName && (
             <span className="text-[11px] text-gray-500 ml-1 mb-1">{sender?.name}</span>
        )}

        {/* Bubble */}
        <div 
            className={`
                relative px-3 py-2 text-[15px] shadow-sm
                ${message.type === 'text' ? 'rounded-xl' : 'rounded-lg bg-transparent shadow-none p-0'}
                ${isMe 
                    ? (message.type === 'text' ? 'bg-primary-50 text-text-main border border-primary-100 rounded-tr-none' : '') 
                    : (message.type === 'text' ? 'bg-white text-text-main border border-gray-200 rounded-tl-none' : '')
                }
            `}
        >
            {renderContent()}
            
            {/* Timestamp & Status Overlay (for text) */}
             {message.type === 'text' && (
                <div className={`text-[10px] mt-1 flex items-center justify-end gap-1 opacity-60 select-none`}>
                    {format(new Date(message.timestamp), 'HH:mm')}
                </div>
             )}
        </div>

        {/* Reaction logic placeholder */}
        <div className="h-4"></div>
      </div>
    </div>
  );
};
