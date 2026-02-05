import React from 'react';

interface ReactionDisplayProps {
  reactions?: Record<string, string>;
  className?: string;
  onClick?: () => void;
  variant?: 'default' | 'minimal';
}

export const ReactionDisplay: React.FC<ReactionDisplayProps> = ({ 
  reactions = {}, 
  className = '', 
  onClick,
  variant = 'default'
}) => {
  const reactionCounts = Object.values(reactions).reduce((acc: Record<string, number>, emoji: string) => {
    acc[emoji] = (acc[emoji] || 0) + 1;
    return acc;
  }, {});

  const sortedEmojis = Object.entries(reactionCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([emoji]) => emoji)
    .slice(0, 3);

  const total = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

  if (total === 0) return null;
  
  const isMinimal = variant === 'minimal';
  
  return (
    <div 
      className={`flex items-center gap-1 select-none transition-all duration-200 ${
        isMinimal 
          ? 'cursor-default' 
          : 'px-1 py-[1px] bg-bg-secondary rounded-full ring-1 ring-border-light shadow-sm cursor-pointer hover:bg-bg-hover hover:ring-primary hover:shadow-md'
      } ${className}`}
      onClick={(e) => {
        if (isMinimal) return;
        e.stopPropagation();
        onClick?.();
      }}
    >
      <div className={`flex items-center ${isMinimal ? 'gap-1' : '-space-x-1 mr-0.5'}`}>
        {sortedEmojis.map(emoji => (
          <span key={emoji} className={isMinimal ? 'text-sm sm:text-base flex items-center' : 'text-[11px] sm:text-xs flex items-center'}>
            {emoji}
          </span>
        ))}
      </div>
      <span className={`${isMinimal ? 'text-sm sm:text-[14px]' : 'text-[9px] sm:text-[10px]'} text-text-secondary font-bold flex items-center h-full translate-y-[0.5px]`}>
        {total}
      </span>
    </div>
  );
};
