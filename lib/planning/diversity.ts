// lib/planning/diversity.ts

export interface RecipeMetadata {
  cuisine: string;
  protein: string;
  difficulty: string;
  prepTime: number | null;
}

export interface DiversityScore {
  cuisineVariety: number; // 0-1, higher is better
  proteinVariety: number; // 0-1, higher is better
  difficultyDistribution: number; // 0-1, higher is better
  totalScore: number; // 0-1, weighted average
}

/**
 * Scores the diversity of a meal plan based on cuisine, protein, and difficulty distribution.
 */
export function scoreDiversity(
  selectedRecipes: RecipeMetadata[]
): DiversityScore {
  if (selectedRecipes.length === 0) {
    return {
      cuisineVariety: 0,
      proteinVariety: 0,
      difficultyDistribution: 0,
      totalScore: 0,
    };
  }

  // Count unique cuisines
  const uniqueCuisines = new Set(selectedRecipes.map((r) => r.cuisine));
  const cuisineVariety = uniqueCuisines.size / selectedRecipes.length;

  // Count unique proteins
  const uniqueProteins = new Set(selectedRecipes.map((r) => r.protein));
  const proteinVariety = uniqueProteins.size / selectedRecipes.length;

  // Check difficulty distribution (prefer mix of Easy/Medium/Hard)
  const difficulties = selectedRecipes.map((r) => r.difficulty);
  const easyCount = difficulties.filter((d) => d === "Easy").length;
  const mediumCount = difficulties.filter((d) => d === "Medium").length;
  const hardCount = difficulties.filter((d) => d === "Hard").length;
  
  // Ideal distribution: roughly equal, or at least not all one type
  const maxCount = Math.max(easyCount, mediumCount, hardCount);
  const difficultyDistribution = maxCount === selectedRecipes.length 
    ? 0 // All same difficulty
    : 1 - (maxCount / selectedRecipes.length); // More variety = higher score

  // Weighted average (can adjust weights)
  const totalScore = (cuisineVariety * 0.4 + proteinVariety * 0.4 + difficultyDistribution * 0.2);

  return {
    cuisineVariety,
    proteinVariety,
    difficultyDistribution,
    totalScore,
  };
}

