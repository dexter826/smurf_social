import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;

  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalIsOpen(newOpen);
    }
    onOpenChange?.(newOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        handleOpenChange(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isControlled, onOpenChange]); // Added dependencies

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
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
          <div className="fixed inset-0 z-30 md:hidden bg-black/20 backdrop-blur-[1px]" onClick={() => handleOpenChange(false)} />
          <div 
            className={`
              absolute z-40 mt-1 min-w-[220px] max-w-[calc(100vw-32px)] py-1.5 bg-bg-primary border border-border-light rounded-xl shadow-dropdown transition-all animate-in fade-in zoom-in-95 duration-200
              md:absolute
              fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] md:w-auto md:top-auto md:left-auto md:translate-x-0 md:translate-y-0
              ${align === 'right' ? 'md:right-0' : 'md:left-0'}
            `}
            onClick={() => handleOpenChange(false)}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
};
