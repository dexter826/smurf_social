import { useEffect, useRef, useCallback, RefObject } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number;
  rootMargin?: string;
  enabled?: boolean;
}

/**
 * Hook để theo dõi element có visible trong viewport không
 * Thường dùng cho infinite scroll
 */
export const useIntersectionObserver = (
  callback: () => void,
  options: UseIntersectionObserverOptions = {}
): RefObject<HTMLDivElement> => {
  const { threshold = 1.0, rootMargin = '0px', enabled = true } = options;
  const observerRef = useRef<HTMLDivElement>(null);

  const handleIntersection = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && enabled) {
        callback();
      }
    },
    [callback, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    const observer = new IntersectionObserver(handleIntersection, {
      threshold,
      rootMargin,
    });

    if (observerRef.current) {
      observer.observe(observerRef.current);
    }

    return () => observer.disconnect();
  }, [handleIntersection, threshold, rootMargin, enabled]);

  return observerRef;
};
