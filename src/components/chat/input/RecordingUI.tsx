import React from 'react';
import { Square } from 'lucide-react';
import { Button } from '../../ui';

interface RecordingUIProps {
  duration: number;
  onCancel: () => void;
  onStop: () => void;
}

export const RecordingUI: React.FC<RecordingUIProps> = ({
  duration,
  onCancel,
  onStop
}) => {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex items-center justify-between bg-bg-secondary rounded-2xl px-4 py-3 border border-primary animate-pulse-soft">
      <div className="flex items-center gap-2 text-primary font-medium">
        <div className="w-2 h-2 rounded-full bg-error animate-pulse" />
        <span>{formatTime(duration)}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button 
          variant="ghost"
          size="sm"
          type="button"
          onClick={onCancel}
          className="p-1 hover:bg-bg-hover text-text-secondary text-sm h-auto"
        >
          Hủy
        </Button>
        <Button
          type="button"
          variant="primary"
          size="sm"
          onClick={onStop}
          className="rounded-full"
          icon={<Square size={16} fill="currentColor" />}
        />
      </div>
    </div>
  );
};
