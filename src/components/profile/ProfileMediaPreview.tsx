import React from 'react';
import { MediaObject } from '../../../shared/types';
import { SensitiveMediaGuard, EmptyState, MediaViewer } from '../ui';
import { Image as ImageIcon } from 'lucide-react';

interface ProfileMediaPreviewProps {
  media: MediaObject[];
  isBlocked: boolean;
  onSeeAll: () => void;
}

export const ProfileMediaPreview: React.FC<ProfileMediaPreviewProps> = ({ media, isBlocked, onSeeAll }) => {
  const [selectedIndex, setSelectedIndex] = React.useState(-1);

  const mediaViewerItems = React.useMemo(() => 
    media.map(m => ({
      url: m.url,
      type: (m.url.includes('.mp4') || m.mimeType?.startsWith('video/')) ? 'video' as const : 'image' as const,
      isSensitive: m.isSensitive
    })), [media]);

  return (
    <div className="bg-bg-primary rounded-2xl border border-border-light p-4 hidden md:block">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-base text-text-primary">Ảnh/Video</h3>
        <button
          onClick={onSeeAll}
          className="text-xs text-primary font-semibold hover:underline transition-colors"
        >
          Xem tất cả
        </button>
      </div>

      {media.length > 0 && !isBlocked ? (
        <div className="grid grid-cols-3 gap-1.5">
          {media.map((item, idx) => (
            <div
              key={idx}
              className="aspect-square rounded-xl overflow-hidden bg-bg-secondary cursor-pointer group"
              onClick={() => setSelectedIndex(idx)}
            >
              <SensitiveMediaGuard isSensitive={item.isSensitive} size="xs" className="w-full h-full">
                {item.url.includes('.mp4') || item.url.includes('video') ? (
                  <video src={item.url} className="w-full h-full object-cover" />
                ) : (
                  <img
                    src={item.url} alt=""
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                )}
              </SensitiveMediaGuard>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Chưa có ảnh hoặc video nào"
          size="sm"
          className="py-4"
        />
      )}

      <MediaViewer
        media={mediaViewerItems}
        initialIndex={selectedIndex}
        isOpen={selectedIndex >= 0}
        onClose={() => setSelectedIndex(-1)}
      />
    </div>
  );
};
