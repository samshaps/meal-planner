// app/api/paprika/test/route.ts

import { NextResponse } from "next/server";
import { PaprikaClient, PaprikaRecipeRaw, PaprikaCategory } from "@/lib/paprika/client";

interface TestRequestBody {
  email?: string;
  password?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TestRequestBody;
    const email = body.email?.trim();
    const password = body.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing email or password" },
        { status: 400 }
      );
    }

    const client = new PaprikaClient(email, password);

    await client.login();
    const recipes = await client.getRecipes();
    const categories = await client.getCategories();

    // Create a map of category UID to category name
    const categoryMap = new Map<string, string>();
    categories.forEach((cat: PaprikaCategory) => {
      if (cat.uid && cat.name) {
        categoryMap.set(cat.uid, cat.name);
      }
    });

    const totalRecipes = recipes.length;

    // The recipes endpoint only returns uid and hash (like RecipeItem[])
    // To get full recipe details, we need to fetch individual recipes
    // Let's fetch the first 3 full recipes to show name and categories
    const sample = [];
    for (let i = 0; i < Math.min(3, recipes.length); i++) {
      const recipeItem = recipes[i];
      if (recipeItem?.uid) {
        try {
          const fullRecipe = await client.getRecipe(recipeItem.uid);
          const categoryUids = Array.isArray(fullRecipe.categories)
            ? fullRecipe.categories
            : [];
          
          // Map category UIDs to category names
          const categoryNames = categoryUids
            .map((uid: string) => categoryMap.get(uid))
            .filter((name): name is string => name !== undefined);

          sample.push({
            uid: fullRecipe.uid ?? null,
            name: fullRecipe.name ?? null,
            categories: categoryNames,
          });
        } catch (err) {
          // If fetching full recipe fails, just include the basic info
          sample.push({
            uid: recipeItem.uid,
            name: null,
            categories: [],
            _error: err instanceof Error ? err.message : "Failed to fetch full recipe",
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      totalRecipes,
      sample,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

