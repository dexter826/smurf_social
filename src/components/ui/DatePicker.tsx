import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, isToday } from 'date-fns';
import { vi } from 'date-fns/locale';

interface DatePickerProps {
  label?: string;
  value?: number; // Timestmap
  onChange: (timestamp: number) => void;
  error?: string;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  label,
  value,
  onChange,
  error,
  placeholder = 'Chọn ngày',
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value) : new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // DatePicker cần nhiều chỗ hơn (khoảng 350px)
      setOpenUp(spaceBelow < 350);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleOpen = () => {
    if (!disabled) setIsOpen(!isOpen);
  };

  const handleDateSelect = (date: Date) => {
    onChange(date.getTime());
    setIsOpen(false);
  };

  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-light">
        <span className="text-sm font-bold text-text-primary capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: vi })}
        </span>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors text-text-secondary"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1.5 hover:bg-bg-hover rounded-lg transition-colors text-text-secondary"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day, i) => (
          <div key={i} className="text-[10px] font-bold text-center text-text-tertiary uppercase py-2">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const d = day;
        const isSelected = value && isSameDay(d, new Date(value));
        const isCurrentMonth = isSameMonth(d, monthStart);

        days.push(
          <button
            key={d.toString()}
            type="button"
            onClick={() => handleDateSelect(d)}
            className={`
              relative h-10 w-full flex items-center justify-center text-sm transition-all rounded-lg
              ${!isCurrentMonth ? 'text-text-tertiary opacity-40' : 'text-text-primary'}
              ${isSelected ? 'bg-primary text-white font-bold shadow-md scale-105' : 'hover:bg-bg-hover'}
              ${isToday(d) && !isSelected ? 'text-primary font-bold' : ''}
            `}
          >
            {format(d, 'd')}
            {isToday(d) && !isSelected && (
              <div className="absolute bottom-1 w-1 h-1 bg-primary rounded-full" />
            )}
          </button>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 gap-1" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div className="px-2 pb-3">{rows}</div>;
  };

  const displayValue = value ? format(new Date(value), 'dd/MM/yyyy') : '';

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && (
        <label className="text-xs font-semibold text-text-secondary ml-1 cursor-pointer">
          {label}
        </label>
      )}

      <div className="relative">
        <div
          onClick={toggleOpen}
          className={`
            w-full h-11 px-4 flex items-center justify-between rounded-xl border outline-none transition-all
            bg-bg-primary text-sm
            ${isOpen ? 'border-primary ring-4 ring-primary-light/30' : 'border-border-light hover:border-primary'}
            ${error ? 'border-error ring-4 ring-error/10' : ''}
            ${disabled ? 'opacity-50 cursor-not-allowed bg-bg-secondary' : 'cursor-pointer'}
            ${className}
          `}
        >
          <span className={`truncate ${!value ? 'text-text-tertiary' : 'text-text-primary'}`}>
            {displayValue || placeholder}
          </span>
          <CalendarIcon 
            size={18} 
            className="text-text-tertiary" 
          />
        </div>

        {isOpen && (
          <div className={`
            absolute z-50 w-72 bg-bg-primary border border-border-light rounded-2xl shadow-lg transition-all animate-in fade-in zoom-in-95 duration-200 left-0
            ${openUp ? 'bottom-full mb-2' : 'top-full mt-2'}
          `}>
            {renderHeader()}
            <div className="p-2">
              {renderDays()}
              {renderCells()}
            </div>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-0.5 ml-1 text-[11px] font-medium text-error animate-fade-in">
          {error}
        </p>
      )}
    </div>
  );
};
