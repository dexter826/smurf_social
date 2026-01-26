import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerClassName?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ icon, rightElement, className = '', containerClassName='', error, ...props }) => {
  return (
    <div className={`relative w-full ${containerClassName}`}>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-tertiary">
            {icon}
          </div>
        )}
        <input
          className={`block w-full rounded-md border-border-light bg-bg-primary border focus:bg-bg-primary focus:border-primary focus:ring-1 focus:ring-primary sm:text-sm py-2 text-text-primary placeholder:text-text-tertiary ${icon ? 'pl-10' : 'pl-3'} ${rightElement ? 'pr-10' : 'pr-3'} transition-theme ${error ? 'border-error ring-1 ring-error' : ''} ${className}`}
          {...props}
        />
        {rightElement && (
            <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
                {rightElement}
            </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-xs text-error">{error}</p>
      )}
    </div>
  );
};
