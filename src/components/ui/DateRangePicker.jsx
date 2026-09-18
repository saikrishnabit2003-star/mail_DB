import React, { useState } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameMonth, 
  isSameDay, 
  addDays,
  isWithinInterval,
  isBefore,
  isAfter,
  parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function DateRangePicker({ startDate, endDate, onChange }) {
  const [currentMonth, setCurrentMonth] = useState(startDate ? parseISO(startDate) : new Date());
  const [hoverDate, setHoverDate] = useState(null);

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

  const onDateClick = (day) => {
    if (!startDate || (startDate && endDate)) {
      onChange({ start: format(day, 'yyyy-MM-dd'), end: '' });
    } else if (startDate && !endDate) {
      const start = parseISO(startDate);
      if (isBefore(day, start)) {
        onChange({ start: format(day, 'yyyy-MM-dd'), end: '' });
      } else {
        onChange({ start: startDate, end: format(day, 'yyyy-MM-dd') });
      }
    }
  };

  const handleDoubleClick = () => {
    onChange({ start: '', end: '' });
  };

  const renderHeader = () => (
    <div className="flex justify-between items-center mb-4">
      <button type="button" onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>
      <span className="font-semibold text-gray-800">
        {format(currentMonth, 'MMMM yyyy')}
      </span>
      <button type="button" onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </button>
    </div>
  );

  const renderDays = () => {
    const days = [];
    let startDateOfWeek = startOfWeek(currentMonth);
    for (let i = 0; i < 7; i++) {
      days.push(
        <div className="text-center font-medium text-xs text-gray-500 py-1" key={i}>
          {format(addDays(startDateOfWeek, i), 'EEEEE')}
        </div>
      );
    }
    return <div className="grid grid-cols-7 mb-2">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDateOfWeek = startOfWeek(monthStart);
    const endDateOfWeek = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDateOfWeek;
    let formattedDate = '';

    const start = startDate ? parseISO(startDate) : null;
    const end = endDate ? parseISO(endDate) : null;

    while (day <= endDateOfWeek) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, 'd');
        const cloneDay = day;

        const isSelectedStart = start && isSameDay(day, start);
        const isSelectedEnd = end && isSameDay(day, end);
        
        let isHoverRange = false;
        if (start && !end && hoverDate && isAfter(hoverDate, start)) {
          isHoverRange = isWithinInterval(day, { start, end: hoverDate });
        }

        const isInRange = start && end && isWithinInterval(day, { start, end });
        const isCurrentMonth = isSameMonth(day, monthStart);

        let cellClasses = "flex items-center justify-center w-8 h-8 text-sm cursor-pointer transition-colors rounded-full ";
        let wrapperClasses = "p-0.5 ";
        
        if (isInRange || isHoverRange) {
          wrapperClasses += "bg-primary/10 ";
          if (isSelectedStart) wrapperClasses += "rounded-l-full ";
          if (isSelectedEnd || (isHoverRange && isSameDay(day, hoverDate))) wrapperClasses += "rounded-r-full ";
        }

        if (isSelectedStart || isSelectedEnd) {
          cellClasses += "bg-primary text-white font-semibold shadow-sm";
        } else if (!isCurrentMonth) {
          cellClasses += "text-gray-300";
        } else {
          cellClasses += "text-gray-700 hover:bg-gray-100";
        }

        days.push(
          <div 
            key={day.toISOString()} 
            className={wrapperClasses}
            onMouseEnter={() => setHoverDate(cloneDay)}
            onDoubleClick={handleDoubleClick}
            onClick={() => onDateClick(cloneDay)}
          >
            <div className={cellClasses}>
              {formattedDate}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 gap-0" key={day.toISOString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div onMouseLeave={() => setHoverDate(null)}>{rows}</div>;
  };

  return (
    <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xl w-[280px] select-none">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
      <div className="mt-4 text-xs text-center text-gray-400">
        Double click any date to reset selection
      </div>
    </div>
  );
}
