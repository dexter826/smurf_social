import React, { useEffect, useState } from 'react';
import { Post } from '../../types';
import { postService } from '../../services/postService';
import { Spinner } from '../ui';
import { Image as ImageIcon } from 'lucide-react';

interface PhotosTabProps {
  userId: string;
}

export const PhotosTab: React.FC<PhotosTabProps> = ({ userId }) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  useEffect(() => {
    loadPhotos();
  }, [userId]);

  const loadPhotos = async () => {
    setLoading(true);
    try {
      const posts = await postService.getUserPosts(userId);
      
      // Lấy tất cả ảnh từ các posts
      const allPhotos: string[] = [];
      posts.forEach(post => {
        if (post.images && post.images.length > 0) {
          allPhotos.push(...post.images);
        }
      });
      
      setPhotos(allPhotos);
    } catch (error) {
      console.error("Lỗi load photos", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20">
        <div className="bg-bg-primary rounded-lg shadow-sm border border-border-light p-8 text-center transition-theme">
          <ImageIcon size={48} className="mx-auto mb-3 text-text-secondary" />
          <p className="text-text-secondary">Chưa có ảnh nào</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="bg-bg-primary rounded-lg shadow-sm border border-border-light p-6 transition-theme">
          <h3 className="font-bold text-lg mb-4 text-text-primary">
            Ảnh <span className="text-text-secondary font-normal">({photos.length})</span>
          </h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {photos.map((photo, index) => (
              <div
                key={index}
                className="aspect-square bg-secondary rounded-lg overflow-hidden cursor-pointer hover:opacity-90 transition-opacity"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img 
                  src={photo} 
                  alt={`Photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <img 
            src={selectedPhoto} 
            alt="Preview"
            className="max-w-full max-h-full object-contain"
          />
        </div>
      )}
    </>
  );
};
