import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud } from 'lucide-react';

interface DragDropZoneProps {
  children: React.ReactNode;
  disabled?: boolean;
}

export const DragDropZone: React.FC<DragDropZoneProps> = ({ children, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const dragCounter = useRef(0);

  // Prevent default behavior to avoid opening the file in the browser
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => e.preventDefault();
    const handleDrop = (e: DragEvent) => e.preventDefault();

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;
    
    // Check if the dragged items are files
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const isFile = Array.from(e.dataTransfer.items).some(item => item.kind === 'file');
      if (!isFile) return;
    }

    dragCounter.current += 1;
    if (dragCounter.current === 1) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;

    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (disabled) return;

    setIsDragging(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      window.dispatchEvent(new CustomEvent('chat:drop-files', {
        detail: { files }
      }));
    }
  };

  return (
    <div 
      className="relative flex-1 flex flex-col min-w-0 w-full h-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {children}
      
      {/* Overlay */}
      {isDragging && !disabled && (
        <div 
          className="absolute inset-0 z-[var(--z-modal)] flex flex-col items-center justify-center bg-bg-primary/60 backdrop-blur-sm transition-all duration-300 animate-in fade-in rounded-lg m-2 border-2 border-dashed border-primary/50"
          style={{ zIndex: 999 }}
        >
          <div className="w-16 h-16 bg-primary/5 rounded-full flex items-center justify-center mb-4">
            <UploadCloud size={32} className="text-primary/70" />
          </div>
          <h3 className="text-xl font-medium text-text-primary mb-1">Thả tệp để đính kèm</h3>
          <p className="text-xs text-text-secondary">Tệp sẽ được nạp vào hàng đợi tin nhắn</p>
        </div>
      )}
    </div>
  );
};
