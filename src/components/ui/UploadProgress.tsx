import React from 'react';
import { formatBytes } from '../../utils/uploadUtils';

interface UploadProgressProps {
  progress: number;
  bytesTransferred?: number;
  totalBytes?: number;
  fileName?: string;
  showDetails?: boolean;
  className?: string;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  progress,
  bytesTransferred,
  totalBytes,
  fileName,
  showDetails = false,
  className = '',
}) => {
  const isComplete = progress >= 100;

  return (
    <div className={`w-full ${className}`}>
      {fileName && (
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-text-secondary truncate max-w-[200px]">
            {fileName}
          </span>
          <span className="text-xs font-medium text-text-primary">
            {Math.round(progress)}%
          </span>
        </div>
      )}
      
      <div className="w-full h-1.5 bg-bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-slow rounded-full ${
            isComplete ? 'bg-success' : 'bg-primary'
          }`}
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>

      {showDetails && bytesTransferred !== undefined && totalBytes !== undefined && (
        <div className="flex items-center justify-between mt-1">
          <span className="text-[10px] text-text-tertiary">
            {formatBytes(bytesTransferred)} / {formatBytes(totalBytes)}
          </span>
          {isComplete && (
            <span className="text-[10px] text-success font-medium">
              Hoàn tất
            </span>
          )}
        </div>
      )}
    </div>
  );
};

interface MultiUploadProgressProps {
  files: { name: string; progress: number }[];
  className?: string;
}

export const MultiUploadProgress: React.FC<MultiUploadProgressProps> = ({
  files,
  className = '',
}) => {
  const completedCount = files.filter(f => f.progress >= 100).length;
  const totalProgress = files.reduce((acc, f) => acc + f.progress, 0) / files.length;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary">
          Đang tải {completedCount}/{files.length} files
        </span>
        <span className="text-xs font-bold text-primary">
          {Math.round(totalProgress)}%
        </span>
      </div>
      
      <div className="w-full h-2 bg-bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-slow rounded-full"
          style={{ width: `${Math.min(totalProgress, 100)}%` }}
        />
      </div>

      {files.length <= 5 && (
        <div className="space-y-1">
          {files.map((file, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex-1 h-1 bg-bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 rounded-full ${
                    file.progress >= 100 ? 'bg-success' : 'bg-primary/60'
                  }`}
                  style={{ width: `${file.progress}%` }}
                />
              </div>
              <span className="text-[10px] text-text-tertiary truncate max-w-[100px]">
                {file.name}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
