// app/plan/review/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { WeeklyPlan } from "@/lib/planning/types";

const dayLabels: Record<string, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const day = d.getDate();
  return `${month} ${day}`;
}

export default function PlanReviewPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [approvedMeals, setApprovedMeals] = useState<Set<string>>(new Set());
  const [replacingMeal, setReplacingMeal] = useState<string | null>(null);
  const [showReplaceInput, setShowReplaceInput] = useState<string | null>(null);
  const [replaceGuidance, setReplaceGuidance] = useState<string>("");
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [planParams, setPlanParams] = useState<{ days: any[]; categoryUids?: string[] } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("meal-planner-current-plan");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          // Convert date strings back to Date objects
          const planWithDates = {
            ...parsed,
            meals: parsed.meals.map((m: any) => ({
              ...m,
              date: new Date(m.date),
              recipe: {
                ...m.recipe, // Preserve all existing recipe fields
                // Explicitly ensure description and ingredients are preserved
                description: m.recipe?.description || undefined,
                ingredients: m.recipe?.ingredients || m.recipe?.ingredient || undefined, // Check both possible field names
              },
            })),
          };
          setPlan(planWithDates);
          
          // Load approved meals from localStorage, but only if they match the current plan
          // Check if the stored approved meals match the current plan's meal keys
          const storedApproved = localStorage.getItem("meal-planner-approved-meals");
          if (storedApproved) {
            try {
              const approved = JSON.parse(storedApproved);
              const currentMealKeys = new Set(
                planWithDates.meals.map((m: any) => `${m.day}-${m.date.toISOString()}`)
              );
              
              // Only use approved meals that still exist in the current plan
              const validApproved = approved.filter((key: string) => currentMealKeys.has(key));
              
              if (validApproved.length > 0 && validApproved.length === approved.length) {
                // All approved meals are still valid, use them
                setApprovedMeals(new Set(validApproved));
              } else {
                // Plan has changed, clear approvals
                setApprovedMeals(new Set());
                localStorage.removeItem("meal-planner-approved-meals");
              }
            } catch (err) {
              console.error("Failed to load approved meals:", err);
              setApprovedMeals(new Set());
            }
          } else {
            setApprovedMeals(new Set());
          }
          
          // Load plan generation parameters for "Regenerate All"
          const storedParams = localStorage.getItem("meal-planner-plan-params");
          if (storedParams) {
            try {
              const params = JSON.parse(storedParams);
              setPlanParams(params);
            } catch (err) {
              console.error("Failed to load plan params:", err);
            }
          }
        } catch (err) {
          console.error("Failed to load plan:", err);
        }
      }
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const handleApprove = (mealKey: string) => {
    const newApproved = new Set(approvedMeals);
    newApproved.add(mealKey);
    setApprovedMeals(newApproved);
    
    // Save to localStorage
    if (typeof window !== "undefined") {
      localStorage.setItem("meal-planner-approved-meals", JSON.stringify(Array.from(newApproved)));
    }
  };

  const handleReplaceClick = (mealKey: string) => {
    setShowReplaceInput(mealKey);
    setReplaceGuidance("");
  };

  const handleReplaceCancel = () => {
    setShowReplaceInput(null);
    setReplaceGuidance("");
  };

  const handleReplace = async (meal: any, mealKey: string) => {
    if (!plan) return;
    
    setReplacingMeal(mealKey);
    setShowReplaceInput(null);
    
    try {
      // Get all current recipes from the plan (excluding the one being replaced)
      const currentRecipes = plan.meals
        .filter((m) => `${m.day}-${m.date.toISOString()}` !== mealKey)
        .map((m) => ({
          name: m.recipe.name,
          cuisine: (m.recipe as any).cuisine || "Unknown",
          protein: (m.recipe as any).protein || "Unknown",
          ingredients: (m.recipe as any).ingredients || "",
          directions: typeof m.recipe.directions === "string" ? m.recipe.directions : "",
        }));

      const response = await fetch("/api/plan/replace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentRecipes,
          day: meal.day,
          guidance: replaceGuidance.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to replace recipe" }));
        throw new Error(errorData.error || "Failed to replace recipe");
      }

      const data = await response.json();
      const newRecipe = data.recipe;

      // Update the plan with the new recipe
      const updatedMeals = plan.meals.map((m) => {
        if (`${m.day}-${m.date.toISOString()}` === mealKey) {
          return {
            ...m,
            recipe: {
              ...m.recipe, // Preserve all existing fields
              uid: newRecipe.uid,
              name: newRecipe.name,
              description: newRecipe.description,
              ingredients: newRecipe.ingredients,
              directions: newRecipe.directions,
            },
          };
        }
        return m;
      });

      const updatedPlan = { ...plan, meals: updatedMeals };
      setPlan(updatedPlan);

      // Save updated plan to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("meal-planner-current-plan", JSON.stringify(updatedPlan));
      }

      // Remove approval if it was approved
      if (approvedMeals.has(mealKey)) {
        const newApproved = new Set(approvedMeals);
        newApproved.delete(mealKey);
        setApprovedMeals(newApproved);
        localStorage.setItem("meal-planner-approved-meals", JSON.stringify(Array.from(newApproved)));
      }

      setReplaceGuidance(""); // Clear guidance after successful replace
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to replace recipe");
    } finally {
      setReplacingMeal(null);
    }
  };

  const handleRegenerateAll = async () => {
    if (!planParams) {
      alert("Unable to regenerate: plan parameters not found");
      return;
    }
    
    setIsRegenerating(true);
    
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(planParams),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Failed to regenerate plan" }));
        throw new Error(errorData.error || "Failed to regenerate plan");
      }

      const responseData = await response.json();
      const newPlan = responseData.plan;
      
      if (!newPlan) {
        throw new Error("No plan returned from API");
      }
      
      // Update the plan
      const planWithDates = {
        ...newPlan,
        meals: newPlan.meals.map((m: any) => ({
          ...m,
          date: new Date(m.date),
          recipe: {
            ...m.recipe,
            description: m.recipe?.description || undefined,
          },
        })),
      };
      
      setPlan(planWithDates);
      
      // Clear approvals since we have a new plan
      setApprovedMeals(new Set());
      
      // Save updated plan
      if (typeof window !== "undefined") {
        localStorage.setItem("meal-planner-current-plan", JSON.stringify(planWithDates));
        localStorage.removeItem("meal-planner-approved-meals"); // Clear approved meals for new plan
      }
    } catch (err) {
      console.error(`[REVIEW] Error regenerating plan:`, err);
      alert(err instanceof Error ? err.message : "Failed to regenerate plan");
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleFinalize = async () => {
    if (!plan) return;
    
    // Store finalized plan (all approved meals) - ensure all recipe fields are preserved
    const finalizedPlan = {
      ...plan,
      meals: plan.meals
        .filter((m) => approvedMeals.has(`${m.day}-${m.date.toISOString()}`))
        .map((m) => ({
          ...m,
          recipe: {
            ...m.recipe,
            // Explicitly preserve all recipe fields
            uid: m.recipe.uid,
            name: m.recipe.name,
            description: m.recipe.description,
            ingredients: m.recipe.ingredients || (m.recipe as any).ingredients,
            directions: m.recipe.directions,
          },
        })),
    };
    
    if (typeof window !== "undefined") {
      localStorage.setItem("meal-planner-finalized-plan", JSON.stringify(finalizedPlan));
    }
    
    // Navigate to grocery list page
    router.push("/plan/grocery-list");
  };

  const allApproved = plan && plan.meals.length > 0 && plan.meals.every((m) => 
    approvedMeals.has(`${m.day}-${m.date.toISOString()}`)
  );

  if (!plan || plan.meals.length === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-xl font-bold text-gray-900 mb-4">No Plan Found</h1>
          <button
            onClick={() => router.push("/plan/days")}
            className="text-blue-600 hover:text-blue-700"
          >
            Go back to day selection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold text-slate-900">Your Meal Plan</h1>
          <div className="flex items-center">
            <button
              type="button"
              onClick={handleRegenerateAll}
              disabled={isRegenerating || !planParams}
              className={`rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors ${
                isRegenerating || !planParams
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              {isRegenerating ? "Regenerating..." : "Regenerate All"}
            </button>
            <button
              type="button"
              onClick={handleFinalize}
              disabled={!allApproved}
              className={`ml-3 rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors ${
                !allApproved
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              Finalize Plan
            </button>
          </div>
        </div>

        {/* Card wrapper for table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Day</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Recipe</th>
                  <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {plan.meals.map((meal, index) => {
                  const mealKey = `${meal.day}-${meal.date.toISOString()}`;
                  const isApproved = approvedMeals.has(mealKey);
                  const isReplacing = replacingMeal === mealKey;
                  
                  return (
                    <tr
                      key={mealKey}
                      className={`${isApproved ? "bg-green-50" : "bg-white"} hover:bg-slate-50 border-t border-slate-100`}
                    >
                      {/* Day column */}
                      <td className="py-4 px-4 text-sm">
                        <div className="flex items-center">
                          {isApproved && (
                            <span className="text-green-500 mr-2">✓</span>
                          )}
                          <span className="font-medium text-slate-900">
                            {dayLabels[meal.day]}, {formatDate(meal.date)}
                          </span>
                        </div>
                      </td>
                      
                      {/* Recipe column */}
                      <td className="py-4 px-4 text-sm">
                        {isReplacing ? (
                          <div className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                            <span className="text-sm text-slate-600">Generating new recipe...</span>
                          </div>
                        ) : (
                          <div>
                            <div className="text-sm font-semibold text-blue-700 hover:underline cursor-pointer">
                              {meal.recipe.name}
                            </div>
                            {meal.recipe.description && (
                              <div className="mt-1 text-xs text-slate-600">
                                {meal.recipe.description}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      
                      {/* Actions column */}
                      <td className="py-4 px-4 text-sm text-right">
                        {isReplacing ? (
                          <div className="flex items-center justify-end gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
                            <span className="text-sm text-slate-600">Replacing...</span>
                          </div>
                        ) : showReplaceInput === mealKey ? (
                          <div className="flex flex-col gap-2 min-w-[250px]">
                            <p className="text-xs text-slate-500 text-left">Provide guidance for a new suggestion (optional).</p>
                            <textarea
                              value={replaceGuidance}
                              onChange={(e) => setReplaceGuidance(e.target.value)}
                              placeholder="e.g., 'something spicy', 'no seafood'"
                              className="px-3 py-2 text-sm border border-slate-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              rows={3}
                              autoFocus
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReplace(meal, mealKey)}
                                disabled={isReplacing}
                                className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                  isReplacing
                                    ? "text-slate-400 bg-slate-100 cursor-not-allowed"
                                    : "text-blue-600 bg-blue-50 hover:bg-blue-100"
                                }`}
                              >
                                Suggest
                              </button>
                              <button
                                onClick={handleReplaceCancel}
                                disabled={isReplacing}
                                className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-50 rounded-md hover:bg-slate-100 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-3">
                            {isApproved ? (
                              <span className="text-sm font-semibold text-green-600">Approved</span>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleApprove(mealKey)}
                                  className="text-sm font-medium text-green-600 hover:underline mr-3"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReplaceClick(mealKey)}
                                  disabled={isReplacing}
                                  className={`text-sm font-medium ${
                                    isReplacing
                                      ? "text-slate-400 cursor-not-allowed"
                                      : "text-blue-600 hover:underline"
                                  }`}
                                >
                                  Replace
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}

