// lib/formatters/notesFormatter.ts

import { AggregatedIngredient, IngredientCategory } from "@/lib/ingredients/types";
import { WeeklyPlan } from "@/lib/planning/types";
import { formatQuantity } from "@/lib/ingredients/aggregator";

/**
 * Cleans ingredient display name for grocery list.
 * Removes prep instructions, parentheticals, and garnish notes.
 */
function cleanGroceryDisplayName(name: string): string {
  let cleaned = name.trim();
  
  // Remove "Optional:" prefix
  cleaned = cleaned.replace(/^optional:\s*/i, "");
  
  // Remove everything in parentheses
  cleaned = cleaned.replace(/\([^)]*\)/g, "");
  
  // Remove text after comma (prep instructions)
  const commaIndex = cleaned.indexOf(",");
  if (commaIndex !== -1) {
    cleaned = cleaned.substring(0, commaIndex);
  }
  
  // Remove "for garnish" suffix
  cleaned = cleaned.replace(/\s+for\s+garnish\s*$/i, "");
  
  // Clean up extra whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  
  return cleaned;
}

const CATEGORY_ORDER: IngredientCategory[] = [
  "Produce",
  "Meat/Fish",
  "Dairy",
  "Dry Goods",
  "Pantry",
  "Spices",
  "Other",
];

/**
 * Formats aggregated ingredients into a grocery list text block for Apple Notes.
 */
export function formatGroceryListForNotes(
  aggregated: AggregatedIngredient[],
  weekLabel?: string
): string {
  // Group by category
  const byCategory = new Map<IngredientCategory, AggregatedIngredient[]>();
  
  for (const ingredient of aggregated) {
    const category = (ingredient.category || "Other") as IngredientCategory;
    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category)!.push(ingredient);
  }
  
  // Build text output
  const lines: string[] = [];
  
  if (weekLabel) {
    lines.push(weekLabel.toUpperCase());
    lines.push("");
  }
  
  // Add categories in order
  for (const category of CATEGORY_ORDER) {
    const ingredients = byCategory.get(category);
    if (!ingredients || ingredients.length === 0) {
      continue;
    }
    
    lines.push(category);
    
    for (const ingredient of ingredients) {
      // Clean the display name to remove prep text, parentheticals, etc.
      const cleanName = cleanGroceryDisplayName(ingredient.name);
      
      // Use formatQuantity to get human-friendly display
      const baseUnit = ingredient.baseUnit || "none";
      const { displayQuantity, displayUnit } = formatQuantity(
        ingredient.totalQuantity,
        baseUnit,
        cleanName
      );
      
      // For unit-based items, try to preserve original unit from lines
      let finalUnit = displayUnit;
      if (baseUnit === "unit" && ingredient.lines.length > 0) {
        const firstLine = ingredient.lines[0];
        if (firstLine.unit) {
          finalUnit = firstLine.unit; // e.g., "cloves", "lbs", "breasts"
        } else if (!finalUnit) {
          // Check if we stored a unit in the aggregated ingredient
          finalUnit = ingredient.unit || "";
        }
      } else if (baseUnit === "unit" && ingredient.unit) {
        // Use stored unit if available
        finalUnit = ingredient.unit;
      }
      
      if (displayQuantity !== undefined && finalUnit) {
        lines.push(`• ${displayQuantity} ${finalUnit} ${cleanName}`);
      } else if (displayQuantity !== undefined && !finalUnit) {
        // Unit-based items without explicit unit (e.g., "2 chicken breasts")
        lines.push(`• ${displayQuantity} ${cleanName}`);
      } else if (displayQuantity !== undefined) {
        lines.push(`• ${displayQuantity} ${cleanName}`);
      } else {
        // For items without quantity (e.g., "salt and pepper to taste")
        if (cleanName.toLowerCase().includes("salt") && cleanName.toLowerCase().includes("pepper")) {
          lines.push(`• ${cleanName} (to taste)`);
        } else {
          lines.push(`• ${cleanName}`);
        }
      }
    }
    
    lines.push(""); // Empty line between categories
  }
  
  return lines.join("\n").trim();
}

/**
 * Formats a weekly plan into a recipe packet text block.
 */
export function formatRecipePacket(weeklyPlan: WeeklyPlan): string {
  const lines: string[] = [];
  
  const dayLabels: Record<string, string> = {
    sunday: "Sunday",
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
  };
  
  function formatDate(date: Date | string): string {
    const d = typeof date === "string" ? new Date(date) : date;
    const month = d.toLocaleDateString("en-US", { month: "short" });
    const day = d.getDate();
    return `${month} ${day}`;
  }
  
  for (const meal of weeklyPlan.meals) {
    const dayName = dayLabels[meal.day] || meal.day;
    const dateStr = formatDate(meal.date);
    
    lines.push(`${dayName}, ${dateStr}`);
    lines.push("=".repeat(40));
    lines.push("");
    lines.push(meal.recipe.name.toUpperCase());
    lines.push("");
    
    // Ingredients
    if (meal.recipe.ingredients) {
      lines.push("INGREDIENTS:");
      const ingredients = typeof meal.recipe.ingredients === "string"
        ? meal.recipe.ingredients.split("\n")
        : Array.isArray(meal.recipe.ingredients)
        ? meal.recipe.ingredients
        : [];
      
      for (const ingredient of ingredients) {
        if (ingredient.trim()) {
          lines.push(`• ${ingredient.trim()}`);
        }
      }
      lines.push("");
    }
    
    // Directions
    if (meal.recipe.directions) {
      lines.push("INSTRUCTIONS:");
      let directions = "";
      if (typeof meal.recipe.directions === "string") {
        directions = meal.recipe.directions;
      } else if (Array.isArray(meal.recipe.directions)) {
        directions = meal.recipe.directions.join("\n");
      }
      
      lines.push(directions);
      lines.push("");
    }
    
    lines.push(""); // Extra space between recipes
  }
  
  return lines.join("\n").trim();
}

