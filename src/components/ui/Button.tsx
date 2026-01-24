import React from 'react';
import { Loader2 } from 'lucide-react';

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
