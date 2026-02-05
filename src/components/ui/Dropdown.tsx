import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '../../hooks/useMediaQuery';

interface DropdownItemProps {
  icon?: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
  className?: string;
}

export const DropdownItem: React.FC<DropdownItemProps> = ({
  icon,
  label,
  onClick,
  variant = 'default',
  className = ''
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={`
      w-full px-4 py-2.5 text-left text-sm flex items-center justify-start gap-3 transition-colors
      hover:bg-bg-hover active:bg-bg-hover/80
      ${variant === 'danger' 
        ? 'text-error hover:text-error' 
        : 'text-text-primary'
      }
      ${className}
    `}
  >
    {icon && <span className={`flex-shrink-0 ${variant === 'danger' ? 'text-error' : 'text-text-secondary'}`}>{icon}</span>}
    <span className="truncate font-medium flex-1">{label}</span>
  </button>
);

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
  disableTriggerScale?: boolean;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  align = 'right',
  className = '',
  isOpen: controlledIsOpen,
  onOpenChange,
  disableTriggerScale = false
}) => {
  const isMobile = useIsMobile();
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  const [isReverse, setIsReverse] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalIsOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  const updateCoords = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      
      // Kiểm tra xem có đủ chỗ bên dưới không (giả định menu cao ~250px)
      const spaceBelow = windowHeight - rect.bottom;
      const needsReverse = spaceBelow < 250 && rect.top > spaceBelow;
      
      setIsReverse(needsReverse);
      setCoords({
        top: rect.top,
        left: rect.left,
        width: rect.width
      });
    }
  };

  useLayoutEffect(() => {
    if (isOpen) {
      updateCoords();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEvents = () => {
      if (isOpen) {
        handleOpenChange(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', (e) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node) && 
            menuRef.current && !menuRef.current.contains(e.target as Node)) {
          handleOpenChange(false);
        }
      });
      window.addEventListener('resize', handleEvents);
      window.addEventListener('scroll', handleEvents, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleEvents);
      window.removeEventListener('resize', handleEvents);
      window.removeEventListener('scroll', handleEvents, true);
    };
  }, [isOpen]);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <div 
        onClick={(e) => {
          e.stopPropagation();
          handleOpenChange(!isOpen);
        }}
        className={`cursor-pointer transition-transform ${disableTriggerScale ? '' : 'active:scale-95'}`}
      >
        {trigger}
      </div>

      {isOpen && (
        <>
          {createPortal(
            <div 
              ref={menuRef}
              style={{
                top: isReverse ? 'auto' : `${coords.top + 40}px`,
                bottom: isReverse ? `${window.innerHeight - coords.top + 8}px` : 'auto',
                left: align === 'left' ? `${coords.left}px` : 'auto',
                right: align === 'right' ? `${window.innerWidth - (coords.left + coords.width)}px` : 'auto',
                position: 'fixed'
              }}
              className={`
                z-[var(--z-dropdown)] 
                fixed bottom-0 left-0 right-0 
                py-1.5 pb-max(20px, env(safe-area-inset-bottom)) bg-bg-primary border-t border-border-light rounded-2xl 
                max-h-[70vh] overflow-y-auto
                md:bottom-auto md:left-auto md:right-auto md:max-h-none
                md:min-w-max md:w-auto md:max-w-[calc(100vw-32px)] md:border md:rounded-xl 
                shadow-dropdown animate-in fade-in zoom-in-95 duration-200
              `}
              onClick={() => handleOpenChange(false)}
            >
              {children}
            </div>,
            document.body
          )}
        </>
      )}
    </div>
  );
};
