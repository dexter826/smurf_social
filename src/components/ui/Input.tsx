import React from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerClassName?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Input: React.FC<InputProps> = ({
  label,
  icon,
  rightElement,
  className = '',
  containerClassName = '',
  error,
  id,
  size = 'md',
  ...props
}) => {
  const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  return (
    <div className={`flex flex-col gap-1.5 w-full ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-text-secondary ml-1 cursor-pointer">
          {label}
        </label>
      )}
      <div className="relative group">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-tertiary group-focus-within:text-primary transition-colors duration-base">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={`w-full bg-bg-primary border-2 ${error ? 'border-error' : 'border-border-light'} rounded-xl transition-all duration-base outline-none focus:ring-4 ${error ? 'focus:ring-error/20' : 'focus:ring-primary/20'} ${error ? 'focus:border-error' : 'focus:border-primary'} ${size === 'sm' ? 'h-9 px-3 text-sm' : size === 'lg' ? 'h-12 px-4 text-base' : 'h-10 px-4 text-sm'} ${icon ? 'pl-10' : ''} ${rightElement ? 'pr-10' : ''} ${className}`}
          {...props}
        />
        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-1.5 flex items-center">
            {rightElement}
          </div>
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
