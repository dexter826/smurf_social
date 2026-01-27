import React, { forwardRef, useEffect, useRef, useImperativeHandle } from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerClassName?: string;
  error?: string;
  autoResize?: boolean;
  maxHeight?: number;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(({ 
  label,
  icon, 
  rightElement, 
  className = '', 
  containerClassName = '', 
  error, 
  id,
  autoResize = false,
  maxHeight = 120,
  onChange,
  value,
  ...props 
}, ref) => {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(ref, () => innerRef.current!);

  const inputId = id || (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

  useEffect(() => {
    if (autoResize && innerRef.current) {
      innerRef.current.style.height = 'auto';
      innerRef.current.style.height = `${Math.min(innerRef.current.scrollHeight, maxHeight)}px`;
    }
  }, [value, autoResize, maxHeight]);

  return (
    <div className={`flex flex-col gap-1.5 w-full ${containerClassName}`}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-semibold text-text-secondary ml-1 cursor-pointer">
          {label}
        </label>
      )}
      <div className={`
        relative group transition-all
        bg-bg-primary border border-border-light
        focus-within:border-primary focus-within:ring-4 focus-within:ring-primary-light/30
        ${!className.includes('rounded-') ? 'rounded-xl' : ''}
        ${error ? 'border-error ring-4 ring-error/10' : ''} 
        ${className}
      `}>
        {icon && (
          <div className="absolute top-3 left-0 pl-3.5 flex items-start pointer-events-none text-text-tertiary group-focus-within:text-primary transition-colors">
            {icon}
          </div>
        )}
        <textarea
          ref={innerRef}
          id={inputId}
          className={`
            block w-full bg-transparent outline-none text-[15px] leading-relaxed resize-none
            text-text-primary placeholder:text-text-tertiary
            ${icon ? 'pl-11' : 'pl-4'} 
            ${rightElement ? 'pr-32' : 'pr-4'} 
            ${!className.includes('py-') ? 'py-2' : ''}
            ${!className.includes('min-h-') ? 'min-h-[40px]' : ''}
            overflow-y-auto custom-scrollbar
          `}
          rows={1}
          value={value}
          onChange={(e) => {
            onChange?.(e);
          }}
          {...props}
        />
        {rightElement && (
          <div className="absolute bottom-1 right-1 pr-1 flex items-center h-8">
            {rightElement}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-0.5 ml-1 text-[11px] font-medium text-error flex items-center gap-1 animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
});

TextArea.displayName = 'TextArea';
