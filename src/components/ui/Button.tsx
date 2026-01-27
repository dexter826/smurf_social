import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
    variant = 'primary', 
    size = 'md', 
    className = '', 
    isLoading, 
    children, 
    icon,
    fullWidth = false,
    disabled,
    ...props 
}) => {
  const isIconOnly = !children && icon && !isLoading;
  
  const baseStyle = "inline-flex items-center justify-center font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-primary hover:bg-primary-hover text-white focus:ring-primary shadow-sm hover:shadow-md active:scale-[0.98]",
    secondary: "bg-bg-secondary hover:bg-bg-hover text-text-primary border border-border-light focus:ring-primary/30 active:scale-[0.98]",
    outline: "border border-border-medium bg-transparent hover:bg-bg-hover text-text-primary focus:ring-primary/30 active:scale-[0.98]",
    ghost: "hover:bg-bg-hover text-text-secondary hover:text-text-primary active:scale-[0.95]",
    danger: "bg-error hover:bg-error/90 text-white focus:ring-error shadow-sm active:scale-[0.98]"
  };

  const sizes = {
    sm: isIconOnly ? "w-8 h-8 p-0 rounded-lg" : "h-9 px-3 text-sm gap-2 rounded-lg",
    md: isIconOnly ? "w-10 h-10 p-0 rounded-xl" : "h-10 px-4 text-sm gap-2 rounded-xl",
    lg: isIconOnly ? "w-11 h-11 p-0 rounded-xl" : "h-11 px-5 text-base gap-2.5 rounded-xl"
  };

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 20 : 18;

  return (
    <button 
        className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`} 
        disabled={disabled || isLoading}
        {...props} 
    >
        {isLoading && <Loader2 className="animate-spin" size={iconSize} />}
        {!isLoading && icon && <span className="shrink-0">{icon}</span>}
        {!isLoading && children && <span className="truncate">{children}</span>}
    </button>
  );
};
