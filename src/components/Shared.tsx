import React from 'react';
import { Loader2 } from 'lucide-react';

// --- Avatar ---
interface AvatarProps {
  src?: string;
  name?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  status?: 'online' | 'offline' | 'busy';
  className?: string;
  isGroup?: boolean;
}

export const Avatar: React.FC<AvatarProps> = ({ src, name, size = 'md', status, className = '', isGroup }) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-base',
    xl: 'w-24 h-24 text-xl',
    '2xl': 'w-32 h-32 text-2xl'
  };

  const statusColor = {
    online: 'bg-green-500 border-white',
    offline: 'bg-gray-400 border-white',
    busy: 'bg-red-500 border-white'
  };

  return (
    <div className={`relative inline-block ${className}`}>
      <div className={`${sizeClasses[size]} relative rounded-full overflow-hidden border border-gray-100 bg-gray-200 flex items-center justify-center`}>
        {src ? (
          <img
            className="w-full h-full object-cover"
            src={src}
            alt={name}
            onError={(e) => {
                (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${name || 'U'}&background=random`;
            }}
          />
        ) : (
            <span className="font-semibold text-gray-600">{name?.charAt(0).toUpperCase()}</span>
        )}
      </div>
      {status && (
        <span className={`absolute bottom-0.5 right-0.5 block h-3 w-3 rounded-full border-2 ${statusColor[status]}`} />
      )}
    </div>
  );
};

// --- Button ---
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
    variant = 'primary', 
    size = 'md', 
    className = '', 
    isLoading, 
    children, 
    icon,
    disabled,
    ...props 
}) => {
  const baseStyle = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 rounded-md disabled:opacity-60 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-primary-500 hover:bg-primary-600 text-white focus:ring-primary-500 shadow-sm",
    secondary: "bg-gray-100 hover:bg-gray-200 text-text-main focus:ring-gray-300",
    outline: "border border-gray-300 bg-transparent hover:bg-gray-50 text-text-main",
    ghost: "hover:bg-gray-100 text-text-secondary hover:text-primary-600",
    danger: "bg-red-500 hover:bg-red-600 text-white focus:ring-red-500"
  };

  const sizes = {
    sm: "h-8 px-3 text-xs gap-1.5",
    md: "h-10 px-4 py-2 text-sm gap-2",
    lg: "h-12 px-6 text-base gap-2"
  };

  return (
    <button 
        className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`} 
        disabled={disabled || isLoading}
        {...props} 
    >
        {isLoading && <Loader2 className="animate-spin" size={16} />}
        {!isLoading && icon && <span>{icon}</span>}
        {children}
    </button>
  );
};

// --- Input ---
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

// --- Spinner ---
export const Spinner = () => (
    <div className="flex justify-center items-center p-4">
        <Loader2 className="animate-spin text-primary-500" size={32} />
    </div>
);
