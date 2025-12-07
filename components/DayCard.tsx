// components/DayCard.tsx
"use client";

interface DayCardProps {
  label: string;
  date: string;
  isSelected: boolean;
  onClick: () => void;
}

export default function DayCard({
  label,
  date,
  isSelected,
  onClick,
}: DayCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative w-20 h-20 rounded-lg border-2 transition-all cursor-pointer touch-manipulation flex flex-col items-center justify-center ${
        isSelected
          ? "bg-blue-600 text-white border-blue-600 shadow-sm active:bg-blue-700"
          : "bg-white text-gray-900 border-gray-200 hover:border-gray-300 active:bg-gray-50"
      }`}
    >
      {isSelected && (
        <div className="absolute top-1.5 right-1.5">
          <svg
            className="w-4 h-4 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}
      <div className={`text-xs font-medium ${isSelected ? "text-white" : "text-gray-900"}`}>
        {label}
      </div>
      <div className={`text-xs ${isSelected ? "text-blue-100" : "text-gray-600"}`}>
        {date}
      </div>
    </button>
  );
}

