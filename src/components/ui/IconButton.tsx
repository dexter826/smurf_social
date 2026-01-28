import React from "react";

// Size icon chuẩn
export const iconSizes = {
  sm: 16,
  md: 18,
  lg: 20,
} as const;

interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  variant?: "default" | "primary" | "danger";
  size?: "sm" | "md" | "lg";
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  variant = "default",
  size = "md",
  className = "",
  disabled,
  ...props
}) => {
  const baseStyle = "inline-flex items-center justify-center rounded-xl transition-all hover:bg-bg-hover active:scale-95 outline-none focus:outline-none focus:ring-0 focus-visible:outline-none disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

  const variants = {
    default: "text-text-secondary hover:text-text-primary",
    primary: "text-primary hover:text-primary-hover",
    danger: "text-error hover:text-error",
  };

  const sizes = {
    sm: "w-8 h-8",
    md: "w-9 h-9",
    lg: "w-10 h-10",
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {icon}
    </button>
  );
};

