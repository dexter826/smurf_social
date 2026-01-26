import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Paperclip, Send, Smile, X } from 'lucide-react';
import { EmojiPicker, Loading } from '../ui';
import { toast } from '../../store/toastStore';

interface ChatInputProps {
  onSendText: (text: string) => void;
  onSendImage: (file: File) => void;
  onSendFile: (file: File) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendText,
  onSendImage,
  onSendFile,
  onTyping,
  disabled = false
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    
    // Typing indicator
    onTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1000);
  };

  const handleFileSelect = (file: File, type: 'image' | 'file') => {
    setSelectedFile(file);
    
    if (type === 'image') {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const clearFileSelection = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (disabled || isSending) return;
    
    if (!inputText.trim() && !selectedFile) return;

    setIsSending(true);
    onTyping(false);

    try {
      // Gửi file nếu có
      if (selectedFile) {
        if (previewUrl) {
          await onSendImage(selectedFile);
        } else {
          await onSendFile(selectedFile);
        }
        clearFileSelection();
      }

      // Gửi text nếu có
      if (inputText.trim()) {
        await onSendText(inputText.trim());
        setInputText('');
      }

      // Focus lại input
      inputRef.current?.focus();
    } catch (error) {
      console.error("Lỗi gửi tin nhắn", error);
      toast.error('Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex-shrink-0 border-t border-border-light bg-bg-primary transition-theme">
      {/* File Preview */}
      {selectedFile && (
        <div className="px-4 pt-3 pb-2 border-b border-border-light">
          <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg">
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="preview" 
                className="w-16 h-16 object-cover rounded"
              />
            ) : (
              <div className="w-16 h-16 bg-secondary rounded flex items-center justify-center">
                <Paperclip size={24} className="text-text-secondary" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-text-secondary">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={clearFileSelection}
              className="p-1 hover:bg-bg-hover rounded-full transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
        {/* Attachments */}
        <div className="flex items-center gap-1 pb-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file, 'image');
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            disabled={disabled || isSending}
            className="p-2 text-primary hover:bg-primary-light rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Gửi ảnh"
          >
            <ImageIcon size={20} />
          </button>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileSelect(file, 'file');
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled || isSending}
            className="p-2 text-primary hover:bg-primary-light rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Gửi file"
          >
            <Paperclip size={20} />
          </button>
        </div>

        {/* Text Input */}
        <div className="flex-1 relative">
          <textarea
            ref={inputRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Aa"
            disabled={disabled || isSending}
            className="w-full resize-none border border-border-light rounded-2xl px-4 py-2 pr-10 text-sm focus:outline-none focus:border-primary disabled:bg-secondary disabled:cursor-not-allowed max-h-[120px] bg-bg-primary text-text-primary placeholder:text-text-tertiary transition-theme"
            rows={1}
          />
          <div className="absolute right-2 bottom-1.5">
            <EmojiPicker
              onEmojiSelect={(emoji) => {
                const start = inputRef.current?.selectionStart || 0;
                const end = inputRef.current?.selectionEnd || 0;
                const newText = inputText.substring(0, start) + emoji + inputText.substring(end);
                setInputText(newText);
                
                // Đặt lại con trỏ sau emoji
                setTimeout(() => {
                  if (inputRef.current) {
                    const newPos = start + emoji.length;
                    inputRef.current.focus();
                    inputRef.current.setSelectionRange(newPos, newPos);
                  }
                }, 0);
              }}
              disabled={disabled || isSending}
            />
          </div>
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={disabled || isSending || (!inputText.trim() && !selectedFile)}
          className="p-2 bg-primary text-white rounded-full hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-1"
          title="Gửi"
        >
          {isSending ? (
            <Loading size={20} color="text-white" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </form>
    </div>
  );
};
