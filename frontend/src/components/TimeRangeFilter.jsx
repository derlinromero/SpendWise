import React from 'react';

const TIME_RANGES = [
  { label: '1w', value: '1w', days: 7 },
  { label: '1m', value: '1m', days: 30 },
  { label: '3m', value: '3m', days: 90 },
  { label: '6m', value: '6m', days: 180 },
  { label: '1y', value: '1y', days: 365 },
  { label: 'max', value: 'max', days: null },
];

function TimeRangeFilter({ value, onChange }) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {TIME_RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
            value === range.value
              ? 'bg-white text-cyan-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

export { TimeRangeFilter, TIME_RANGES };