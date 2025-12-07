// app/plan/page.tsx
"use client";

import { useState, useEffect } from "react";
import { PaprikaCategory, PaprikaRecipe } from "@/lib/paprika/types";
import { useRouter } from "next/navigation";

export default function PlanPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<PaprikaCategory[]>([]);
  const [selectedCategoryUids, setSelectedCategoryUids] = useState<string[]>([]);
  const [useAllRecipes, setUseAllRecipes] = useState(true);
  const [recipes, setRecipes] = useState<PaprikaRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await fetch("/api/paprika/categories");
        const data = await res.json();
        if (data.error) {
          setError(data.error);
        } else {
          setCategories(data.categories || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load categories");
      }
    }
    loadCategories();
  }, []);

  // Load recipes when categories change
  useEffect(() => {
    if (categories.length > 0) {
      loadRecipes();
    }
  }, [selectedCategoryUids, useAllRecipes]);

  async function loadRecipes() {
    setLoading(true);
    setError(null);
    try {
      let url = "/api/paprika/recipes";
      if (!useAllRecipes && selectedCategoryUids.length > 0) {
        const params = new URLSearchParams();
        selectedCategoryUids.forEach((uid) => params.append("category", uid));
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setRecipes([]);
      } else {
        setRecipes(data.recipes || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load recipes");
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  }

  function handleCategoryToggle(categoryUid: string) {
    if (useAllRecipes) {
      setUseAllRecipes(false);
    }
    
    setSelectedCategoryUids((prev) => {
      const updated = prev.includes(categoryUid)
        ? prev.filter((uid) => uid !== categoryUid)
        : [...prev, categoryUid];
      
      // Store in localStorage
      if (typeof window !== "undefined") {
        if (updated.length === 0) {
          localStorage.removeItem("meal-planner-selected-categories");
        } else {
          localStorage.setItem("meal-planner-selected-categories", JSON.stringify(updated));
        }
      }
      
      return updated;
    });
  }

  function handleUseAllToggle() {
    if (useAllRecipes) {
      setUseAllRecipes(false);
    } else {
      setUseAllRecipes(true);
      setSelectedCategoryUids([]);
      // Clear localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("meal-planner-selected-categories");
      }
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Meal Planner</h1>

        {/* Category Selection Section */}
        <section className="mb-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Filter Recipes (Optional)
          </h2>
          <p className="text-sm text-gray-600 mb-3">
            Select categories or use all recipes
          </p>

          {/* Use All Recipes Toggle */}
          <div className="mb-3">
            <label className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-gray-50">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={useAllRecipes}
                  onChange={handleUseAllToggle}
                  className="sr-only"
                />
                <div
                  className={`w-11 h-6 rounded-full transition-colors ${
                    useAllRecipes ? "bg-blue-600" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                      useAllRecipes ? "translate-x-5" : "translate-x-0.5"
                    }`}
                    style={{ marginTop: "2px" }}
                  />
                </div>
              </div>
              <span className="text-base font-medium text-gray-900">
                Use All Recipes
              </span>
            </label>
          </div>

          {/* Category Checkboxes */}
          {!useAllRecipes && (
            <div className="space-y-1">
              {categories.map((category) => (
                <label
                  key={category.uid}
                  className="flex items-center space-x-3 cursor-pointer p-2.5 rounded-md hover:bg-gray-50 active:bg-gray-100"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategoryUids.includes(category.uid)}
                    onChange={() => handleCategoryToggle(category.uid)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{category.name}</span>
                </label>
              ))}
            </div>
          )}

          {/* Selected Categories Display */}
          {!useAllRecipes && selectedCategoryUids.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedCategoryUids.map((uid) => {
                const category = categories.find((c) => c.uid === uid);
                return category ? (
                  <span
                    key={uid}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {category.name}
                  </span>
                ) : null;
              })}
            </div>
          )}
        </section>

        {/* Recipe List Section */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900">
              {loading ? "Loading recipes..." : `${recipes.length} Recipes Available`}
            </h2>
            {!loading && recipes.length > 0 && (
              <button
                onClick={loadRecipes}
                className="px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 active:bg-blue-200"
              >
                Refresh
              </button>
            )}
          </div>

          {/* Error State */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && recipes.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">
                No recipes found. {!useAllRecipes && "Try selecting different categories."}
              </p>
            </div>
          )}

          {/* Recipe List */}
          {!loading && recipes.length > 0 && (
            <div className="space-y-2">
              {recipes.map((recipe) => (
                <div
                  key={recipe.uid}
                  className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition-colors bg-white"
                >
                  <h3 className="text-sm font-semibold text-gray-900 mb-1.5">
                    {recipe.name}
                  </h3>
                  {recipe.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {recipe.categories.map((categoryUid) => {
                        const category = categories.find((c) => c.uid === categoryUid);
                        return category ? (
                          <span
                            key={categoryUid}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700"
                          >
                            {category.name}
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Continue to Day Selection Button */}
        <div className="mt-8 pb-6">
          <button
            type="button"
            onClick={() => router.push("/plan/days")}
            className="w-full py-3 px-4 rounded-md text-base font-medium bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 transition-colors"
          >
            Continue to Day Selection
          </button>
        </div>
      </div>
    </div>
  );
}

