import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Paperclip, Send, Smile, X, Video, Mic, Square, Trash2, Play, Pause, Plus, MoreHorizontal, Camera } from 'lucide-react';
import { EmojiPicker, Loading, Button, IconButton, TextArea } from '../ui';
import { toast } from '../../store/toastStore';
import { FILE_LIMITS } from '../../constants/fileConfig';
import { validateFileSize } from '../../utils/fileUtils';

interface ChatInputProps {
  onSendText: (text: string) => void;
  onSendImage: (file: File) => void;
  onSendFile: (file: File) => void;
  onSendVideo?: (file: File) => void;
  onSendVoice?: (file: File) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
  blockedMessage?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendText,
  onSendImage,
  onSendFile,
  onSendVideo,
  onSendVoice,
  onTyping,
  disabled = false,
  blockedMessage
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview?: string; type: 'image' | 'video' | 'file' | 'voice' }[]>([]);
  const [isSending, setIsSending] = useState(false);
  
  // Audio Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingPreview, setPlayingPreview] = useState<number | null>(null); // Index of playing audio
  const [showActions, setShowActions] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout>();

  // Tự động giãn dòng được xử lý bởi component TextArea

  useEffect(() => {
    // Focus vào input khi component mount
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActions(false);
      }
    };

    if (showActions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showActions]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      // Cleanup previews
      selectedFiles.forEach(f => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });

      // Cleanup recording resources
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
         mediaRecorderRef.current.stop();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [selectedFiles]);

  // ========== RECORDING LOGIC ==========

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice_message_${Date.now()}.webm`, { type: 'audio/webm' });
        
        // Add to selected files
        const url = URL.createObjectURL(audioFile);
        setSelectedFiles(prev => [...prev, { file: audioFile, preview: url, type: 'voice' }]);
        
        // Stop tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error("Lỗi truy cập micro", error);
      toast.error('Không thể truy cập Microphone. Vui lòng kiểm tra quyền truy cập.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Setup onstop to DO NOTHING (or just stop tracks) but here we just stop and clear chunks logic 
      // Actually simpler: remove onstop handler or handle logic flag.
      // But standard way: just stop, and don't add to selectedFiles.
      
      // Override onstop to just cleanup
      mediaRecorderRef.current.onstop = () => {
         mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // =====================================

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'file' | 'camera') => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    // Validate limit
    if (selectedFiles.length + files.length > FILE_LIMITS.CHAT_MAX_FILES) {
      toast.error(`Chỉ được gửi tối đa ${FILE_LIMITS.CHAT_MAX_FILES} file cùng lúc.`);
      return;
    }

    const newFiles: { file: File; preview?: string; type: 'image' | 'video' | 'file' | 'voice' }[] = [];

    files.forEach(file => {
      // Validate file size
      const limitType = (type === 'image' || type === 'camera') ? 'IMAGE' : type === 'video' ? 'VIDEO' : 'FILE';
      if (!validateFileSize(file, limitType)) return;

      let preview: string | undefined;
      const fileType = (type === 'camera' && file.type.startsWith('video')) ? 'video' : (type === 'camera' ? 'image' : type);
      
      if (fileType === 'image' || fileType === 'video') {
        preview = URL.createObjectURL(file);
      }

      newFiles.push({ file, preview, type: fileType as any });
    });

    setSelectedFiles(prev => [...prev, ...newFiles]);
    e.target.value = ''; // Reset input
  };

  const handlePlayPreview = (url: string, index: number) => {
    if (playingPreview === index) {
      // Pause
      if (audioRef.current) {
        audioRef.current.pause();
        setPlayingPreview(null);
      }
    } else {
      // Stop current if any
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // Play new
      const audio = new Audio(url);
      audio.onended = () => setPlayingPreview(null);
      audio.play().catch(e => toast.error('Không thể phát file âm thanh này'));
      audioRef.current = audio;
      setPlayingPreview(index);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      const removed = newFiles.splice(index, 1)[0];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return newFiles;
    });
  };

  const clearAllFiles = () => {
    selectedFiles.forEach(f => {
      if (f.preview) URL.revokeObjectURL(f.preview);
    });
    setSelectedFiles([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (disabled || isSending) return;
    
    if (!inputText.trim() && selectedFiles.length === 0) return;

    setIsSending(true);
    onTyping(false);

    try {
      // Gửi files
      for (const item of selectedFiles) {
        if (item.type === 'image') {
          await onSendImage(item.file);
        } else if (item.type === 'video') {
          await onSendVideo?.(item.file);
        } else if (item.type === 'voice') {
          await onSendVoice?.(item.file);
        } else {
          await onSendFile(item.file);
        }
      }
      clearAllFiles();

      // Gửi text nếu có
      if (inputText.trim()) {
        await onSendText(inputText.trim());
        setInputText('');
      }

    } catch (error) {
      console.error("Lỗi gửi tin nhắn", error);
      toast.error('Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setIsSending(false);
      // Đảm bảo input đã được enable trước khi focus
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Hiển thị thông báo khi bị chặn
  if (blockedMessage) {
    return (
      <div className="flex-shrink-0 border-t border-border-light bg-bg-primary transition-theme">
        <div className="flex items-center justify-center px-4 py-4 text-text-tertiary text-sm">
          <span>{blockedMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 border-t border-border-light bg-bg-primary transition-theme">
      {/* File Preview List */}
      {selectedFiles.length > 0 && (
        <div className="p-3 border-b border-border-light bg-bg-primary overflow-x-auto">
          <div className="flex gap-3">
            {selectedFiles.map((item, index) => (
              <div key={index} className="relative flex-shrink-0 group w-20 h-20 bg-bg-secondary rounded-lg border border-border-light overflow-hidden">
                {item.preview ? (
                  item.type === 'video' ? (
                     <div className="w-full h-full relative">
                        <video src={item.preview} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                           <Video size={20} className="text-white drop-shadow" />
                        </div>
                     </div>
                  ) : item.type === 'voice' ? (
                    <div className="w-full h-full bg-secondary flex flex-col items-center justify-center gap-1 group/audio cursor-pointer"
                         onClick={() => item.preview && handlePlayPreview(item.preview, index)}>
                       {playingPreview === index ? (
                         <div className="p-1.5 bg-primary text-white rounded-full">
                           <Pause size={16} fill="currentColor" />
                         </div>
                       ) : (
                         <div className="p-1.5 bg-secondary-hover text-primary rounded-full group-hover/audio:bg-primary group-hover/audio:text-white transition-colors">
                           <Play size={16} fill="currentColor" />
                         </div>
                       )}
                       <span className="text-[10px] text-text-secondary">Nghe lại</span>
                    </div>
                  ) : (
                    <img src={item.preview} alt="preview" className="w-full h-full object-cover" />
                  )
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-text-secondary p-1">
                    <Paperclip size={20} className="mb-1" />
                    <span className="text-[10px] truncate w-full text-center">
                      {item.file.name.split('.').pop()}
                    </span>
                  </div>
                )}
                
                <IconButton
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100"
                  icon={<X size={14} />}
                  size="sm"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 bg-bg-primary">
        {/* More Actions Menu */}
        <div className="relative" ref={actionsMenuRef}>

           <IconButton
             type="button"
             onClick={(e) => {
               e.stopPropagation();
               setShowActions(!showActions);
             }}
             className={`transition-all ${showActions ? 'rotate-45' : ''}`}
             variant={showActions ? 'primary' : 'default'}
             icon={<Plus size={18} />}
             size="md"
           />

           {/* Popover Menu */}
           {showActions && (
             <div
               className="absolute bottom-full left-0 mb-2 flex items-center gap-2 p-2 bg-bg-secondary rounded-xl shadow-lg border border-border-light animate-fade-in z-50"
             >
                <IconButton
                   type="button"
                   onClick={() => { imageInputRef.current?.click(); setShowActions(false); }}
                   title="Gửi ảnh"
                   icon={<ImageIcon size={16} />}
                   size="sm"
                />
                <IconButton
                   type="button"
                   onClick={() => { cameraInputRef.current?.click(); setShowActions(false); }}
                   title="Chụp ảnh/Quay phim"
                   icon={<Camera size={16} />}
                   size="sm"
                />
                <IconButton
                   type="button"
                   onClick={() => { videoInputRef.current?.click(); setShowActions(false); }}
                   title="Gửi video"
                   icon={<Video size={16} />}
                   size="sm"
                />
               <IconButton
                  type="button"
                  onClick={() => { fileInputRef.current?.click(); setShowActions(false); }}
                  title="Gửi file"
                  icon={<Paperclip size={16} />}
                  size="sm"
               />
             </div>
           )}
        </div>

        {/* Hidden Inputs */}
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e, 'image')}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e, 'video')}
          />
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e, 'file')}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*,video/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleFileSelect(e, 'camera')}
          />


        {/* Text Input */}
        {/* Text Input Container */}

        {/* Recording UI overlay or Text Input */}
        {isRecording ? (
           <div className="flex-1 flex items-center justify-between bg-bg-secondary rounded-2xl px-4 py-3 border border-primary animate-pulse-soft">
              <div className="flex items-center gap-2 text-primary font-medium">
                 <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                 <span>{formatTime(recordingTime)}</span>
              </div>
              <div className="flex items-center gap-2">
                  <Button 
                     variant="ghost"
                     size="sm"
                     type="button"
                     onClick={cancelRecording}
                     className="p-1 hover:bg-bg-hover text-text-secondary text-sm h-auto"
                  >
                     Hủy
                  </Button>
                  <Button
                     type="button"
                     variant="primary"
                     size="sm"
                     onClick={stopRecording}
                     className="rounded-full"
                     icon={<Square size={16} fill="currentColor" />}
                  />
              </div>
           </div>
        ) : (
           <TextArea
              ref={inputRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Aa"
              disabled={disabled || isSending}
              autoResize
              maxHeight={120}
              containerClassName="flex-1"
              className="rounded-2xl"
              style={{ 
                overflowY: inputText.split('\n').length > 5 ? 'auto' : 'hidden',
              }}
              rightElement={
                <div className="flex items-center gap-1">
                  <IconButton
                    type="button"
                    onClick={startRecording}
                    disabled={disabled || isSending || isRecording}
                    title="Ghi âm"
                    icon={<Mic size={16} />}
                    size="sm"
                  />
                  <EmojiPicker
                    onEmojiSelect={(emoji) => {
                      const start = inputRef.current?.selectionStart || 0;
                      const end = inputRef.current?.selectionEnd || 0;
                      const newText = inputText.substring(0, start) + emoji + inputText.substring(end);
                      setInputText(newText);
                      
                      setTimeout(() => {
                        if (inputRef.current) {
                          const newPos = start + emoji.length;
                          inputRef.current.focus();
                          inputRef.current.setSelectionRange(newPos, newPos);
                        }
                      }, 0);
                    }}
                    disabled={disabled || isSending}
                    buttonClassName="p-1.5 text-text-secondary hover:text-primary"
                  />
                </div>
              }
            />
        )}

        {/* Send Button */}
        <Button
          type="submit"
          disabled={disabled || (!inputText.trim() && selectedFiles.length === 0)}
          isLoading={isSending}
          variant={(inputText.trim() || selectedFiles.length > 0) ? 'primary' : 'secondary'}
          className={`w-10 h-10 shadow-sm active:scale-95 rounded-full ${(inputText.trim() || selectedFiles.length > 0) ? '' : 'opacity-50 cursor-not-allowed'}`}
          title="Gửi"
          icon={<Send size={20} className={inputText.trim() || selectedFiles.length > 0 ? 'fill-current' : ''} />}
        />
      </form>
    </div>
  );
};
