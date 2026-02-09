import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { useIsMobile } from '../../hooks/utils/useMediaQuery';

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
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalIsOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleOpenChange(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
        <div 
          className={`
            absolute z-[var(--z-dropdown)] mt-1.5
            min-w-[180px] w-max max-w-[calc(100vw-32px)]
            bg-bg-primary border border-border-light rounded-xl 
            shadow-dropdown overflow-hidden
            animate-in fade-in zoom-in-95 duration-200
            ${align === 'right' ? 'right-0' : 'left-0'}
            origin-top-${align}
          `}
          onClick={() => handleOpenChange(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
};
