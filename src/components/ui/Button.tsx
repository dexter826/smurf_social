import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

const baseStyle = "inline-flex items-center justify-center font-semibold transition-all duration-base outline-none border-2 border-transparent focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";

const variants = {
  primary: "bg-primary hover:bg-primary-hover active:bg-primary-active text-text-on-primary shadow-sm hover:shadow-md",
  secondary: "bg-bg-secondary hover:bg-bg-hover active:bg-bg-active text-text-primary border-2 border-border-light",
  ghost: "hover:bg-bg-hover active:bg-bg-active text-text-secondary hover:text-text-primary",
  danger: "bg-error hover:bg-error/90 active:bg-error/80 text-text-on-primary shadow-sm",
};


const sizes = {
  sm: "h-9 px-3 text-sm gap-2 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-6 text-base gap-3 rounded-xl"
};

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

