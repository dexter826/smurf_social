import React, { useState, useRef, useEffect } from 'react';
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
}

export const Select: React.FC<SelectProps> = ({
  label,
  options,
  value,
  onChange,
  error,
  placeholder = 'Chọn một tùy chọn',
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const selectedOption = options.find(opt => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
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

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className="text-sm font-medium text-text-secondary ml-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className={`
            w-full h-10 px-4 flex items-center justify-between rounded-xl border outline-none transition-all
            bg-bg-primary text-sm
            ${isOpen ? 'border-primary ring-2 ring-primary-500/20' : 'border-border-medium hover:border-primary'}
            ${error ? 'border-error ring-1 ring-error' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed bg-bg-secondary' : 'cursor-pointer'}
          `}
          disabled={disabled}
        >
          <span className={`truncate ${!selectedOption ? 'text-text-tertiary' : 'text-text-primary'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown 
            size={18} 
            className={`text-text-tertiary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
          />
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1.5 bg-bg-primary border border-border-light rounded-xl shadow-2xl py-1.5 transition-all animate-in fade-in zoom-in-95 duration-150 backdrop-blur-md bg-opacity-95">
            <div className="max-h-60 overflow-y-auto custom-scrollbar">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`
                    w-full px-4 py-2.5 text-left text-sm flex items-center justify-between transition-colors
                    ${option.value === value 
                      ? 'bg-primary-light text-primary font-medium' 
                      : 'text-text-primary hover:bg-bg-hover'
                    }
                  `}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value && <Check size={16} />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {error && <span className="text-xs text-error ml-1">{error}</span>}
    </div>
  );
};
