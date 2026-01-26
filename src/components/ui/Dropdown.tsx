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
      w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-all
      active:scale-[0.98]
      ${variant === 'danger' 
        ? 'text-error hover:bg-error-light' 
        : 'text-text-primary hover:bg-bg-hover'
      }
      ${className}
    `}
  >
    {icon && <span className="shrink-0 opacity-70">{icon}</span>}
    <span className="truncate font-medium">{label}</span>
  </button>
);

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right';
  className?: string;
}

export const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  children,
  align = 'right',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <div 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="cursor-pointer active:scale-95 transition-transform"
      >
        {trigger}
      </div>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30 md:hidden" onClick={() => setIsOpen(false)} />
          <div 
            className={`
              absolute z-40 mt-2 min-w-[200px] py-2 bg-bg-primary border border-border-light rounded-2xl shadow-lg transition-all animate-in fade-in zoom-in-95 duration-200
              ${align === 'right' ? 'right-0' : 'left-0'}
            `}
            onClick={() => setIsOpen(false)}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
};
