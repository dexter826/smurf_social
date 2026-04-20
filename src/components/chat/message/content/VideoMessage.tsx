import React from 'react';
import { RtdbMessage } from '../../../../../shared/types';
import { LazyVideo, CircularProgressOverlay } from '../../../ui';

interface VideoMessageProps {
  message: { id: string; data: RtdbMessage };
  isMe: boolean;
  uploadProgress?: { progress: number; error?: boolean; localUrls?: string[] };
  onLoad?: () => void;
}

export const VideoMessage: React.FC<VideoMessageProps> = ({ 
  message, isMe, uploadProgress, onLoad 
}) => {
  const isUploading = isMe && uploadProgress && uploadProgress.progress < 100;
  
  // Ưu tiên dùng Blob URL khi đang upload để thấy preview ngay lập tức
  const videoUrl = (isUploading && uploadProgress?.localUrls?.[0]) 
    ? uploadProgress.localUrls[0] 
    : message.data.media?.[0]?.url || message.data.content;
    
  const thumbnailUrl = message.data.media?.[0]?.thumbnailUrl;

  if (!videoUrl) return null;

  return (
    <div className="rounded-2xl overflow-hidden max-w-[280px] bg-black/5 relative shadow-sm border border-border-light">
      <LazyVideo
        src={videoUrl}
        thumbnail={thumbnailUrl}
        className="w-full h-auto"
        autoPlay={!isUploading} // Tắt autoplay khi đang upload để tránh tốn tài nguyên
        muted
        loop
        controls={!isUploading} // Chỉ hiện điều khiển khi đã upload xong
        onLoad={onLoad}
      />
      
      <CircularProgressOverlay isVisible={isUploading} progress={uploadProgress?.progress || 0} size="md" />
    </div>
  );
};
