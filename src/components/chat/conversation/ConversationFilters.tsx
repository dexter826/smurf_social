import React from 'react';
import { Button } from '../../ui';

export type FilterType = 'all' | 'group';

interface ConversationFiltersProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

export const ConversationFilters: React.FC<ConversationFiltersProps> = ({
  activeFilter,
  onFilterChange,
}) => {
  const filters: { id: FilterType; label: string }[] = [
    { id: 'all', label: 'Tất cả' },
    { id: 'group', label: 'Nhóm' },
  ];

  return (
    <div className="flex-shrink-0 flex items-center px-4 h-12 border-b border-border-light bg-bg-primary">
      {filters.map((filter) => (
        <Button
          key={filter.id}
          variant="ghost"
          onClick={() => onFilterChange(filter.id)}
          className={`flex-1 h-full relative hover:!bg-transparent hover:!text-current transition-colors ${
            activeFilter === filter.id ? 'text-primary' : 'text-text-tertiary'
          }`}
        >
          {filter.label}
          {activeFilter === filter.id && (
            <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-primary rounded-t-full" />
          )}
        </Button>
      ))}
    </div>
  );
};
