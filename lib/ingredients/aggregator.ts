// lib/ingredients/aggregator.ts

import { ParsedIngredient, AggregatedIngredient } from "./types";

/**
 * Formats quantity and unit for display, converting base units to human-friendly units.
 * Returns display quantity (as number) and unit string.
 */
export function formatQuantity(
  totalQuantity: number | undefined,
  baseUnit: "tsp" | "tbsp" | "cup" | "unit" | "none",
  name: string
): { displayQuantity?: number; displayUnit?: string } {
  if (baseUnit === "none" || totalQuantity === undefined) {
    return { displayQuantity: undefined, displayUnit: undefined };
  }
  
  // Convert tbsp to cups if >= 16
  if (baseUnit === "tbsp" && totalQuantity >= 16) {
    const cups = Math.floor(totalQuantity / 16);
    const remainingTbsp = totalQuantity % 16;
    
    if (remainingTbsp === 0) {
      return {
        displayQuantity: cups,
        displayUnit: cups === 1 ? "cup" : "cups",
      };
    } else {
      // For now, still show as cups (round up or down)
      // Future: could show "1 cup 2 tbsp" but keeping simple for now
      return {
        displayQuantity: cups,
        displayUnit: cups === 1 ? "cup" : "cups",
      };
    }
  }
  
  // Convert tsp to tbsp if >= 3
  if (baseUnit === "tsp" && totalQuantity >= 3) {
    const tbsp = Math.floor(totalQuantity / 3);
    const remainingTsp = totalQuantity % 3;
    
    if (remainingTsp === 0) {
      return {
        displayQuantity: tbsp,
        displayUnit: "tbsp",
      };
    } else {
      // Keep as tsp if there's a remainder
      return {
        displayQuantity: totalQuantity,
        displayUnit: "tsp",
      };
    }
  }
  
  // Default: use base unit as-is
  if (baseUnit === "tsp") {
    return {
      displayQuantity: totalQuantity,
      displayUnit: "tsp",
    };
  }
  
  if (baseUnit === "tbsp") {
    return {
      displayQuantity: totalQuantity,
      displayUnit: "tbsp",
    };
  }
  
  if (baseUnit === "cup") {
    return {
      displayQuantity: totalQuantity,
      displayUnit: totalQuantity === 1 ? "cup" : "cups",
    };
  }
  
  if (baseUnit === "unit") {
    return {
      displayQuantity: totalQuantity,
      displayUnit: "", // Will use original unit from ingredient
    };
  }
  
  return { displayQuantity: undefined, displayUnit: undefined };
}

/**
 * Converts baseUnit to a human-friendly display unit string.
 * For unit-based items, preserves original unit string.
 */
function formatUnit(baseUnit: "tsp" | "tbsp" | "cup" | "unit" | "none", totalQuantity?: number): string {
  if (baseUnit === "none" || !totalQuantity) {
    return "";
  }
  
  if (baseUnit === "tsp") {
    return "tsp";
  }
  
  if (baseUnit === "tbsp") {
    // Check if we should convert to cups
    if (totalQuantity >= 16) {
      const cups = Math.floor(totalQuantity / 16);
      return cups === 1 ? "cup" : "cups";
    }
    return "tbsp";
  }
  
  if (baseUnit === "cup") {
    return totalQuantity === 1 ? "cup" : "cups";
  }
  
  if (baseUnit === "unit") {
    return ""; // For unit-based items like "cloves"
  }
  
  return "";
}

/**
 * Aggregates parsed ingredients by canonicalName + baseUnit, combining quantities.
 * Ingredients with incompatible units are kept as separate entries.
 */
export function aggregateIngredients(
  parsed: ParsedIngredient[]
): AggregatedIngredient[] {
  // Group by canonicalName (derived from baseName) + baseUnit
  const groupKey = (ing: ParsedIngredient): string => {
    // Use canonicalName which is now derived from baseName
    const canonical = ing.canonicalName || normalizeCanonicalName(ing.baseName || ing.name);
    const baseUnit = ing.baseUnit || "none";
    return `${canonical}::${baseUnit}`;
  };
  
  const groups = new Map<string, ParsedIngredient[]>();
  
  // Group ingredients
  for (const ingredient of parsed) {
    const key = groupKey(ingredient);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(ingredient);
  }
  
  const result: AggregatedIngredient[] = [];
  
  for (const [key, ingredients] of groups.entries()) {
    const [canonicalName, baseUnitStr] = key.split("::");
    const baseUnit = baseUnitStr as "tsp" | "tbsp" | "cup" | "unit" | "none";
    
    // Check if all items have numeric quantities
    const itemsWithQuantity = ingredients.filter(
      (ing) => ing.quantityInBaseUnits !== undefined && ing.quantityInBaseUnits !== null
    );
    const itemsWithoutQuantity = ingredients.filter(
      (ing) => ing.quantityInBaseUnits === undefined || ing.quantityInBaseUnits === null
    );
    
    // Sum quantities for items with quantities
    let totalQuantity: number | undefined;
    if (itemsWithQuantity.length > 0) {
      totalQuantity = itemsWithQuantity.reduce(
        (sum, ing) => sum + (ing.quantityInBaseUnits || 0),
        0
      );
    }
    
    // Determine display name from baseName (not the full name with prep)
    const baseName = ingredients[0].baseName || ingredients[0].name;
    const displayName = formatDisplayName(canonicalName, baseName);
    
    // Format quantity and unit for display using the new formatter
    const { displayQuantity, displayUnit: formattedDisplayUnit } = formatQuantity(
      totalQuantity,
      baseUnit,
      displayName
    );
    
    // For unit-based items, preserve the original unit string (e.g., "cloves", "lbs")
    let displayUnit = formattedDisplayUnit;
    if (baseUnit === "unit" && ingredients[0].unit) {
      displayUnit = ingredients[0].unit; // Preserve original unit like "cloves", "lbs"
    } else if (baseUnit === "unit" && !displayUnit) {
      // If no unit was found, try to extract from name (e.g., "chicken breasts")
      // For now, leave empty - the formatter will handle it
      displayUnit = "";
    }
    
    // Use formatted quantity if available, otherwise use totalQuantity
    const finalDisplayQuantity = displayQuantity !== undefined 
      ? parseFloat(displayQuantity) 
      : totalQuantity;
    
    // Special handling for "salt and pepper" - always collapse to single entry without quantity
    if (canonicalName === "salt and pepper") {
      result.push({
        name: displayName,
        canonicalName, // Store canonical name for categorization
        baseName: ingredients[0].baseName, // Store base name for categorization
        totalQuantity: undefined,
        unit: undefined,
        baseUnit: "none",
        lines: ingredients,
        section: "Spices", // Will be overridden by categorizer, but set default
      });
      continue;
    }
    
    // If we have both items with and without quantities, we might want to handle them separately
    // For now, combine them but only show totalQuantity if we have it
    if (itemsWithQuantity.length > 0 && itemsWithoutQuantity.length === 0) {
      // All items have quantities - aggregate normally
      // Store baseUnit for later formatting, but keep totalQuantity in base units
      result.push({
        name: displayName,
        canonicalName, // Store canonical name for categorization
        baseName: ingredients[0].baseName, // Store base name for categorization
        totalQuantity, // Keep in base units (e.g., tbsp)
        unit: displayUnit, // For unit-based, preserve original unit
        baseUnit, // Store for formatting
        lines: ingredients,
        section: "Other", // Will be set by categorizer
      });
    } else if (itemsWithQuantity.length === 0 && itemsWithoutQuantity.length > 0) {
      // No items have quantities - single entry without quantity
      result.push({
        name: displayName,
        canonicalName, // Store canonical name for categorization
        baseName: ingredients[0].baseName, // Store base name for categorization
        totalQuantity: undefined,
        unit: undefined,
        baseUnit: "none",
        lines: ingredients,
        section: "Other", // Will be set by categorizer
      });
    } else {
      // Mixed - for now, show totalQuantity if available, but keep all lines
      result.push({
        name: displayName,
        canonicalName, // Store canonical name for categorization
        baseName: ingredients[0].baseName, // Store base name for categorization
        totalQuantity,
        unit: displayUnit,
        baseUnit,
        lines: ingredients,
        section: "Other", // Will be set by categorizer
      });
    }
  }
  
  return result;
}

/**
 * Helper to normalize canonical name (used in aggregator for fallback).
 */
function normalizeCanonicalName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Formats a display name from canonical name (derived from baseName), preserving some capitalization.
 */
function formatDisplayName(canonicalName: string, baseName: string): string {
  // For special cases, use title case
  if (canonicalName === "salt and pepper") {
    return "Salt and black pepper";
  }
  
  // Use baseName for display (not the full name with prep)
  // Title case the baseName
  const words = baseName.split(" ");
  const capitalized = words.map((word, index) => {
    if (index === 0 || word.length > 3) {
      return word.charAt(0).toUpperCase() + word.slice(1);
    }
    return word;
  });
  
  return capitalized.join(" ");
}

