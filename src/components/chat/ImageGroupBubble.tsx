import React, { useState } from 'react';
import { Message, User } from '../../types';
import { formatTimeOnly } from '../../utils/dateUtils';
import { UserAvatar, ImageViewer } from '../ui';

interface ImageGroupBubbleProps {
  messages: Message[];
  isMe: boolean;
  sender?: User;
  showAvatar: boolean;
  showName: boolean;
  currentUserId: string;
  onRecall?: (messageId: string) => void;
  onDeleteForMe?: (messageId: string) => void;
  onForward?: (message: Message) => void;
  onReply?: (message: Message) => void;
}

export const ImageGroupBubble: React.FC<ImageGroupBubbleProps> = ({
  messages,
  isMe,
  sender,
  showAvatar,
  showName
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);

  const validMessages = messages.filter(m => !m.isRecalled && !m.deletedBy?.includes(sender?.id || ''));



  if (validMessages.length === 0) return null;

  const lastMsg = validMessages[validMessages.length - 1];

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

      <div className={`flex flex-col max-w-[70%] min-w-0 ${isMe ? 'items-end' : 'items-start'}`}>
          {!isMe && showName && (
            <span className="text-[11px] text-text-secondary ml-1 mb-1 font-medium">
              {sender?.name}
            </span>
          )}
          
          <div className={`rounded-xl overflow-hidden grid gap-0.5 ${gridClass} border border-border-light shadow-sm bg-bg-secondary w-full max-w-[320px]`}>
             {renderImages()}
          </div>
          
          <div className="text-[10px] text-text-tertiary mt-1 flex items-center gap-1">
             {formatTimeOnly(lastMsg.timestamp)}
          </div>
      </div>

       {/* Shared Lightbox Viewer */}
       <ImageViewer
         images={validMessages.map(m => m.fileUrl || m.content)}
         initialIndex={selectedIndex}
         isOpen={selectedIndex !== -1}
         onClose={() => setSelectedIndex(-1)}
       />
    </div>
  );
};
