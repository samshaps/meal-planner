// app/api/plan/replace/route.ts

import { NextResponse } from "next/server";
import { generateRecipes } from "@/lib/ai/recipe-generator";
import { PaprikaRecipe } from "@/lib/paprika/types";

interface ReplaceRequestBody {
  currentRecipes: Array<{
    name: string;
    cuisine?: string;
    protein?: string;
    ingredients?: string;
    directions?: string;
  }>;
  day: string;
  guidance?: string; // Optional user guidance for recipe generation
}

/**
 * Generates a new recipe that complements the existing recipes in the plan.
 * Uses OpenAI to analyze the current set and generate a diverse, complementary recipe.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReplaceRequestBody;
    const { currentRecipes } = body;

    if (!currentRecipes || currentRecipes.length === 0) {
      return NextResponse.json(
        { error: "No current recipes provided" },
        { status: 400 }
      );
    }

    const { guidance } = body;

    // Convert current recipes to PaprikaRecipe format for the generator
    const existingRecipes: PaprikaRecipe[] = currentRecipes.map((r, i) => ({
      uid: `existing-${i}`,
      name: r.name,
      ingredients: r.ingredients || "",
      directions: r.directions || "",
      categories: [],
      cuisine: r.cuisine,
      protein: r.protein,
    }));

    // Generate a single complementary recipe with optional guidance
    const generatedRecipes = await generateRecipes(
      existingRecipes,
      1, // Generate just one recipe
      undefined, // No category filter
      guidance // Pass user guidance
    );

    if (generatedRecipes.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate replacement recipe" },
        { status: 500 }
      );
    }

    const newRecipe = generatedRecipes[0];
    
    // Ensure ingredients are included in the response
    const ingredients = newRecipe.ingredients || (newRecipe as any).ingredients;
    
    return NextResponse.json({
      success: true,
      recipe: {
        uid: newRecipe.uid,
        name: newRecipe.name,
        description: newRecipe.description,
        ingredients: ingredients, // Explicitly include ingredients
        directions: newRecipe.directions,
        cuisine: (newRecipe as any).cuisine,
        protein: (newRecipe as any).protein,
        difficulty: (newRecipe as any).difficulty,
        prepTime: (newRecipe as any).prepTime,
        cookTime: (newRecipe as any).cookTime,
        servings: (newRecipe as any).servings,
      },
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred";
    console.error("[REPLACE API] Error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

