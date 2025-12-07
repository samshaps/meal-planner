// lib/ai/prompts.ts

import { PaprikaRecipe } from "@/lib/paprika/types";
import { DayRequirement } from "@/lib/planning/types";

export function getRecipeAnalysisPrompt(recipe: PaprikaRecipe): string {
  return `Analyze this recipe and extract metadata. Return ONLY a JSON object with this exact structure:
{
  "cuisine": "string (e.g., Italian, Mexican, Asian, American, etc.)",
  "protein": "string (e.g., chicken, beef, pork, fish, vegetarian, etc.)",
  "difficulty": "string (Easy, Medium, Hard)",
  "prepTime": "number (estimated minutes, or null if unknown)"
}

Recipe name: ${recipe.name}
Categories: ${recipe.categories.join(", ") || "None"}
Ingredients: ${recipe.ingredients.substring(0, 500)}
${recipe.source ? `Source: ${recipe.source}` : ""}

Return ONLY the JSON object, no other text.`;
}

export function getMealPlanPrompt(
  recipes: Array<{
    uid: string;
    name: string;
    metadata: {
      cuisine: string;
      protein: string;
      difficulty: string;
      prepTime: number | null;
    };
    _isGenerated?: boolean;
  }>,
  days: DayRequirement[],
  minExisting: number = 1,
  maxNew: number = 2
): string {
  const selectedDays = days.filter((d) => d.needsDinner);
  const dayNames = selectedDays.map((d) => d.day);
  
  const existingRecipes = recipes.filter((r) => !r._isGenerated);
  const newRecipes = recipes.filter((r) => r._isGenerated);

  return `You are a meal planning assistant. Generate a diverse weekly meal plan.

Available recipes:
${recipes.map((r, i) => {
  const label = r._isGenerated ? "[NEW]" : "[EXISTING]";
  return `${i + 1}. ${label} ${r.name} (${r.metadata.cuisine}, ${r.metadata.protein}, ${r.metadata.difficulty})`;
}).join("\n")}

Days needing dinner: ${dayNames.join(", ")}

Requirements:
1. Assign exactly one recipe to each day
2. Use at least ${minExisting} existing recipe(s) and at most ${maxNew} new recipe(s)
3. Maximize diversity: avoid repeating the same recipe, protein type, or cuisine
4. Distribute difficulty levels (don't stack all hard meals)
5. Return ONLY a JSON array with this exact structure:
[
  {
    "day": "sunday",
    "recipeUid": "recipe-uid-here"
  },
  {
    "day": "monday",
    "recipeUid": "recipe-uid-here"
  },
  ...
]

Return ONLY the JSON array, no other text.`;
}

export function getRecipeGenerationPrompt(
  existingRecipes: PaprikaRecipe[],
  count: number = 1,
  categoryFilter?: string[],
  userGuidance?: string
): string {
  // Sample recipes for analysis (limit to avoid token limits - reduced for speed)
  const sampleCount = count > 1 ? 5 : 10; // Fewer samples when generating multiple recipes
  const sampleRecipes = existingRecipes.slice(0, sampleCount).map((r) => {
    const ingredientsStr = typeof r.ingredients === "string" 
      ? r.ingredients.substring(0, 150) // Reduced from 300
      : Array.isArray(r.ingredients) 
      ? (r.ingredients as string[]).slice(0, 5).join(", ") // Reduced from 10
      : "";
    
    const directionsStr = typeof r.directions === "string"
      ? r.directions.substring(0, 150) // Reduced from 300
      : Array.isArray(r.directions)
      ? (r.directions as string[]).slice(0, 3).join(" ") // Reduced from 5
      : "";
    
    return {
      name: r.name,
      cuisine: r.categories.join(", ") || "None",
      ingredients: ingredientsStr,
      directions: directionsStr,
    };
  });

  const categoryContext = categoryFilter && categoryFilter.length > 0
    ? `Focus on recipes similar to these categories: ${categoryFilter.join(", ")}.`
    : "";

  const userGuidanceContext = userGuidance && userGuidance.trim()
    ? `\nUSER-SPECIFIC GUIDANCE: The user has provided the following guidance for this recipe: "${userGuidance.trim()}". Please incorporate this guidance into the recipe generation. This guidance takes priority over general diversity requirements.`
    : "";

  if (count === 1) {
    // Single recipe generation (backward compatibility)
    return `You are a creative recipe generator. Analyze the user's existing recipe collection and generate a NEW, ORIGINAL recipe that matches their cooking style and preferences.

User's existing recipes (sample):
${sampleRecipes.map((r, i) => `
Recipe ${i + 1}: ${r.name} (${r.cuisine})
Key ingredients: ${r.ingredients}
`).join("\n")}

${categoryContext}

${userGuidanceContext}

Requirements:
1. Generate a COMPLETELY NEW and UNIQUE recipe (not a copy of any existing recipe)
2. Match the user's preferred cuisine styles, flavor profiles, and cooking techniques
3. Use similar ingredient combinations and cooking methods
4. Maintain appropriate difficulty level (Easy, Medium, or Hard)
5. Include realistic prep and cook times
6. Make it creative and interesting while staying true to the user's style

HEALTH & DIVERSITY REQUIREMENTS:
7. Create HEALTHY recipes that adhere to generally healthy dietary protocols:
   - Keto-friendly (low carb, high fat, moderate protein)
   - Whole30-compliant (no grains, legumes, dairy, added sugar, alcohol)
   - Slow Carb diet compatible (no white carbs, no dairy, no fruit except tomatoes/avocados)
   - Focus on whole foods, lean proteins, vegetables, and healthy fats
8. Each recipe should be nutritionally balanced and suitable for a healthy lifestyle

CRITICAL: The "description" field is REQUIRED and MUST be different from "directions":
- "description": A brief 1-2 sentence marketing-style overview highlighting featured ingredients and key flavors (e.g., "A Mediterranean-inspired dish featuring tender chicken, fresh herbs, and tangy lemon, with notes of garlic and olive oil")
- "directions": Full step-by-step cooking instructions (numbered steps or paragraphs)

DO NOT put cooking instructions in the description field. The description should be a brief, appetizing summary that makes someone want to cook the dish.

Return ONLY a JSON object with this exact structure:
{
  "name": "Recipe Name",
  "description": "REQUIRED: Brief 1-2 sentence overview highlighting featured ingredients and key flavors (NOT cooking steps)",
  "ingredients": "Ingredient list with quantities, one per line (be concise, 8-12 ingredients max)",
  "directions": "Step-by-step instructions, numbered (4-6 steps max, be concise)",
  "prepTime": 15,
  "cookTime": 30,
  "difficulty": "Medium",
  "cuisine": "Italian",
  "protein": "chicken",
  "servings": 4
}

Return ONLY the JSON object, no other text.`;
  }

  // Multiple recipes generation - ensure diversity
  const existingRecipesContext = sampleRecipes.length > 0
    ? `User's existing recipes (sample) - use these as style inspiration:
${sampleRecipes.map((r, i) => `
Recipe ${i + 1}: ${r.name} (${r.cuisine})
Key ingredients: ${r.ingredients}
`).join("\n")}`
    : `Generate healthy, diverse recipes without needing existing recipe inspiration.`;

  // Special context for replacement recipes - need to complement existing set
  const complementContext = count === 1 && sampleRecipes.length > 0
    ? `\nIMPORTANT: You are generating a replacement recipe that must COMPLEMENT the existing recipes in the user's current meal plan. Analyze the existing recipes and generate a recipe that:
- Uses DIFFERENT protein types (if existing recipes use chicken, use beef/fish/vegetarian)
- Uses DIFFERENT cuisines (if existing recipes are Italian, use Mexican/Asian/Mediterranean)
- Uses DIFFERENT cooking methods (if existing recipes are baked, use grilled/sautéed/slow-cooked)
- Uses DIFFERENT flavor profiles (if existing recipes are savory, use spicy/tangy/sweet)
- Fills gaps in the meal plan's diversity
- Still matches the user's overall cooking style and preferences`
    : "";

  return `You are a creative recipe generator. ${sampleRecipes.length > 0 ? 'Analyze the user\'s existing recipe collection and' : ''} Generate ${count} NEW, ORIGINAL recipes${sampleRecipes.length > 0 ? ' that match their cooking style and preferences' : ''}.

${existingRecipesContext}

${complementContext}

${categoryContext}

${userGuidanceContext}

CRITICAL DIVERSITY REQUIREMENTS:
You must generate ${count} DISTINCT recipes that are MAXIMALLY DIVERSE from each other:
1. Vary protein types across recipes (chicken, beef, pork, fish, seafood, vegetarian - ensure different proteins)
2. Mix cuisines (Italian, Mexican, Asian, Mediterranean, American, etc. - ensure different cuisines)
3. Balance flavors (savory, spicy, tangy, sweet, umami - ensure different flavor profiles)
4. Distribute cooking methods (baking, grilling, sautéing, slow-cooking, etc. - ensure different methods)
5. Vary difficulty levels (Easy, Medium, Hard - distribute across recipes)
6. Use different primary ingredients and cooking techniques
7. Ensure recipe names are clearly distinct and descriptive

HEALTH REQUIREMENTS:
8. All recipes must be HEALTHY and adhere to generally healthy dietary protocols:
   - Keto-friendly (low carb, high fat, moderate protein)
   - Whole30-compliant (no grains, legumes, dairy, added sugar, alcohol)
   - Slow Carb diet compatible (no white carbs, no dairy, no fruit except tomatoes/avocados)
   - Focus on whole foods, lean proteins, vegetables, and healthy fats
9. Each recipe should be nutritionally balanced and suitable for a healthy lifestyle

GENERAL REQUIREMENTS:
10. Generate COMPLETELY NEW recipes (not copies of existing recipes)
11. Match the user's preferred cooking style and techniques
12. Include realistic prep and cook times
13. Make recipes creative and interesting while staying true to the user's style

CRITICAL: The "description" field is REQUIRED and MUST be different from "directions":
- "description": A brief 1-2 sentence marketing-style overview highlighting featured ingredients and key flavors (e.g., "A Mediterranean-inspired dish featuring tender chicken, fresh herbs, and tangy lemon, with notes of garlic and olive oil")
- "directions": Full step-by-step cooking instructions (numbered steps or paragraphs)

DO NOT put cooking instructions in the description field. The description should be a brief, appetizing summary that makes someone want to cook the dish.

Return ONLY a JSON array with this exact structure:
[
  {
    "name": "Recipe Name 1",
    "description": "REQUIRED: Brief 1-2 sentence overview highlighting featured ingredients and key flavors (e.g., 'A Mediterranean-inspired dish featuring tender chicken, fresh herbs, and tangy lemon')",
    "ingredients": "Ingredient list with quantities, one per line (be concise, 8-12 ingredients max)",
    "directions": "Step-by-step instructions, numbered (4-6 steps max, be concise)",
    "prepTime": 15,
    "cookTime": 30,
    "difficulty": "Medium",
    "cuisine": "Italian",
    "protein": "chicken",
    "servings": 4
  },
  {
    "name": "Recipe Name 2",
    "description": "REQUIRED: Brief 1-2 sentence overview highlighting featured ingredients and key flavors",
    "ingredients": "Ingredient list with quantities, one per line (be concise, 8-12 ingredients max)",
    "directions": "Step-by-step instructions, numbered (4-6 steps max, be concise)",
    "prepTime": 20,
    "cookTime": 45,
    "difficulty": "Easy",
    "cuisine": "Mexican",
    "protein": "beef",
    "servings": 4
  },
  ...
]

Return exactly ${count} recipes in the array. Return ONLY the JSON array, no other text.`;
}

/**
 * Prompt for generating recipe concepts (Phase 1) - minimal output for diversity planning.
 */
export function getRecipeConceptsPrompt(
  existingRecipes: PaprikaRecipe[],
  count: number,
  categoryFilter?: string[],
  userGuidance?: string
): string {
  // Minimal sample recipes for context
  const sampleCount = Math.min(3, existingRecipes.length);
  const sampleRecipes = existingRecipes.slice(0, sampleCount).map((r) => ({
    name: r.name,
    cuisine: r.categories.join(", ") || "None",
  }));

  const categoryContext = categoryFilter && categoryFilter.length > 0
    ? `Focus on recipes similar to these categories: ${categoryFilter.join(", ")}.`
    : "";

  const userGuidanceContext = userGuidance && userGuidance.trim()
    ? `\nUSER-SPECIFIC GUIDANCE: "${userGuidance.trim()}". Incorporate this guidance.`
    : "";

  const existingContext = sampleRecipes.length > 0
    ? `User's existing recipes (sample):\n${sampleRecipes.map((r, i) => `${i + 1}. ${r.name} (${r.cuisine})`).join("\n")}`
    : "Generate healthy, diverse recipes.";

  return `You are a recipe concept planner. Generate ${count} DISTINCT recipe concepts with MAXIMAL DIVERSITY.

${existingContext}

${categoryContext}
${userGuidanceContext}

CRITICAL DIVERSITY REQUIREMENTS:
- Each recipe must have a UNIQUE cuisine (Italian, Mexican, Asian, Mediterranean, American, etc.)
- Each recipe must have a UNIQUE protein type (chicken, beef, pork, fish, seafood, vegetarian)
- Vary difficulty levels (Easy, Medium, Hard) across recipes
- Distribute cooking methods (baking, grilling, sautéing, slow-cooking, etc.)

HEALTH REQUIREMENTS:
- All recipes must be healthy: Keto-friendly, Whole30-compliant, Slow Carb compatible
- Focus on whole foods, lean proteins, vegetables, healthy fats

Return ONLY a JSON array with this exact structure:
[
  {
    "name": "Recipe Name 1",
    "cuisine": "Italian",
    "protein": "chicken",
    "difficulty": "Medium",
    "prepTime": 15,
    "cookTime": 30
  },
  {
    "name": "Recipe Name 2",
    "cuisine": "Mexican",
    "protein": "beef",
    "difficulty": "Easy",
    "prepTime": 20,
    "cookTime": 45
  },
  ...
]

Return exactly ${count} concepts. Ensure NO duplicate cuisines or proteins. Return ONLY the JSON array, no other text.`;
}

/**
 * Prompt for generating full recipe details from a concept (Phase 2).
 */
export function getRecipeDetailsPrompt(
  concept: { name: string; cuisine: string; protein: string; difficulty: string; prepTime: number; cookTime: number },
  existingRecipes: PaprikaRecipe[]
): string {
  const sampleCount = Math.min(2, existingRecipes.length);
  const sampleRecipes = existingRecipes.slice(0, sampleCount).map((r) => ({
    name: r.name,
    ingredients: typeof r.ingredients === "string" 
      ? r.ingredients.substring(0, 100)
      : "",
  }));

  const existingContext = sampleRecipes.length > 0
    ? `User's cooking style (sample recipes):\n${sampleRecipes.map((r, i) => `${i + 1}. ${r.name}: ${r.ingredients}`).join("\n")}`
    : "";

  return `Generate a complete recipe based on this concept:

Recipe Concept:
- Name: ${concept.name}
- Cuisine: ${concept.cuisine}
- Protein: ${concept.protein}
- Difficulty: ${concept.difficulty}
- Prep Time: ${concept.prepTime} minutes
- Cook Time: ${concept.cookTime} minutes

${existingContext}

Requirements:
1. Match the concept exactly (name, cuisine, protein, difficulty, times)
2. Create a HEALTHY recipe: Keto-friendly, Whole30-compliant, Slow Carb compatible
3. Use whole foods, lean proteins, vegetables, healthy fats
4. Be concise: 8-12 ingredients max, 4-6 steps max

CRITICAL: The "description" field is REQUIRED and MUST be different from "directions":
- "description": Brief 1-2 sentence marketing-style overview highlighting featured ingredients and key flavors
- "directions": Step-by-step cooking instructions (numbered, 4-6 steps)

Return ONLY a JSON object with this exact structure:
{
  "name": "${concept.name}",
  "description": "REQUIRED: Brief 1-2 sentence overview highlighting featured ingredients and key flavors",
  "ingredients": "Ingredient list with quantities, one per line (8-12 ingredients max)",
  "directions": "Step-by-step instructions, numbered (4-6 steps max)",
  "prepTime": ${concept.prepTime},
  "cookTime": ${concept.cookTime},
  "difficulty": "${concept.difficulty}",
  "cuisine": "${concept.cuisine}",
  "protein": "${concept.protein}",
  "servings": 4
}

Return ONLY the JSON object, no other text.`;
}

/**
 * Prompt for parsing ingredient lines into structured data.
 */
export function getIngredientParsingPrompt(lines: string[]): string {
  const linesText = lines.map((line, i) => `${i + 1}. ${line}`).join("\n");
  
  return `Parse the following ingredient lines into structured JSON format. Extract the quantity, unit, and ingredient name from each line.

Ingredient lines:
${linesText}

For each line, return a JSON object with:
- "name": The ingredient name (normalized, lowercase)
- "quantity": The numeric quantity (if present, as a number)
- "unit": The unit of measurement (if present, lowercase)
- "originalText": The original line text

Examples:
- "2 lb boneless skinless chicken thighs" → { "name": "boneless skinless chicken thighs", "quantity": 2, "unit": "lb", "originalText": "2 lb boneless skinless chicken thighs" }
- "1 can black beans" → { "name": "black beans", "quantity": 1, "unit": "can", "originalText": "1 can black beans" }
- "Salt to taste" → { "name": "salt", "quantity": undefined, "unit": undefined, "originalText": "Salt to taste" }
- "2-3 large tomatoes" → { "name": "large tomatoes", "quantity": 2.5, "unit": undefined, "originalText": "2-3 large tomatoes" }
- "1/2 cup, plus 2 tablespoons olive oil" → { "name": "olive oil", "quantity": 0.5, "unit": "cup", "originalText": "1/2 cup, plus 2 tablespoons olive oil" }

Return ONLY a JSON array of ${lines.length} objects, one for each line. Return ONLY the JSON array, no other text.`;
}

/**
 * Prompt for categorizing ingredients into shopping sections.
 */
export function getIngredientCategorizationPrompt(ingredientNames: string[]): string {
  const namesText = ingredientNames.map((name, i) => `${i + 1}. ${name}`).join("\n");
  
  return `Categorize the following ingredients into shopping sections. Return ONLY a JSON object mapping each ingredient name to its category.

Ingredients:
${namesText}

Categories:
- "Produce": Fresh fruits and vegetables (garlic, onion, bell pepper, zucchini, tomatoes, lettuce, herbs, etc.)
- "Meat/Fish": Raw meat, poultry, fish, seafood (chicken, beef, salmon, shrimp, pork, etc.)
- "Dry Goods": Grains, pasta, rice, beans, canned goods, nuts, seeds (quinoa, lentils, chickpeas, pine nuts, sesame seeds, etc.)
- "Dairy": Milk, cheese, yogurt, butter (parmesan, feta, mozzarella, etc.)
- "Spices": Herbs, spices, seasonings (garlic powder, onion powder, oregano, paprika, salt, pepper, etc.)
- "Pantry": Oils, vinegars, condiments, broths, sauces (olive oil, balsamic vinegar, coconut milk, tomato paste, etc.)
- "Other": Everything else

Important rules and examples:
- "garlic" → "Produce" (fresh garlic)
- "garlic powder" → "Spices" (dried/powdered)
- "onion" → "Produce" (fresh onion)
- "onion powder" → "Spices" (dried/powdered)
- "bell pepper" → "Produce" (fresh vegetable)
- "pepper" or "black pepper" → "Spices" (seasoning)
- "chicken broth" → "Pantry" (not Meat/Fish)
- "parmesan cheese" → "Dairy"
- "olive oil" → "Pantry"
- "fresh herbs" (basil, cilantro, parsley) → "Produce"
- "dried herbs" or "dried oregano" → "Spices"
- "tomato paste" → "Pantry" (not Produce)
- "cherry tomatoes" → "Produce"
- "salmon" or "salmon fillets" → "Meat/Fish"
- "chicken breasts" → "Meat/Fish"
- "coconut milk" → "Pantry"
- "quinoa" or "cooked quinoa" → "Dry Goods"
- "red lentils" → "Dry Goods"

Return ONLY a JSON object with ingredient names as keys (use the exact ingredient name from the list above) and category names as values:
{
  "chicken thighs": "Meat/Fish",
  "cilantro": "Produce",
  "olive oil": "Pantry",
  "garlic powder": "Spices",
  "bell pepper": "Produce",
  ...
}

Return ONLY the JSON object, no other text.`;
}

