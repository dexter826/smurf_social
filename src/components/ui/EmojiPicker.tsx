import React, { useState, useRef, useEffect } from 'react';
import EmojiPickerReact, { EmojiClickData, Theme } from 'emoji-picker-react';
import { Smile } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
  className?: string;
  buttonClassName?: string;
  disabled?: boolean;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ 
  onEmojiSelect, 
  className = '',
  buttonClassName = '',
  disabled = false
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
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className={`p-2 text-gray-500 hover:text-primary-500 transition-colors disabled:opacity-50 ${buttonClassName}`}
        title="Emoji"
      >
        <Smile 
          size={24} 
          className="text-yellow-500 group-hover:scale-110 transition-transform" 
        />
      </button>

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
