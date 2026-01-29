import React, { useEffect, useState } from 'react';
import { Post } from '../../types';
import { postService } from '../../services/postService';
import { Spinner, Skeleton } from '../ui';
import { Image as ImageIcon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

interface PhotosTabProps {
  userId: string;
}

export const PhotosTab: React.FC<PhotosTabProps> & { Skeleton: React.FC } = ({ userId }) => {
  const [media, setMedia] = useState<{ url: string, type: 'image' | 'video' }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<{ url: string, type: 'image' | 'video' } | null>(null);
  const { user: currentUser } = useAuthStore();

  useEffect(() => {
    loadMedia();
  }, [userId]);

  const loadMedia = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const { posts } = await postService.getUserPosts(
        userId, 
        currentUser.id, 
        currentUser.friendIds || [], 
        50
      );
      
      const allMedia: { url: string, type: 'image' | 'video' }[] = [];
      posts.forEach(post => {
        if (post.images) {
          post.images.forEach(url => allMedia.push({ url, type: 'image' }));
        }
        if (post.videos) {
          post.videos.forEach(url => allMedia.push({ url, type: 'video' }));
        }
      });
      
      setMedia(allMedia);
    } catch (error) {
      console.error("Lỗi load media", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <PhotosTab.Skeleton />;
  }

  if (media.length === 0) {
    return (
      <div className="bg-bg-primary rounded-lg shadow-sm border border-border-light p-4 sm:p-8 text-center transition-theme">
        <ImageIcon size={48} className="mx-auto mb-3 text-text-secondary" />
        <p className="text-text-secondary">Chưa có ảnh hoặc video nào</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-bg-primary rounded-lg shadow-sm border border-border-light p-4 sm:p-6 transition-theme">
          <h3 className="font-bold text-lg mb-4 text-text-primary">
            Ảnh/Video <span className="text-text-secondary font-normal">({media.length})</span>
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {media.map((item, index) => (
              <div
                key={index}
                className="aspect-square bg-secondary rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative group"
                onClick={() => setSelectedMedia(item)}
              >
                {item.type === 'video' ? (
                  <video 
                    src={item.url} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img 
                    src={item.url} 
                    alt={`Media ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
                {item.type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors">
                    <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

      {/* Lightbox */}
      {selectedMedia && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedMedia(null)}
        >
          {selectedMedia.type === 'video' ? (
            <video 
              src={selectedMedia.url} 
              controls 
              autoPlay
              className="max-w-full max-h-full"
            />
          ) : (
            <img 
              src={selectedMedia.url} 
              alt="Preview"
              className="max-w-full max-h-full object-contain"
            />
          )}
        </div>
      )}
    </>
  );
};

PhotosTab.Skeleton = () => (
  <div className="bg-bg-primary rounded-lg shadow-sm border border-border-light p-4 sm:p-6 transition-theme">
    <h3 className="font-bold text-lg mb-4 text-text-primary">
      Ảnh/Video <Skeleton width={40} height={20} className="inline-block" />
    </h3>
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
      {[...Array(10)].map((_, i) => (
        <Skeleton key={i} variant="rect" className="aspect-square rounded-lg" />
      ))}
    </div>
  </div>
);
