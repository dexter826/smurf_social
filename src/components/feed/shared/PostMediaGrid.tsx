import React, { useMemo } from 'react';
import { ChevronRight, Loader2 } from 'lucide-react';
import { IconButton, LazyImage } from '../../ui';

interface MediaItem {
  url: string;
  type: string;
}

interface PostMediaGridProps {
  images?: string[];
  videos?: string[];
  videoThumbnails?: Record<string, string>;
  onClick?: () => void;
}

const PostMediaGridInner: React.FC<PostMediaGridProps> = ({
  images, videos, videoThumbnails, onClick
}) => {
  const allMedia = useMemo<MediaItem[]>(() => [
    ...(images || []).map(url => ({ url, type: 'image' })),
    ...(videos || []).map(url => ({ url, type: 'video' }))
  ], [images, videos]);

  if (allMedia.length === 0) return null;

  const count = allMedia.length;

  const renderMediaItem = (item: MediaItem, className: string = '') => {
    const isBlob = item.url.startsWith('blob:');
    
    return (
      <div className={`relative group overflow-hidden bg-bg-tertiary ${className}`}>
        {item.type === 'video' ? (
          <video
            src={item.url}
            poster={videoThumbnails?.[item.url]}
            className={`w-full h-full object-cover ${isBlob ? 'blur-[2px] opacity-70' : ''}`}
            controls={!isBlob}
          />
        ) : (
          <LazyImage 
            src={item.url} 
            alt="" 
            className={`w-full h-full object-cover transition-all duration-base ${isBlob ? 'blur-[2px] opacity-70' : ''}`} 
          />
        )}

        {isBlob && (
          <div className="absolute inset-0 flex items-center justify-center z-20">
            <div className="bg-black/50 p-2 rounded-full text-white">
              <Loader2 size={20} className="animate-spin" />
            </div>
          </div>
        )}

        {!isBlob && item.type === 'video' && (
          <div className="absolute top-2 right-2 p-1 bg-black/20 backdrop-blur-md rounded-full text-white pointer-events-none">
            <IconButton icon={<ChevronRight size={16} fill="white" />} size="sm" className="!bg-transparent" />
          </div>
        )}
      </div>
    );
  };

  if (count === 1) {
    const item = allMedia[0];
    const isBlob = item.url.startsWith('blob:');
    
    return (
      <div className="bg-bg-secondary relative select-none overflow-hidden">
        <div
          className="relative group cursor-pointer bg-black/5 flex items-center justify-center overflow-hidden max-h-[600px]"
          onClick={onClick}
        >
          <div
            className={`absolute inset-0 blur-2xl grayscale pointer-events-none ${isBlob ? 'opacity-20' : 'opacity-30'}`}
            style={{ backgroundImage: `url(${item.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
          
          {item.type === 'video' ? (
            <video
              src={item.url}
              poster={videoThumbnails?.[item.url]}
              className={`relative z-10 w-full h-auto max-h-[600px] object-contain ${isBlob ? 'blur-[2px] opacity-70' : ''}`}
              controls={!isBlob}
            />
          ) : (
            <LazyImage 
              src={item.url} 
              alt="" 
              className={`relative z-10 w-full h-auto max-h-[600px] object-contain transition-all duration-base ${isBlob ? 'blur-[2px] opacity-70' : ''}`} 
            />
          )}

          {isBlob && (
            <div className="absolute inset-0 flex items-center justify-center z-20">
              <div className="bg-black/50 p-3 rounded-full text-white">
                <Loader2 size={28} className="animate-spin" />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary relative select-none overflow-hidden">
      <div
        className={`grid gap-0.5 aspect-[4/3] sm:aspect-video cursor-pointer ${count === 2 ? 'grid-cols-2' :
          count === 3 ? 'grid-cols-2 grid-rows-2' :
            'grid-cols-2 grid-rows-2'
          }`}
        onClick={onClick}
      >
        {allMedia.slice(0, 4).map((item, idx) => {
          const isLarge = count === 3 && idx === 0;
          return (
            <React.Fragment key={idx}>
              {renderMediaItem(item, isLarge ? 'row-span-2' : '')}
              {idx === 3 && count > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                  <span className="text-white text-2xl font-bold">+{count - 4}</span>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export const PostMediaGrid = React.memo(PostMediaGridInner);
