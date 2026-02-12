import React, { useState } from 'react';

interface TruncatedTextProps {
  content: string;
  threshold?: number;
  className?: string;
  expandClassName?: string;
}

export const TruncatedText: React.FC<TruncatedTextProps> = ({
  content,
  threshold = 300,
  className = '',
  expandClassName = 'text-primary font-bold cursor-pointer hover:underline ml-1.5 transition-all duration-base text-sm tracking-wider'
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const shouldTruncate = content.length > threshold;
  const displayContent = !shouldTruncate || isExpanded
    ? content
    : content.slice(0, threshold) + '...';

  return (
    <span className={className}>
      {displayContent}
      {shouldTruncate && (
        <span
          onClick={() => setIsExpanded(!isExpanded)}
          className={expandClassName}
        >
          {isExpanded ? 'Thu gọn' : 'Xem thêm'}
        </span>
      )}
    </span>
  );
};
