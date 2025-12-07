// lib/ingredients/categorizer.ts

import { IngredientCategory } from "./types";
import { callOpenAI } from "@/lib/ai/openai-client";
import { getIngredientCategorizationPrompt } from "@/lib/ai/prompts";

/**
 * Normalizes ingredient text before sending to AI for categorization.
 * Strips quantities, units, prep text, and parentheticals.
 */
function normalizeForAICategorization(raw: string): string {
  let normalized = raw.trim();
  
  // Remove "Optional:" prefix
  normalized = normalized.replace(/^optional:\s*/i, "");
  
  // Remove everything in parentheses (including nested)
  normalized = normalized.replace(/\([^)]*\)/g, "");
  
  // Remove text after comma (prep instructions)
  const commaIndex = normalized.indexOf(",");
  if (commaIndex !== -1) {
    normalized = normalized.substring(0, commaIndex);
  }
  
  // Remove common prep words/phrases
  const prepWords = [
    "minced", "chopped", "diced", "sliced", "grated", "zested", "juiced",
    "halved", "seeded", "spiralized", "rinsed", "drained", "for garnish",
    "optional", "pitted", "trimmed", "peeled", "deveined", "crumbled",
    "riced", "for serving", "cut into", "thick slices", "thin slices"
  ];
  
  for (const prep of prepWords) {
    // Remove prep word at start, end, or as standalone word
    const regex = new RegExp(`\\b${prep}\\b`, "gi");
    normalized = normalized.replace(regex, "");
  }
  
  // Remove quantities and units (numbers, fractions, common units)
  normalized = normalized.replace(/^\d+(\.\d+)?\s*/g, ""); // Leading numbers
  normalized = normalized.replace(/\s*\d+(\.\d+)?\s*(oz|lb|lbs|cup|cups|tbsp|tsp|tablespoon|teaspoon|clove|cloves|head|heads|bunch|bunches|can|cans|fillet|fillets|breast|breasts|inch|inches)\s*/gi, "");
  normalized = normalized.replace(/\s*\d+\/\d+\s*/g, ""); // Fractions
  
  // Clean up extra whitespace
  normalized = normalized.replace(/\s+/g, " ").trim();
  
  // Lowercase everything
  normalized = normalized.toLowerCase();
  
  return normalized;
}

/**
 * Post-processes AI categorization with deterministic overrides.
 * Ensures common items are never misclassified.
 */
function postProcessSection(name: string, aiSection: IngredientCategory, canonicalName?: string): IngredientCategory {
  const text = name.toLowerCase();
  const canonicalText = canonicalName?.toLowerCase() || "";
  
  // HARD OVERRIDES — these must win every time
  // Check both display name and canonical name
  
  // Produce - MUST check before any spice checks to prevent "bell pepper" → Spices
  if (text.includes("bell pepper") || canonicalText.includes("bell pepper")) return "Produce";
  
  // Meat/Fish
  if (text.includes("salmon") || canonicalText.includes("salmon")) return "Meat/Fish";
  if (text.includes("shrimp") || canonicalText.includes("shrimp")) return "Meat/Fish";
  if (text.includes("chicken") || canonicalText.includes("chicken")) return "Meat/Fish";
  if (text.includes("beef") || canonicalText.includes("beef")) return "Meat/Fish";
  if (text.includes("pork") || canonicalText.includes("pork")) return "Meat/Fish";
  if ((text.includes("turkey") || canonicalText.includes("turkey")) && !text.includes("broth") && !canonicalText.includes("broth")) return "Meat/Fish";
  if ((text.includes("fish") || canonicalText.includes("fish")) && !text.includes("sauce") && !canonicalText.includes("sauce")) return "Meat/Fish";
  
  // Produce (continued)
  if (text.includes("zucchini") || canonicalText.includes("zucchini")) return "Produce";
  if ((text.includes("onion") || canonicalText.includes("onion")) && !text.includes("powder") && !canonicalText.includes("powder")) return "Produce";
  if ((text.includes("garlic") || canonicalText.includes("garlic")) && !text.includes("powder") && !canonicalText.includes("powder")) return "Produce";
  if (text.includes("lemon") || canonicalText.includes("lemon")) return "Produce";
  if (text.includes("lime") || canonicalText.includes("lime")) return "Produce";
  if (text.includes("cilantro") || canonicalText.includes("cilantro")) return "Produce";
  if (text.includes("parsley") || canonicalText.includes("parsley")) return "Produce";
  if (text.includes("basil") || canonicalText.includes("basil")) return "Produce";
  if (text.includes("broccoli") || canonicalText.includes("broccoli")) return "Produce";
  if (text.includes("spinach") || canonicalText.includes("spinach")) return "Produce";
  if (text.includes("carrot") || canonicalText.includes("carrot")) return "Produce";
  if ((text.includes("tomato") || canonicalText.includes("tomato")) && !text.includes("paste") && !canonicalText.includes("paste")) return "Produce";
  if (text.includes("lettuce") || canonicalText.includes("lettuce")) return "Produce";
  if (text.includes("cucumber") || canonicalText.includes("cucumber")) return "Produce";
  if (text.includes("avocado") || canonicalText.includes("avocado")) return "Produce";
  if (text.includes("cauliflower") || canonicalText.includes("cauliflower")) return "Produce";
  if (text.includes("snap pea") || canonicalText.includes("snap pea")) return "Produce";
  if (text.includes("green onion") || canonicalText.includes("green onion")) return "Produce";
  
  // Dairy
  if (text.includes("parmesan")) return "Dairy";
  if (text.includes("feta")) return "Dairy";
  if (text.includes("mozzarella")) return "Dairy";
  if (text.includes("cheese") && !text.includes("sauce")) return "Dairy";
  
  // Pantry
  if (text.includes("olive oil")) return "Pantry";
  if (text.includes("sesame oil")) return "Pantry";
  if (text.includes("coconut oil")) return "Pantry";
  if (text.includes("vinegar")) return "Pantry";
  if (text.includes("broth")) return "Pantry";
  if (text.includes("stock")) return "Pantry";
  if (text.includes("coconut milk")) return "Pantry";
  if (text.includes("fish sauce")) return "Pantry";
  if (text.includes("soy sauce")) return "Pantry";
  
  // Spices (only if not already overridden above)
  if (text.includes("cumin") || text.includes("paprika") || text.includes("turmeric") || 
      text.includes("cinnamon") || text.includes("chili") || text.includes("coriander") ||
      text.includes("garlic powder") || text.includes("onion powder")) {
    return "Spices";
  }
  
  return aiSection;
}

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
    const jsonObjectMatch = cleaned.match(/\{[\s\S]*\}/);
    
    if (jsonObjectMatch) {
      try {
        return JSON.parse(jsonObjectMatch[0]) as T;
      } catch (objectError) {
        console.error(`[CATEGORIZER] Failed to parse extracted JSON object`);
      }
    }
    
    // Log the problematic response for debugging
    console.error(`[CATEGORIZER] JSON parse error. Response length: ${cleaned.length}`);
    console.error(`[CATEGORIZER] Response preview (first 500 chars):`, cleaned.substring(0, 500));
    if (cleaned.length > 500) {
      console.error(`[CATEGORIZER] Response preview (last 500 chars):`, cleaned.substring(Math.max(0, cleaned.length - 500)));
    }
    
    throw error;
  }
}

/**
 * Categorizes a single ingredient using AI.
 * Uses canonicalName/baseName if provided for cleaner categorization.
 */
export async function categorizeIngredient(
  name: string,
  useAI: boolean = true,
  canonicalName?: string,
  baseName?: string
): Promise<IngredientCategory> {
  // Use canonicalName or baseName if provided (cleaner for AI), otherwise use name
  const ingredientName = canonicalName || baseName || name;
  
  if (!useAI) {
    return postProcessSection(name, "Other");
  }
  
  try {
    // Normalize before sending to AI
    const normalizedForAI = normalizeForAICategorization(ingredientName);
    
    const prompt = getIngredientCategorizationPrompt([normalizedForAI]);
    const response = await callOpenAI(
      [
        {
          role: "system",
          content: "You are an ingredient categorizer. Always return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        model: "gpt-4o-mini",
        temperature: 0.1,
        maxTokens: 100,
      }
    );
    
    const categories = cleanAndParseJSON<Record<string, IngredientCategory>>(response);
    const aiSection = categories[normalizedForAI.toLowerCase()] || "Other";
    
    // Apply post-processing overrides (pass canonicalName if available)
    return postProcessSection(name, aiSection, canonicalName || baseName);
  } catch (error) {
    console.error(`[CATEGORIZER] AI categorization failed for "${ingredientName}":`, error);
    return postProcessSection(name, "Other");
  }
}

/**
 * Categorizes multiple ingredients in batch using AI.
 * Uses canonicalName/baseName if provided for cleaner categorization.
 * All ingredients are sent to AI in a single batch call for efficiency.
 */
export async function categorizeIngredients(
  names: string[],
  useAI: boolean = true,
  ingredients?: Array<{ name: string; canonicalName?: string; baseName?: string }>
): Promise<Map<string, IngredientCategory>> {
  const result = new Map<string, IngredientCategory>();
  
  if (!useAI || names.length === 0) {
    // If AI is disabled or no ingredients, return "Other" for all
    for (const name of names) {
      result.set(name, "Other");
    }
    return result;
  }
  
  // Create a map from display name to normalized name for categorization
  const nameToNormalized = new Map<string, string>();
  const normalizedForAI: string[] = [];
  
  for (const name of names) {
    const ingredient = ingredients?.find(ing => ing.name === name);
    // Use canonicalName or baseName if available (cleaner for AI), otherwise use display name
    const baseName = ingredient?.canonicalName || ingredient?.baseName || name;
    // Normalize before sending to AI (strip quantities, units, prep text)
    const normalized = normalizeForAICategorization(baseName);
    nameToNormalized.set(name, normalized);
    normalizedForAI.push(normalized);
  }
  
  try {
    const prompt = getIngredientCategorizationPrompt(normalizedForAI);
    const response = await callOpenAI(
      [
        {
          role: "system",
          content: "You are an ingredient categorizer. Always return valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      {
        model: "gpt-4o-mini",
        temperature: 0.1,
        maxTokens: Math.max(normalizedForAI.length * 50, 500),
      }
    );
    
    const categories = cleanAndParseJSON<Record<string, IngredientCategory>>(response);
    
    // Map results back to display names and apply post-processing overrides
    for (const name of names) {
      const normalized = nameToNormalized.get(name) || name;
      const aiSection = categories[normalized.toLowerCase()] || "Other";
      
      // Get canonical name for post-processing
      const ingredient = ingredients?.find(ing => ing.name === name);
      const canonicalName = ingredient?.canonicalName || ingredient?.baseName;
      
      // Apply post-processing overrides (check both display name and canonical name)
      const finalSection = postProcessSection(name, aiSection, canonicalName);
      result.set(name, finalSection);
    }
  } catch (error) {
    console.error(`[CATEGORIZER] Batch AI categorization failed:`, error);
    // Fallback: use "Other" for all
    for (const name of names) {
      result.set(name, "Other");
    }
  }
  
  return result;
}

