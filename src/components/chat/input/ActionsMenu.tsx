import React from 'react';
import { Image as ImageIcon, Camera, Paperclip, Mic, Plus } from 'lucide-react';
import { IconButton } from '../../ui';

interface ActionsMenuProps {
  isOpen: boolean;
  onToggle: () => void;
  onAction: (type: 'image' | 'camera' | 'file' | 'voice') => void;
  disabled?: boolean;
}

export const ActionsMenu: React.FC<ActionsMenuProps> = ({
  isOpen,
  onToggle,
  onAction,
  disabled
}) => {
  return (
    <div className="relative">
      <IconButton
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={`transition-all ${isOpen ? 'rotate-45' : ''}`}
        variant={isOpen ? 'primary' : 'default'}
        icon={<Plus size={18} />}
        size="md"
        disabled={disabled}
      />

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 flex items-center gap-2 p-2 bg-bg-secondary rounded-xl shadow-lg border border-border-light animate-fade-in z-50">
          <IconButton
            type="button"
            onClick={() => onAction('image')}
            title="Hình ảnh & Video"
            icon={<ImageIcon size={16} />}
            size="sm"
          />
          <IconButton
            type="button"
            onClick={() => onAction('camera')}
            title="Chụp ảnh/Quay phim"
            icon={<Camera size={16} />}
            size="sm"
          />
          <IconButton
            type="button"
            onClick={() => onAction('file')}
            title="Gửi file"
            icon={<Paperclip size={16} />}
            size="sm"
          />
          <IconButton
            type="button"
            onClick={() => onAction('voice')}
            title="Ghi âm"
            icon={<Mic size={16} />}
            size="sm"
            disabled={disabled}
          />
        </div>
      )}
    </div>
  );
};
