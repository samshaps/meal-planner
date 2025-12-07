// lib/paprika/types.ts

export interface PaprikaCategory {
  uid: string;
  name: string;
  parent_uid?: string | null;
  order_flag?: number;
  [key: string]: unknown;
}

export interface PaprikaRecipe {
  uid: string;
  name: string;
  description?: string; // Brief overview of featured ingredients and flavors (for AI-generated recipes)
  ingredients: string; // Raw ingredient text from Paprika
  directions: string; // Raw directions text from Paprika
  categories: string[]; // Array of category UIDs
  rating?: number;
  source?: string;
  photo?: string;
  photo_url?: string;
  hash?: string;
  [key: string]: unknown;
}

// Raw recipe item from /api/v2/sync/recipes/ (just uid and hash)
export interface PaprikaRecipeItem {
  uid: string;
  hash: string;
}

