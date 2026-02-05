import { useEffect } from 'react';

/**
 * Hook khóa cuộn trang khi hiển thị overlay
 */
export const useScrollLock = (lock: boolean) => {
  useEffect(() => {
    if (lock) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
    return undefined;
  }, [lock]);
};
