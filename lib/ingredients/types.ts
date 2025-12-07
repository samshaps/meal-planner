// lib/ingredients/types.ts

export interface ParsedIngredient {
  raw: string;           // full original line ("2 cloves garlic, minced")
  name: string;          // human-readable name (backwards compatible, may include prep)
  baseName: string;      // ingredient without prep ("garlic")
  prepNote?: string;     // preparation / extra info ("minced", "halved and seeded")
  canonicalName: string;  // normalized key derived from baseName
  quantity?: number;       // original numeric quantity
  unit?: string;           // original unit string ("cup", "cups", "tbsp", etc.)
  baseUnit?: "tsp" | "tbsp" | "cup" | "unit" | "none";
  quantityInBaseUnits?: number; // converted to base unit where possible
  notes?: string;
  originalText: string;    // keep for backward compatibility
}

export interface AggregatedIngredient {
  name: string;                 // use canonicalName for display
  canonicalName?: string;       // canonical name for categorization
  baseName?: string;            // base name for categorization
  totalQuantity?: number;       // sum of quantityInBaseUnits where applicable
  unit?: string;                // baseUnit rendered in human-friendly form
  baseUnit?: "tsp" | "tbsp" | "cup" | "unit" | "none"; // stored baseUnit for formatting
  lines: ParsedIngredient[];    // underlying lines
  section: string;              // "Produce", "Meat/Fish", etc.
  category?: string;            // keep for backward compatibility
}

export type IngredientCategory =
  | "Produce"
  | "Meat/Fish"
  | "Dry Goods"
  | "Dairy"
  | "Spices"
  | "Pantry"
  | "Other";

