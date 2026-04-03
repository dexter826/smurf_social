import React from 'react';

export type FilterType = 'all' | 'group';

interface ConversationFiltersProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const filters: { id: FilterType; label: string }[] = [
  { id: 'all', label: 'Tất cả' },
  { id: 'group', label: 'Nhóm' },
];

export const ConversationFilters: React.FC<ConversationFiltersProps> = ({
  activeFilter, onFilterChange,
}) => (
  <div className="flex-shrink-0 flex items-center px-3 h-11 border-b border-border-light bg-bg-primary gap-1">
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
);
