// app/plan/grocery-list/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { WeeklyPlan } from "@/lib/planning/types";

export default function GroceryListPage() {
  const router = useRouter();
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [groceryList, setGroceryList] = useState<string>("");
  const [recipePacket, setRecipePacket] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"grocery" | "recipes">("grocery");

  useEffect(() => {
    async function generateGroceryList() {
      if (typeof window === "undefined") return;

      // Load finalized plan from localStorage
      const stored = localStorage.getItem("meal-planner-finalized-plan");
      if (!stored) {
        setError("No finalized plan found. Please go back and finalize your plan.");
        setLoading(false);
        return;
      }

      try {
        const parsed = JSON.parse(stored);
        const planWithDates = {
          ...parsed,
          meals: parsed.meals.map((m: any) => ({
            ...m,
            date: new Date(m.date),
            recipe: {
              ...m.recipe,
              // Ensure all recipe fields are preserved
              ingredients: m.recipe?.ingredients || undefined,
            },
          })),
        };
        
        setPlan(planWithDates);

        // Call API to generate grocery list
        const response = await fetch("/api/grocery-list", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ plan: planWithDates }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: "Failed to generate grocery list" }));
          throw new Error(errorData.error || "Failed to generate grocery list");
        }

        const data = await response.json();
        setGroceryList(data.groceryList || "");
        setRecipePacket(data.recipePacket || "");
      } catch (err) {
        console.error("Failed to generate grocery list:", err);
        setError(err instanceof Error ? err.message : "Failed to generate grocery list");
      } finally {
        setLoading(false);
      }
    }

    generateGroceryList();
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert("Copied to clipboard!");
    }).catch((err) => {
      console.error("Failed to copy:", err);
      alert("Failed to copy to clipboard");
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Generating grocery list...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-100">
        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h1 className="text-2xl font-semibold text-slate-900 mb-4">Error</h1>
            <p className="text-slate-600 mb-4">{error}</p>
            <button
              onClick={() => router.push("/plan/review")}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm text-blue-600 hover:text-blue-700 flex items-center"
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
          <h1 className="text-3xl font-semibold text-slate-900">Ready to Copy</h1>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("grocery")}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === "grocery"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Grocery List
            </button>
            <button
              onClick={() => setActiveTab("recipes")}
              className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                activeTab === "recipes"
                  ? "text-blue-600 border-b-2 border-blue-600 bg-blue-50"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Recipes
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === "grocery" ? (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-slate-900">Grocery List</h2>
                  <button
                    onClick={() => handleCopy(groceryList)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <textarea
                  readOnly
                  value={groceryList}
                  className="w-full h-96 p-4 border border-slate-300 rounded-md font-mono text-sm bg-slate-50 resize-none"
                />
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold text-slate-900">Recipe Packet</h2>
                  <button
                    onClick={() => handleCopy(recipePacket)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                  >
                    Copy to Clipboard
                  </button>
                </div>
                <textarea
                  readOnly
                  value={recipePacket}
                  className="w-full h-96 p-4 border border-slate-300 rounded-md font-mono text-sm bg-slate-50 resize-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

