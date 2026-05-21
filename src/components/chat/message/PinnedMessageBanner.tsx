import React, { useState, useMemo, useEffect } from 'react';
import { Pin, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { RtdbMessage } from '../../../../shared/types';
import { getMessageDisplayContent } from '../../../utils/chatUtils';

interface PinnedMessageBannerProps {
  pinnedMessages: Record<string, { pinnedBy: string; pinnedAt: number }>;
  pinnedMessagesDetails: Record<string, RtdbMessage>;
  currentUserId: string;
  onUnpin: (messageId: string) => void;
  onGoToMessage: (messageId: string) => void;
}

/** Banner hiển thị các tin nhắn được ghim ở đầu hộp thoại */
export const PinnedMessageBanner: React.FC<PinnedMessageBannerProps> = ({
  pinnedMessages,
  pinnedMessagesDetails,
  currentUserId,
  onUnpin,
  onGoToMessage
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const activePins = useMemo(() => {
    return Object.entries(pinnedMessages)
      .map(([id, meta]) => ({
        id,
        meta,
        details: pinnedMessagesDetails[id]
      }))
      .filter(({ details }) => {
        if (!details) return false;
        if (details.isRecalled) return false;
        if (details.deletedBy?.[currentUserId]) return false;
        return true;
      })
      .sort((a, b) => a.meta.pinnedAt - b.meta.pinnedAt);
  }, [pinnedMessages, pinnedMessagesDetails, currentUserId]);

  useEffect(() => {
    if (currentIndex >= activePins.length) {
      setCurrentIndex(Math.max(0, activePins.length - 1));
    }
  }, [activePins.length, currentIndex]);

  if (activePins.length === 0) return null;

  const activeIndex = currentIndex >= activePins.length ? 0 : currentIndex;
  const currentPin = activePins[activeIndex];
  const { id: msgId, details } = currentPin;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev === 0 ? activePins.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev === activePins.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="flex items-center justify-between px-3 md:px-4 h-10 bg-bg-primary border-b border-border-light transition-theme z-20">
      <div 
        className="flex items-center gap-2 min-w-0 flex-1 cursor-pointer hover:opacity-85 active:opacity-75 transition-opacity"
        onClick={() => onGoToMessage(msgId)}
      >
        <Pin size={13} className="text-error flex-shrink-0" />
        
        {activePins.length > 1 && (
          <span className="text-[10px] text-text-tertiary bg-bg-tertiary px-1.5 py-0.5 rounded font-medium select-none flex-shrink-0">
            {activeIndex + 1}/{activePins.length}
          </span>
        )}

        <span className="text-xs text-text-secondary truncate pr-4">
          {getMessageDisplayContent(details)}
        </span>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {activePins.length > 1 && (
          <div className="flex items-center gap-0.5 border-r border-border-light pr-1.5 mr-0.5">
            <button
              onClick={handlePrev}
              className="p-1 text-text-tertiary hover:bg-bg-hover hover:text-text-primary rounded transition-colors"
              title="Tin nhắn ghim trước"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={handleNext}
              className="p-1 text-text-tertiary hover:bg-bg-hover hover:text-text-primary rounded transition-colors"
              title="Tin nhắn ghim tiếp theo"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onUnpin(msgId);
          }}
          className="p-1 text-text-tertiary hover:bg-bg-hover hover:text-error rounded transition-colors"
          title="Bỏ ghim tin nhắn"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};
