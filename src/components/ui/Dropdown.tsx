import React, { useState, useRef, useEffect } from 'react';

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
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleOpenChange(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
          {/* Backdrop cho mobile */}
          <div 
            className="fixed inset-0 z-30 bg-bg-overlay backdrop-blur-sm md:hidden" 
            onClick={() => handleOpenChange(false)} 
          />
          
          {/* Dropdown menu */}
          <div 
            className={`
              fixed bottom-0 left-0 right-0 z-40 
              py-1.5 pb-20 bg-bg-primary border-t border-border-light rounded-t-2xl shadow-dropdown 
              animate-in slide-in-from-bottom duration-300
              max-h-[70vh] overflow-y-auto
              md:absolute md:bottom-auto md:left-auto md:right-auto md:top-full md:mt-2 md:pb-1.5
              md:min-w-[220px] md:w-auto md:max-w-[calc(100vw-32px)] md:border md:rounded-xl 
              md:animate-in md:fade-in md:zoom-in-95 md:slide-in-from-top-2 md:duration-200
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
