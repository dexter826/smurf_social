import React from 'react';
import { Ban } from 'lucide-react';
import { REACTIONS } from '../../constants';

interface ReactionSelectorProps {
  onSelect: (emoji: string) => void;
  onClose?: () => void;
  className?: string;
  currentReaction?: string | null;
}

const ReactionSelectorInner: React.FC<ReactionSelectorProps> = ({ onSelect, onClose, className = '', currentReaction }) => {
  return (
    <div
      className={`absolute z-[var(--z-dropdown)] bg-bg-primary border border-divider rounded-full shadow-lg p-1.5 flex gap-1 animate-in fade-in zoom-in duration-base after:content-[''] after:absolute after:left-0 after:-bottom-4 after:w-full after:h-4 after:bg-transparent ${className}`}
      onMouseLeave={onClose}
    >
      {currentReaction && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSelect('REMOVE');
            onClose?.();
          }}
          className="w-9 h-9 flex items-center justify-center text-text-secondary hover:text-error hover:bg-bg-hover active:bg-bg-active transition-all duration-base relative group rounded-full"
          title="Gỡ cảm xúc"
        >
          <Ban size={20} />
        </button>
      )}
      {REACTIONS.map((emoji) => (
        <button
          key={emoji}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(emoji);
            onClose?.();
          }}
          className="w-9 h-9 flex items-center justify-center text-2xl hover:bg-bg-hover active:bg-bg-active transition-all duration-base relative group rounded-full"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

export const ReactionSelector = React.memo(ReactionSelectorInner);