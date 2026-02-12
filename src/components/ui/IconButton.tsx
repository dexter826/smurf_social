import React from "react";

// Size icon chuẩn
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

const baseStyle = "inline-flex items-center justify-center rounded-xl transition-all hover:bg-bg-hover active:bg-bg-active outline-none focus-visible:ring focus-visible:ring-primary/20 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed";

const iconVariants = {
  primary: "text-primary hover:text-primary-hover",
  secondary: "text-text-secondary hover:text-text-primary",
  ghost: "text-text-tertiary hover:text-text-primary",
  danger: "text-error hover:text-error",
};

const iconButtonSizes = {
  sm: "w-8 h-8",
  md: "w-9 h-9",
  lg: "w-10 h-10",
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(({
  icon,
  variant = "secondary",
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
      {icon}
    </button>
  );
});

IconButton.displayName = "IconButton";

