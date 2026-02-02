import React from 'react';

interface ReactionDisplayProps {
  reactions?: Record<string, string>;
  className?: string;
  onClick?: () => void;
}

export const ReactionDisplay: React.FC<ReactionDisplayProps> = ({ reactions = {}, className = '', onClick }) => {
  const reactionCounts = Object.values(reactions).reduce((acc, emoji) => {
    acc[emoji] = (acc[emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedEmojis = Object.entries(reactionCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([emoji]) => emoji)
    .slice(0, 3);

  const total = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

  if (total === 0) return null;

  return (
    <div 
      className={`flex items-center gap-1.5 cursor-pointer select-none ${className}`}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <div className="flex -space-x-1">
        {sortedEmojis.map(emoji => (
          <div key={emoji} className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center bg-bg-secondary rounded-full ring-2 ring-bg-primary text-[10px] sm:text-xs relative z-0 shadow-sm">
            {emoji}
          </div>
        ))}
      </div>
      <span className="text-xs sm:text-sm text-text-secondary hover:underline font-medium">
        {total}
      </span>
    </div>
  );
};
