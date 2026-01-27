import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  isIconOnly?: boolean;
  rounded?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

export const Button: React.FC<ButtonProps> = ({ 
    variant = 'primary', 
    size = 'md', 
    className = '', 
    isLoading, 
    children, 
    icon,
    isIconOnly = false,
    rounded = 'md',
    disabled,
    ...props 
}) => {
  const baseStyle = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-primary hover:bg-primary-hover text-text-on-primary focus:ring-primary shadow-sm",
    secondary: "bg-bg-secondary hover:bg-bg-hover text-text-primary focus:ring-border-medium",
    outline: "border border-border-light bg-transparent hover:bg-bg-hover text-text-primary",
    ghost: "hover:bg-bg-hover text-text-secondary hover:text-primary",
    danger: "bg-error hover:bg-error/90 text-white focus:ring-error"
  };

  const roundedStyles = {
    sm: "rounded-sm",
    md: "rounded-md",
    lg: "rounded-lg",
    xl: "rounded-xl",
    full: "rounded-full"
  };

  const sizes = {
    sm: isIconOnly ? "w-8 h-8 p-0" : "h-8 px-3 text-xs gap-1.5",
    md: isIconOnly ? "w-10 h-10 p-0" : "h-10 px-4 py-2 text-sm gap-2",
    lg: isIconOnly ? "w-12 h-12 p-0" : "h-12 px-6 text-base gap-2"
  };

  return (
    <button 
        className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${roundedStyles[rounded]} ${className}`} 
        disabled={disabled || isLoading}
        {...props} 
    >
        {isLoading && <Loader2 className="animate-spin" size={16} />}
        {!isLoading && icon && (isIconOnly ? icon : <span>{icon}</span>)}
        {!isLoading && children}
    </button>
  );
};
