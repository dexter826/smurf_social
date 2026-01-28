import React, { useState, useRef, useEffect } from 'react';
import EmojiPickerReact, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Smile } from 'lucide-react';
import { IconButton } from './IconButton';
import { useThemeStore } from '../../store/themeStore';

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
  size = 16
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { mode } = useThemeStore();

  // Đóng khi click ngoài
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
    // Không đóng sau khi chọn để có thể chọn nhiều
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <IconButton
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={buttonClassName}
        title="Emoji"
        icon={<Smile size={size} />}
        size="sm"
      />

      {isOpen && (
        <div className="absolute bottom-full right-0 mb-2 z-50">
          <EmojiPickerReact
            onEmojiClick={handleEmojiClick}
            autoFocusSearch={false}
            theme={mode === 'dark' ? Theme.DARK : Theme.LIGHT}
            lazyLoadEmojis={true}
            searchPlaceholder="Tìm kiếm emoji..."
          />
        </div>
      )}
    </div>
  );
};
