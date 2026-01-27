import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Paperclip, Send, Smile, X, Video, Mic, Square, Trash2, Play, Pause, Plus, MoreHorizontal } from 'lucide-react';
import { EmojiPicker, Loading } from '../ui';
import { toast } from '../../store/toastStore';

interface ChatInputProps {
  onSendText: (text: string) => void;
  onSendImage: (file: File) => void;
  onSendFile: (file: File) => void;
  onSendVideo?: (file: File) => void;
  onSendVoice?: (file: File) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendText,
  onSendImage,
  onSendFile,
  onSendVideo,
  onSendVoice,
  onTyping,
  disabled = false
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
  
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Auto-resize textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [inputText]);

  useEffect(() => {
    // Focus vào input khi component mount
    inputRef.current?.focus();
  }, []);

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'file') => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    // Validate limit
    if (selectedFiles.length + files.length > 10) {
      toast.error('Chỉ được gửi tối đa 10 file cùng lúc.');
      return;
    }

    const newFiles: { file: File; preview?: string; type: 'image' | 'video' | 'file' | 'voice' }[] = [];

    files.forEach(file => {
      // Validate file size
      let maxSize = 20 * 1024 * 1024;
      let errorMsg = 'File quá lớn. Giới hạn 20MB.';

      if (type === 'image') {
        maxSize = 5 * 1024 * 1024;
        errorMsg = 'Ảnh quá lớn. Giới hạn 5MB.';
      } else if (type === 'video') {
        maxSize = 50 * 1024 * 1024;
        errorMsg = 'Video quá lớn. Giới hạn 50MB.';
      }

      if (file.size > maxSize) {
        toast.error(`${file.name}: ${errorMsg}`);
        return;
      }

      let preview: string | undefined;
      if (type === 'image' || type === 'video') {
        preview = URL.createObjectURL(file);
      }

      newFiles.push({ file, preview, type });
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
                
                <button
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-3 bg-bg-primary">
        {/* More Actions Menu */}
        <div className="relative">
           <button 
             type="button"
             onClick={() => setShowActions(!showActions)}
             className={`p-2 rounded-full transition-all ${showActions ? 'bg-primary text-white rotate-45' : 'text-primary hover:bg-primary-light'}`}
           >
             <Plus size={24} />
           </button>

           {/* Popover Menu */}
           {showActions && (
             <div className="absolute bottom-full left-0 mb-2 flex items-center gap-2 p-2 bg-bg-secondary rounded-xl shadow-lg border border-border-light animate-fade-in z-50">
               <button
                  type="button"
                  onClick={() => { imageInputRef.current?.click(); setShowActions(false); }}
                  className="p-2 text-text-secondary hover:text-primary hover:bg-primary-light rounded-full transition-all flex items-center gap-2"
                  title="Gửi ảnh"
               >
                 <ImageIcon size={20} />
               </button>
               <button
                  type="button"
                  onClick={() => { videoInputRef.current?.click(); setShowActions(false); }}
                  className="p-2 text-text-secondary hover:text-primary hover:bg-primary-light rounded-full transition-all flex items-center gap-2"
                  title="Gửi video"
               >
                 <Video size={20} />
               </button>
               <button
                  type="button"
                  onClick={() => { fileInputRef.current?.click(); setShowActions(false); }}
                  className="p-2 text-text-secondary hover:text-primary hover:bg-primary-light rounded-full transition-all flex items-center gap-2"
                  title="Gửi file"
               >
                 <Paperclip size={20} />
               </button>
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
                 <button 
                    type="button"
                    onClick={cancelRecording}
                    className="p-1 hover:bg-bg-hover rounded-full text-text-secondary text-sm"
                 >
                    Hủy
                 </button>
                 <button
                    type="button"
                    onClick={stopRecording}
                    className="p-1.5 bg-primary text-white rounded-full hover:bg-primary-hover"
                 >
                    <Square size={16} fill="currentColor" />
                 </button>
              </div>
           </div>
        ) : (
           <div className="flex-1 relative flex bg-bg-secondary rounded-2xl border border-border-light focus-within:border-primary transition-all">
            <textarea
              ref={inputRef}
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Aa"
              disabled={disabled || isSending}
              className="w-full resize-none bg-transparent pl-4 pr-20 py-3 text-[15px] leading-relaxed focus:outline-none disabled:cursor-not-allowed max-h-[120px] text-text-primary placeholder:text-text-tertiary scrollbar-none overflow-y-auto"
              rows={1}
              style={{ 
                overflowY: inputText.split('\n').length > 5 ? 'auto' : 'hidden',
                scrollbarWidth: 'none'
              }}
            />
            <div className="absolute right-2 bottom-1.5 flex items-center gap-1">
              {/* Voice Button inside Input */}
              <button
                 type="button"
                 onClick={startRecording}
                 disabled={disabled || isSending || isRecording}
                 className="p-1.5 text-text-secondary hover:text-primary rounded-full transition-all disabled:opacity-30"
                 title="Ghi âm"
              >
                <Mic size={22} />
              </button>

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
                buttonClassName="p-1.5"
              />
            </div>
          </div>
        )}

        {/* Send Button */}
        <button
          type="submit"
          disabled={disabled || isSending || (!inputText.trim() && selectedFiles.length === 0)}
          className={`
            p-2.5 rounded-full transition-all
            ${(inputText.trim() || selectedFiles.length > 0) && !isSending
              ? 'bg-primary text-white shadow-md hover:bg-primary-hover active:scale-95' 
              : 'bg-secondary text-text-tertiary opacity-50 cursor-not-allowed'}
          `}
          title="Gửi"
        >
          {isSending ? (
            <Loading size={20} color="text-white" />
          ) : (
            <Send size={20} className={inputText.trim() || selectedFiles.length > 0 ? 'fill-current' : ''} />
          )}
        </button>
      </form>
    </div>
  );
};
