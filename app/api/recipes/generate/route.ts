// app/api/recipes/generate/route.ts

import { NextResponse } from "next/server";
import { PaprikaClient } from "@/lib/paprika/client";
import { generateRecipe, generateRecipes } from "@/lib/ai/recipe-generator";

interface GenerateRecipeRequestBody {
  categoryUids?: string[];
  count?: number;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as GenerateRecipeRequestBody;
    const { categoryUids = [], count = 1 } = body;

    const email = process.env.PAPRIKA_EMAIL;
    const password = process.env.PAPRIKA_PASSWORD;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Paprika credentials not configured" },
        { status: 500 }
      );
    }

    // Fetch recipes from Paprika
    const client = new PaprikaClient(email, password);
    await client.login();

    const recipeItems = await client.getRecipes();
    const recipes = [];

    // Fetch full recipe details
    for (const item of recipeItems) {
      if (item.uid) {
        try {
          const fullRecipe = await client.getRecipe(item.uid);

          // Filter by categories if provided
          if (categoryUids.length > 0) {
            const recipeCategories = Array.isArray(fullRecipe.categories)
              ? fullRecipe.categories
              : [];

            const hasSelectedCategory = categoryUids.some((uid) =>
              recipeCategories.includes(uid)
            );

            if (!hasSelectedCategory) {
              continue;
            }
          }

          recipes.push({
            uid: fullRecipe.uid ?? "",
            name: fullRecipe.name ?? "",
            ingredients: typeof fullRecipe.ingredients === "string"
              ? fullRecipe.ingredients
              : Array.isArray(fullRecipe.ingredients)
              ? fullRecipe.ingredients.join("\n")
              : "",
            directions: typeof fullRecipe.directions === "string"
              ? fullRecipe.directions
              : Array.isArray(fullRecipe.directions)
              ? fullRecipe.directions.join("\n")
              : "",
            categories: Array.isArray(fullRecipe.categories)
              ? fullRecipe.categories
              : [],
            rating: typeof fullRecipe.rating === "number" ? fullRecipe.rating : undefined,
            source: typeof fullRecipe.source === "string" ? fullRecipe.source : undefined,
            photo: typeof fullRecipe.photo === "string" ? fullRecipe.photo : undefined,
            photo_url: typeof fullRecipe.photo_url === "string" ? fullRecipe.photo_url : undefined,
            hash: typeof fullRecipe.hash === "string" ? fullRecipe.hash : undefined,
          });
        } catch (err) {
          console.error(`Failed to fetch recipe ${item.uid}:`, err);
        }
      }
    }

    if (recipes.length === 0) {
      return NextResponse.json(
        { error: "No recipes found matching the selected categories" },
        { status: 400 }
      );
    }

    // Generate new recipes
    const generatedRecipes = await generateRecipes(recipes, count, categoryUids);

    return NextResponse.json({
      success: true,
      recipes: generatedRecipes,
      count: generatedRecipes.length,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred";
    console.error("Recipe generation error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

