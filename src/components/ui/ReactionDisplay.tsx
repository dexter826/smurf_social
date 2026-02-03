import React from 'react';

interface ReactionDisplayProps {
  reactions?: Record<string, string>;
  className?: string;
  onClick?: () => void;
}

export const ReactionDisplay: React.FC<ReactionDisplayProps> = ({ reactions = {}, className = '', onClick }) => {
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
  
  return (
    <div 
      className={`flex items-center gap-0.5 px-1 py-[1px] bg-bg-secondary rounded-full ring-1 ring-border-light shadow-sm cursor-pointer select-none hover:bg-bg-hover hover:ring-primary hover:shadow-md transition-all duration-200 ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <div className="flex -space-x-1 mr-0.5">
        {sortedEmojis.map(emoji => (
          <span key={emoji} className="text-[11px] sm:text-xs">
            {emoji}
          </span>
        ))}
      </div>
      <span className="text-[9px] sm:text-[10px] text-text-secondary font-bold leading-none">
        {total}
      </span>
    </div>
  );
};
