import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useClickOutside } from '../../hooks/utils';
import { ChevronDown, Check } from 'lucide-react';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  options: SelectOption[];
  value?: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  openUp?: boolean;
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  error,
  placeholder = 'Chọn một tùy chọn',
  disabled = false,
  className = '',
  openUp: forceOpenUp
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    if (isOpen && containerRef.current && forceOpenUp === undefined) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setOpenUp(spaceBelow < 250);
    } else if (forceOpenUp !== undefined) {
      setOpenUp(forceOpenUp);
    }
  }, [isOpen, forceOpenUp]);

  useClickOutside([containerRef, dropdownRef], () => setIsOpen(false), isOpen);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-text-secondary ml-1 cursor-pointer">
          {label}
        </label>
      )}
      
      <div className="relative">
        <div
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`
            w-full h-11 px-4 flex items-center justify-between border outline-none transition-all rounded-xl
            bg-bg-primary text-sm font-normal
            ${isOpen ? 'border-primary ring-4 ring-primary-light/30' : 'border-border-light hover:border-primary'}
            ${error ? 'border-error ring-4 ring-error/10' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed bg-bg-secondary' : 'cursor-pointer'}
          `}
        >
          <span className={`truncate ${!selectedOption ? 'text-text-tertiary' : 'text-text-primary'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown 
            size={18} 
            className={`text-text-tertiary transition-transform duration-200 flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </div>

        {isOpen && createPortal(
          <div 
            ref={dropdownRef}
            style={{
              top: openUp ? 'auto' : `calc(${containerRef.current?.getBoundingClientRect().bottom ?? 0}px + 6px)`,
              bottom: openUp ? `calc(${window.innerHeight - (containerRef.current?.getBoundingClientRect().top ?? 0)}px + 6px)` : 'auto',
              left: `${containerRef.current?.getBoundingClientRect().left ?? 0}px`,
              width: `${containerRef.current?.getBoundingClientRect().width ?? 0}px`,
              position: 'fixed'
            }}
            className={`
              z-[var(--z-dropdown)] bg-bg-primary border border-border-light rounded-xl shadow-dropdown py-1.5 transition-all animate-in fade-in zoom-in-95 duration-200
            `}
          >
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`
                    w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors font-normal hover:bg-bg-hover
                    ${option.value === value 
                      ? 'bg-primary-light text-primary font-medium' 
                      : 'text-text-primary'
                    }
                  `}
                >
                  <span className="whitespace-nowrap">{option.label}</span>
                  {option.value === value && <Check size={16} className="ml-2 flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>,
          document.body
        )}
      </div>
      
      {error && (
        <p className="mt-0.5 ml-1 text-[11px] font-medium text-error flex items-center gap-1 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
};
