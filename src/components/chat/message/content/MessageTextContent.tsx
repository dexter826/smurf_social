import React from 'react';
import { parseTextWithMentions } from '../../../../utils/chatUtils';
import { extractFirstUrl } from '../../../../services/linkPreviewService';
import { LinkPreviewCard } from '../../../shared/LinkPreviewCard';

interface MessageTextContentProps {
  content: string;
  isMe: boolean;
  isEdited?: boolean;
}

/**
 * Thành phần hiển thị nội dung văn bản trong tin nhắn
 */
export const MessageTextContent: React.FC<MessageTextContentProps> = ({ content, isMe, isEdited }) => {
  if (!content) return null;
  
  const parts = parseTextWithMentions(content);

  const renderContent = () => {
    return parts.map((part, index) => {
      if (part.startsWith('@[') && part.endsWith(']')) {
        const match = part.match(/@\[([^:]+):([^\]]+)\]/);
        if (match) {
          const [, userId, name] = match;
          return (
            <a key={index} href={`/profile/${userId}`}
              className={`font-bold hover:underline transition-all duration-200 ${isMe ? 'text-black/90 dark:text-white/90' : 'text-primary'}`}
              onClick={(e) => e.stopPropagation()}
            >
              @{name}
            </a>
          );
        }
      }
      
      if (part.startsWith('@') && part.endsWith('\u200B')) {
        const name = part.slice(1, -1);
        return (
          <span key={index} className={`font-bold ${isMe ? 'text-black/90 dark:text-white/90' : 'text-primary'}`}>
            @{name}
          </span>
        );
      }
      
      if (/^(https?:\/\/|www\.)/.test(part)) {
        const href = part.startsWith('www.') ? `https://${part}` : part;
        return (
          <a key={index} href={href} target="_blank" rel="noopener noreferrer"
            className={`underline break-all transition-all duration-200 hover:opacity-80 ${isMe ? 'text-black/90 dark:text-white/90' : 'text-primary'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      
      return <span key={index}>{part}</span>;
    });
  };

  const firstUrl = extractFirstUrl(content);

  return (
    <div className="flex flex-col min-w-0 w-full">
      <div className="whitespace-pre-wrap break-words leading-snug">
        {renderContent()}
      </div>
      
      {isEdited && (
        <span className="text-[10px] opacity-60 mt-1 italic">(đã chỉnh sửa)</span>
      )}
      
      {firstUrl && (
        <LinkPreviewCard
          url={firstUrl}
          compact
          className="mt-2 shadow-sm border border-border-light/50"
        />
      )}
    </div>
  );
};
