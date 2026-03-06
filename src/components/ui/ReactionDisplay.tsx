import React, { useMemo } from 'react';

interface ReactionDisplayProps {
  reactions?: Record<string, string>;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'minimal';
}

import { getReactionIcon } from '../chat/reactions/ReactionIcons';

const ReactionDisplayInner: React.FC<ReactionDisplayProps> = ({
  reactions = {},
  className = '',
  onClick,
  variant = 'default'
}) => {
  const { sortedEmojis, total } = useMemo(() => {
    const counts = Object.values(reactions).reduce((acc: Record<string, number>, emoji: string) => {
      acc[emoji] = (acc[emoji] || 0) + 1;
      return acc;
    }, {});

    const sorted = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([emoji]) => emoji)
      .slice(0, 3);

    const sum = Object.values(counts).reduce((a, b) => a + b, 0);
    return { sortedEmojis: sorted, total: sum };
  }, [reactions]);

  if (total === 0) return null;

  const isMinimal = variant === 'minimal';

  return (
    <div
      className={`flex items-center gap-1 select-none transition-all duration-base ${isMinimal
        ? (onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default')
        : 'px-1.5 py-1 min-h-[24px] bg-bg-secondary rounded-full border border-divider shadow-sm cursor-pointer hover:bg-bg-hover hover:border-primary/50 hover:shadow-md'
        } overflow-visible ${className}`}
      onClick={(e) => {
        if (!onClick) return;
        e.stopPropagation();
        onClick?.();
      }}
    >
      <div className={`flex items-center ${isMinimal ? '-space-x-1.5' : '-space-x-1'}`}>
        {sortedEmojis.map((emoji, index) => (
          <React.Fragment key={emoji}>
            <div 
              style={{ zIndex: 10 - index }} 
              className="flex-shrink-0 flex items-center justify-center overflow-visible"
            >
              {getReactionIcon(emoji, "overflow-visible", 16)}
            </div>
          </React.Fragment>
        ))}
      </div>
      <span className={`${isMinimal ? 'text-xs sm:text-[13px] ml-1.5' : 'text-[10px] sm:text-[11px]'} text-text-secondary font-bold flex items-center h-full`}>
        {total}
      </span>
    </div>
  );
};

export const ReactionDisplay = React.memo(ReactionDisplayInner);