import React, { useState, useRef, useEffect } from 'react';
import EmojiPickerReact, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Smile } from 'lucide-react';
import { Button } from './Button';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
  size?: number;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ 
  onEmojiSelect, 
  className = '',
  buttonClassName = '',
  disabled = false,
  size = 22
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Đóng khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <Button
        type="button"
        variant="ghost"
        isIconOnly
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`p-1.5 text-text-tertiary hover:text-primary transition-colors disabled:opacity-50 h-auto w-auto ${buttonClassName}`}
        title="Emoji"
        icon={<Smile size={size} />}
      />

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 z-50">
          <EmojiPickerReact
            onEmojiClick={handleEmojiClick}
            autoFocusSearch={false}
            theme={Theme.LIGHT}
            lazyLoadEmojis={true}
            searchPlaceholder="Tìm kiếm emoji..."
          />
        </div>
      )}
    </div>
  );
};
