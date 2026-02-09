import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface ImageViewerProps {
  images: string[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  images,
  initialIndex = 0,
  isOpen,
  onClose
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
    }
  }, [isOpen, initialIndex]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    if (e.key === 'ArrowLeft') {
      setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
    } else if (e.key === 'ArrowRight') {
      setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'Escape') {
      onClose();
    }
  }, [isOpen, images.length, onClose]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden'; // Prevent scrolling
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
    if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  if (!isOpen) return null;

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev < images.length - 1 ? prev + 1 : 0));
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex(prev => (prev > 0 ? prev - 1 : images.length - 1));
  };

  return (
    <div 
      className="fixed inset-0 z-[var(--z-overlay)] bg-black/95 backdrop-blur-sm flex items-center justify-center select-none animate-in fade-in duration-200"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 z-[var(--z-dialog)]">
        <button 
           className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-md border border-white/5"
           onClick={(e) => {
             e.stopPropagation();
             onClose();
           }}
        >
          <X size={24} />
        </button>
      </div>

      {images.length > 1 && (
        <>
          <button
            className="hidden md:block absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md border border-white/5 z-[var(--z-dialog)] transition-all active:scale-95"
            onClick={handlePrev}
          >
            <ChevronLeft size={32} />
          </button>
          
          <button
            className="hidden md:block absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-md border border-white/5 z-[var(--z-dialog)] transition-all active:scale-95"
            onClick={handleNext}
          >
            <ChevronRight size={32} />
          </button>

          {/* Counter */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 text-white/90 font-medium text-lg bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10">
             {currentIndex + 1} / {images.length}
          </div>
        </>
      )}

      {/* Image */}
      <div className="w-full h-full flex items-center justify-center p-4 md:px-28 md:py-10">
        <img 
          src={images[currentIndex]} 
          className="max-w-full max-h-full object-contain animate-in zoom-in-95 duration-200 shadow-2xl drop-shadow-2xl rounded-sm"
          onClick={(e) => e.stopPropagation()}
          alt={`View ${currentIndex + 1}`}
        />
      </div>
    </div>
  );
};
