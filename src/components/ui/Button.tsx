import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success' | 'warning';
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
  const baseStyle = "inline-flex items-center justify-center font-semibold transition-all duration-200 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";
  
  const variants = {
    primary: "bg-primary hover:bg-primary-hover text-white shadow-sm hover:shadow-md",
    secondary: "bg-bg-secondary hover:bg-bg-hover text-text-primary border border-border-light",
    outline: "border border-border-medium bg-transparent hover:bg-bg-hover text-text-primary",
    ghost: "hover:bg-bg-hover text-text-secondary hover:text-text-primary",
    danger: "bg-error hover:opacity-90 text-white shadow-sm",
    success: "bg-success hover:opacity-90 text-white shadow-sm",
    warning: "bg-warning hover:opacity-90 text-white shadow-sm"
  };

  const sizes = {
    sm: "h-9 px-3 text-sm gap-2 rounded-lg",
    md: "h-10 px-4 text-sm gap-2 rounded-xl",
    lg: "h-11 px-5 text-base gap-2.5 rounded-xl"
  };

  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 20 : 18;

  return (
    <button 
        className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`} 
        disabled={disabled || isLoading}
        {...props} 
    >
        {isLoading && <Loader2 className="animate-spin shrink-0" size={iconSize} />}
        {!isLoading && icon && <span className="shrink-0">{icon}</span>}
        {!isLoading && children && <span className="truncate">{children}</span>}
    </button>
  );
};

