// lib/planning/planner.ts

import { PaprikaRecipe } from "@/lib/paprika/types";
import { DayRequirement, WeeklyPlan, PlannedMeal, Weekday } from "@/lib/planning/types";
import { callOpenAI } from "@/lib/ai/openai-client";
import { getRecipeAnalysisPrompt } from "@/lib/ai/prompts";
import { RecipeMetadata } from "./diversity";

interface RecipeWithMetadata extends PaprikaRecipe {
  metadata: RecipeMetadata;
}

/**
 * Analyzes a recipe using OpenAI to extract metadata (cuisine, protein, difficulty, prep time).
 */
async function analyzeRecipe(recipe: PaprikaRecipe): Promise<RecipeMetadata> {
  try {
    const prompt = getRecipeAnalysisPrompt(recipe);
    const response = await callOpenAI([
      {
        role: "system",
        content: "You are a recipe analysis assistant. Always return valid JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ]);

    // Parse JSON response
    const metadata = JSON.parse(response.trim()) as RecipeMetadata;
    
    // Validate and provide defaults
    return {
      cuisine: metadata.cuisine || "Unknown",
      protein: metadata.protein || "Unknown",
      difficulty: metadata.difficulty || "Medium",
      prepTime: metadata.prepTime ?? null,
    };
  } catch (error) {
    console.error(`Failed to analyze recipe ${recipe.uid}:`, error);
    // Fallback to simple heuristics
    return extractMetadataHeuristic(recipe);
  }
}

/**
 * Fallback: Extract metadata using simple heuristics when AI fails.
 */
function extractMetadataHeuristic(recipe: PaprikaRecipe): RecipeMetadata {
  const name = recipe.name.toLowerCase();
  const ingredients = recipe.ingredients.toLowerCase();

  // Simple cuisine detection
  let cuisine = "American";
  if (name.includes("italian") || name.includes("pasta") || name.includes("pizza")) {
    cuisine = "Italian";
  } else if (name.includes("mexican") || name.includes("taco") || name.includes("burrito")) {
    cuisine = "Mexican";
  } else if (name.includes("asian") || name.includes("stir fry") || name.includes("curry")) {
    cuisine = "Asian";
  }

  // Simple protein detection
  let protein = "vegetarian";
  if (ingredients.includes("chicken") || name.includes("chicken")) {
    protein = "chicken";
  } else if (ingredients.includes("beef") || name.includes("beef")) {
    protein = "beef";
  } else if (ingredients.includes("pork") || name.includes("pork")) {
    protein = "pork";
  } else if (ingredients.includes("fish") || ingredients.includes("salmon") || ingredients.includes("tuna")) {
    protein = "fish";
  }

  return {
    cuisine,
    protein,
    difficulty: "Medium",
    prepTime: null,
  };
}

/**
 * Generates a meal plan using AI-powered recommendations.
 */
export async function generatePlan(
  recipes: PaprikaRecipe[],
  days: DayRequirement[]
): Promise<WeeklyPlan> {
  const selectedDays = days.filter((d) => d.needsDinner);

  if (selectedDays.length === 0) {
    return { meals: [] };
  }

  if (recipes.length === 0) {
    throw new Error("No recipes available for meal planning");
  }

  // Use recipes directly without metadata analysis
  const recipesWithMetadata = recipes.map((r) => ({
    ...r,
    metadata: {
      cuisine: (r as any).cuisine || "Unknown",
      protein: (r as any).protein || "Unknown",
      difficulty: (r as any).difficulty || "Medium",
      prepTime: (r as any).prepTime ?? null,
    },
  })) as RecipeWithMetadata[];

  // If we only have one recipe, repeat it for all days
  if (recipesWithMetadata.length === 1) {
    return {
      meals: selectedDays.map((day) => ({
        day: day.day,
        date: day.date,
          recipe: {
            uid: recipesWithMetadata[0].uid,
            name: recipesWithMetadata[0].name,
            description: recipesWithMetadata[0].description,
            ingredients: typeof recipesWithMetadata[0].ingredients === "string"
              ? recipesWithMetadata[0].ingredients
              : undefined,
            directions: typeof recipesWithMetadata[0].directions === "string"
              ? recipesWithMetadata[0].directions
              : Array.isArray(recipesWithMetadata[0].directions)
              ? (recipesWithMetadata[0].directions as string[]).join("\n")
              : undefined,
          },
      })),
    };
  }

  // COMMENTED OUT: AI meal planning - no longer needed since we directly assign recipes
  // This was an unnecessary API call since we ignore the AI's response anyway
  /*
  // Use AI to generate meal plan
  try {
    // Simplified logic: 1 existing recipe, rest are AI-generated
    const selectedDaysCount = selectedDays.length;
    const minExisting = 1; // Always exactly 1 existing recipe
    const maxNew = selectedDaysCount - 1; // All remaining days use generated recipes
    
    const prompt = getMealPlanPrompt(
      recipesWithMetadata.map((r) => ({
        uid: r.uid,
        name: r.name,
        metadata: r.metadata,
        _isGenerated: (r as any)._isGenerated || false,
      })),
      days,
      minExisting,
      maxNew
    );

    const response = await callOpenAI([
      {
        role: "system",
        content: "You are a meal planning assistant. Always return valid JSON only.",
      },
      {
        role: "user",
        content: prompt,
      },
    ]);

    // Parse AI response
    const aiPlan = JSON.parse(response.trim()) as Array<{
      day: Weekday;
      recipeUid: string;
    }>;
  */
  
    // Directly assign recipes: all generated
  try {
    // All recipes are generated now
    const generatedRecipesList = recipesWithMetadata.filter((r) => ((r as any)._isGenerated));
    
    // Build meals: Assign generated recipes to all days
    const meals: PlannedMeal[] = [];
    const usedRecipeUids = new Set<string>();
    
    // Assign generated recipes to all days (no duplicates)
    const availableGeneratedRecipes = [...generatedRecipesList]; // Copy array to avoid mutation
    
    for (let i = 0; i < selectedDays.length; i++) {
      const day = selectedDays[i];
      
      // If we've used all generated recipes, we have a problem
      if (availableGeneratedRecipes.length === 0) {
        break;
      }
      
      // Use a different generated recipe for each day (no duplicates)
      const generatedRecipe = availableGeneratedRecipes.shift(); // Remove from available list
      
      if (generatedRecipe) {
        // Access description directly from the recipe object - check both the typed property and any
        const description = (generatedRecipe as PaprikaRecipe).description || (generatedRecipe as any).description;
        const descriptionValue = description && description.trim() !== "" ? description : undefined;
        
        // Access ingredients - check multiple possible locations
        const rawIngredients = (generatedRecipe as PaprikaRecipe).ingredients || (generatedRecipe as any).ingredients;
        const ingredientsValue = typeof rawIngredients === "string"
          ? rawIngredients
          : Array.isArray(rawIngredients)
          ? rawIngredients.join("\n")
          : undefined;
        
        meals.push({
          day: day.day,
          date: day.date,
          recipe: {
            uid: generatedRecipe.uid,
            name: generatedRecipe.name,
            description: descriptionValue, // Store description if it exists and is not empty
            ingredients: ingredientsValue, // Store ingredients (may be undefined if missing)
            directions: typeof generatedRecipe.directions === "string"
              ? generatedRecipe.directions
              : Array.isArray(generatedRecipe.directions)
              ? (generatedRecipe.directions as string[]).join("\n")
              : undefined,
          },
        });
        usedRecipeUids.add(generatedRecipe.uid);
      }
    }

    return { meals };
  } catch (error) {
    console.error("AI meal planning failed, falling back to simple algorithm:", error);
    // Fallback to simple algorithm
    return generatePlanSimple(recipesWithMetadata, selectedDays);
  }
}

/**
 * Simple fallback algorithm when AI fails.
 */
function generatePlanSimple(
  recipes: RecipeWithMetadata[],
  days: DayRequirement[]
): WeeklyPlan {
  const meals: PlannedMeal[] = [];
  const usedRecipeUids = new Set<string>();

  for (const day of days) {
    // Try to find a recipe we haven't used yet
    let recipe = recipes.find((r) => !usedRecipeUids.has(r.uid));

    // If all recipes used, reset and start over
    if (!recipe) {
      usedRecipeUids.clear();
      recipe = recipes[0];
    }

    if (recipe) {
      usedRecipeUids.add(recipe.uid);
      meals.push({
        day: day.day,
        date: day.date,
        recipe: {
          uid: recipe.uid,
          name: recipe.name,
          directions: typeof recipe.directions === "string"
            ? recipe.directions
            : Array.isArray(recipe.directions)
            ? (recipe.directions as string[]).join("\n")
            : undefined,
        },
      });
    }
  }

  return { meals };
}

