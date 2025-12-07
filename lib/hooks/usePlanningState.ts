// lib/hooks/usePlanningState.ts

import { useState, useEffect, useCallback } from "react";
import { DayRequirement, Weekday } from "@/lib/planning/types";

const STORAGE_KEY = "meal-planner-day-selection";

// Get the upcoming week (Sunday to Saturday)
export function getUpcomingWeek(): DayRequirement[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0 = Sunday, 6 = Saturday
  
  // Find the next Sunday (or use today if it's Sunday)
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday);
  nextSunday.setHours(0, 0, 0, 0);
  
  const weekdays: Weekday[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  
  return weekdays.map((day, index) => {
    const date = new Date(nextSunday);
    date.setDate(nextSunday.getDate() + index);
    return {
      day,
      needsDinner: false,
      date,
    };
  });
}

export function usePlanningState() {
  // Always start with default state to avoid hydration mismatch
  const [days, setDays] = useState<DayRequirement[]>(getUpcomingWeek);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load from localStorage after hydration
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          // Convert date strings back to Date objects
          const daysWithDates = parsed.map((d: any) => ({
            ...d,
            date: new Date(d.date),
          }));
          // Check if stored week is still current (within 7 days)
          if (daysWithDates.length > 0) {
            const firstDate = new Date(daysWithDates[0]?.date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            firstDate.setHours(0, 0, 0, 0);
            const daysDiff = Math.floor(
              (firstDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
            );
            // If the stored week is for this week or next week (0-13 days ahead), use it
            if (daysDiff >= 0 && daysDiff < 14) {
              setDays(daysWithDates);
            }
          }
        }
      } catch (err) {
        console.error("Failed to load planning state from localStorage:", err);
      }
      setIsHydrated(true);
    }
  }, []);

  // Save to localStorage whenever days change (only after hydration)
  useEffect(() => {
    if (typeof window !== "undefined" && isHydrated && days.length > 0) {
      try {
        // Serialize dates as ISO strings
        const serialized = days.map(d => ({
          ...d,
          date: d.date.toISOString(),
        }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
      } catch (err) {
        console.error("Failed to save planning state to localStorage:", err);
      }
    }
  }, [days, isHydrated]);

  const toggleDay = useCallback((day: Weekday) => {
    setDays((prev) => {
      const updated = prev.map((d) =>
        d.day === day ? { ...d, needsDinner: !d.needsDinner } : d
      );
      return updated;
    });
  }, []);

  function setDayNeedsDinner(day: Weekday, needsDinner: boolean) {
    setDays((prev) =>
      prev.map((d) => (d.day === day ? { ...d, needsDinner } : d))
    );
  }

  function resetDays() {
    setDays(getUpcomingWeek());
  }

  const selectedDaysCount = days.filter((d) => d.needsDinner).length;
  const selectedDays = days.filter((d) => d.needsDinner);

  return {
    days,
    toggleDay,
    setDayNeedsDinner,
    resetDays,
    selectedDaysCount,
    selectedDays,
  };
}

