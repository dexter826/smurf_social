import { useEffect, useState, RefObject } from 'react';

interface Position {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  maxHeight?: number;
}

interface DropdownPositionOptions {
  triggerRef: RefObject<HTMLElement>;
  dropdownRef: RefObject<HTMLElement>;
  isOpen: boolean;
  align?: 'left' | 'right' | 'center';
  preferredPosition?: 'top' | 'bottom';
  offset?: number;
}

export const useDropdownPosition = ({
  triggerRef,
  dropdownRef,
  isOpen,
  align = 'right',
  preferredPosition = 'bottom',
  offset = 8
}: DropdownPositionOptions) => {
  const [position, setPosition] = useState<Position>({});
  const [placement, setPlacement] = useState<'top' | 'bottom'>('bottom');
  const [horizontalAlign, setHorizontalAlign] = useState<'left' | 'right'>(align);

  useEffect(() => {
    if (!isOpen || !triggerRef.current || !dropdownRef.current) {
      return;
    }

    const calculatePosition = () => {
      const trigger = triggerRef.current;
      const dropdown = dropdownRef.current;
      
      if (!trigger || !dropdown) return;

      const triggerRect = trigger.getBoundingClientRect();
      const dropdownRect = dropdown.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      const isMobile = viewportWidth < 768;
      
      if (isMobile) {
        // Trên mobile: hiển thị ở giữa màn hình dạng modal
        setPosition({
          top: undefined,
          bottom: undefined,
          left: undefined,
          right: undefined
        });
        return;
      }

      // Desktop: tính toán vị trí thông minh
      const spaceBelow = viewportHeight - triggerRect.bottom;
      const spaceAbove = triggerRect.top;
      const spaceRight = viewportWidth - triggerRect.right;
      const spaceLeft = triggerRect.left;

      const dropdownHeight = dropdownRect.height || 300;
      const dropdownWidth = dropdownRect.width || 220;

      const padding = 16;

      // Xác định vị trí dọc (top hoặc bottom)
      let verticalPosition: 'top' | 'bottom' = preferredPosition;
      
      if (preferredPosition === 'bottom') {
        if (spaceBelow < dropdownHeight + padding && spaceAbove > spaceBelow) {
          verticalPosition = 'top';
        }
      } else {
        if (spaceAbove < dropdownHeight + padding && spaceBelow > spaceAbove) {
          verticalPosition = 'bottom';
        }
      }

      setPlacement(verticalPosition);

      // Xác định vị trí ngang (left hoặc right alignment)
      let newHorizontalAlign = align;
      
      if (align === 'right') {
        if (spaceRight < dropdownWidth + padding && spaceLeft > spaceRight) {
          newHorizontalAlign = 'left';
        }
      } else if (align === 'left') {
        if (spaceLeft < dropdownWidth + padding && spaceRight > spaceLeft) {
          newHorizontalAlign = 'right';
        }
      }

      setHorizontalAlign(newHorizontalAlign);

      // Tính maxHeight để tránh tràn màn hình
      const maxHeight = verticalPosition === 'bottom' 
        ? spaceBelow - offset - padding
        : spaceAbove - offset - padding;

      setPosition({
        maxHeight: Math.max(150, maxHeight)
      });
    };

    calculatePosition();

    const resizeObserver = new ResizeObserver(calculatePosition);
    resizeObserver.observe(dropdownRef.current);

    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition, true);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [isOpen, align, preferredPosition, offset, triggerRef, dropdownRef]);

  return { position, placement, horizontalAlign };
};
