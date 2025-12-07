// app/plan/days/page.tsx
"use client";

import { useState } from "react";
import { usePlanningState } from "@/lib/hooks/usePlanningState";
import DaySelector from "@/components/DaySelector";
import { useRouter } from "next/navigation";

function formatWeekRange(startDate?: Date, endDate?: Date): string {
  if (!startDate || !endDate) return "";
  const startMonth = startDate.toLocaleDateString("en-US", { month: "short" });
  const startDay = startDate.getDate();
  const endMonth = endDate.toLocaleDateString("en-US", { month: "short" });
  const endDay = endDate.getDate();
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay} - ${endDay}`;
  }
  return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
}

export default function DaySelectionPage() {
  const router = useRouter();
  const {
    days,
    toggleDay,
    selectedDaysCount,
    selectedDays,
  } = usePlanningState();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContinue() {
    if (selectedDays.length === 0) {
      return;
    }

    // Show loading state immediately
    setIsGenerating(true);
    setError(null);

    try {
      // Get selected category UIDs from localStorage
      const selectedCategories = typeof window !== "undefined"
        ? JSON.parse(localStorage.getItem("meal-planner-selected-categories") || "[]")
        : [];

      // Build request body
      const selectedDaysData = selectedDays.map((day) => ({
        day: day.day,
        date: day.date.toISOString(),
        needsDinner: day.needsDinner,
      }));

      console.log(`[DAYS PAGE] Starting API call for ${selectedDaysData.length} days...`);
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          days: selectedDaysData,
          categoryUids: selectedCategories.length > 0 ? selectedCategories : undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to generate plan" }));
        throw new Error(errorData.error || "Failed to generate plan");
      }

      const responseData = await response.json();
      
      // Extract the plan from the response (API returns { success: true, plan: {...} })
      const plan = responseData.plan;
      
      if (!plan) {
        throw new Error("No plan returned from API");
      }
      
      // Store plan in localStorage for review page
      if (typeof window !== "undefined") {
        localStorage.setItem("meal-planner-current-plan", JSON.stringify(plan));
        // Store plan generation parameters for "Regenerate All" functionality
        localStorage.setItem("meal-planner-plan-params", JSON.stringify({
          days: selectedDaysData,
          categoryUids: selectedCategories.length > 0 ? selectedCategories : undefined,
        }));
        // Clear approved meals when generating a new plan
        localStorage.removeItem("meal-planner-approved-meals");
      }

      // Navigate to review page only after everything is complete
      router.push("/plan/review");
    } catch (err) {
      console.error(`[DAYS PAGE] Error:`, err);
      setError(err instanceof Error ? err.message : "Failed to generate plan");
      setIsGenerating(false);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-4 text-sm text-blue-600 hover:text-blue-700 active:text-blue-800 flex items-center"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back
          </button>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Select Days</h1>
          {days.length > 0 && (
            <p className="text-sm text-gray-600">
              {formatWeekRange(days[0]?.date, days[days.length - 1]?.date)}
            </p>
          )}
        </div>

        {/* Day Selector */}
        <DaySelector
          days={days}
          onToggle={toggleDay}
          selectedCount={selectedDaysCount}
        />

        {/* Error Message */}
        {error && (
          <div className="mt-4 mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Continue Button */}
        <div className="mt-6 pb-6 flex justify-center">
          <button
            type="button"
            disabled={selectedDaysCount === 0 || isGenerating}
            onClick={handleContinue}
            className={`max-w-md w-full py-3 px-4 rounded-full text-base font-medium transition-colors flex items-center justify-center gap-2 ${
              selectedDaysCount === 0 || isGenerating
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
            }`}
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent"></div>
                <span>Generating Plan...</span>
              </>
            ) : (
              "Continue to Planning"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

