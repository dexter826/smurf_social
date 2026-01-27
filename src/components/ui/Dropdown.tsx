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
  <Button
    variant="ghost"
    rounded="none"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className={`
      w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-all h-auto
      active:scale-[0.98]
      ${variant === 'danger' 
        ? 'text-error hover:bg-error-light' 
        : 'text-text-primary hover:bg-bg-hover'
      }
      ${className}
    `}
    icon={icon}
  >
    <span className="truncate font-medium">{label}</span>
  </Button>
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
          <div className="fixed inset-0 z-30 md:hidden" onClick={() => handleOpenChange(false)} />
          <div 
            className={`
              absolute z-40 mt-2 min-w-[200px] py-2 bg-bg-primary border border-border-light rounded-2xl shadow-lg transition-all animate-in fade-in zoom-in-95 duration-200
              ${align === 'right' ? 'right-0' : 'left-0'}
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
