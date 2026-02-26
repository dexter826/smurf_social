import React from 'react';
import { X, Play, Pause, Paperclip, Video, Loader2 } from 'lucide-react';
import { IconButton } from '../../ui';

interface FilePreviewProps {
  files: { file: File; preview?: string; type: 'image' | 'video' | 'file' | 'voice' }[];
  onRemove: (index: number) => void;
  onPlayVoice: (url: string, index: number) => void;
  playingIndex: number | null;
  isSending: boolean;
}

export const FilePreview: React.FC<FilePreviewProps> = ({
  files,
  onRemove,
  onPlayVoice,
  playingIndex,
  isSending
}) => {
  if (files.length === 0) return null;

  return (
    <div className="p-3 border-b border-border-light bg-bg-primary overflow-x-auto">
      <div className="flex gap-3">
        {files.map((item, index) => (
          <div key={index} className="relative flex-shrink-0 group w-20 h-20 bg-bg-secondary rounded-lg border border-border-light overflow-hidden">
            {item.preview ? (
              item.type === 'video' ? (
                <div className="w-full h-full relative">
                  <video src={item.preview} className="w-full h-full object-cover" playsInline muted />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Video size={20} className="text-white drop-shadow" />
                  </div>
                </div>
              ) : item.type === 'voice' ? (
                <div className="w-full h-full bg-secondary flex flex-col items-center justify-center gap-1 group/audio cursor-pointer"
                  onClick={() => item.preview && onPlayVoice(item.preview, index)}>
                  {playingIndex === index ? (
                    <div className="p-1.5 bg-primary text-white rounded-full">
                      <Pause size={16} fill="currentColor" />
                    </div>
                  ) : (
                    <div className="p-1.5 bg-secondary-hover text-primary rounded-full group-hover/audio:bg-primary group-hover/audio:text-white transition-all duration-base">
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

            {!isSending && (
              <IconButton
                onClick={() => onRemove(index)}
                className="absolute top-1 right-1 bg-black/60 hover:bg-black/80 active:bg-black/90 text-white opacity-100 md:opacity-0 md:group-hover:opacity-100 z-20 transition-all duration-base"
                icon={<X size={14} />}
                size="sm"
              />
            )}

            {isSending && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px] rounded-lg z-10">
                <Loader2 size={20} className="animate-spin text-white" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
