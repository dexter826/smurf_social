import { useState, useEffect } from 'react';

/**
 * Hook để kiểm tra media query (breakpoint)
 * @param query Media query string (e.g. '(max-width: 768px)')
 * @returns boolean
 */
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    window.addEventListener('resize', listener);
    return () => window.removeEventListener('resize', listener);
  }, [matches, query]);

  return matches;
};

/**
 * Hook tiện ích để kiểm tra xem có phải màn hình mobile không (md: 768px)
 */
export const useIsMobile = () => useMediaQuery('(max-width: 767px)');
