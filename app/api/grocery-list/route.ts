// app/api/grocery-list/route.ts

import { NextResponse } from "next/server";
import { WeeklyPlan, PlannedMeal } from "@/lib/planning/types";
import { parseIngredients } from "@/lib/ingredients/parser";
import { aggregateIngredients } from "@/lib/ingredients/aggregator";
import { categorizeIngredients } from "@/lib/ingredients/categorizer";
import { formatGroceryListForNotes, formatRecipePacket } from "@/lib/formatters/notesFormatter";
import { PaprikaClient, PaprikaRecipeRaw } from "@/lib/paprika/client";

interface GroceryListRequestBody {
  plan: WeeklyPlan;
}

/**
 * Generates a grocery list and recipe packet from an approved meal plan.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GroceryListRequestBody;
    const { plan } = body;

    if (!plan || !plan.meals || plan.meals.length === 0) {
      return NextResponse.json(
        { error: "No meals provided in plan" },
        { status: 400 }
      );
    }

    // Extract all ingredient lines from recipes
    const allIngredientLines: string[] = [];
    const recipeMap = new Map<string, PaprikaRecipeRaw>();

    // Fetch full recipe details for each meal (if needed)
    // For AI-generated recipes, ingredients are already in the plan
    // For Paprika recipes, we may need to fetch them
    const email = process.env.PAPRIKA_EMAIL;
    const password = process.env.PAPRIKA_PASSWORD;
    let client: PaprikaClient | null = null;
    
    if (email && password) {
      try {
        client = new PaprikaClient(email, password);
        await client.login();
      } catch (err) {
        // Silently fail - we'll use ingredients from plan
        client = null;
      }
    }

    for (const meal of plan.meals) {
      // Check if recipe has ingredients in the plan (for AI-generated recipes)
      const recipeIngredients = (meal.recipe as any).ingredients;
      
      if (recipeIngredients) {
        // Ingredients are already in the plan (AI-generated recipes)
        const lines = typeof recipeIngredients === "string"
          ? recipeIngredients.split("\n").filter((l: string) => l.trim())
          : Array.isArray(recipeIngredients)
          ? recipeIngredients.filter((l: string) => l.trim())
          : [];
        allIngredientLines.push(...lines);
        continue;
      }
      
      // For Paprika recipes, we need to fetch full recipe details
      // But since we're generating all recipes now, this should rarely happen
      if (meal.recipe.uid && !meal.recipe.uid.startsWith("generated-") && client) {
        try {
          const fullRecipe = await client.getRecipe(meal.recipe.uid);
          recipeMap.set(meal.recipe.uid, fullRecipe);
          const lines = typeof fullRecipe.ingredients === "string"
            ? fullRecipe.ingredients.split("\n").filter((l: string) => l.trim())
            : [];
          allIngredientLines.push(...lines);
        } catch (err) {
          console.warn(`[GROCERY LIST] Failed to fetch recipe ${meal.recipe.uid}:`, err);
          // If we can't fetch, skip this recipe's ingredients
        }
      }
    }

    if (allIngredientLines.length === 0) {
      return NextResponse.json(
        { error: "No ingredients found in recipes" },
        { status: 400 }
      );
    }

    // Parse ingredients
    const parsed = await parseIngredients(allIngredientLines, true);

    // Aggregate ingredients
    const aggregated = aggregateIngredients(parsed);

    // Categorize ingredients using canonical/base names
    const ingredientNames = aggregated.map((a) => a.name);
    // Pass aggregated ingredients so categorizer can access canonicalName/baseName
    const ingredientsForCategorization = aggregated.map((a) => ({
      name: a.name,
      canonicalName: a.canonicalName || a.lines[0]?.canonicalName,
      baseName: a.baseName || a.lines[0]?.baseName,
    }));
    const categories = await categorizeIngredients(ingredientNames, true, ingredientsForCategorization);

    // Assign categories/sections to aggregated ingredients
    for (const ingredient of aggregated) {
      const category = categories.get(ingredient.name) || "Other";
      ingredient.category = category;
      ingredient.section = category; // Use category as section
    }

    // Generate week label
    const firstDate = plan.meals[0]?.date;
    const lastDate = plan.meals[plan.meals.length - 1]?.date;
    let weekLabel = "";
    if (firstDate && lastDate) {
      const first = typeof firstDate === "string" ? new Date(firstDate) : firstDate;
      const last = typeof lastDate === "string" ? new Date(lastDate) : lastDate;
      const firstMonth = first.toLocaleDateString("en-US", { month: "short" });
      const firstDay = first.getDate();
      const lastMonth = last.toLocaleDateString("en-US", { month: "short" });
      const lastDay = last.getDate();
      
      if (firstMonth === lastMonth) {
        weekLabel = `WEEK OF ${firstMonth.toUpperCase()} ${firstDay} — GROCERY LIST`;
      } else {
        weekLabel = `WEEK OF ${firstMonth.toUpperCase()} ${firstDay} - ${lastMonth.toUpperCase()} ${lastDay} — GROCERY LIST`;
      }
    } else {
      weekLabel = "GROCERY LIST";
    }

    // Format outputs
    const groceryListText = formatGroceryListForNotes(aggregated, weekLabel);
    const recipePacketText = formatRecipePacket(plan);

    return NextResponse.json({
      success: true,
      groceryList: groceryListText,
      recipePacket: recipePacketText,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred";
    console.error("[GROCERY LIST] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

