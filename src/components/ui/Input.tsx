import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({ icon, rightElement, className = '', containerClassName='', ...props }) => {
  return (
    <div className={`relative w-full ${containerClassName}`}>
      {icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
          {icon}
        </div>
      )}
      <input
        className={`block w-full rounded-md border-gray-300 bg-bg-main border focus:bg-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500 sm:text-sm py-2 ${icon ? 'pl-10' : 'pl-3'} ${rightElement ? 'pr-10' : 'pr-3'} transition-colors ${className}`}
        {...props}
      />
      {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
              {rightElement}
          </div>
      )}
    </div>
  );
};
