import React, { useMemo, useCallback } from 'react';
import { Play, Image as ImageIcon } from 'lucide-react';
import { RtdbMessage } from '../../../../../shared/types';
import { LazyImage, CircularProgressOverlay } from '../../../ui';

interface ImageMessageProps {
  message: { id: string; data: RtdbMessage };
  isMe: boolean;
  uploadProgress?: { progress: number; error?: boolean; localUrls?: string[] };
  onOpenImage: (index: number) => void;
  onLoad?: () => void;
}

/**
 * Hiển thị album ảnh hoặc ảnh đơn lẻ
 */
export const ImageMessage: React.FC<ImageMessageProps> = ({ 
  message, isMe, uploadProgress, onOpenImage, onLoad 
}) => {
  const { media, content } = message.data;
  const isUploading = isMe && uploadProgress && uploadProgress.progress < 100;

  // Track loading state for multiple items to signal parent
  const loadedCount = React.useRef(0);
  const handleItemLoad = useCallback(() => {
    loadedCount.current += 1;
    if (loadedCount.current === 1) { // Chỉ cần 1 ảnh đầu hiện lên là có thể hiện thời gian
      onLoad?.();
    }
  }, [onLoad]);

  const mediaItems = useMemo(() => {
    if (isUploading && uploadProgress?.localUrls && uploadProgress.localUrls.length > 0) {
      return uploadProgress.localUrls.map(url => ({
        url,
        fileName: '',
        mimeType: 'image/jpeg',
        size: 0,
        isSensitive: false
      }));
    }
    return media?.length
      ? media
      : content
        ? [{ url: content, fileName: '', mimeType: '', size: 0, isSensitive: false }]
        : [];
  }, [media, content, isUploading, uploadProgress?.localUrls]);
  
  const count = mediaItems.length;
  if (count === 0) return null;

  const renderItem = (item: any, idx: number) => {
    const isVid = item.mimeType?.startsWith('video/');
    return (
      <div
        key={`${message.id}-media-${idx}`}
        className="relative overflow-hidden cursor-pointer border border-border-light/30 aspect-square group"
        onClick={() => onOpenImage(idx)}
      >
        {isVid ? (
          item.thumbnailUrl
            ? <img src={item.thumbnailUrl} alt="" className="w-full h-full object-cover" />
            : <video src={item.url} className="w-full h-full object-cover" preload="metadata" playsInline muted onLoadedData={handleItemLoad} />
        ) : (
          <LazyImage 
            src={item.url} 
            alt="media item" 
            className="w-full h-full object-cover" 
            wrapperClassName="w-full h-full" 
            onLoad={handleItemLoad}
          />
        )}
        {isVid && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
              <Play size={14} className="text-text-primary ml-0.5 fill-current" />
            </div>
          </div>
        )}
      </div>
    );
  };

  if (count > 1) {
    const rowLayouts: Record<number, number[]> = { 5: [3, 2], 7: [4, 3], 10: [4, 3, 3] };
    const singleGrid: Record<number, string> = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-2', 6: 'grid-cols-3', 8: 'grid-cols-4', 9: 'grid-cols-3' };

    const wrapperClass = "relative rounded-2xl overflow-hidden flex flex-col gap-0.5 w-full max-w-[320px] border border-border-light bg-bg-secondary shadow-sm";

    let contentUI;
    if (rowLayouts[count]) {
      const rows = rowLayouts[count];
      let offset = 0;
      contentUI = (
        <div className={wrapperClass}>
          {rows.map((cols, rowIdx) => {
            const start = offset;
            offset += cols;
            return (
              <div key={rowIdx} className={`grid grid-cols-${cols} gap-0.5`}>
                {mediaItems.slice(start, offset).map((item, i) => renderItem(item, start + i))}
              </div>
            );
          })}
          <CircularProgressOverlay isVisible={isUploading} progress={uploadProgress?.progress || 0} size="md" />
        </div>
      );
    } else {
      const cols = singleGrid[count] ?? 'grid-cols-3';
      contentUI = (
        <div className={`relative rounded-2xl overflow-hidden grid gap-0.5 ${cols} shadow-sm bg-bg-secondary w-full max-w-[320px] border border-border-light`}>
          {mediaItems.map((item, idx) => renderItem(item, idx))}
          <CircularProgressOverlay isVisible={isUploading} progress={uploadProgress?.progress || 0} size="md" />
        </div>
      );
    }
    return contentUI;
  }

  const first = mediaItems[0];
  return (
    <div className="rounded-2xl overflow-hidden max-w-[320px] max-h-[420px] cursor-pointer group relative shadow-sm border border-border-light w-fit bg-bg-secondary" onClick={() => onOpenImage(0)}>
      <LazyImage 
        src={first.url} 
        alt="media content" 
        className="max-w-full max-h-[420px] object-contain" 
        onLoad={onLoad}
      />
      
      <CircularProgressOverlay isVisible={isUploading} progress={uploadProgress?.progress || 0} />
      
      {!isUploading && (
        <div className="absolute inset-0 bg-transparent flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-black/20 p-3 rounded-full backdrop-blur-sm">
            <ImageIcon className="text-white drop-shadow-md" size={24} />
          </div>
        </div>
      )}
    </div>
  );
};
