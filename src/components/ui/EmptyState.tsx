import React from 'react';
import { LucideIcon } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: LucideIcon | React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  variant?: 'default' | 'boxed' | 'error';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  variant = 'default',
  size = 'md',
  className = '',
}) => {
  const sizeConfig = {
    sm: { icon: 20, title: 'text-sm', desc: 'text-xs', gap: 'gap-3', iconContainer: 'w-10 h-10' },
    md: { icon: 28, title: 'text-base', desc: 'text-sm', gap: 'gap-4', iconContainer: 'w-14 h-14' },
    lg: { icon: 40, title: 'text-lg', desc: 'text-sm', gap: 'gap-6', iconContainer: 'w-20 h-20' },
  }[size];

  const variantClasses = {
    default: 'bg-transparent',
    boxed: 'bg-bg-primary rounded-2xl border border-border-light p-8 md:p-12 shadow-sm',
    error: 'bg-error/5 rounded-2xl border border-error/10 p-8',
  }[variant];

  const iconColor = variant === 'error' ? 'text-error' : 'text-text-tertiary';

  const renderIcon = () => {
    if (!icon) return null;
    
    if (React.isValidElement(icon)) {
      return icon;
    }

    const IconComp = icon as any;
    return <IconComp size={sizeConfig.icon} className={iconColor} strokeWidth={1.5} />;
  };

  return (
    <div 
      className={`flex flex-col items-center justify-center text-center animate-fade-in ${sizeConfig.gap} ${variantClasses} ${className}`}
    >
      {icon && (
        <div className={`${sizeConfig.iconContainer} rounded-full bg-bg-secondary/40 flex items-center justify-center border border-border-light/50 flex-shrink-0`}>
          {renderIcon()}
        </div>
      )}
      
      <div className="max-w-sm space-y-1">
        <h3 className={`${sizeConfig.title} font-semibold text-text-primary`}>
          {title}
        </h3>
        {description && (
          <p className={`${sizeConfig.desc} text-text-tertiary leading-relaxed`}>
            {description}
          </p>
        )}
      </div>

      {action && (
        <Button
          onClick={action.onClick}
          variant={variant === 'error' ? 'danger' : 'secondary'}
          size="sm"
          icon={action.icon}
          className="mt-2"
        >
          {action.label}
        </Button>
      )}
    </div>
  );
};
