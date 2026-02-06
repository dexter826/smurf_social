import React, { useState, useRef, useEffect } from 'react';
import { Image as ImageIcon, Paperclip, Send, Smile, X, Video, Mic, Square, Trash2, Play, Pause, Plus, MoreHorizontal, Camera, Reply, Edit2 } from 'lucide-react';
import { EmojiPicker, Loading, Button, IconButton, TextArea, CircularProgressOverlay } from '../ui';
import { MentionList } from './MentionList';
import { toast } from '../../store/toastStore';
import { FILE_LIMITS } from '../../constants/fileConfig';
import { validateFileSize } from '../../utils/fileUtils';
import { Message, User } from '../../types';


interface ChatInputProps {
  onSendText: (text: string, mentions?: string[]) => void;
  onSendImage: (file: File) => void;
  onSendFile: (file: File) => void;
  onSendVideo?: (file: File) => void;
  onSendVoice?: (file: File) => void;
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
  blockedMessage?: string;
  replyingTo?: any;
  editingMessage: Message | null;
  onCancelAction: () => void;
  onEditMessage?: (text: string) => Promise<void>;
  currentUserId: string;
  usersMap: Record<string, User>;
  participants?: User[];
  isGroup?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendText,
  onSendImage,
  onSendFile,
  onSendVideo,
  onSendVoice,
  onTyping,
  disabled = false,
  blockedMessage,
  replyingTo,
  editingMessage,
  onCancelAction,
  onEditMessage,
  currentUserId,
  usersMap,
  participants = [],
  isGroup = false
}) => {
  const [inputText, setInputText] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<{ file: File; preview?: string; type: 'image' | 'video' | 'file' | 'voice' }[]>([]);
  const [isSending, setIsSending] = useState(false);
  
  // State xử lý tag
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionStartPos, setMentionStartPos] = useState(-1);
  
  // State ghi âm
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isStartingRecording, setIsStartingRecording] = useState(false);
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

  useEffect(() => {
    if (!isSending && !disabled) {
      inputRef.current?.focus();
    }
    
    if (editingMessage) {
      setInputText(editingMessage.content);
    }
  }, [editingMessage, isSending, disabled]);

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
    if (isStartingRecording || isRecording) return;
    setIsStartingRecording(true);
    
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
        
        const url = URL.createObjectURL(audioFile);
        setSelectedFiles(prev => {
          prev.forEach(f => {
            if (f.type === 'voice' && f.preview) URL.revokeObjectURL(f.preview);
          });
          const filtered = prev.filter(f => f.type !== 'voice');
          return [...filtered, { file: audioFile, preview: url, type: 'voice' }];
        });
        
        // Stop tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsStartingRecording(false);
      setRecordingTime(0);

      // Start timer
      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error("Error accessing microphone:", error);
      setIsStartingRecording(false);
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
    const text = e.target.value;
    setInputText(text);
    
    // Typing indicator
    onTyping(true);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 1000);

    // Chỉ bật tính năng tag trong nhóm
    if (!isGroup) return;

    const selectionStart = e.target.selectionStart;
    const textBeforeCursor = text.slice(0, selectionStart);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');

    if (lastAtPos !== -1) {
      const query = textBeforeCursor.slice(lastAtPos + 1);
      // Chặn nếu query chứa xuống dòng
      if (!query.includes('\n')) {
        setMentionStartPos(lastAtPos);
        setMentionQuery(query);
        setShowMentions(true);
        setMentionIndex(0);
        return;
      }
    }
    setShowMentions(false);
  };

  const filteredParticipants = participants
    .filter(p => p.id !== currentUserId)
    .filter(p => p.name.toLowerCase().includes(mentionQuery.toLowerCase()));

  const handleSelectMention = (user: User) => {
    if (mentionStartPos === -1) return;
    
    const before = inputText.slice(0, mentionStartPos);
    // Xóa phần query vừa nhập sau @
    const afterCursor = inputRef.current?.selectionStart || mentionStartPos + 1;
    const after = inputText.slice(afterCursor);
    
    // Chèn format @[User]
    const mentionText = `@[${user.name}] `;
    const newText = before + mentionText + after;
    
    setInputText(newText);
    setShowMentions(false);
    
    // Đợi render xong để set con trỏ
    requestAnimationFrame(() => {
      if (inputRef.current) {
        const newPos = before.length + mentionText.length;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newPos, newPos);
      }
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'file' | 'camera') => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length === 0) return;

    // Giới hạn số lượng file
    if (selectedFiles.length + files.length > FILE_LIMITS.CHAT_MAX_FILES) {
      toast.error(`Chỉ được gửi tối đa ${FILE_LIMITS.CHAT_MAX_FILES} file cùng lúc.`);
      return;
    }

    const newFiles: { file: File; preview?: string; type: 'image' | 'video' | 'file' | 'voice' }[] = [];

    files.forEach(file => {
      // Validate theo loại file
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
      // Tạm dừng
      if (audioRef.current) {
        audioRef.current.pause();
        setPlayingPreview(null);
      }
    } else {
      // Dừng file đang phát
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // Phát file mới
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

  const handleCancelAction = () => {
    if (editingMessage) {
      setInputText('');
    }
    onCancelAction();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (disabled || isSending) return;
    
    if (!inputText.trim() && selectedFiles.length === 0) return;

    setIsSending(true);
    onTyping(false);

    try {
      // Gửi danh sách file
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

      // Xử lý gửi text
      if (inputText.trim()) {
        if (editingMessage) {
          await onEditMessage?.(inputText.trim());
        } else {
          // Lọc danh sách user được tag
          const mentionRegex = /@\[([^\]]+)\]/g;
          const mentions: string[] = [];
          let match;
          while ((match = mentionRegex.exec(inputText.trim())) !== null) {
             const name = match[1];
             const user = participants.find(p => p.name === name);
             if (user) mentions.push(user.id);
          }
          const uniqueMentions = [...new Set(mentions)];
          
          await onSendText(inputText.trim(), uniqueMentions.length > 0 ? uniqueMentions : undefined);
        }
        setInputText('');
      }

      handleCancelAction();

    } catch (error) {
      console.error("Lỗi gửi tin nhắn", error);
      toast.error('Không thể gửi tin nhắn. Vui lòng thử lại.');
    } finally {
      setIsSending(false);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentions && filteredParticipants.length > 0) {
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex(prev => (prev > 0 ? prev - 1 : filteredParticipants.length - 1));
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex(prev => (prev < filteredParticipants.length - 1 ? prev + 1 : 0));
        return;
      }
    }

    if (e.key === 'Backspace') {
      const cursor = e.currentTarget.selectionStart;
      const text = e.currentTarget.value;
      const beforeCursor = text.slice(0, cursor);

      // Kiểm tra nếu đang xóa thẻ tag
      const mentionMatch = beforeCursor.match(/@\[[^\]]+\] ?$/);

      if (mentionMatch) {
        e.preventDefault(); // Chặn xóa ký tự đơn
        
        const deleteLength = mentionMatch[0].length;
        // Cắt bỏ cả block tag
        const newText = text.substring(0, cursor - deleteLength) + text.substring(cursor);
        
        // Cập nhật state
        setInputText(newText);
        
        // Set lại vị trí con trỏ
        requestAnimationFrame(() => {
          if (inputRef.current) {
            const newCursorPos = cursor - deleteLength;
            inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
          }
        });
        return;
      }
    }

    if (showMentions && filteredParticipants.length > 0) {
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        handleSelectMention(filteredParticipants[mentionIndex]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowMentions(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Thông báo nếu bị chặn chat
  if (blockedMessage) {
    return (
      <div className="flex-shrink-0 border-t border-border-light bg-bg-primary transition-theme pb-safe z-30">
        <div className="flex items-center justify-center px-4 py-4 text-text-tertiary text-sm">
          <span>{blockedMessage}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-shrink-0 border-t border-border-light bg-bg-primary transition-theme pb-safe z-30 relative">
      {/* Danh sách file chờ gửi */}
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
                  className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white opacity-0 group-hover:opacity-100 z-20"
                  icon={<X size={14} />}
                  size="sm"
                />
                
                {/* Progress overlay khi đang gửi */}
                <CircularProgressOverlay
                  isVisible={isSending}
                  progress={75}
                  size={32}
                  showPercentage={false}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Giao diện đang trả lời/sửa */}
      {(replyingTo || editingMessage) && (
        <div className="px-4 py-2 border-b border-border-light bg-bg-secondary flex items-center justify-between animate-in slide-in-from-bottom-1 duration-200">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="text-primary flex-shrink-0 bg-primary/10 p-2 rounded-lg">
              {editingMessage ? <Edit2 size={16} /> : <Reply size={16} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[12px] font-bold text-primary mb-0.5">
                {editingMessage 
                  ? 'Đang chỉnh sửa' 
                  : (replyingTo.senderId === currentUserId 
                    ? 'Trả lời chính bạn' 
                    : `Trả lời ${usersMap[replyingTo.senderId]?.name || ''}`)}
              </div>
              <div className="text-[13px] text-text-secondary truncate">
                {editingMessage ? editingMessage.content : (replyingTo.type === 'text' ? replyingTo.content : `[${replyingTo.type}]`)}
              </div>
            </div>
          </div>
          <IconButton
            onClick={handleCancelAction}
            icon={<X size={14} />}
            size="sm"
            variant="ghost"
          />
        </div>
      )}

      {/* Khu vực nhập liệu */}
      <form onSubmit={handleSubmit} className="relative flex items-center gap-2 px-4 py-3 bg-bg-primary">
        {showMentions && filteredParticipants.length > 0 && (
          <MentionList
            users={filteredParticipants}
            selectedIndex={mentionIndex}
            onSelect={handleSelectMention}
          />
        )}
        
        {/* Menu chức năng mở rộng */}
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
               />               <IconButton
                  type="button"
                  onClick={() => { startRecording(); setShowActions(false); }}
                  title="Ghi âm"
                  icon={<Mic size={16} />}
                  size="sm"
                  disabled={disabled || isSending || isRecording || isStartingRecording} 
               />             </div>
           )}
        </div>

        {/* Input ẩn dể chọn file */}
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


        {/* Nhập text hoặc ghi âm */}
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
              placeholder="Nhập tin nhắn..."
              disabled={disabled || isSending}
              autoResize
              maxHeight={120}
              containerClassName="flex-1"
              className="rounded-2xl"
              renderOverlay={(value) => {
                const parts = value.split(/(@\[[^\]]+\])/g);
                return (
                  <>
                    {parts.map((part, index) => {
                      if (part.startsWith('@[') && part.endsWith(']')) {
                        return (
                          <span key={index} className="text-primary bg-primary/10 rounded box-decoration-clone">
                            {part}
                          </span>
                        );
                      }
                      return <span key={index}>{part}</span>;
                    })}
                    {value.endsWith('\n') && <br />}
                  </>
                );
              }}
              rightElement={
                <div className="flex items-center gap-1">
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
          className={`w-10 h-10 shadow-md active:scale-90 rounded-full flex-shrink-0 ${(inputText.trim() || selectedFiles.length > 0) ? '' : 'opacity-40'}`}
          title="Gửi"
          icon={<Send size={18} className={inputText.trim() || selectedFiles.length > 0 ? 'fill-current' : ''} />}
        />
      </form>
    </div>
  );
};


