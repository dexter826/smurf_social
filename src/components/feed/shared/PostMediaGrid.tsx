import React from 'react';
import { ChevronRight } from 'lucide-react';
import { IconButton } from '../../ui';

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

export const PostMediaGrid: React.FC<PostMediaGridProps> = ({
  images, videos, videoThumbnails, onClick
}) => {
  const allMedia: MediaItem[] = [
    ...(images || []).map(url => ({ url, type: 'image' })),
    ...(videos || []).map(url => ({ url, type: 'video' }))
  ];

  if (allMedia.length === 0) return null;

  const count = allMedia.length;

  if (count === 1) {
    const item = allMedia[0];
    return (
      <div className="bg-bg-secondary relative select-none overflow-hidden">
        <div
          className="relative group cursor-pointer bg-black/5 flex items-center justify-center overflow-hidden max-h-[600px]"
          onClick={onClick}
        >
          <div
            className="absolute inset-0 scale-110 blur-2xl opacity-30 grayscale pointer-events-none"
            style={{ backgroundImage: `url(${item.url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
          {item.type === 'video' ? (
            <video
              src={item.url}
              poster={videoThumbnails?.[item.url]}
              controls
              className="relative z-10 w-full h-auto max-h-[600px] object-contain"
            />
          ) : (
            <img src={item.url} alt="" className="relative z-10 w-full h-auto max-h-[600px] object-contain transition-transform duration-500 group-hover:scale-[1.02]" loading="lazy" />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-bg-secondary relative select-none overflow-hidden">
      <div
        className={`grid gap-0.5 aspect-[4/3] sm:aspect-video cursor-pointer ${
          count === 2 ? 'grid-cols-2' :
          count === 3 ? 'grid-cols-2 grid-rows-2' :
          'grid-cols-2 grid-rows-2'
        }`}
        onClick={onClick}
      >
        {allMedia.slice(0, 4).map((item, idx) => {
          const isLarge = count === 3 && idx === 0;
          return (
            <div
              key={idx}
              className={`relative overflow-hidden bg-bg-tertiary ${isLarge ? 'row-span-2' : ''}`}
            >
              {item.type === 'video' ? (
                <video
                  src={item.url}
                  poster={videoThumbnails?.[item.url]}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img src={item.url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" loading="lazy" />
              )}

              {idx === 3 && count > 4 && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <span className="text-white text-2xl font-bold">+{count - 4}</span>
                </div>
              )}

              {item.type === 'video' && (
                <div className="absolute top-2 right-2 p-1 bg-black/20 backdrop-blur-md rounded-full text-white">
                  <IconButton icon={<ChevronRight size={16} fill="white" />} size="sm" className="!bg-transparent" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
