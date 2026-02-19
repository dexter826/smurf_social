import React, { useState, useRef, useEffect } from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  fallback?: string;
  className?: string;
  wrapperClassName?: string;
}

// Lazy load image.
export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  placeholder,
  fallback = '/placeholder-image.png',
  className = '',
  wrapperClassName = '',
  ...props
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => setIsLoaded(true);
  const handleError = () => {
    setError(true);
    setIsLoaded(true);
  };

  const imageSrc = error ? fallback : (isInView ? src : placeholder);

  return (
    <div className={`relative overflow-hidden ${wrapperClassName}`}>
      {/* Placeholder skeleton */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-bg-secondary animate-pulse" />
      )}

      <img
        ref={imgRef}
        src={imageSrc}
        alt={alt}
        onLoad={handleLoad}
        onError={handleError}
        className={`transition-all duration-base ${isLoaded ? 'opacity-100' : 'opacity-0'
          } ${className}`}
        loading="lazy"
        {...props}
      />
    </div>
  );
};

interface LazyVideoProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  src: string;
  thumbnail?: string;
  className?: string;
  wrapperClassName?: string;
}

// Lazy load video.
export const LazyVideo: React.FC<LazyVideoProps> = ({
  src,
  thumbnail,
  className = '',
  wrapperClassName = '',
  ...props
}) => {
  const [isInView, setIsInView] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '50px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handlePlay = () => setShowVideo(true);

  return (
    <div ref={containerRef} className={`relative ${wrapperClassName}`}>
      {!showVideo && thumbnail ? (
        <div
          className="relative cursor-pointer group"
          onClick={handlePlay}
        >
          <img
            src={thumbnail}
            alt="Video thumbnail"
            className={`w-full h-auto ${className}`}
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-all duration-base">
            <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
              <svg className="w-6 h-6 text-text-primary ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        </div>
      ) : isInView ? (
        <video
          src={src}
          className={className}
          controls
          preload="metadata"
          {...props}
        />
      ) : (
        <div className={`bg-bg-secondary animate-pulse ${className}`} style={{ aspectRatio: '16/9' }} />
      )}
    </div>
  );
};
