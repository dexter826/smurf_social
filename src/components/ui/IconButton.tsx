import React from "react";

// ========== ICON SIZES ========== 
export const iconSizes = {
  sm: 16,
  md: 18,
  lg: 20,
} as const;

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}

const baseStyle = "inline-flex items-center justify-center font-semibold transition-all duration-base outline-none border-2 border-transparent focus-visible:ring-4 focus-visible:ring-primary/20 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";

const iconVariants = {
  primary: "bg-primary text-text-on-primary hover:bg-primary-hover active:bg-primary-active shadow-sm",
  secondary: "bg-bg-secondary text-text-primary border-2 border-border-light hover:bg-bg-hover active:bg-bg-active",
  ghost: "text-text-secondary hover:bg-bg-hover hover:text-primary active:bg-bg-active",
  danger: "bg-error text-text-on-primary hover:bg-error/90 active:bg-error/80 shadow-sm",
};

const iconButtonSizes = {
  sm: "w-9 h-9 rounded-lg",
  md: "w-11 h-11 rounded-xl",
  lg: "w-12 h-12 rounded-xl",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(({
  icon,
  variant = "ghost",
  size = "md",
  className = "",
  disabled,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      className={`${baseStyle} ${iconVariants[variant]} ${iconButtonSizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      <span className="inline-flex pointer-events-none">
        {icon}
      </span>
    </button>
  );
});

IconButton.displayName = "IconButton";

