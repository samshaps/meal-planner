// lib/ai/recipe-generator.ts

import { PaprikaRecipe } from "@/lib/paprika/types";
import { callOpenAI } from "./openai-client";
import { getRecipeGenerationPrompt, getRecipeConceptsPrompt, getRecipeDetailsPrompt } from "./prompts";

/**
 * Cleans and attempts to fix common JSON issues in AI responses.
 */
function cleanAndParseJSON<T>(response: string): T {
  let cleaned = response.trim();
  
  // Remove markdown code blocks if present
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
    cleaned = cleaned.replace(/\s*```$/m, "");
    cleaned = cleaned.trim();
  }
  
  // Try direct parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch (error) {
    // Try to extract JSON from the response
    // First try to find a complete array
    const jsonArrayMatch = cleaned.match(/\[[\s\S]*\]/);
    // If no complete array, try to find a truncated array (starts with [ but no closing ])
    const truncatedArrayMatch = !jsonArrayMatch ? cleaned.match(/\[[\s\S]*$/) : null;
    const jsonObjectMatch = cleaned.match(/\{[\s\S]*\}/);
    
    // Try complete array first
    if (jsonArrayMatch) {
      try {
        return JSON.parse(jsonArrayMatch[0]) as T;
      } catch (arrayError) {
        // Array exists but doesn't parse - might be malformed, try recovery
        console.warn(`[RECIPE GEN] Complete array found but failed to parse, attempting recovery`);
      }
    }
    
    // Try truncated array recovery
    if (truncatedArrayMatch || jsonArrayMatch) {
      let arrayStr = truncatedArrayMatch ? truncatedArrayMatch[0] : jsonArrayMatch![0];
      
      // If array doesn't end with ], it's likely truncated
      if (!arrayStr.endsWith("]")) {
        // Strategy 1: Find all complete JSON objects and reconstruct array
        // Match complete objects: { ... } (handling nested braces)
        const objectMatches: string[] = [];
        let depth = 0;
        let start = -1;
        
        for (let i = 0; i < arrayStr.length; i++) {
          if (arrayStr[i] === '{') {
            if (depth === 0) start = i;
            depth++;
          } else if (arrayStr[i] === '}') {
            depth--;
            if (depth === 0 && start !== -1) {
              objectMatches.push(arrayStr.substring(start, i + 1));
              start = -1;
            }
          }
        }
        
        if (objectMatches.length > 0) {
          // Reconstruct array from complete objects
          const reconstructed = "[" + objectMatches.join(",") + "]";
          try {
            const parsed = JSON.parse(reconstructed) as T;
            console.warn(`[RECIPE GEN] Recovered ${Array.isArray(parsed) ? parsed.length : 1} complete items from truncated response`);
            return parsed;
          } catch (retryError) {
            console.warn(`[RECIPE GEN] Failed to parse reconstructed array from ${objectMatches.length} objects`);
          }
        }
        
        // Strategy 2: Find last complete object by looking for last }
        const lastBrace = arrayStr.lastIndexOf("}");
        if (lastBrace !== -1) {
          // Find the start of this object
          let objStart = lastBrace;
          let objDepth = 1;
          while (objStart > 0 && objDepth > 0) {
            objStart--;
            if (arrayStr[objStart] === '}') objDepth++;
            else if (arrayStr[objStart] === '{') objDepth--;
          }
          
          if (objStart >= 0) {
            // Extract everything up to and including this object
            let extracted = arrayStr.substring(0, lastBrace + 1);
            // Find where this object starts in the array
            const objInArray = extracted.substring(extracted.lastIndexOf("{"));
            // Reconstruct: everything before this object + this object + closing bracket
            const beforeObj = extracted.substring(0, extracted.lastIndexOf("{"));
            // Remove trailing comma
            const cleanedBefore = beforeObj.replace(/,\s*$/, "");
            const reconstructed = cleanedBefore + (cleanedBefore.endsWith("[") ? "" : ",") + objInArray + "]";
            
            try {
              const parsed = JSON.parse(reconstructed) as T;
              console.warn(`[RECIPE GEN] Recovered ${Array.isArray(parsed) ? parsed.length : 1} items from truncated response (brace method)`);
              return parsed;
            } catch (retryError) {
              // Fall through to next strategy
            }
          }
        }
        
        // Strategy 3: Find last comma and remove incomplete entry
        const lastComma = arrayStr.lastIndexOf(",");
        if (lastComma !== -1) {
          arrayStr = arrayStr.substring(0, lastComma).trim();
          // Remove trailing comma if still present
          arrayStr = arrayStr.replace(/,\s*$/, "");
          if (!arrayStr.endsWith("]")) {
            arrayStr += "]";
          }
          
          try {
            const parsed = JSON.parse(arrayStr) as T;
            console.warn(`[RECIPE GEN] Recovered ${Array.isArray(parsed) ? parsed.length : 1} items from truncated response (comma method)`);
            return parsed;
          } catch (retryError) {
            console.error(`[RECIPE GEN] Failed to parse fixed JSON array (comma method)`);
          }
        }
      }
    }
    
    if (jsonObjectMatch) {
      try {
        return JSON.parse(jsonObjectMatch[0]) as T;
      } catch (objectError) {
        console.error(`[RECIPE GEN] Failed to parse extracted JSON object`);
      }
    }
    
    // Log the problematic response for debugging
    console.error(`[RECIPE GEN] JSON parse error. Response length: ${cleaned.length}`);
    console.error(`[RECIPE GEN] Response preview (first 500 chars):`, cleaned.substring(0, 500));
    if (cleaned.length > 500) {
      console.error(`[RECIPE GEN] Response preview (last 500 chars):`, cleaned.substring(Math.max(0, cleaned.length - 500)));
    }
    
    throw new Error(
      `Failed to parse JSON: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export interface RecipeConcept {
  name: string;
  cuisine: string;
  protein: string;
  difficulty: "Easy" | "Medium" | "Hard";
  prepTime: number;
  cookTime: number;
}

export interface GeneratedRecipe {
  name: string;
  description: string; // Brief overview of featured ingredients and flavors
  ingredients: string;
  directions: string;
  prepTime: number;
  cookTime: number;
  difficulty: "Easy" | "Medium" | "Hard";
  cuisine: string;
  protein: string;
  servings: number;
}

/**
 * Generates recipe concepts (Phase 1) - minimal output for diversity planning.
 */
export async function generateRecipeConcepts(
  existingRecipes: PaprikaRecipe[],
  count: number,
  categoryFilter?: string[],
  userGuidance?: string
): Promise<RecipeConcept[]> {
  const startTime = Date.now();
  
  try {
    const prompt = getRecipeConceptsPrompt(existingRecipes, count, categoryFilter, userGuidance);
    
    const response = await callOpenAI(
      [
        {
          role: "system",
          content: "You are a recipe concept planner. Always return valid JSON only. Ensure maximum diversity across cuisines and proteins.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        model: "gpt-4o-mini",
        temperature: 0.7,
        maxTokens: Math.max(count * 250, 3000), // Increased to prevent truncation (250 tokens per concept, min 3000)
      }
    );

    // Clean and parse JSON response
    const concepts = cleanAndParseJSON<RecipeConcept | RecipeConcept[]>(response);
    const conceptArray = Array.isArray(concepts) ? concepts : [concepts];

    if (conceptArray.length === 0) {
      throw new Error("No recipe concepts generated");
    }

    if (conceptArray.length !== count) {
      console.warn(`[RECIPE GEN] Expected ${count} concepts but got ${conceptArray.length}`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[RECIPE GEN] ✅ Generated ${conceptArray.length} recipe concepts in ${duration}s`);

    return conceptArray;
  } catch (error) {
    console.error(`[RECIPE GEN] Concept generation error:`, error);
    throw new Error(
      `Failed to generate recipe concepts: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generates full recipe details from a concept (Phase 2).
 */
export async function generateRecipeDetails(
  concept: RecipeConcept,
  existingRecipes: PaprikaRecipe[]
): Promise<PaprikaRecipe> {
  const startTime = Date.now();
  
  try {
    const prompt = getRecipeDetailsPrompt(concept, existingRecipes);
    
    const response = await callOpenAI(
      [
        {
          role: "system",
          content: "You are a creative recipe generator. Always return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        model: "gpt-4o-mini",
        temperature: 0.7,
        maxTokens: 800, // Reduced tokens per recipe
      }
    );

    // Clean and parse JSON response
    const recipe = cleanAndParseJSON<GeneratedRecipe>(response);

    // Validate required fields
    if (!recipe.name || !recipe.ingredients || !recipe.directions) {
      throw new Error(`Generated recipe missing required fields`);
    }

    // Ensure description exists
    if (!recipe.description || recipe.description.trim() === "") {
      const nameWords = recipe.name.toLowerCase().split(/\s+/);
      const ingredientPreview = typeof recipe.ingredients === "string" 
        ? recipe.ingredients.split("\n").slice(0, 3).join(", ")
        : "";
      recipe.description = `A ${recipe.cuisine || "delicious"} dish featuring ${nameWords.slice(0, 3).join(" ")}${ingredientPreview ? ` with ${ingredientPreview.substring(0, 50)}` : ""}.`;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`[RECIPE GEN] ✅ Generated details for "${recipe.name}" in ${duration}s`);

    return {
      uid: `generated-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      name: recipe.name,
      description: recipe.description,
      ingredients: recipe.ingredients,
      directions: recipe.directions,
      categories: [],
      source: "AI Generated",
      prepTime: recipe.prepTime,
      cookTime: recipe.cookTime,
      difficulty: recipe.difficulty,
      cuisine: recipe.cuisine,
      protein: recipe.protein,
      servings: recipe.servings,
    };
  } catch (error) {
    console.error(`[RECIPE GEN] Recipe details generation error for "${concept.name}":`, error);
    throw new Error(
      `Failed to generate recipe details: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Generates a new recipe based on the user's existing recipe collection.
 * Uses OpenAI to analyze cooking style and create a novel recipe that matches preferences.
 */
export async function generateRecipe(
  existingRecipes: PaprikaRecipe[],
  categoryFilter?: string[]
): Promise<PaprikaRecipe> {
  const recipes = await generateRecipes(existingRecipes, 1, categoryFilter);
  return recipes[0];
}

/**
 * Generates multiple recipe variations using two-phase approach for better performance.
 * Phase 1: Generate concepts (fast, ensures diversity)
 * Phase 2: Generate full details in parallel batches (faster than single call)
 */
export async function generateRecipes(
  existingRecipes: PaprikaRecipe[],
  count: number = 1,
  categoryFilter?: string[],
  userGuidance?: string
): Promise<PaprikaRecipe[]> {
  const totalStartTime = Date.now();
  const logStep = (stepName: string, stepStartTime: number) => {
    const duration = ((Date.now() - stepStartTime) / 1000).toFixed(2);
    const elapsed = ((Date.now() - totalStartTime) / 1000).toFixed(2);
    console.log(`[RECIPE GEN] ⏱️  ${stepName}: ${duration}s (total: ${elapsed}s)`);
  };

  try {
    // For single recipe, use old approach (skip Phase 1)
    if (count === 1) {
      const step1Start = Date.now();
      const prompt = getRecipeGenerationPrompt(existingRecipes, 1, categoryFilter, userGuidance);
      logStep("Step 1: Build prompt", step1Start);
      
      const step2Start = Date.now();
      const response = await callOpenAI(
        [
          {
            role: "system",
            content: "You are a creative recipe generator. Always return valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        {
          model: "gpt-4o-mini",
          temperature: 0.7,
          maxTokens: 1500,
        }
      );
      logStep("Step 2: OpenAI API call", step2Start);

      const step3Start = Date.now();
      const generated = cleanAndParseJSON<GeneratedRecipe>(response);
      logStep("Step 3: Parse JSON response", step3Start);

      if (!generated.name || !generated.ingredients || !generated.directions) {
        throw new Error("Generated recipe missing required fields");
      }

      if (!generated.description || generated.description.trim() === "") {
        const nameWords = generated.name.toLowerCase().split(/\s+/);
        const ingredientPreview = typeof generated.ingredients === "string" 
          ? generated.ingredients.split("\n").slice(0, 3).join(", ")
          : "";
        generated.description = `A ${generated.cuisine || "delicious"} dish featuring ${nameWords.slice(0, 3).join(" ")}${ingredientPreview ? ` with ${ingredientPreview.substring(0, 50)}` : ""}.`;
      }

      const recipe: PaprikaRecipe = {
        uid: `generated-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        name: generated.name,
        description: generated.description,
        ingredients: generated.ingredients,
        directions: generated.directions,
        categories: categoryFilter || [],
        source: "AI Generated",
        prepTime: generated.prepTime,
        cookTime: generated.cookTime,
        difficulty: generated.difficulty,
        cuisine: generated.cuisine,
        protein: generated.protein,
        servings: generated.servings,
      };

      const totalDuration = ((Date.now() - totalStartTime) / 1000).toFixed(2);
      console.log(`[RECIPE GEN] ✅ Generated 1 recipe in ${totalDuration}s`);

      return [recipe];
    }

    // For multiple recipes, use two-phase approach
    // Phase 1: Generate concepts
    const phase1Start = Date.now();
    const concepts = await generateRecipeConcepts(existingRecipes, count, categoryFilter, userGuidance);
    logStep("Phase 1: Generate concepts", phase1Start);

    // Phase 2: Generate full details in parallel batches
    const phase2Start = Date.now();
    const batchSize = 3; // Generate 2-3 recipes per batch
    const batches: RecipeConcept[][] = [];
    
    for (let i = 0; i < concepts.length; i += batchSize) {
      batches.push(concepts.slice(i, i + batchSize));
    }

    console.log(`[RECIPE GEN] Generating ${concepts.length} recipes in ${batches.length} parallel batches (${batchSize} per batch)`);
    
    // Generate all batches in parallel
    const batchPromises = batches.map(async (batch, batchIndex) => {
      const batchStart = Date.now();
      const batchResults = await Promise.all(
        batch.map((concept) => generateRecipeDetails(concept, existingRecipes))
      );
      const batchDuration = ((Date.now() - batchStart) / 1000).toFixed(2);
      console.log(`[RECIPE GEN] Batch ${batchIndex + 1}/${batches.length} completed in ${batchDuration}s`);
      return batchResults;
    });

    const batchResults = await Promise.all(batchPromises);
    const recipes = batchResults.flat();
    logStep("Phase 2: Generate details (parallel batches)", phase2Start);

    // Add category filter to all recipes
    recipes.forEach((recipe) => {
      recipe.categories = categoryFilter || [];
    });

    const totalDuration = ((Date.now() - totalStartTime) / 1000).toFixed(2);
    console.log(`[RECIPE GEN] ✅ Generated ${recipes.length} recipes in ${totalDuration}s (Phase 1 + Phase 2)`);

    return recipes;
  } catch (error) {
    console.error(`[RECIPE GEN] Recipe generation error:`, error);
    throw new Error(
      `Failed to generate recipes: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

