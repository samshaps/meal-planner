// app/api/paprika/recipes/route.ts

import { NextResponse } from "next/server";
import { PaprikaClient } from "@/lib/paprika/client";
import { PaprikaRecipe } from "@/lib/paprika/types";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryUids = searchParams.getAll("category"); // Support multiple categories

    const email = process.env.PAPRIKA_EMAIL;
    const password = process.env.PAPRIKA_PASSWORD;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Paprika credentials not configured" },
        { status: 500 }
      );
    }

    const client = new PaprikaClient(email, password);
    await client.login();

    // Get recipe items (uid and hash only)
    const recipeItems = await client.getRecipes();

    // Fetch full recipe details for each item
    const recipes: PaprikaRecipe[] = [];
    for (const item of recipeItems) {
      if (item.uid) {
        try {
          const fullRecipe = await client.getRecipe(item.uid);
          
          // Filter by categories if provided
          if (categoryUids.length > 0) {
            const recipeCategories = Array.isArray(fullRecipe.categories)
              ? fullRecipe.categories
              : [];
            
            // Recipe must have at least one of the selected categories
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
          // Skip recipes that fail to fetch
          console.error(`Failed to fetch recipe ${item.uid}:`, err);
        }
      }
    }

    return NextResponse.json({ recipes, count: recipes.length });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

