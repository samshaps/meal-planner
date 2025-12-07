// lib/ingredients/parser.ts

import { ParsedIngredient } from "./types";
import { callOpenAI } from "@/lib/ai/openai-client";
import { getIngredientParsingPrompt } from "@/lib/ai/prompts";

// Name normalization map for synonyms
const NAME_NORMALIZATION_MAP: Record<string, string> = {
  "garlic cloves": "garlic",
  "cloves garlic": "garlic",
  "clove garlic": "garlic",
  "green onions": "green onions",
  "scallions": "green onions",
  "zucchinis": "zucchini",
  "zucchini": "zucchini",
  "zucchini noodles": "zucchini",
  "red bell pepper": "bell pepper",
  "yellow bell pepper": "bell pepper",
  "orange bell pepper": "bell pepper",
  "green bell pepper": "bell pepper",
  "bell peppers": "bell pepper",
  "bell pepper": "bell pepper",
  "cherry tomatoes": "cherry tomatoes",
  "cherry tomatoes, halved": "cherry tomatoes",
  "basil leaves": "basil",
  "basil": "basil",
  "feta cheese": "feta cheese",
  "feta cheese, crumbled": "feta cheese",
  "parmesan cheese": "parmesan cheese",
  "grated parmesan cheese": "parmesan cheese",
  "cooked quinoa": "cooked quinoa",
  "red lentils": "red lentils",
  "red lentils, rinsed": "red lentils",
  "lime": "lime",
  "lime wedges": "lime",
  "juice of 1 lime": "lime",
  "lime juice": "lime",
  "broccoli florets": "broccoli florets",
  "fresh ginger": "ginger",
  "ginger root": "ginger",
  "apple cider vinegar": "apple cider vinegar",
  "dried oregano": "oregano",
  "salt and pepper": "salt and pepper",
  "salt & pepper": "salt and pepper",
  "black pepper": "black pepper",
};

// Unit conversion map
const UNIT_MAP: Record<string, { baseUnit: "tsp" | "tbsp" | "cup" | "unit" | "none"; factor: number }> = {
  tsp: { baseUnit: "tsp", factor: 1 },
  teaspoon: { baseUnit: "tsp", factor: 1 },
  teaspoons: { baseUnit: "tsp", factor: 1 },
  tbsp: { baseUnit: "tbsp", factor: 1 },
  tablespoon: { baseUnit: "tbsp", factor: 1 },
  tablespoons: { baseUnit: "tbsp", factor: 1 },
  cup: { baseUnit: "cup", factor: 1 },
  cups: { baseUnit: "cup", factor: 1 },
  clove: { baseUnit: "unit", factor: 1 },
  cloves: { baseUnit: "unit", factor: 1 },
  lb: { baseUnit: "unit", factor: 1 },
  lbs: { baseUnit: "unit", factor: 1 },
  pound: { baseUnit: "unit", factor: 1 },
  pounds: { baseUnit: "unit", factor: 1 },
  oz: { baseUnit: "unit", factor: 1 },
  ounce: { baseUnit: "unit", factor: 1 },
  ounces: { baseUnit: "unit", factor: 1 },
  can: { baseUnit: "unit", factor: 1 },
  cans: { baseUnit: "unit", factor: 1 },
  head: { baseUnit: "unit", factor: 1 },
  heads: { baseUnit: "unit", factor: 1 },
  bunch: { baseUnit: "unit", factor: 1 },
  bunches: { baseUnit: "unit", factor: 1 },
  fillet: { baseUnit: "unit", factor: 1 },
  fillets: { baseUnit: "unit", factor: 1 },
  breast: { baseUnit: "unit", factor: 1 },
  breasts: { baseUnit: "unit", factor: 1 },
  "": { baseUnit: "none", factor: 1 },
};

/**
 * Extracts baseName and prepNote from an ingredient name.
 */
function extractBaseNameAndPrep(name: string): { baseName: string; prepNote?: string } {
  let baseName = name.trim();
  let prepNote: string | undefined;
  
  // Remove "Optional:" prefix
  baseName = baseName.replace(/^optional:\s*/i, "");
  
  // Pattern to match preparation descriptors at the end
  // Matches: ", minced", ", finely minced", ", halved and seeded", ", riced", etc.
  // More comprehensive pattern to catch combinations like "halved and seeded"
  const prepPattern = /,\s*((?:(?:finely|roughly|coarsely)\s+)?(?:minced|chopped|diced|sliced|grated|crushed|spiralized|into noodles|halved|seeded|trimmed|rinsed|peeled|deveined|crumbled|riced|julienned|shredded)(?:\s+and\s+(?:seeded|trimmed|rinsed|peeled|deveined|crumbled|sliced|diced))?|for garnish|for serving)/i;
  const prepMatch = baseName.match(prepPattern);
  
  if (prepMatch) {
    prepNote = prepMatch[1].trim();
    baseName = baseName.replace(prepPattern, "").trim();
  }
  
  // Remove leading size descriptors
  baseName = baseName.replace(/^(fresh|large|small|medium|organic|dried|boneless|skinless|lean|boneless,\s*skinless)\s+/i, "");
  
  // Remove trailing descriptors that weren't caught by prep pattern
  baseName = baseName.replace(/\s+(for garnish|for serving)$/i, "");
  
  // Remove common prefixes that don't affect identity
  baseName = baseName.replace(/^(juice of|wedges of|wedges from)\s+/i, "");
  
  baseName = baseName.trim();
  
  return { baseName, prepNote };
}

/**
 * Normalizes an ingredient name to a canonical form (from baseName).
 */
function normalizeCanonicalName(baseName: string): string {
  let normalized = baseName.toLowerCase().trim();
  
  // Handle plurals - normalize to singular for common cases
  // But keep plurals for things like "bell peppers" which should stay plural
  if (normalized.endsWith("s") && !normalized.endsWith("ss") && !normalized.endsWith("us")) {
    // Try singular form for aggregation
    const singular = normalized.slice(0, -1);
    // Check if singular form exists in our map
    if (NAME_NORMALIZATION_MAP[singular]) {
      normalized = NAME_NORMALIZATION_MAP[singular];
    } else if (NAME_NORMALIZATION_MAP[normalized]) {
      normalized = NAME_NORMALIZATION_MAP[normalized];
    }
  }
  
  // Trim again after removals
  normalized = normalized.trim();
  
  // Apply synonym normalization
  if (NAME_NORMALIZATION_MAP[normalized]) {
    normalized = NAME_NORMALIZATION_MAP[normalized];
  }
  
  // Special case: salt and pepper variations
  if (/^salt\s*(and|&)\s*pepper/i.test(normalized) || /^salt\s+to\s+taste/i.test(normalized)) {
    normalized = "salt and pepper";
  }
  
  // Special case: pepper to taste should become salt and pepper (will be handled in aggregator)
  if (/^pepper\s+to\s+taste$/i.test(normalized)) {
    normalized = "salt and pepper";
  }
  
  return normalized;
}

/**
 * Normalizes units and converts to base units.
 */
function normalizeUnit(
  unit: string | undefined,
  quantity: number | undefined
): { baseUnit: "tsp" | "tbsp" | "cup" | "unit" | "none"; quantityInBaseUnits: number | undefined } {
  // If we have a quantity but no unit, treat as "unit" (e.g., "2 chicken breasts")
  if (!unit && quantity !== undefined) {
    return { baseUnit: "unit", quantityInBaseUnits: quantity };
  }
  
  if (!unit || !quantity) {
    return { baseUnit: "none", quantityInBaseUnits: undefined };
  }
  
  const normalizedUnit = unit.toLowerCase().trim();
  
  // Check if unit is in our map
  const unitInfo = UNIT_MAP[normalizedUnit];
  if (unitInfo) {
    let quantityInBaseUnits: number;
    
    // Convert to tablespoons as the base for volume measurements
    if (unitInfo.baseUnit === "cup") {
      // 1 cup = 16 tbsp
      quantityInBaseUnits = quantity * 16;
      return { baseUnit: "tbsp", quantityInBaseUnits };
    } else if (unitInfo.baseUnit === "tbsp") {
      quantityInBaseUnits = quantity;
      return { baseUnit: "tbsp", quantityInBaseUnits };
    } else if (unitInfo.baseUnit === "tsp") {
      // Keep tsp as tsp (don't convert to tbsp for now to avoid precision loss)
      quantityInBaseUnits = quantity;
      return { baseUnit: "tsp", quantityInBaseUnits };
    } else {
      // For "unit" (cloves, lbs, etc.) or "none"
      return { baseUnit: unitInfo.baseUnit, quantityInBaseUnits: quantity };
    }
  }
  
  // Unknown unit - treat as "unit" if we have a quantity
  return { baseUnit: "unit", quantityInBaseUnits: quantity };
}

/**
 * Enriches a parsed ingredient with baseName, prepNote, canonical name and unit normalization.
 */
function enrichParsedIngredient(parsed: ParsedIngredient): ParsedIngredient {
  // Extract baseName and prepNote from the name
  const { baseName, prepNote } = extractBaseNameAndPrep(parsed.name);
  
  // Derive canonicalName from baseName (not the full name with prep)
  const canonicalName = normalizeCanonicalName(baseName);
  
  const { baseUnit, quantityInBaseUnits } = normalizeUnit(parsed.unit, parsed.quantity);
  
  return {
    ...parsed,
    raw: parsed.originalText || parsed.raw || "",
    baseName,
    prepNote,
    canonicalName,
    baseUnit,
    quantityInBaseUnits,
  };
}

/**
 * Attempts to parse an ingredient line using regex for simple cases.
 * Returns null if the line is too complex for regex parsing.
 */
function parseIngredientRegex(line: string): ParsedIngredient | null {
  const trimmed = line.trim();
  
  // Handle "to taste" or similar non-quantity cases
  if (/to taste|as needed|optional|for garnish/i.test(trimmed)) {
    const parsed: ParsedIngredient = {
      name: trimmed.toLowerCase(),
      baseName: "", // Will be set by enrichParsedIngredient
      originalText: trimmed,
      raw: trimmed,
      canonicalName: "",
      baseUnit: "none",
    };
    return enrichParsedIngredient(parsed);
  }
  
  // Simple pattern: number + unit + ingredient name
  // Examples: "2 lb chicken", "1 cup milk", "3 tbsp olive oil"
  const simplePattern = /^(\d+(?:\/\d+)?(?:\.\d+)?)\s+([a-z]+|lb|oz|g|kg|ml|l|cup|cups|tbsp|tsp|can|cans|clove|cloves|bunch|bunches|head|heads)\s+(.+)$/i;
  const simpleMatch = trimmed.match(simplePattern);
  
  if (simpleMatch) {
    let quantity: number | undefined;
    const quantityStr = simpleMatch[1];
    // Handle fractions like "1/2"
    if (quantityStr.includes("/")) {
      const [num, den] = quantityStr.split("/").map(Number);
      quantity = num / den;
    } else {
      quantity = parseFloat(quantityStr);
    }
    const unit = simpleMatch[2].toLowerCase();
    const name = simpleMatch[3].trim();
    
    const parsed: ParsedIngredient = {
      name,
      baseName: "", // Will be set by enrichParsedIngredient
      quantity: isNaN(quantity!) ? undefined : quantity,
      unit,
      originalText: trimmed,
      raw: trimmed,
      canonicalName: "",
      baseUnit: "none",
    };
    return enrichParsedIngredient(parsed);
  }
  
  // Pattern without unit: "2 eggs", "3 tomatoes", "2 boneless, skinless chicken breasts"
  // Also handles decimals like "1.5 lbs" or "1.5" without unit
  const noUnitPattern = /^(\d+(?:\/\d+)?(?:\.\d+)?)\s+(.+)$/i;
  const noUnitMatch = trimmed.match(noUnitPattern);
  
  if (noUnitMatch) {
    let quantity: number | undefined;
    const quantityStr = noUnitMatch[1];
    // Handle fractions like "1/2"
    if (quantityStr.includes("/")) {
      const [num, den] = quantityStr.split("/").map(Number);
      quantity = num / den;
    } else {
      quantity = parseFloat(quantityStr);
    }
    const name = noUnitMatch[2].trim();
    
    // Check if the name starts with a weight unit that we should treat as "unit" baseUnit
    // e.g., "1 pound lean ground beef" - the "pound" is part of the name, treat as unit
    const parsed: ParsedIngredient = {
      name,
      baseName: "", // Will be set by enrichParsedIngredient
      quantity: isNaN(quantity) ? undefined : quantity,
      unit: undefined, // No explicit unit token
      originalText: trimmed,
      raw: trimmed,
      canonicalName: "",
      baseUnit: "none",
    };
    return enrichParsedIngredient(parsed);
  }
  
  // If no pattern matches, return null to trigger AI parsing
  return null;
}

/**
 * Parses a single ingredient line using AI-assisted parsing.
 * Falls back to regex for simple cases.
 */
export async function parseIngredient(
  line: string,
  useAI: boolean = true
): Promise<ParsedIngredient> {
  // Try regex first for simple cases
  const regexResult = parseIngredientRegex(line);
  if (regexResult) {
    return regexResult;
  }
  
  // Use AI for complex cases
  if (useAI) {
    try {
      const prompt = getIngredientParsingPrompt([line]);
      const response = await callOpenAI(
        [
          {
            role: "system",
            content: "You are an ingredient parser. Always return valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        {
          model: "gpt-4o-mini",
          temperature: 0.1, // Low temperature for accuracy
          maxTokens: 200,
        }
      );
      
      const parsed = JSON.parse(response.trim()) as ParsedIngredient;
      
      // Ensure originalText and raw are set
      if (!parsed.originalText) {
        parsed.originalText = line;
      }
      if (!parsed.raw) {
        parsed.raw = line;
      }
      
      return enrichParsedIngredient(parsed);
    } catch (error) {
      console.error(`[PARSER] AI parsing failed for "${line}":`, error);
      // Fallback to basic parsing
      const parsed: ParsedIngredient = {
        name: line.trim(),
        baseName: "", // Will be set by enrichParsedIngredient
        originalText: line,
        raw: line,
        canonicalName: "",
        baseUnit: "none",
      };
      return enrichParsedIngredient(parsed);
    }
  }
  
  // Final fallback
  const parsed: ParsedIngredient = {
    name: line.trim(),
    baseName: "", // Will be set by enrichParsedIngredient
    originalText: line,
    raw: line,
    canonicalName: "",
    baseUnit: "none",
  };
  return enrichParsedIngredient(parsed);
}

/**
 * Parses multiple ingredient lines in batch using AI for efficiency.
 */
export async function parseIngredients(
  lines: string[],
  useAI: boolean = true
): Promise<ParsedIngredient[]> {
  // Separate simple and complex lines
  const simpleLines: string[] = [];
  const complexLines: string[] = [];
  const simpleResults: ParsedIngredient[] = [];
  
  for (const line of lines) {
    const regexResult = parseIngredientRegex(line);
    if (regexResult) {
      // regexResult is already enriched by parseIngredientRegex
      simpleResults.push(regexResult);
      simpleLines.push(line);
    } else {
      complexLines.push(line);
    }
  }
  
  // Parse complex lines with AI in batch
  if (complexLines.length > 0 && useAI) {
    try {
      const prompt = getIngredientParsingPrompt(complexLines);
      const response = await callOpenAI(
        [
          {
            role: "system",
            content: "You are an ingredient parser. Always return valid JSON only.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        {
          model: "gpt-4o-mini",
          temperature: 0.1,
          maxTokens: complexLines.length * 100, // Estimate tokens needed
        }
      );
      
      const parsed = JSON.parse(response.trim()) as ParsedIngredient[];
      const aiResults = Array.isArray(parsed) ? parsed : [parsed];
      
      // Ensure originalText and raw are set for all results, then enrich
      aiResults.forEach((result, index) => {
        if (!result.originalText) {
          result.originalText = complexLines[index];
        }
        if (!result.raw) {
          result.raw = complexLines[index];
        }
      });
      
      // Enrich all AI results
      const enrichedAiResults = aiResults.map(enrichParsedIngredient);
      
      // Combine results in original order
      const allResults: ParsedIngredient[] = [];
      let simpleIndex = 0;
      let complexIndex = 0;
      
      for (const line of lines) {
        if (simpleLines.includes(line)) {
          allResults.push(simpleResults[simpleIndex++]);
        } else {
          const fallback: ParsedIngredient = {
            name: line.trim(),
            baseName: "", // Will be set by enrichParsedIngredient
            originalText: line,
            raw: line,
            canonicalName: "",
            baseUnit: "none",
          };
          allResults.push(enrichedAiResults[complexIndex++] || enrichParsedIngredient(fallback));
        }
      }
      
      return allResults;
    } catch (error) {
      console.error(`[PARSER] Batch AI parsing failed:`, error);
      // Fallback: parse remaining lines individually
      const fallbackResults = await Promise.all(
        complexLines.map((line) => parseIngredient(line, false))
      );
      
      // Combine results
      const allResults: ParsedIngredient[] = [];
      let simpleIndex = 0;
      let complexIndex = 0;
      
      for (const line of lines) {
        if (simpleLines.includes(line)) {
          allResults.push(simpleResults[simpleIndex++]);
        } else {
          const fallback = fallbackResults[complexIndex++];
          // Ensure baseName is set if not already
          if (!fallback.baseName) {
            const { baseName } = extractBaseNameAndPrep(fallback.name);
            fallback.baseName = baseName;
          }
          allResults.push(enrichParsedIngredient(fallback));
        }
      }
      
      return allResults;
    }
  }
  
  // If no AI or no complex lines, return simple results (already enriched)
  return simpleResults;
}

