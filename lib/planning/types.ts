// lib/planning/types.ts

export type Weekday =
  | "sunday"
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday";

export interface DayRequirement {
  day: Weekday;
  needsDinner: boolean;
  date: Date; // The actual date for this day
}

export interface WeeklyPlan {
  meals: PlannedMeal[];
}

export interface PlannedMeal {
  day: Weekday;
  date: Date;
  recipe: {
    uid: string;
    name: string;
    description?: string; // Brief overview of featured ingredients and flavors
    ingredients?: string; // Ingredient list (needed for grocery list generation)
    directions?: string; // Full recipe instructions
    [key: string]: unknown;
  };
}

