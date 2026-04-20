import React, { useRef, useEffect } from 'react';
import { Pause, Play, Mic } from 'lucide-react';
import { RtdbMessage } from '../../../../../shared/types';
import { useAudioStore } from '../../../../store/audioStore';
import { CircularProgress } from '../../../ui';

interface VoiceMessageProps {
  message: { id: string; data: RtdbMessage };
  isMe: boolean;
  uploadProgress?: { progress: number; error?: boolean; localUrls?: string[] };
}

export const VoiceMessage: React.FC<VoiceMessageProps> = ({ 
  message, isMe, uploadProgress 
}) => {
  const { currentlyPlayingId, isPlaying, togglePlay, setCurrentlyPlaying, setIsPlaying } = useAudioStore();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const isThisPlaying = currentlyPlayingId === message.id && isPlaying;
  const voiceUrl = message.data.media?.[0]?.url || '';
  const rawDuration = message.data.content ? parseInt(message.data.content) : 0;
  
  const isUploading = isMe && uploadProgress && uploadProgress.progress < 100;

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (currentlyPlayingId !== message.id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      return;
    }

    if (!audioRef.current && voiceUrl) {
      audioRef.current = new Audio(voiceUrl);
      audioRef.current.onended = () => {
        setIsPlaying(false);
        setCurrentlyPlaying(null);
      };
    }

    if (audioRef.current) {
      if (isPlaying) audioRef.current.play().catch(console.error);
      else audioRef.current.pause();
    }
  }, [currentlyPlayingId, isPlaying, message.id, voiceUrl, setIsPlaying, setCurrentlyPlaying]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!voiceUrl || isUploading) return;
    togglePlay(message.id);
  };

  const durationStr = rawDuration > 0
    ? (rawDuration >= 60
      ? `${Math.floor(rawDuration / 60)}:${String(rawDuration % 60).padStart(2, '0')}`
      : `0:${String(rawDuration).padStart(2, '0')}`)
    : null;

  const voiceClass = `flex flex-col gap-2 p-2.5 rounded-2xl border max-w-[260px] shadow-sm transition-all duration-200 ${
    isMe 
      ? 'bg-bg-message-sent text-text-primary border border-primary/10' 
      : 'bg-bg-message-received text-text-primary border border-border-light'
  }`;

  const btnClass = `w-10 h-10 flex-shrink-0 flex items-center justify-center rounded-xl transition-all duration-200 border relative ${
    isThisPlaying 
      ? 'bg-primary text-white border-primary shadow-md scale-95' 
      : (isMe ? 'bg-primary/10 text-primary border-primary/20' : 'bg-bg-secondary text-primary border-border-light')
  }`;

  return (
    <div className={`${voiceClass} cursor-pointer group`} onClick={handleToggle}>
      <div className="flex items-center gap-3.5">
        <div className={btnClass}>
          {isUploading ? (
            <CircularProgress progress={uploadProgress!.progress} size="sm" showPercentage={false} />
          ) : isThisPlaying ? (
            <Pause size={18} fill="currentColor" /> 
          ) : (
            <Play size={18} className="ml-0.5" fill="currentColor" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-bold text-text-primary mb-1 transition-colors group-hover:text-primary">
            {isUploading ? `Đang tải ${Math.round(uploadProgress!.progress)}%` : 'Tin nhắn thoại'}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 h-3 flex-1">
              {[...Array(isThisPlaying ? 16 : 10)].map((_, i) => (
                <div 
                  key={i} 
                  className={`w-0.5 rounded-full transition-all duration-300 ${
                    isThisPlaying ? 'bg-primary' : (isMe ? 'bg-primary/40' : 'bg-text-tertiary/40')
                  } ${isUploading ? 'animate-pulse' : ''}`}
                  style={{ 
                    height: isThisPlaying ? `${30 + Math.random() * 70}%` : '20%',
                    animationDelay: `${i * 0.05}s`
                  }}
                />
              ))}
            </div>
            
            <div className={`flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider ${
              isMe ? 'text-primary/70' : 'text-text-tertiary'
            }`}>
              <Mic size={10} strokeWidth={3} />
              <span>{durationStr ?? '0:00'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`flex justify-end text-[10px] font-bold tracking-tight opacity-40 px-1 ${isMe ? 'text-primary' : 'text-text-tertiary'}`}>
        {new Date(message.data.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  );
};
