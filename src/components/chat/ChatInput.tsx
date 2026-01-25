import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Paperclip, Send, Smile, X } from 'lucide-react';

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
      alert('Không thể gửi tin nhắn. Vui lòng thử lại.');
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
    <div className="flex-shrink-0 border-t border-gray-200 bg-white">
      {/* File Preview */}
      {selectedFile && (
        <div className="px-4 pt-3 pb-2 border-b border-gray-200">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            {previewUrl ? (
              <img 
                src={previewUrl} 
                alt="preview" 
                className="w-16 h-16 object-cover rounded"
              />
            ) : (
              <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center">
                <Paperclip size={24} className="text-gray-500" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-gray-500">
                {(selectedFile.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button
              onClick={clearFileSelection}
              className="p-1 hover:bg-gray-200 rounded-full transition-colors"
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
            className="p-2 text-primary-600 hover:bg-primary-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="p-2 text-primary-600 hover:bg-primary-50 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
            className="w-full resize-none border border-gray-300 rounded-2xl px-4 py-2 pr-10 text-sm focus:outline-none focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed max-h-[120px]"
            rows={1}
          />
          <button
            type="button"
            className="absolute right-2 bottom-2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
            title="Emoji (Chưa hỗ trợ)"
          >
            <Smile size={20} />
          </button>
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={disabled || isSending || (!inputText.trim() && !selectedFile)}
          className="p-2 bg-primary-500 text-white rounded-full hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed mb-1"
          title="Gửi"
        >
          {isSending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send size={20} />
          )}
        </button>
      </form>
    </div>
  );
};
