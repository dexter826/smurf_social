import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useRtdbChatStore } from '../../store';
import { useAudioRecorder } from './useAudioRecorder';
import { useMentions } from './useMentions';
import { toast } from '../../store/toastStore';
import { TOAST_MESSAGES, FILE_LIMITS, TIME_LIMITS, VALIDATION } from '../../constants';
import { validateFile } from '../../utils';
import { formatMessageForSending } from '../../utils/chatUtils';
import { FilePreviewItem } from '../../components/chat/input/FilePreview';
import { User, RtdbMessage } from '../../../shared/types';

interface UseChatInputProps {
  conversationId?: string;
  editingMessage: { id: string; data: RtdbMessage } | null;
  replyingTo?: { id: string; data: RtdbMessage };
  onTyping: (isTyping: boolean) => void;
  disabled?: boolean;
  onSendText: (text: string, mentions?: string[], replyToId?: string) => void;
  onSendImages: (files: File[], options?: { content?: string; mentions?: string[]; replyToId?: string }) => Promise<void>;
  onSendFile: (file: File, replyToId?: string) => void;
  onSendVideo?: (file: File, replyToId?: string) => void;
  onSendVoice?: (file: File, replyToId?: string, duration?: number) => void;
  onEditMessage?: (text: string) => Promise<void>;
  onCancelAction: () => void;
  participants?: User[];
  currentUserId: string;
  isGroup?: boolean;
}

export const useChatInput = ({
  conversationId,
  editingMessage,
  replyingTo,
  onTyping,
  disabled,
  onSendText,
  onSendImages,
  onSendFile,
  onSendVideo,
  onSendVoice,
  onEditMessage,
  onCancelAction,
  participants = [],
  currentUserId,
  isGroup = false,
}: UseChatInputProps) => {
  const { saveDraft, clearDraft, draftMessages } = useRtdbChatStore();

  const [inputText, setInputText] = useState(() =>
    conversationId ? (draftMessages[conversationId] ?? '') : ''
  );
  const [activeMentions, setActiveMentions] = useState<{ id: string; name: string }[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FilePreviewItem[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const [showGiphy, setShowGiphy] = useState(false);
  const [playingPreview, setPlayingPreview] = useState<number | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const typingTimeoutRef = useRef<NodeJS.Timeout>(undefined);
  const draftTimeoutRef = useRef<NodeJS.Timeout>(undefined);
  const isCurrentlyTypingRef = useRef(false);

  const { isRecording, recordingDuration, startRecording, stopRecording, cancelRecording } =
    useAudioRecorder({
      onRecordingComplete: (blob, duration) => {
        const audioFile = new File([blob], `voice_message_${Date.now()}.webm`, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioFile);
        setSelectedFiles(prev => {
          prev.forEach(f => { if (f.type === 'voice' && f.preview) URL.revokeObjectURL(f.preview); });
          return [
            ...prev.filter(f => f.type !== 'voice'),
            { id: `voice-${Date.now()}`, file: audioFile, preview: url, type: 'voice', duration },
          ];
        });
      },
      onError: (err) => toast.error(err.message),
    });

  const mentionsProps = useMentions({ 
    inputText, setInputText, participants, currentUserId, isGroup, inputRef 
  });

  const onSelectMention = useCallback((user: User) => {
    const userSelected = mentionsProps.handleSelectMention(user);
    if (userSelected) {
      setActiveMentions(prev =>
        prev.find(m => m.id === userSelected.id)
          ? prev
          : [...prev, { id: userSelected.id, name: userSelected.fullName }]
      );
    }
  }, [mentionsProps.handleSelectMention]);

  useEffect(() => {
    if (editingMessage) {
      setInputText(editingMessage.data.content);
    } else {
      setInputText(conversationId ? (useRtdbChatStore.getState().draftMessages[conversationId] ?? '') : '');
    }
  }, [editingMessage, conversationId]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
      selectedFiles.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    };
  }, []);

  const detectedActiveMentions = useMemo(() => {
    if (!inputText) return [];
    const mentionRegex = /@([^\n\u200B]+)\u200B/g;
    const namesInText: string[] = [];
    let match;
    while ((match = mentionRegex.exec(inputText)) !== null) namesInText.push(match[1]);
    return activeMentions.filter(m => namesInText.includes(m.name));
  }, [inputText, activeMentions]);

  useEffect(() => {
    if (JSON.stringify(detectedActiveMentions) !== JSON.stringify(activeMentions)) {
      setActiveMentions(detectedActiveMentions);
    }
  }, [detectedActiveMentions]);

  useEffect(() => {
    if (!isSending && !disabled) inputRef.current?.focus();
  }, [isSending, disabled]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    let text = e.target.value;
    if (text.length > VALIDATION.MESSAGE_MAX_LENGTH) {
      text = text.slice(0, VALIDATION.MESSAGE_MAX_LENGTH);
    }
    setInputText(text);

    if (conversationId && !editingMessage) {
      if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
      draftTimeoutRef.current = setTimeout(() => saveDraft(conversationId, text), 500);
    }

    if (!isCurrentlyTypingRef.current) {
      isCurrentlyTypingRef.current = true;
      onTyping(true);
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      isCurrentlyTypingRef.current = false;
      onTyping(false);
    }, TIME_LIMITS.TYPING_TIMEOUT);

    mentionsProps.handleInputChange(text, e.target.selectionStart);
  };

  const processFiles = useCallback((files: File[]) => {
    if (files.length === 0) return;

    if (selectedFiles.length + files.length > FILE_LIMITS.CHAT_MAX_FILES) {
      toast.error(TOAST_MESSAGES.CHAT.FILE_LIMIT(FILE_LIMITS.CHAT_MAX_FILES));
      return;
    }

    const newFiles: FilePreviewItem[] = [];
    files.forEach(file => {
      let fileType: 'image' | 'video' | 'file' = 'file';
      if (file.type.startsWith('image/')) fileType = 'image';
      else if (file.type.startsWith('video/')) fileType = 'video';

      const limitType = fileType === 'image' ? 'IMAGE' : fileType === 'video' ? 'VIDEO' : 'FILE';
      const validation = validateFile(file, limitType);
      if (!validation.isValid) { if (validation.error) toast.error(validation.error); return; }

      const preview = (fileType === 'image' || fileType === 'video')
        ? URL.createObjectURL(file)
        : undefined;
      newFiles.push({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file, preview, type: fileType,
      });
    });

    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, [selectedFiles]);

  useEffect(() => {
    const handleDropFiles = (e: Event) => {
      const customEvent = e as CustomEvent<{ files: File[] }>;
      if (customEvent.detail?.files) {
        processFiles(customEvent.detail.files);
      }
    };
    window.addEventListener('chat:drop-files', handleDropFiles);
    return () => window.removeEventListener('chat:drop-files', handleDropFiles);
  }, [processFiles]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    processFiles(files);
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) processFiles(files);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => {
      const next = [...prev];
      const removed = next.splice(index, 1)[0];
      if (removed.preview) URL.revokeObjectURL(removed.preview);
      return next;
    });
  };

  const clearAllFiles = () => {
    selectedFiles.forEach(f => { if (f.preview) URL.revokeObjectURL(f.preview); });
    setSelectedFiles([]);
  };

  const handlePlayVoice = (url: string, index: number) => {
    if (playingPreview === index) {
      audioRef.current?.pause();
      setPlayingPreview(null);
    } else {
      audioRef.current?.pause();
      const audio = new Audio(url);
      audio.onended = () => setPlayingPreview(null);
      audio.play().catch(() => toast.error(TOAST_MESSAGES.CHAT.AUDIO_PLAY_FAILED));
      audioRef.current = audio;
      setPlayingPreview(index);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (disabled || isSending || (!inputText.trim() && selectedFiles.length === 0)) return;

    setIsSending(true);
    onTyping(false);

    try {
      const imageFiles = selectedFiles.filter(f => f.type === 'image');
      const videoFiles = selectedFiles.filter(f => f.type === 'video');
      const otherFiles = selectedFiles.filter(f => f.type !== 'image' && f.type !== 'video');

      const canCombineText = imageFiles.length === 1 && videoFiles.length === 0 && otherFiles.length === 0 && inputText.trim();
      let textSentWithImages = false;

      if (imageFiles.length > 0) {
        let combinedContent = '';
        let combinedMentions: string[] = [];

        if (canCombineText) {
          const { content, mentions } = formatMessageForSending(inputText.trim(), activeMentions);
          combinedContent = content;
          combinedMentions = mentions;
          textSentWithImages = true;
        }

        onSendImages(imageFiles.map(f => f.file), {
          replyToId: replyingTo?.id,
          content: textSentWithImages ? combinedContent : undefined,
          mentions: textSentWithImages ? (combinedMentions.length > 0 ? combinedMentions : undefined) : undefined
        }).catch(() => toast.error(TOAST_MESSAGES.CHAT.SEND_FAILED));
      }

      for (const video of videoFiles) {
        try { onSendVideo?.(video.file, replyingTo?.id); } catch { toast.error(TOAST_MESSAGES.CHAT.SEND_FAILED); }
      }

      for (const item of otherFiles) {
        if (item.type === 'voice') {
          try { onSendVoice?.(item.file, replyingTo?.id, item.duration); } catch { toast.error(TOAST_MESSAGES.CHAT.SEND_FAILED); }
        } else {
          onSendFile(item.file, replyingTo?.id);
        }
      }

      if (inputText.trim() && !textSentWithImages) {
        if (editingMessage) {
          if (inputText.trim() !== editingMessage.data.content) {
            await onEditMessage?.(inputText.trim());
          }
        } else {
          const { content: finalContent, mentions } = formatMessageForSending(inputText.trim(), activeMentions);
          
          await onSendText(
            finalContent,
            mentions.length > 0 ? mentions : undefined,
            replyingTo?.id
          );
        }
      }

      if (inputText.trim()) {
        setInputText('');
        setActiveMentions([]);
        if (conversationId) {
          if (draftTimeoutRef.current) clearTimeout(draftTimeoutRef.current);
          clearDraft(conversationId);
        }
      }

      clearAllFiles();
      onCancelAction();
    } catch {
      toast.error(TOAST_MESSAGES.CHAT.SEND_FAILED);
    } finally {
      setIsSending(false);
      isCurrentlyTypingRef.current = false;
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionsProps.handleKeyDown(e)) return;

    if (e.key === 'Backspace') {
      const cursor = e.currentTarget.selectionStart;
      const text = e.currentTarget.value;
      const mentionMatch = text.slice(0, cursor).match(/@([^\n\u200B]+)\u200B ?$/);
      if (mentionMatch) {
        e.preventDefault();
        const deleteLength = mentionMatch[0].length;
        const name = mentionMatch[1];
        const newText = text.substring(0, cursor - deleteLength) + text.substring(cursor);
        setInputText(newText);
        setActiveMentions(prev =>
          prev.filter(m => m.name !== name || newText.includes(`@${m.name}\u200B`))
        );
        setTimeout(() => {
          if (inputRef.current) {
            const newPos = cursor - deleteLength;
            inputRef.current.setSelectionRange(newPos, newPos);
          }
        }, 0);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) { 
      e.preventDefault(); 
      handleSubmit(); 
    }
  };

  return {
    inputText,
    setInputText,
    selectedFiles,
    isSending,
    showActions,
    setShowActions,
    showGiphy,
    setShowGiphy,
    playingPreview,
    inputRef,
    fileInputRef,
    isRecording,
    recordingDuration,
    startRecording,
    stopRecording,
    cancelRecording,
    mentionsProps,
    onSelectMention,
    handleInputChange,
    handleKeyDown,
    handleFileSelect,
    handlePaste,
    handleSubmit,
    handlePlayVoice,
    removeFile,
  };
};
