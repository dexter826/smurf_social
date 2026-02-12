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
          className={`
            block w-full rounded-xl transition-all duration-base outline-none text-base sm:text-sm
            bg-bg-primary border border-border-light text-text-primary placeholder:text-text-tertiary
            focus:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:ring-offset-1
            disabled:opacity-50 disabled:bg-bg-secondary disabled:text-text-tertiary disabled:cursor-not-allowed disabled:border-border-light
            ${icon ? 'pl-11' : 'pl-4'} 
            ${rightElement ? 'pr-11' : 'pr-4'} 
            ${error ? 'border-error ring-4 ring-error/10' : ''} 
            ${size === 'sm' ? 'h-9 text-xs' : size === 'lg' ? 'h-12 text-base' : 'h-10 text-sm'}
            ${className}
          `}
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
