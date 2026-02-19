import React from 'react';
import { X } from 'lucide-react';

interface CircularProgressProps {
  progress: number;
  size?: number;
  strokeWidth?: number;
  showPercentage?: boolean;
  showCancel?: boolean;
  onCancel?: () => void;
  className?: string;
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 48,
  strokeWidth = 3,
  showPercentage = true,
  showCancel = false,
  onCancel,
  className = '',
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;
  const isComplete = progress >= 100;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      {/* Background circle */}
      <svg className="absolute transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--text-inverse, rgba(255,255,255,0.3))"
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={isComplete ? 'var(--color-success)' : 'var(--text-inverse, #ffffff)'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-slow"
        />
      </svg>

      {/* Center content */}
      <div className="relative z-10 flex items-center justify-center">
        {showCancel && onCancel && !isComplete ? (
          <button
            onClick={onCancel}
            className="p-1 rounded-full hover:bg-white/20 active:bg-white/30 transition-all duration-base"
            title="Hủy upload"
            aria-label="Hủy upload"
          >
            <X size={size * 0.35} className="text-text-inverse" />
          </button>
        ) : showPercentage ? (
          <span
            className="text-text-inverse font-semibold"
            style={{ fontSize: size * 0.25 }}
          >
            {isComplete ? '✓' : `${Math.round(progress)}%`}
          </span>
        ) : null}
      </div>
    </div>
  );
};

// ========== OVERLAY ========== 
interface CircularProgressOverlayProps extends CircularProgressProps {
  isVisible: boolean;
}

export const CircularProgressOverlay: React.FC<CircularProgressOverlayProps> = ({
  isVisible,
  ...props
}) => {
  if (!isVisible) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-[2px] rounded-lg z-10">
      <CircularProgress {...props} />
    </div>
  );
};
