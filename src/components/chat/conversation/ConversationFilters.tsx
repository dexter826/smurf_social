import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export type FilterType = 'all' | 'group';

interface ConversationFiltersProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  onMarkAllRead?: () => void;
}

const filters: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'group', label: 'Nhóm' },
];

export const ConversationFilters: React.FC<ConversationFiltersProps> = ({
  activeFilter, onFilterChange, onMarkAllRead,
}) => (
  <div className="flex-shrink-0 flex items-center justify-between px-3 h-11 border-b border-border-light bg-bg-primary">
    <div className="flex items-center gap-1">
      {filters.map((filter) => {
        const isActive = activeFilter === filter.id;
        return (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 outline-none
              ${isActive
                ? 'bg-primary/10 text-primary'
                : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-hover'
              }`}
          >
            {filter.label}
          </button>
        );
      })}
    </div>

    {onMarkAllRead && (
      <button
        onClick={onMarkAllRead}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md text-text-tertiary hover:text-primary hover:bg-primary/5 transition-all duration-200 outline-none group"
        title="Đánh dấu tất cả đã đọc"
      >
        <span className="text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200 hidden xs:inline">
          Đánh dấu đã đọc
        </span>
        <CheckCircle2 size={16} />
      </button>
    )}
  </div>
);
