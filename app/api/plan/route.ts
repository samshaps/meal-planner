// app/api/plan/route.ts

import { NextResponse } from "next/server";
import { generatePlan } from "@/lib/planning/planner";
import { DayRequirement } from "@/lib/planning/types";
import { PaprikaRecipe } from "@/lib/paprika/types";
import { generateRecipes } from "@/lib/ai/recipe-generator";

interface PlanRequestBody {
  days: DayRequirement[];
  categoryUids?: string[];
  useAllRecipes?: boolean;
}

export async function POST(req: Request) {
  const totalStartTime = Date.now();
  const logStep = (stepName: string, stepStartTime: number) => {
    const duration = ((Date.now() - stepStartTime) / 1000).toFixed(2);
    const elapsed = ((Date.now() - totalStartTime) / 1000).toFixed(2);
    console.log(`[PLAN API] ⏱️  ${stepName}: ${duration}s (total: ${elapsed}s)`);
  };
  
  try {
    const step1Start = Date.now();
    const body = (await req.json()) as PlanRequestBody;
    const { days, categoryUids = [], useAllRecipes = true } = body;
    logStep("Step 1: Parse request body", step1Start);

    if (!days || days.length === 0) {
      return NextResponse.json(
        { error: "No days provided" },
        { status: 400 }
      );
    }

    // Generate all recipes needed for the selected days
    const selectedDaysCount = days.filter((d) => d.needsDinner).length;
    const recipesToGenerate = selectedDaysCount;
    console.log(`[PLAN API] 📊 Generating ${recipesToGenerate} recipes for ${selectedDaysCount} days`);
    
    let generatedRecipes: PaprikaRecipe[] = [];
    if (recipesToGenerate > 0) {
      try {
        const step2Start = Date.now();
        generatedRecipes = await generateRecipes(
          [],
          recipesToGenerate,
          categoryUids.length > 0 ? categoryUids : undefined
        );
        logStep("Step 2: Generate recipes (OpenAI API call)", step2Start);
      } catch (err) {
        console.error(`[PLAN API] Failed to generate new recipes:`, err);
        return NextResponse.json(
          { error: "Failed to generate recipes" },
          { status: 500 }
        );
      }
    }

    // All recipes are generated
    const step3Start = Date.now();
    const allRecipes = generatedRecipes.map((r) => ({ ...r, _isGenerated: true }));
    logStep("Step 3: Map recipes", step3Start);

    if (allRecipes.length === 0) {
      return NextResponse.json(
        { error: "No recipes generated" },
        { status: 400 }
      );
    }

    // Generate meal plan
    const step4Start = Date.now();
    const weeklyPlan = await generatePlan(allRecipes, days);
    logStep("Step 4: Generate meal plan", step4Start);
    
    // Ensure all meals have ingredients before returning
    const step5Start = Date.now();
    const planWithIngredients = {
      ...weeklyPlan,
      meals: weeklyPlan.meals.map((m) => ({
        ...m,
        recipe: {
          ...m.recipe,
          // Explicitly ensure ingredients field exists
          ingredients: m.recipe.ingredients || (m.recipe as any).ingredients || undefined,
        },
      })),
    };
    logStep("Step 5: Process ingredients", step5Start);
    
    const totalDuration = ((Date.now() - totalStartTime) / 1000).toFixed(2);
    console.log(`[PLAN API] ✅ Plan generation complete in ${totalDuration}s`);
    
    return NextResponse.json({
      success: true,
      plan: planWithIngredients, // Use plan with explicitly preserved ingredients
      totalRecipes: generatedRecipes.length,
    });
  } catch (err: unknown) {
    const totalDuration = ((Date.now() - totalStartTime) / 1000).toFixed(2);
    const message =
      err instanceof Error ? err.message : "Unknown error occurred";
    console.error(`[PLAN API] ❌ Plan generation failed after ${totalDuration}s:`, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

