// components/DaySelector.tsx
"use client";

import { DayRequirement, Weekday } from "@/lib/planning/types";
import DayCard from "./DayCard";

interface DaySelectorProps {
  days: DayRequirement[];
  onToggle: (day: Weekday) => void;
  selectedCount: number;
}

const dayAbbreviations: Record<Weekday, string> = {
  sunday: "Sun",
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
};

function formatDate(date: Date): string {
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  return `${month} ${day}`;
}

export default function DaySelector({
  days,
  onToggle,
  selectedCount,
}: DaySelectorProps) {
  // Get the date range for the week
  const startDate = days[0]?.date;
  const endDate = days[days.length - 1]?.date;
  const weekLabel =
    startDate && endDate
      ? `${formatDate(startDate)} - ${formatDate(endDate)}`
      : "";

  return (
    <div className="w-full">
      {/* Day Cards Grid */}
      <div className="flex gap-4 justify-center flex-wrap mb-4">
        {days.map((day) => {
          const isSelected = day.needsDinner;
          const dayLabel = dayAbbreviations[day.day];
          const dateStr = formatDate(day.date);

          return (
            <DayCard
              key={`${day.day}-${day.needsDinner}`}
              label={dayLabel}
              date={dateStr}
              isSelected={isSelected}
              onClick={() => onToggle(day.day)}
            />
          );
        })}
      </div>

      {/* Summary */}
      <div className="mb-3">
        <p className="text-xs text-gray-600 text-center">
          {selectedCount === 0
            ? "No days selected"
            : selectedCount === 1
            ? "1 day selected"
            : `${selectedCount} days selected`}
        </p>
      </div>
    </div>
  );
}

