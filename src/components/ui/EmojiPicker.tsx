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
  buttonSize?: 'sm' | 'md' | 'lg';
  iconClassName?: string;
}

export const EmojiPicker: React.FC<EmojiPickerProps> = ({ 
  onEmojiSelect, 
  className = '',
  buttonClassName = '',
  disabled = false,
  size = 16,
  buttonSize = 'sm',
  iconClassName = ''
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
        icon={<Smile size={size} className={iconClassName} />}
        size={buttonSize}
      />

      {isOpen && (
        <>
          {/* Mobile Overlay */}
          <div 
            className="fixed inset-0 bg-black/50 z-[49] md:hidden" 
            onClick={() => setIsOpen(false)}
          />
          
          <div className="fixed bottom-0 left-0 right-0 z-[50] flex justify-center p-4 md:p-0 md:absolute md:bottom-full md:right-0 md:mb-2 md:left-auto md:w-auto">
            <div className="w-full max-w-[350px] md:w-auto shadow-2xl rounded-t-2xl md:rounded-lg overflow-hidden pb-safe md:pb-0 bg-bg-primary">
              <EmojiPickerReact
                onEmojiClick={handleEmojiClick}
                autoFocusSearch={false}
                theme={mode === 'dark' ? Theme.DARK : Theme.LIGHT}
                lazyLoadEmojis={true}
                searchPlaceholder="Tìm kiếm emoji..."
                width="100%"
                height={350}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
