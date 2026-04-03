import React, { useState, useMemo } from 'react';
import { RtdbMessage, MediaObject } from '../../../../shared/types';
import { Image, Film, FileText, Download, Play } from 'lucide-react';
import { LazyImage, MediaViewer } from '../../ui';
import { downloadFile } from '../../../utils';

interface ChatDetailsMediaProps {
  messages: Array<{ id: string; data: RtdbMessage }>;
  onMessageClick?: (messageId: string) => void;
}

type MediaTab = 'images' | 'videos' | 'files';

interface MediaViewerState {
  isOpen: boolean;
  index: number;
  items: { type: 'image' | 'video'; url: string; thumbnail?: string }[];
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const ChatDetailsMediaInner: React.FC<ChatDetailsMediaProps> = ({ messages, onMessageClick }) => {
  const [activeTab, setActiveTab] = useState<MediaTab>('images');
  const [viewer, setViewer] = useState<MediaViewerState>({ isOpen: false, index: 0, items: [] });

  const sortedMessages = useMemo(
    () => [...messages].sort((a, b) => b.data.createdAt - a.data.createdAt),
    [messages]
  );

  const mediaItems = useMemo(() => {
    const images: Array<{ key: string; msgId: string; media: MediaObject }> = [];
    const videos: Array<{ key: string; msgId: string; media: MediaObject }> = [];
    const files: Array<{ key: string; msgId: string; media: MediaObject }> = [];

    sortedMessages.forEach((msg) => {
      if (!msg.data.media || msg.data.media.length === 0) return;
      if (msg.data.type === 'image') {
        msg.data.media.forEach((media, i) => images.push({ key: `${msg.id}_${i}`, msgId: msg.id, media }));
      } else if (msg.data.type === 'video') {
        msg.data.media.forEach((media, i) => videos.push({ key: `${msg.id}_${i}`, msgId: msg.id, media }));
      } else if (msg.data.type === 'file') {
        msg.data.media.forEach((media, i) => files.push({ key: `${msg.id}_${i}`, msgId: msg.id, media }));
      }
    });

    return { images, videos, files };
  }, [sortedMessages]);

  const imageViewerItems = useMemo(
    () => mediaItems.images.map(i => ({ type: 'image' as const, url: i.media.url })),
    [mediaItems.images]
  );

  const videoViewerItems = useMemo(
    () => mediaItems.videos.map(i => ({
      type: 'video' as const, url: i.media.url, thumbnail: i.media.thumbnailUrl,
    })),
    [mediaItems.videos]
  );

  const tabs: { id: MediaTab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'images', label: 'Ảnh', icon: <Image size={14} />, count: mediaItems.images.length },
    { id: 'videos', label: 'Video', icon: <Film size={14} />, count: mediaItems.videos.length },
    { id: 'files', label: 'File', icon: <FileText size={14} />, count: mediaItems.files.length },
  ];

  const renderContent = () => {
    switch (activeTab) {
      case 'images':
        if (mediaItems.images.length === 0) return <EmptyState message="Chưa có ảnh nào được chia sẻ" />;
        return (
          <div className="grid grid-cols-3 gap-0.5 p-0.5">
            {mediaItems.images.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setViewer({ isOpen: true, index, items: imageViewerItems })}
                className="aspect-square overflow-hidden hover:opacity-85 active:opacity-70 transition-opacity duration-200 group relative"
              >
                <LazyImage
                  src={item.media.url || ''}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        );

      case 'videos':
        if (mediaItems.videos.length === 0) return <EmptyState message="Chưa có video nào được chia sẻ" />;
        return (
          <div className="grid grid-cols-2 gap-1 p-1">
            {mediaItems.videos.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setViewer({ isOpen: true, index, items: videoViewerItems })}
                className="aspect-video rounded-lg overflow-hidden bg-bg-tertiary relative group"
              >
                <video
                  src={item.media.url}
                  poster={item.media.thumbnailUrl}
                  className="w-full h-full object-cover"
                  playsInline muted
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors duration-200">
                  <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <Play size={14} className="text-white fill-white ml-0.5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        );

      case 'files':
        if (mediaItems.files.length === 0) return <EmptyState message="Chưa có file nào được chia sẻ" />;
        return (
          <div className="space-y-0.5 p-2">
            {mediaItems.files.map((item) => (
              <div
                key={item.key}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-bg-hover transition-colors duration-200"
              >
                <button
                  type="button"
                  onClick={() => onMessageClick?.(item.msgId)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText size={17} className="text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {item.media.fileName || 'File'}
                    </p>
                    <p className="text-xs text-text-tertiary">{formatFileSize(item.media.size)}</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => downloadFile(item.media.url, item.media.fileName || 'file')}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-bg-active text-text-tertiary hover:text-primary transition-all duration-200 flex-shrink-0"
                  title="Tải về"
                >
                  <Download size={16} />
                </button>
              </div>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Sub-tab bar */}
      <div className="flex border-b border-border-light flex-shrink-0 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold whitespace-nowrap transition-all duration-200 relative outline-none
              ${activeTab === tab.id ? 'text-primary' : 'text-text-tertiary hover:text-text-secondary'}`}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <span className="text-[10px] text-text-tertiary font-normal">({tab.count})</span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto scroll-hide min-h-0">
        {renderContent()}
      </div>

      <MediaViewer
        media={viewer.items}
        initialIndex={viewer.index}
        isOpen={viewer.isOpen}
        onClose={() => setViewer(v => ({ ...v, isOpen: false }))}
      />
    </div>
  );
};

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-10 text-text-tertiary">
    <p className="text-sm">{message}</p>
  </div>
);

export const ChatDetailsMedia = React.memo(ChatDetailsMediaInner);
